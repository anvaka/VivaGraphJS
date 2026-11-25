/*! VivaGraph 1.0.0-alpha.2 | BSD-3-Clause | https://github.com/anvaka/VivaGraphJS */
import { g as getDefaultExportFromCjs, r as requireFormula } from './vivagraph.index.js';

// The device: requesting it with the adapter's limits, watching it for errors and loss, its
// pipelines (compiled asynchronously, cached by their WGSL text), what a submit costs on it, and
// how much slower than the Mac the work caps were sized on it is.
const deviceStates = new WeakMap(); // device -> state, see watchDevice()

/**
 * A GPUDevice with the adapter's values of `limits` (names of GPUSupportedLimits) and with
 * timestamp queries when the adapter has them, or null when WebGPU is not available.
 */
async function requestDevice(limits) {
  try {
    if (typeof navigator === 'undefined' || !navigator.gpu) return null;
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return null;
    const requiredLimits = {};
    for (const name of limits) {
      if (adapter.limits[name] !== undefined) requiredLimits[name] = adapter.limits[name];
    }
    const requiredFeatures = adapter.features.has('timestamp-query') ? ['timestamp-query'] : [];
    return await adapter.requestDevice({ requiredFeatures, requiredLimits });
  } catch (e) {
    console.warn('WebGPU is not available:', e);
    return null;
  }
}

/**
 * Per device: the listeners of its errors and loss (runners), its pipelines and its submit cost.
 * Validation errors are only console warnings unless someone listens, so every device a runner
 * uses is watched.
 */
function watchDevice(device) {
  let state = deviceStates.get(device);
  if (state) return state;
  state = { listeners: new Set(), lost: null, modules: new Map(), pipelines: new Map(), layouts: new Map(), submitMs: null, slowdown: null };
  deviceStates.set(device, state);
  device.addEventListener('uncapturederror', e => {
    const message = e.error && e.error.message ? e.error.message : String(e.error);
    state.listeners.forEach(listener => listener({ message }));
  });
  device.lost.then(info => {
    state.lost = info;
    state.listeners.forEach(listener => listener({ lost: true, message: info.message || 'the device was lost', reason: info.reason }));
  });
  return state;
}

/**
 * A compute pipeline for `code`, created asynchronously and cached per device by the WGSL text,
 * the layout and the override constants. `bindings` gives an explicit layout, one entry per
 * binding: 'uniform', 'dynamic' (a uniform with a dynamic offset), 'read' or 'storage'; without
 * it the layout is 'auto'. Rejects with an error that names the kernel (`error.kernel`).
 */
function getPipeline(device, { code, label, bindings = null, constants = null }) {
  const state = watchDevice(device);
  const layoutKey = bindings ? bindings.join(',') : 'auto';
  const key = layoutKey + '|' + (constants ? JSON.stringify(constants) : '') + '|' + code;
  let pipeline = state.pipelines.get(key);
  if (!pipeline) {
    pipeline = createPipeline(device, state, { code, label, bindings, constants });
    state.pipelines.set(key, pipeline);
    pipeline.catch(() => { state.pipelines.delete(key); });
  }
  return pipeline;
}

async function createPipeline(device, state, { code, label, bindings, constants }) {
  let module = state.modules.get(code);
  let moduleError = null;
  if (!module) {
    device.pushErrorScope('validation');
    module = device.createShaderModule({ code, label });
    moduleError = device.popErrorScope();
    state.modules.set(code, module);
  }
  const layout = bindings ? pipelineLayout(device, state, bindings) : 'auto';
  const compute = { module, entryPoint: 'main' };
  if (constants) compute.constants = constants;
  try {
    const [error, pipeline] = await Promise.all([moduleError, device.createComputePipelineAsync({ layout, compute, label })]);
    if (error) throw error;
    return pipeline;
  } catch (e) {
    state.modules.delete(code);
    const error = new Error(`kernel ${label}: ${e.message}`);
    error.kernel = label;
    throw error;
  }
}

const BINDING_TYPES = {
  uniform: { buffer: { type: 'uniform' } },
  dynamic: { buffer: { type: 'uniform', hasDynamicOffset: true } },
  read: { buffer: { type: 'read-only-storage' } },
  storage: { buffer: { type: 'storage' } },
};

function pipelineLayout(device, state, bindings) {
  const key = bindings.join(',');
  let layout = state.layouts.get(key);
  if (!layout) {
    const group = device.createBindGroupLayout({
      entries: bindings.map((type, binding) => Object.assign({ binding, visibility: GPUShaderStage.COMPUTE }, BINDING_TYPES[type])),
    });
    layout = device.createPipelineLayout({ bindGroupLayouts: [group] });
    state.layouts.set(key, layout);
  }
  return layout;
}

/**
 * What one submit costs on this device, in ms: the wall clock of near empty submits, measured
 * once per device. Batching (runner.js) puts enough steps in a submit to hide it.
 */
async function submitCost(device) {
  const state = watchDevice(device);
  if (state.submitMs !== null) return state.submitMs;
  const count = 16;
  await device.queue.onSubmittedWorkDone();
  const start = performance.now();
  for (let i = 0; i < count; i++) device.queue.submit([device.createCommandEncoder().finish()]);
  await device.queue.onSubmittedWorkDone();
  state.submitMs = (performance.now() - start) / count;
  return state.submitMs;
}

// The speed probe: three kinds of work the module's kernels do, each timed in its own pass.
//  - pairs: every thread sums a push from each of 1,024 bodies (an exact pair loop, from cache);
//  - gather: every thread reads scattered words of a 16 MB buffer (a cell sort's neighbours);
//  - atomics: every thread adds into scattered and into shared counters (a grid's deposit).
// MS is each part's GPU time on the M4 Max the work caps were sized on (0.93-1.01, 0.95 and
// 0.76-0.87 ms measured), with a margin for noise; at about 1 ms each, Chrome's 100 us timestamp
// quantum costs at most a tenth.
const PROBE_THREADS = 65536, PROBE_BODIES = 1024, GATHER_WORDS = 1 << 22, GATHER_READS = 128, ATOMIC_SLOTS = 1 << 20, ATOMIC_ADDS = 32;
const MIX = `fn mix(x: u32) -> u32 {
  var h = x * 747796405u + 2891336453u;
  h = ((h >> 16u) ^ h) * 0x45d9f3bu;
  return (h >> 16u) ^ h;
}`;
const PROBE_PARTS = [
  {
    name: 'pairs', MS: 1.06, buffers: ['bodies', 'out'],
    code: `@group(0) @binding(0) var<storage, read> p: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> out: array<f32>;
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let me = p[gid.x % ${PROBE_BODIES}u];
  var acc = vec3f(0.0);
  for (var j = 0u; j < ${PROBE_BODIES}u; j++) {
    let o = p[j];
    let d = o.xyz - me.xyz;
    let r2 = dot(d, d) + 0.01;
    acc += d * (o.w * inverseSqrt(r2) / r2);
  }
  out[gid.x] = acc.x + acc.y + acc.z;
}`,
  },
  {
    name: 'gather', MS: 1.0, buffers: ['words', 'out'],
    code: `@group(0) @binding(0) var<storage, read> words: array<u32>;
@group(0) @binding(1) var<storage, read_write> out: array<f32>;
${MIX}
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  var at = mix(gid.x);
  var acc = 0u;
  for (var k = 0u; k < ${GATHER_READS}u; k++) {
    let w = words[at & ${GATHER_WORDS - 1}u];
    acc += w;
    at = mix(at + w);
  }
  out[gid.x] = f32(acc);
}`,
  },
  {
    name: 'atomics', MS: 0.91, buffers: ['slots'],
    code: `@group(0) @binding(0) var<storage, read_write> slots: array<atomic<u32>>;
${MIX}
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  var at = mix(gid.x);
  for (var k = 0u; k < ${ATOMIC_ADDS}u; k++) {
    // one add in four lands on 256 shared counters, as bodies piled into a few grid cells do
    let slot = select(at & ${ATOMIC_SLOTS - 1}u, at & 255u, (k & 3u) == 0u);
    atomicAdd(&slots[slot], 1u);
    at = mix(at);
  }
}`,
  },
];
// The factor when the probe cannot measure: a slow device, the safe side
const UNKNOWN_SLOWDOWN = 10;

/**
 * How many times slower than the M4 Max the work caps were sized on this device is: the largest
 * ratio of the probe's three parts (1 at least, 100 at most), measured once per device. GPU time
 * from timestamps when the device has them (the larger of two runs after a warm-up), else the
 * wall clock of each part's submit, which counts its latency too (so it reads slower, the safe
 * side). A probe that cannot measure gives UNKNOWN_SLOWDOWN. About 3 ms of GPU work here.
 */
async function deviceSlowdown(device) {
  const state = watchDevice(device);
  if (state.slowdown !== null) return state.slowdown;
  let factor = UNKNOWN_SLOWDOWN;
  const owned = [];
  try {
    const pipelines = await Promise.all(PROBE_PARTS.map(part => getPipeline(device, { code: part.code, label: 'SPEED_PROBE_' + part.name })));
    const buffer = (size, usage) => { const b = device.createBuffer({ size, usage }); owned.push(b); return b; };
    const S = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    const bodies = new Float32Array(PROBE_BODIES * 4);
    for (let i = 0; i < PROBE_BODIES; i++) bodies.set([Math.cos(i), Math.sin(i * 1.3), (i % 37) * 0.1, 1 + (i % 5)], i * 4);
    const input = buffer(bodies.byteLength, S);
    device.queue.writeBuffer(input, 0, bodies);
    const words = buffer(GATHER_WORDS * 4, S);
    const fill = new Uint32Array(1 << 16);
    for (let i = 0; i < fill.length; i++) fill[i] = (i * 2654435761) >>> 0;
    for (let at = 0; at < GATHER_WORDS; at += fill.length) device.queue.writeBuffer(words, at * 4, fill);
    const slots = buffer(ATOMIC_SLOTS * 4, S);
    const output = buffer(PROBE_THREADS * 4, GPUBufferUsage.STORAGE);
    const named = { bodies: input, words, slots, out: output };
    const groups = pipelines.map((pipeline, p) => device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: PROBE_PARTS[p].buffers.map((name, binding) => ({ binding, resource: { buffer: named[name] } })),
    }));
    const timed = device.features.has('timestamp-query');
    const count = 2 * PROBE_PARTS.length;
    const querySet = timed ? device.createQuerySet({ type: 'timestamp', count }) : null;
    const resolve = timed ? buffer(count * 8, GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC) : null;
    const read = timed ? buffer(count * 8, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST) : null;
    const submit = timed ? 0 : await submitCost(device);
    // one run: each part's ms
    const once = async () => {
      if (timed) {
        const enc = device.createCommandEncoder();
        PROBE_PARTS.forEach((part, p) => {
          const pass = enc.beginComputePass({ timestampWrites: { querySet, beginningOfPassWriteIndex: 2 * p, endOfPassWriteIndex: 2 * p + 1 } });
          pass.setPipeline(pipelines[p]);
          pass.setBindGroup(0, groups[p]);
          pass.dispatchWorkgroups(PROBE_THREADS / 256);
          pass.end();
        });
        enc.resolveQuerySet(querySet, 0, count, resolve, 0);
        enc.copyBufferToBuffer(resolve, 0, read, 0, count * 8);
        device.queue.submit([enc.finish()]);
        await read.mapAsync(GPUMapMode.READ);
        const t = new BigUint64Array(read.getMappedRange());
        const ms = PROBE_PARTS.map((part, p) => Number(t[2 * p + 1] - t[2 * p]) / 1e6);
        read.unmap();
        return ms;
      }
      const ms = [];
      for (let p = 0; p < PROBE_PARTS.length; p++) {
        const enc = device.createCommandEncoder();
        const pass = enc.beginComputePass();
        pass.setPipeline(pipelines[p]);
        pass.setBindGroup(0, groups[p]);
        pass.dispatchWorkgroups(PROBE_THREADS / 256);
        pass.end();
        const start = performance.now();
        device.queue.submit([enc.finish()]);
        await device.queue.onSubmittedWorkDone();
        ms.push(performance.now() - start - submit);
      }
      return ms;
    };
    // a warm-up run, then the larger of two (slower reads the safe side)
    await once();
    const runs = [await once(), await once()];
    const ms = PROBE_PARTS.map((part, p) => Math.max(runs[0][p], runs[1][p]));
    state.probeMs = ms;
    if (ms.every(value => Number.isFinite(value) && value > 0)) {
      factor = Math.min(100, Math.max(1, ...ms.map((value, p) => value / PROBE_PARTS[p].MS)));
    }
    if (querySet) querySet.destroy();
  } catch (e) {
    factor = UNKNOWN_SLOWDOWN;
  } finally {
    owned.forEach(b => b.destroy());
  }
  state.slowdown = factor;
  return factor;
}

var formulaExports = requireFormula();
var formula = /*@__PURE__*/getDefaultExportFromCjs(formulaExports);

// WGSL from the library's formula language. The library's compilers decide what a formula means
// and call a printer for the spelling (lib/formula.js describes the interface); this is the WGSL
// printer, plus the law helpers the kernels use. Three rules make the GPU agree with JS:
//
//  - names: named values print as `v_<name>` and engines print user names (params, columns) with
//    a prefix too (`p_active`), so a user name never hits a WGSL reserved word;
//  - builtins: every function of the library's table prints so that it means what JS computes on
//    the whole domain the table states, or is refused by name. Metal's tanh is NaN from 45, so tanh
//    is clamped to +-10 (tanh(10) is already 1 in f32); a constant whole exponent multiplies, since
//    WGSL's pow is undefined for a negative base;
//  - literals: a number that does not fit a 32-bit float is refused when the shader is printed,
//    never left to become an error or a silent 0 on the device (non-finite, |v| > 3.4028e38, or a
//    nonzero value that rounds to 0). Numbers below 1.18e-38 may be flushed to 0, so they warn.
//
// Laws and builtins that were already safe print exactly as before this module owned the printer
// (test/t3.js compares them with the text the library used to print).

const F32_MAX = 3.4028234663852886e38;
const F32_MIN_NORMAL = 1.1754943508222875e-38;

// Builtins that WGSL has with the same meaning as JS on the table's domain
const NATIVE = new Set(['exp', 'log', 'sqrt', 'abs', 'sign', 'floor', 'ceil', 'sin', 'cos', 'min', 'max', 'dot', 'length']);
// A constant whole exponent up to this is a product; larger ones keep the sign by hand
const MAX_PRODUCT = 8;

/**
 * Why `value` cannot be a 32-bit float literal, or null when it can.
 */
function f32Problem(value) {
  if (!Number.isFinite(value) || Math.abs(value) > F32_MAX) return `the number ${value} does not fit a 32-bit float`;
  if (value !== 0 && Math.fround(value) === 0) return `the number ${value} is 0 in a 32-bit float`;
  return null;
}

/**
 * True for a nonzero value below the smallest normal f32, which a GPU may flush to 0.
 */
function f32Tiny(value) {
  return value !== 0 && Math.abs(value) < F32_MIN_NORMAL;
}

/**
 * A WGSL printer. `warn(message)` hears about literals a GPU may flush to 0 (console.warn, once
 * per message, by default).
 */
function createPrinter(warn) {
  if (!warn) warn = warnOnce$1;
  const printer = {
    name: 'wgsl',

    // Always with a decimal point: 1 / 2 between integer literals is 0 in WGSL
    number(value) {
      const problem = f32Problem(value);
      if (problem) throw new Error(problem);
      if (f32Tiny(value)) warn(`the number ${value} is below 1.18e-38, which the GPU may treat as 0`);
      let text = String(value);
      if (/^-?\d+$/.test(text)) text += '.0';
      return value < 0 ? '(' + text + ')' : text;
    },

    call(name, args) {
      if (NATIVE.has(name)) return name + '(' + args.join(', ') + ')';
      if (name === 'tanh') return 'tanh(clamp(' + args[0] + ', -10.0, 10.0))';
      if (name === 'pow') return power(args[0], args[1]);
      if (name === 'select') return printer.choose(args[0], args[1], args[2]);
      if (name === 'axis') throw new Error('axis() is a constant vector: the formula compiler prints it, not a call');
      throw new Error(`${name}() has no WGSL printing`);
    },

    choose(condition, yes, no) { return 'select(' + no + ', ' + yes + ', ' + condition + ')'; },
    operator(op) { return op; },
    // Named values may be assigned again (+= and the like), so they are variables
    declare(name, code, kind) { return (kind === 'local' ? 'var ' : 'let ') + name + ' = ' + code + ';'; },
    result(name, code) { return 'let ' + name + ' = ' + code + ';'; },
    assign(target, op, code) { return target + ' ' + op + ' ' + code + ';'; },
    local(name) { return 'v_' + name; },
    temp(index) { return 't_' + index; },
  };
  return printer;
}

const WGSL = createPrinter();

const warned$1 = new Set();
function warnOnce$1(message) {
  if (warned$1.has(message)) return;
  warned$1.add(message);
  console.warn('ngraph.forcelayout.gpu: ' + message);
}

// pow(a, b) is exp2(b * log2(a)) in WGSL: undefined for a < 0. JS gives a real number there when
// b is whole, so a whole exponent written in the formula keeps that meaning; a run-time exponent
// with a negative base is outside the parity contract (design section 1).
function power(base, exponent) {
  const whole = wholeLiteral(exponent);
  if (whole === null) return 'pow(' + base + ', ' + exponent + ')';
  if (whole === 0) return '1.0';
  const count = Math.abs(whole);
  if (count <= MAX_PRODUCT) {
    const product = '(' + Array(count).fill(base).join(' * ') + ')';
    return whole < 0 ? '(1.0 / ' + product + ')' : product;
  }
  const magnitude = 'pow(abs(' + base + '), ' + exponent + ')';
  return count % 2 ? '(sign(' + base + ') * ' + magnitude + ')' : magnitude;
}

// The whole number a literal printed by number() holds ('3.0', '(-2.0)'), or null
function wholeLiteral(code) {
  const match = /^\(?(-?\d+)\.0\)?$/.exec(code);
  return match ? Number(match[1]) : null;
}

// ---------------------------------------------------------------------------------------------
// Laws. A compiled law (lib/repulsionLaw.js) keeps its numbers in `law.values`: the parameters
// by name, the parts computed once per step as `$h<n>` and the range as `$range`. Kernels read
// them from a uniform as `law_<name>` and `lawH<n>`, and the squared range as `lawRange2`.
// ---------------------------------------------------------------------------------------------

/**
 * Code that sets `k1Name` to F(r) / r (and `k2Name`, when given, to (F(r)/r - F'(r)) / r^2),
 * both declared with `let`. Throws for what the GPU cannot run, literals included. A lookup table
 * prints as `lawFunctions.T.value(x)` (and its slope's guard): the caller puts its own lookup there.
 */
function emitLaw(law, dimension, rName, k1Name, k2Name, printer = WGSL) {
  if (Object.keys(law.functions).some(name => law.tableNames.indexOf(name) < 0)) throw new Error('Laws with custom functions cannot run on the GPU');
  return law.emit(printer, dimension, rName, k1Name, k2Name);
}

/**
 * Names of the law's numbers in the order lawPrologue() and writeLawValues() use: the parameters,
 * then the hoisted parts.
 */
function lawValueNames(law) {
  const hoisted = Object.keys(law.values).filter(key => /^\$h\d+$/.test(key))
    .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
  return law.paramNames.concat(hoisted);
}

/**
 * How many numbers the law needs in a buffer: its values, plus the squared range when it has one.
 */
function lawValueCount(law) {
  return lawValueNames(law).length + (law.hasRange ? 1 : 0);
}

/**
 * Writes the law's numbers of a step into `out` from `offset`: `values` as the simulator's
 * stageValues() returns them (`lawValues`), or the law's own after `law.update()`.
 */
function writeLawValues(law, out, offset, values = law.values) {
  const names = lawValueNames(law);
  for (let i = 0; i < names.length; ++i) out[offset + i] = values[names[i]];
  // f32 has no room for a squared range past 1e19, and some GPUs mishandle infinity
  if (law.hasRange) out[offset + names.length] = Math.min(values.$range * values.$range, 3e38);
}

/**
 * WGSL that declares the law's numbers, where `read(i)` is an expression for the i-th number
 * written by writeLawValues(). A range is declared as `lawRange2` (squared).
 */
function lawPrologue(law, read) {
  const names = lawValueNames(law).map(key => (key[0] === '$' ? 'lawH' + key.slice(2) : 'law_' + key));
  const lines = names.map((name, i) => 'let ' + name + ' = ' + read(i) + ';');
  if (law.hasRange) lines.push('let lawRange2 = ' + read(names.length) + ';');
  return lines.join(' ');
}

/**
 * The first of the law's numbers for this step that does not fit a 32-bit float (not finite, or
 * beyond +-3.4028e38), as {name, value, problem}, or null. Names are as the user wrote them (`L`),
 * or `part $h<n>` for a part computed once per step. The range is clamped instead (writeLawValues).
 */
function lawValueProblem(law, values = law.values) {
  for (const key of lawValueNames(law)) {
    const value = values[key];
    if (!Number.isFinite(value) || Math.abs(value) > F32_MAX) {
      return { name: valueName(key), value, problem: `${value}, which does not fit a 32-bit float` };
    }
  }
  return null;
}

/**
 * Warnings about the law's numbers for this step: nonzero values that are 0 in a 32-bit float, or
 * below 1.18e-38 (which a GPU may treat as 0).
 */
function lawValueWarnings(law, values = law.values) {
  const out = [];
  for (const key of lawValueNames(law)) {
    const value = values[key];
    if (value !== 0 && Math.fround(value) === 0) out.push(`the law's ${valueName(key)} is ${value}, which is 0 in a 32-bit float`);
    else if (f32Tiny(value)) out.push(`the law's ${valueName(key)} is ${value}, below 1.18e-38: the GPU may treat it as 0`);
  }
  return out;
}

// A parameter by its name; a part the law computes once per step from its parameters by its key
function valueName(key) {
  return key[0] === '$' ? `part ${key} (computed from its parameters)` : key;
}

// Grid pyramid force layout for any graph size. Every buffer stays on the GPU and a step needs
// no CPU round trip:
//
//   robust box -> bin nodes into a G x G Morton grid (counting sort, index order within a cell,
//   so runs are deterministic) -> per-cell mass and centre of mass -> 2x2 reductions up to one
//   cell -> per-cell far field (interaction lists, as field + Jacobian at the cell centre) ->
//   per node: exact pairs in its 3x3 cells + far field + springs.
//
// Springs are summed in chunks of edges (CSR), so a hub does not stall one lane. The integrator is
// ngraph's Euler (drag, |v| <= maxVelocity) or FIRE (three more dispatches: a reduction, a
// one-thread state update and the integration).
//
// The grid covers a robust box rather than the bounding box: a log-scale histogram of positions
// gives quantiles, so one far outlier no longer stretches the grid until every node shares a
// cell. Nodes outside the box are clamped into border cells. Their real positions still feed the
// centres of mass, and they compute their own far field from monopoles at their real position,
// because a cell-centred expansion is meaningless that far from the cell.
//
// Repulsion is 1/r^2 like the library's default. Another law (a compiled law of the library) is
// printed into LOCAL and FORCE by the module's WGSL printer, and they read its numbers from P.law.
//
// This is the stock template: the module runs it for the exact stock step above the small-graph
// size, and its WGSL is today's text byte for byte (test/t4.js). Its JS side takes the masses
// from the simulator's store, compiles pipelines asynchronously, and can feed LOCAL and FORCE a
// different copy of P per step (the law-variant pipelines, see run()).

const WG$3 = 256;
const SPRING_CHUNK = 8;
const NEAR_CAP$1 = 64;
const FIRE_GROUPS = 256;

// Box state buffer (u32 words):
//   0..3   bounding box, order-preserving encoded (min x, min y, max x, max y)
//   4..7   grid box as f32 bits: origin x, origin y, side, G / side
//   8..9   histogram centre as f32 bits (median of the previous step)
//   10     bounding box side as f32 bits (diagnostics)
//   16..   histograms: 1024 bins for x, then 1024 for y
const BOX_HEADER = 16;
const HIST_BINS$1 = 1024;

const COMMON = /* wgsl */`
struct Params {
  n: u32, G: u32, K: u32, nCells: u32,
  gravity: f32, springLength: f32, springK: f32, drag: f32,
  dt: f32, maxV: f32, nearCap: u32, integrator: u32,
  springChunk: u32, outlierRank: u32, nChunks: u32, locOff: u32,
};
fn part1by1(v: u32) -> u32 {
  var x = v & 0x0000ffffu;
  x = (x | (x << 8u)) & 0x00FF00FFu;
  x = (x | (x << 4u)) & 0x0F0F0F0Fu;
  x = (x | (x << 2u)) & 0x33333333u;
  x = (x | (x << 1u)) & 0x55555555u;
  return x;
}
fn compact1by1(v: u32) -> u32 {
  var x = v & 0x55555555u;
  x = (x | (x >> 1u)) & 0x33333333u;
  x = (x | (x >> 2u)) & 0x0F0F0F0Fu;
  x = (x | (x >> 4u)) & 0x00FF00FFu;
  x = (x | (x >> 8u)) & 0x0000FFFFu;
  return x;
}
fn morton(x: u32, y: u32) -> u32 { return part1by1(x) | (part1by1(y) << 1u); }
// Direction for two coincident nodes, from their indices: deterministic and antisymmetric,
// jitter(a, b) == -jitter(b, a), so the pair is pushed apart instead of moving together.
fn jitter(a: u32, b: u32) -> vec2f {
  var h = min(a, b) * 747796405u + max(a, b) * 2891336453u + 1u;
  h = ((h >> 16u) ^ h) * 0x45d9f3bu; h = ((h >> 16u) ^ h) * 0x45d9f3bu; h = (h >> 16u) ^ h;
  let angle = f32(h) * (6.2831853 / 4294967296.0);
  return select(-0.01, 0.01, a < b) * vec2f(cos(angle), sin(angle));
}
`;

// Bounding box and per-axis log-scale histograms of (position - centre). Bins: sign, then
// |d| in [2^-24, 2^40) with 8 bins per octave, so quantiles are found to ~12% of their distance
// from the centre whatever the scale.
const HIST = COMMON + /* wgsl */`
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> pos: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> bs: array<atomic<u32>>;
var<workgroup> hist: array<atomic<u32>, ${2 * HIST_BINS$1}>;
var<workgroup> wb: array<atomic<u32>, 4>;
fn fenc(v: f32) -> u32 { let u = bitcast<u32>(v); return select(u | 0x80000000u, ~u, (u & 0x80000000u) != 0u); }
fn hbin(d: f32) -> u32 {
  let key = u32(clamp(i32(bitcast<u32>(abs(d)) >> 20u) - 824, 0, 511));
  return select(512u + key, 511u - key, d < 0.0);
}
@compute @workgroup_size(${WG$3})
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_index) li: u32,
        @builtin(num_workgroups) nwg: vec3u) {
  for (var b = li; b < ${2 * HIST_BINS$1}u; b += ${WG$3}u) { atomicStore(&hist[b], 0u); }
  if (li < 2u) { atomicStore(&wb[li], 0xffffffffu); } else if (li < 4u) { atomicStore(&wb[li], 0u); }
  workgroupBarrier();
  let c = vec2f(bitcast<f32>(atomicLoad(&bs[8])), bitcast<f32>(atomicLoad(&bs[9])));
  var mn = vec2f(3e38); var mx = vec2f(-3e38);
  for (var i = gid.x; i < P.n; i += nwg.x * ${WG$3}u) {
    let p = pos[i];
    if (!(all(p == p) && all(abs(p) < vec2f(1e37)))) { continue; } // NaN or inf
    mn = min(mn, p); mx = max(mx, p);
    let d = p - c;
    atomicAdd(&hist[hbin(d.x)], 1u);
    atomicAdd(&hist[${HIST_BINS$1}u + hbin(d.y)], 1u);
  }
  atomicMin(&wb[0], fenc(mn.x)); atomicMin(&wb[1], fenc(mn.y));
  atomicMax(&wb[2], fenc(mx.x)); atomicMax(&wb[3], fenc(mx.y));
  workgroupBarrier();
  for (var b = li; b < ${2 * HIST_BINS$1}u; b += ${WG$3}u) {
    let v = atomicLoad(&hist[b]);
    if (v != 0u) { atomicAdd(&bs[${BOX_HEADER}u + b], v); }
  }
  if (li == 0u) {
    atomicMin(&bs[0], atomicLoad(&wb[0])); atomicMin(&bs[1], atomicLoad(&wb[1]));
    atomicMax(&bs[2], atomicLoad(&wb[2])); atomicMax(&bs[3], atomicLoad(&wb[3]));
  }
}`;

// One workgroup: quantiles from the histograms -> grid box. The box is the bounding box,
// shrunk to the [k, n - 1 - k] quantile range (k = outlierRank) plus a 25% margin when that is
// smaller, so ordinary layouts get exactly the bounding box. Also moves the histogram centre to
// the median and resets the histograms and bounding box for the next step.
const BOX = COMMON + /* wgsl */`
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> bs: array<u32>;
var<workgroup> scan: array<u32, ${WG$3}>;
var<workgroup> found: array<f32, 6>;
var<workgroup> total: u32;
fn fdec(u: u32) -> f32 { return bitcast<f32>(select(~u, u & 0x7fffffffu, (u & 0x80000000u) != 0u)); }
fn keyLo(key: u32) -> f32 { return select(bitcast<f32>((key + 824u) << 20u), 0.0, key == 0u); }
fn keyHi(key: u32) -> f32 { return bitcast<f32>((key + 825u) << 20u); }
fn edgeLo(s: u32) -> f32 { return select(-keyHi(511u - s), keyLo(s - 512u), s >= 512u); }
fn edgeHi(s: u32) -> f32 { return select(-keyLo(511u - s), keyHi(s - 512u), s >= 512u); }
@compute @workgroup_size(${WG$3})
fn main(@builtin(local_invocation_index) li: u32) {
  if (li < 6u) { found[li] = 0.0; }
  for (var a = 0u; a < 2u; a++) {
    let base = ${BOX_HEADER}u + a * ${HIST_BINS$1}u + li * 4u;
    var cs = array<u32, 4>(bs[base], bs[base + 1u], bs[base + 2u], bs[base + 3u]);
    let t = cs[0] + cs[1] + cs[2] + cs[3];
    scan[li] = t;
    workgroupBarrier();
    for (var off = 1u; off < ${WG$3}u; off <<= 1u) {
      var v = scan[li];
      if (li >= off) { v += scan[li - off]; }
      workgroupBarrier();
      scan[li] = v;
      workgroupBarrier();
    }
    let count = scan[${WG$3 - 1}];
    if (li == 0u) { total = count; }
    var cum = scan[li] - t;
    if (count > 0u) {
      let k = min(P.outlierRank, (count - 1u) / 2u);
      let rLo = k; let rHi = count - 1u - k; let rMed = count / 2u;
      for (var j = 0u; j < 4u; j++) {
        let s = li * 4u + j;
        let e = cum + cs[j];
        if (rLo >= cum && rLo < e) { found[a * 3u] = edgeLo(s); }
        if (rHi >= cum && rHi < e) { found[a * 3u + 1u] = edgeHi(s); }
        if (rMed >= cum && rMed < e) { found[a * 3u + 2u] = 0.5 * (edgeLo(s) + edgeHi(s)); }
        cum = e;
      }
    }
    for (var j = 0u; j < 4u; j++) { bs[base + j] = 0u; }
    workgroupBarrier();
  }
  if (li == 0u) {
    if (total > 0u) {
      let bbMin = vec2f(fdec(bs[0]), fdec(bs[1]));
      let bbMax = vec2f(fdec(bs[2]), fdec(bs[3]));
      let c = vec2f(bitcast<f32>(bs[8]), bitcast<f32>(bs[9]));
      let qLo = c + vec2f(found[0], found[3]);
      let qHi = c + vec2f(found[1], found[4]);
      let margin = vec2f(0.25 * max(qHi.x - qLo.x, qHi.y - qLo.y));
      let lo = max(bbMin, qLo - margin);
      let hi = min(bbMax, qHi + margin);
      let side = max(max(hi.x - lo.x, hi.y - lo.y) * 1.0001, 1e-3);
      let o = 0.5 * (lo + hi) - vec2f(0.5 * side);
      bs[4] = bitcast<u32>(o.x); bs[5] = bitcast<u32>(o.y);
      bs[6] = bitcast<u32>(side); bs[7] = bitcast<u32>(f32(P.G) / side);
      bs[8] = bitcast<u32>(c.x + found[2]); bs[9] = bitcast<u32>(c.y + found[5]);
      bs[10] = bitcast<u32>(max(bbMax.x - bbMin.x, bbMax.y - bbMin.y));
    }
    bs[0] = 0xffffffffu; bs[1] = 0xffffffffu; bs[2] = 0u; bs[3] = 0u;
  }
}`;

const BIN = COMMON + /* wgsl */`
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> pos: array<vec2f>;
@group(0) @binding(2) var<storage, read> bs: array<u32>;
@group(0) @binding(3) var<storage, read_write> cellCount: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> nodeCell: array<u32>;
@group(0) @binding(5) var<storage, read_write> nodeSlot: array<u32>;
@compute @workgroup_size(${WG$3})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= P.n) { return; }
  let o = vec2f(bitcast<f32>(bs[4]), bitcast<f32>(bs[5]));
  let q = (pos[i] - o) * bitcast<f32>(bs[7]);
  let gmax = f32(P.G - 1u);
  let g = clamp(floor(q), vec2f(0.0), vec2f(gmax));
  // outside the box (by more than half a cell): clamped into a border cell
  let inside = all(q > vec2f(-0.5)) && all(q < vec2f(gmax + 1.5));
  let c = morton(u32(g.x), u32(g.y));
  nodeCell[i] = c | select(0x80000000u, 0u, inside);
  nodeSlot[i] = atomicAdd(&cellCount[c], 1u);
}`;

// Exclusive scan of cellCount (nCells = 4^k >= 1024) in blocks of 1024; zeroes the counts
// for the next step.
const SCAN_BLOCKS = /* wgsl */`
@group(0) @binding(0) var<storage, read_write> cnt: array<u32>;
@group(0) @binding(1) var<storage, read_write> start: array<u32>;
@group(0) @binding(2) var<storage, read_write> blockSums: array<u32>;
var<workgroup> tmp: array<u32, 256>;
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) li: u32, @builtin(workgroup_id) wid: vec3u) {
  let base = wid.x * 1024u + li * 4u;
  let a0 = cnt[base]; let a1 = cnt[base + 1u]; let a2 = cnt[base + 2u]; let a3 = cnt[base + 3u];
  cnt[base] = 0u; cnt[base + 1u] = 0u; cnt[base + 2u] = 0u; cnt[base + 3u] = 0u;
  let t = a0 + a1 + a2 + a3;
  tmp[li] = t;
  workgroupBarrier();
  for (var off = 1u; off < 256u; off <<= 1u) {
    var v = tmp[li];
    if (li >= off) { v += tmp[li - off]; }
    workgroupBarrier();
    tmp[li] = v;
    workgroupBarrier();
  }
  let ex = tmp[li] - t;
  start[base] = ex; start[base + 1u] = ex + a0; start[base + 2u] = ex + a0 + a1; start[base + 3u] = ex + a0 + a1 + a2;
  if (li == 255u) { blockSums[wid.x] = tmp[255]; }
}`;

const SCAN_TOP = /* wgsl */`
@group(0) @binding(0) var<storage, read_write> blockSums: array<u32>;
@group(0) @binding(1) var<uniform> nb: vec4u;
var<workgroup> tmp: array<u32, 256>;
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) li: u32) {
  let base = li * 4u;
  var a = vec4u(0u);
  for (var k = 0u; k < 4u; k++) { if (base + k < nb.x) { a[k] = blockSums[base + k]; } }
  let t = a.x + a.y + a.z + a.w;
  tmp[li] = t;
  workgroupBarrier();
  for (var off = 1u; off < 256u; off <<= 1u) {
    var v = tmp[li];
    if (li >= off) { v += tmp[li - off]; }
    workgroupBarrier();
    tmp[li] = v;
    workgroupBarrier();
  }
  var ex = tmp[li] - t;
  for (var k = 0u; k < 4u; k++) { if (base + k < nb.x) { blockSums[base + k] = ex; } ex += a[k]; }
}`;

const SCAN_ADD = /* wgsl */`
@group(0) @binding(0) var<storage, read_write> start: array<u32>;
@group(0) @binding(1) var<storage, read> blockSums: array<u32>;
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let e = gid.x;
  if (e >= arrayLength(&start)) { return; }
  start[e] += blockSums[e >> 10u];
}`;

// Counting sort, part 1: nodes in the (run-dependent) order of the atomic slots.
const PLACE = COMMON + /* wgsl */`
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> nodeCell: array<u32>;
@group(0) @binding(2) var<storage, read> nodeSlot: array<u32>;
@group(0) @binding(3) var<storage, read> start: array<u32>;
@group(0) @binding(4) var<storage, read_write> slotted: array<u32>;
@compute @workgroup_size(${WG$3})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= P.n) { return; }
  slotted[start[nodeCell[i] & 0x7fffffffu] + nodeSlot[i]] = i;
}`;

// Part 2: within a cell, nodes go in index order, so sums run in the same order every time
// and the layout is deterministic. sp[k] = (x, y, mass, cell + 0.5), negated when the node is
// outside the box.
const ORDER = COMMON + /* wgsl */`
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> pos: array<vec2f>;
@group(0) @binding(2) var<storage, read> mass: array<f32>;
@group(0) @binding(3) var<storage, read> nodeCell: array<u32>;
@group(0) @binding(4) var<storage, read> nodeSlot: array<u32>;
@group(0) @binding(5) var<storage, read> start: array<u32>;
@group(0) @binding(6) var<storage, read> slotted: array<u32>;
@group(0) @binding(7) var<storage, read_write> sp: array<vec4f>;
@group(0) @binding(8) var<storage, read_write> perm: array<u32>;
@compute @workgroup_size(${WG$3})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= P.n) { return; }
  let raw = nodeCell[i];
  let c = raw & 0x7fffffffu;
  let s = start[c];
  let e = select(P.n, start[c + 1u], c + 1u < P.nCells);
  var rank = nodeSlot[i];
  if (e - s <= 1024u) { // a pathologically full cell keeps the atomic order
    rank = 0u;
    for (var t = s; t < e; t++) { if (slotted[t] < i) { rank++; } }
  }
  let k = s + rank;
  let w = f32(c) + 0.5;
  sp[k] = vec4f(pos[i], mass[i], select(-w, w, raw == c));
  perm[k] = i;
}`;

// Springs in fixed chunks of edges, one thread per chunk; nodes add up their chunks later.
const SPRINGS = COMMON + /* wgsl */`
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> chunks: array<vec2u>; // (row, first edge)
@group(0) @binding(2) var<storage, read> csr: array<u32>;      // [rowStart (n + 1), neighbors]
@group(0) @binding(3) var<storage, read> pos: array<vec2f>;
@group(0) @binding(4) var<storage, read_write> springF: array<vec2f>;
@compute @workgroup_size(${WG$3})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let t = gid.x;
  if (t >= P.nChunks) { return; }
  let ch = chunks[t];
  let i = ch.x;
  let eEnd = min(ch.y + P.springChunk, csr[i + 1u]);
  let p = pos[i];
  var f = vec2f(0.0);
  for (var e = ch.y; e < eEnd; e++) {
    let j = csr[P.n + 1u + e];
    var d = pos[j] - p;
    var r = length(d);
    if (r == 0.0) { d = jitter(i, j); r = length(d); }
    f += (P.springK * (r - P.springLength) / r) * d;
  }
  springF[t] = f;
}`;

// cells = [pyramid: (mass, centre of mass, count) per cell of every level | local expansions]
const AGG0 = COMMON + /* wgsl */`
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> start: array<u32>;
@group(0) @binding(2) var<storage, read> sp: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> cells: array<vec4f>;
@compute @workgroup_size(${WG$3})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let c = gid.x;
  if (c >= P.nCells) { return; }
  let s = start[c];
  let e = select(P.n, start[c + 1u], c + 1u < P.nCells);
  var m = 0.0; var com = vec2f(0.0);
  for (var t = s; t < e; t++) { let q = sp[t]; m += q.z; com += q.z * q.xy; }
  if (m > 0.0) { com /= m; }
  cells[c] = vec4f(m, com, f32(e - s));
}`;

const PYR = /* wgsl */`
struct L { count: u32, childOff: u32, parentOff: u32, pad: u32 };
@group(0) @binding(0) var<uniform> lv: L;
@group(0) @binding(1) var<storage, read_write> cells: array<vec4f>;
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let q = gid.x;
  if (q >= lv.count) { return; }
  var m = 0.0; var com = vec2f(0.0); var cn = 0.0;
  for (var k = 0u; k < 4u; k++) {
    let c = cells[lv.childOff + 4u * q + k];
    m += c.x; com += c.x * c.yz; cn += c.w;
  }
  if (m > 0.0) { com /= m; }
  cells[lv.parentOff + q] = vec4f(m, com, cn);
}`;

// Every non-empty cell receives the far field of its interaction list (children of the
// parent's 3x3 that are not in my 3x3) once, at its centre, as field + 2x2 Jacobian.
const LOCAL = law => withLaw(COMMON, law) + /* wgsl */`
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> bs: array<u32>;
@group(0) @binding(2) var<storage, read_write> cells: array<vec4f>;
@compute @workgroup_size(${WG$3})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let t = gid.x;
  var off = 0u; var Gl = P.G; var l = 0u;
  loop {
    if (l >= P.K) { return; }
    if (t < off + Gl * Gl) { break; }
    off += Gl * Gl; Gl >>= 1u; l++;
  }
  let c = t - off;
  let me = cells[off + c];
  if (me.x == 0.0) { return; }${law ? '\n  ' + lawPrologue(law, lawValue) : ''}
  let o = vec2f(bitcast<f32>(bs[4]), bitcast<f32>(bs[5]));
  let w = bitcast<f32>(bs[6]) / f32(Gl);
  let xl = i32(compact1by1(c)); let yl = i32(compact1by1(c >> 1u));
  let center = o + (vec2f(f32(xl), f32(yl)) + 0.5) * w;
  let Gi = i32(Gl);
  let px = xl >> 1u; let py = yl >> 1u;
  let x0 = max(2 * px - 2, 0); let x1 = min(2 * px + 3, Gi - 1);
  let y0 = max(2 * py - 2, 0); let y1 = min(2 * py + 3, Gi - 1);
  var F = vec2f(0.0); var jxx = 0.0; var jxy = 0.0; var jyy = 0.0;
  for (var y = y0; y <= y1; y++) {
    for (var x = x0; x <= x1; x++) {
      if (abs(x - xl) <= 1 && abs(y - yl) <= 1) { continue; }
      let cell = cells[off + morton(u32(x), u32(y))];
      if (cell.x > 0.0) {
        let d = cell.yz - center;
        let r2 = dot(d, d);${law ? `
        if (${inRange(law, 'r2')}) {
          let r = sqrt(r2);
          ${emitLaw(law, 2, 'r', 'k1', 'k2')}
          let g = P.gravity * cell.x;
          F += (g * k1) * d;
          // d/dp of gravity M k1(r) (q - p) = gravity M (k2 d d^T - k1 I)
          jxx += g * (k2 * d.x * d.x - k1);
          jxy += g * (k2 * d.x * d.y);
          jyy += g * (k2 * d.y * d.y - k1);
        }` : `
        let ir2 = 1.0 / r2;
        let g = P.gravity * cell.x * ir2 * sqrt(ir2); // gravity M / r^3
        F += g * d;
        // d/dp of gravity M (q - p) / |q - p|^3 = gravity M (3 d d^T / r^5 - I / r^3)
        jxx += g * (3.0 * d.x * d.x * ir2 - 1.0);
        jxy += g * (3.0 * d.x * d.y * ir2);
        jyy += g * (3.0 * d.y * d.y * ir2 - 1.0);`}
      }
    }
  }
  cells[P.locOff + 2u * t] = vec4f(F, jxx, jxy);
  cells[P.locOff + 2u * t + 1u] = vec4f(jyy, center, 0.0);
}`;

// One thread per node, in cell order. Euler integrates here; FIRE stores the force in
// vel[n + i] for the FIRE passes.
const FORCE = law => withLaw(COMMON, law) + /* wgsl */`
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> sp: array<vec4f>;
@group(0) @binding(2) var<storage, read> perm: array<u32>;
@group(0) @binding(3) var<storage, read> start: array<u32>;
@group(0) @binding(4) var<storage, read> cells: array<vec4f>;
@group(0) @binding(5) var<storage, read> springF: array<vec2f>;
@group(0) @binding(6) var<storage, read> rowChunk: array<u32>; // first chunk of each row (n + 1)
@group(0) @binding(7) var<storage, read_write> pos: array<vec2f>;
// [0, n): (velocity, 0, pinned); [n, 2n): (force, 0, 0) for FIRE
@group(0) @binding(8) var<storage, read_write> vel: array<vec4f>;

@compute @workgroup_size(${WG$3})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let k = gid.x;
  if (k >= P.n) { return; }
  let i = perm[k];
  let me = sp[k];
  let p = me.xy; let mi = me.z;
  let c = u32(abs(me.w));
  let cx = i32(compact1by1(c)); let cy = i32(compact1by1(c >> 1u));
  let Gi = i32(P.G);
  var f = vec2f(0.0);${law ? '\n  ' + lawPrologue(law, lawValue) : ''}

  // near field: exact pairs in my 3x3 cells (strided with weights in overfull cells)
  for (var dy = -1; dy <= 1; dy++) {
    let y = cy + dy;
    if (y < 0 || y >= Gi) { continue; }
    for (var dx = -1; dx <= 1; dx++) {
      let x = cx + dx;
      if (x < 0 || x >= Gi) { continue; }
      let mc = morton(u32(x), u32(y));
      let s = start[mc];
      let e = select(P.n, start[mc + 1u], mc + 1u < P.nCells);
      let n = e - s;
      var stride = 1u;
      if (n > P.nearCap) { stride = (n + P.nearCap - 1u) / P.nearCap; }
      let w = f32(stride);
      for (var t = s; t < e; t += stride) {
        if (t == k) { continue; }
        let q = sp[t];
        var d = q.xy - p;
        var r2 = dot(d, d);
        if (r2 == 0.0) { d = jitter(i, perm[t]); r2 = dot(d, d); }
        ${law ? `${law.hasRange ? `if (r2 > lawRange2) { continue; }
        ` : ''}let r = sqrt(r2);
        ${emitLaw(law, 2, 'r', 'k1')}
        f += (P.gravity * mi * q.z * w * k1) * d;` : `let r = sqrt(r2);
        f += (P.gravity * mi * q.z * w / (r2 * r)) * d;`}
      }
    }
  }

  var ff = vec2f(0.0);
  if (me.w > 0.0) {
    // far field: local expansions down my chain of parent cells
    var off = 0u; var Gl = P.G; var cc = c;
    for (var l = 0u; l < P.K; l++) {
      let a = cells[P.locOff + 2u * (off + cc)]; let b = cells[P.locOff + 2u * (off + cc) + 1u];
      let dp = p - b.yz;
      ff += a.xy + vec2f(a.z * dp.x + a.w * dp.y, a.w * dp.x + b.x * dp.y);
      off += Gl * Gl; Gl >>= 1u; cc >>= 2u;
    }
  } else {
    // clamped into a border cell: monopoles of the interaction lists at my real position
    var off = 0u; var Gl = Gi;
    for (var l = 0u; l < P.K; l++) {
      let xl = cx >> l; let yl = cy >> l;
      let px = xl >> 1u; let py = yl >> 1u;
      let x0 = max(2 * px - 2, 0); let x1 = min(2 * px + 3, Gl - 1);
      let y0 = max(2 * py - 2, 0); let y1 = min(2 * py + 3, Gl - 1);
      for (var y = y0; y <= y1; y++) {
        for (var x = x0; x <= x1; x++) {
          if (abs(x - xl) <= 1 && abs(y - yl) <= 1) { continue; }
          let cell = cells[off + morton(u32(x), u32(y))];
          if (cell.x > 0.0) {
            let d = cell.yz - p;
            let r2 = dot(d, d);
            ${law ? `if (r2 > 0.0 && ${inRange(law, 'r2')}) {
              let r = sqrt(r2);
              ${emitLaw(law, 2, 'r', 'm1')}
              ff += (P.gravity * cell.x * m1) * d;
            }` : 'if (r2 > 0.0) { ff += (P.gravity * cell.x / (r2 * sqrt(r2))) * d; }'}
          }
        }
      }
      off += u32(Gl * Gl);
      Gl = Gl >> 1u;
    }
  }
  f += mi * ff;

  for (var t = rowChunk[i]; t < rowChunk[i + 1u]; t++) { f += springF[t]; }

  let v4 = vel[i];
  if (v4.w != 0.0) { return; } // pinned
  if (P.integrator == 1u) { vel[P.n + i] = vec4f(f, 0.0, 0.0); return; }
  var v = v4.xy;
  f -= P.drag * v;
  v += (P.dt / mi) * f;
  let vl = length(v);
  if (vl > P.maxV) { v *= P.maxV / vl; }
  vel[i] = vec4f(v, 0.0, 0.0);
  pos[i] = p + P.dt * v;
}`;

// FIRE, pass 1: per-workgroup partial sums of (F.v, |v|^2, |F|^2) over non-pinned nodes.
const FIRE_REDUCE = COMMON + /* wgsl */`
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> vel: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> fire: array<vec4f>; // [0]: state, [1 + w]: partials
var<workgroup> red: array<vec4f, ${WG$3}>;
@compute @workgroup_size(${WG$3})
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_index) li: u32,
        @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
  var acc = vec4f(0.0);
  for (var i = gid.x; i < P.n; i += nwg.x * ${WG$3}u) {
    let v4 = vel[i];
    if (v4.w != 0.0) { continue; }
    let f = vel[P.n + i].xy;
    acc += vec4f(dot(f, v4.xy), dot(v4.xy, v4.xy), dot(f, f), 0.0);
  }
  red[li] = acc;
  workgroupBarrier();
  for (var s = ${WG$3 / 2}u; s > 0u; s >>= 1u) {
    if (li < s) { red[li] += red[li + s]; }
    workgroupBarrier();
  }
  if (li == 0u) { fire[1u + wid.x] = red[0]; }
}`;

// FIRE, pass 2 (one workgroup): total power -> mixing coefficients and the (a, npos) update.
// fire[0] = (a, npos, cv, cf): this step uses v = cv v + cf F.
const FIRE_STATE = /* wgsl */`
struct FireParams { groups: u32, pad0: u32, pad1: u32, pad2: u32 };
@group(0) @binding(0) var<uniform> FP: FireParams;
@group(0) @binding(1) var<storage, read_write> fire: array<vec4f>;
var<workgroup> red: array<vec4f, ${WG$3}>;
@compute @workgroup_size(${WG$3})
fn main(@builtin(local_invocation_index) li: u32) {
  var acc = vec4f(0.0);
  for (var w = li; w < FP.groups; w += ${WG$3}u) { acc += fire[1u + w]; }
  red[li] = acc;
  workgroupBarrier();
  for (var s = ${WG$3 / 2}u; s > 0u; s >>= 1u) {
    if (li < s) { red[li] += red[li + s]; }
    workgroupBarrier();
  }
  if (li == 0u) {
    let sum = red[0];
    let st = fire[0];
    let a = st.x;
    if (sum.x > 0.0) {
      var cf = 0.0;
      if (sum.z > 0.0) { cf = a * sqrt(sum.y) / sqrt(sum.z); }
      let npos = st.y + 1.0;
      fire[0] = vec4f(select(a, a * 0.99, npos > 5.0), npos, 1.0 - a, cf);
    } else {
      fire[0] = vec4f(0.1, 0.0, 0.0, 0.0);
    }
  }
}`;

// FIRE, pass 3: mix, then the same Euler update without drag.
const FIRE_INTEGRATE = COMMON + /* wgsl */`
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> pos: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> vel: array<vec4f>;
@group(0) @binding(3) var<storage, read> mass: array<f32>;
@group(0) @binding(4) var<storage, read> fire: array<vec4f>;
@compute @workgroup_size(${WG$3})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= P.n) { return; }
  let v4 = vel[i];
  if (v4.w != 0.0) { return; }
  let st = fire[0];
  let f = vel[P.n + i].xy;
  var v = st.z * v4.xy + st.w * f;
  v += (P.dt / mass[i]) * f;
  let vl = length(v);
  if (vl > P.maxV) { v *= P.maxV / vl; }
  vel[i] = vec4f(v, 0.0, 0.0);
  pos[i] = pos[i] + P.dt * v;
}`;

// A law's numbers (see writeLawValues in ../wgsl/print.js) follow the 16 words of Params
const LAW_VALUES = 16;

function withLaw(common, law) {
  if (!law) return common;
  if (lawValueCount(law) > LAW_VALUES) throw new Error(`The GPU takes laws with up to ${LAW_VALUES} numbers`);
  return common.replace('locOff: u32,\n};', `locOff: u32,\n  law: array<vec4f, ${LAW_VALUES / 4}>,\n};`);
}

function lawValue(i) {
  return `P.law[${i >> 2}].${'xyzw'[i & 3]}`;
}

function inRange(law, r2) {
  return law.hasRange ? `${r2} <= lawRange2` : 'true';
}

const SHADERS = { HIST, BOX, BIN, SCAN_BLOCKS, SCAN_TOP, SCAN_ADD, PLACE, ORDER, SPRINGS, AGG0, PYR, FIRE_REDUCE, FIRE_STATE, FIRE_INTEGRATE };
// Shaders that depend on the repulsion law
const LAW_SHADERS = { LOCAL, FORCE };
// The law-variant layouts of LOCAL and FORCE: the same WGSL, with P at a dynamic offset into a
// ring of per-step copies (see run())
const VARIANT_BINDINGS = {
  LOCAL: ['dynamic', 'read', 'storage'],
  FORCE: ['dynamic', 'read', 'read', 'read', 'read', 'read', 'read', 'storage', 'storage'],
};
// The stages of the step each kernel computes, for error reports
const KERNEL_STAGES = {
  HIST: ['repulsion'], BOX: ['repulsion'], BIN: ['repulsion'], SCAN_BLOCKS: ['repulsion'], SCAN_TOP: ['repulsion'],
  SCAN_ADD: ['repulsion'], PLACE: ['repulsion'], ORDER: ['repulsion'], AGG0: ['repulsion'], PYR: ['repulsion'],
  LOCAL: ['repulsion'], SPRINGS: ['springs'], FORCE: ['clear', 'repulsion', 'drag', 'springs', 'integrate'],
  FIRE_REDUCE: ['integrate'], FIRE_STATE: ['integrate'], FIRE_INTEGRATE: ['integrate'],
};
// Bytes per slot of the per-step ring (the uniform offset alignment)
const SLOT = 256;

function chooseGrid$1(n) {
  let G = 32;
  while (G * G * 2 < n && G < 1024) G *= 2;
  return G;
}

/**
 * Sizes in bytes of the buffers a grid engine allocates for `n` bodies and `edges` links, by
 * name (`chunks`: spring chunks, at most n + edges / 4 when not given). check.js measures them
 * against the device's limits with the same numbers.
 */
function gridBuffers(n, edges, chunks) {
  const nChunks = chunks === undefined ? n + Math.ceil(edges / 4) : chunks;
  const G = chooseGrid$1(n), K = Math.log2(G), nCells = G * G;
  let pyrSize = 0, last = 0;
  for (let l = 0, g = G; l <= K; l++, g >>= 1) { last = pyrSize; pyrSize += g * g; }
  const size = bytes => Math.max(16, Math.ceil(bytes / 16) * 16);
  return {
    pos: size(n * 8), vel: size(n * 32), mass: size(n * 4), csr: size((n + 1 + 2 * edges) * 4),
    chunks: size(Math.max(2, 2 * nChunks) * 4), rowChunk: size((n + 1) * 4), springF: size(Math.max(1, nChunks) * 8),
    cellCount: size(nCells * 4), start: size(nCells * 4), blockSums: size(Math.max(nCells / 1024, 4) * 4),
    nodeCell: size(n * 4), nodeSlot: size(n * 4), slotted: size(n * 4), perm: size(n * 4), sp: size(n * 16),
    cells: size((pyrSize + 2 * last) * 16), fire: size((1 + FIRE_GROUPS) * 16), box: size((BOX_HEADER + 2 * HIST_BINS$1) * 4),
  };
}

/**
 * Compiles the template's pipelines for `law` (null for 1/r^2), in parallel. With `variants`,
 * also LOCAL and FORCE with P at a dynamic offset, for laws whose numbers change within a batch.
 */
async function gridPipelines(device, law, variants) {
  const jobs = [];
  for (const [name, code] of Object.entries(SHADERS)) jobs.push([name, getPipeline(device, { code, label: name })]);
  for (const [name, make] of Object.entries(LAW_SHADERS)) {
    const code = make(law);
    jobs.push([name, getPipeline(device, { code, label: name })]);
    if (variants) jobs.push([name + '_STEP', getPipeline(device, { code, label: name, bindings: VARIANT_BINDINGS[name] })]);
  }
  const pipelines = await Promise.all(jobs.map(job => job[1]));
  const out = {};
  jobs.forEach((job, i) => { out[job[0]] = pipelines[i]; });
  return out;
}

/**
 * @param {GPUDevice} device
 * @param {{n: number, edges: Uint32Array, init: Float32Array, mass: Float32Array, law?: object,
 *   variants?: boolean}} data
 *   init: 2n positions relative to the layout origin; edges: flat (from, to) pairs, no self-loops.
 *   law: a compiled repulsion law other than 1/r^2, or nothing. variants: build the per-step law
 *   pipelines too (see run()).
 * Resolves once the pipelines are compiled; rejects (naming the kernel) when one fails, or when
 * the buffers cannot be created.
 */
async function createGridEngine(device, { n, edges, init, mass, law = null, variants = false }) {
  const pipes = await gridPipelines(device, law, variants);
  const G = chooseGrid$1(n);
  const K = Math.log2(G);
  const nCells = G * G;
  const nBlocks = nCells / 1024;

  // CSR adjacency, split into chunks of SPRING_CHUNK edges
  const deg = new Uint32Array(n);
  for (let e = 0; e < edges.length; e += 2) { deg[edges[e]]++; deg[edges[e + 1]]++; }
  const csr = new Uint32Array(n + 1 + 2 * (edges.length / 2));
  for (let i = 0; i < n; i++) csr[i + 1] = csr[i] + deg[i];
  const fill = csr.slice(0, n);
  for (let e = 0; e < edges.length; e += 2) {
    const a = edges[e], b = edges[e + 1];
    csr[n + 1 + fill[a]++] = b; csr[n + 1 + fill[b]++] = a;
  }
  let nChunks = 0;
  for (let i = 0; i < n; i++) nChunks += Math.ceil(deg[i] / SPRING_CHUNK);
  const chunks = new Uint32Array(Math.max(2, 2 * nChunks));
  const rowChunk = new Uint32Array(n + 1);
  for (let i = 0, t = 0; i < n; i++) {
    rowChunk[i] = t;
    for (let e = csr[i]; e < csr[i + 1]; e += SPRING_CHUNK, t++) { chunks[2 * t] = i; chunks[2 * t + 1] = e; }
  }
  rowChunk[n] = nChunks;

  const sizes = gridBuffers(n, edges.length / 2, nChunks);
  const S = GPUBufferUsage.STORAGE, CD = GPUBufferUsage.COPY_DST, CS = GPUBufferUsage.COPY_SRC;
  const owned = [];
  device.pushErrorScope('validation');
  device.pushErrorScope('out-of-memory');
  const buf = (size, usage = S) => {
    const b = device.createBuffer({ size: Math.max(16, Math.ceil(size / 16) * 16), usage });
    owned.push(b);
    return b;
  };
  const upload = (data, usage = S | CD) => { const b = buf(data.byteLength, usage); device.queue.writeBuffer(b, 0, data); return b; };

  const pos = upload(init, S | CD | CS);
  const vel = buf(sizes.vel, S | CD | CS);
  const massB = upload(mass);
  const csrB = upload(csr);
  const chunksB = upload(chunks);
  const rowChunkB = upload(rowChunk);
  const springF = buf(sizes.springF);
  const cellCount = buf(sizes.cellCount, S | CD);
  const start = buf(sizes.start);
  const blockSums = buf(sizes.blockSums);
  const nodeCell = buf(sizes.nodeCell), nodeSlot = buf(sizes.nodeSlot), slotted = buf(sizes.slotted), perm = buf(sizes.perm);
  const sp = buf(sizes.sp);
  let pyrSize = 0; const levelOff = [];
  for (let l = 0, g = G; l <= K; l++, g >>= 1) { levelOff.push(pyrSize); pyrSize += g * g; }
  const cells = buf(sizes.cells);
  const fireB = buf(sizes.fire, S | CD | CS);
  const fireGroups = Math.min(FIRE_GROUPS, Math.ceil(n / WG$3));

  // Box state: start from the bounding box of the initial positions, histogram centre at the origin.
  const boxInit = new Uint32Array(BOX_HEADER + 2 * HIST_BINS$1);
  const boxF = new Float32Array(boxInit.buffer);
  {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = init[2 * i], y = init[2 * i + 1];
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const side = Math.max(maxX - minX, maxY - minY, 1e-3) * 1.0001;
    boxF[4] = (minX + maxX - side) / 2; boxF[5] = (minY + maxY - side) / 2; boxF[6] = side; boxF[7] = G / side;
    boxInit[0] = boxInit[1] = 0xffffffff;
  }
  const boxB = upload(boxInit, S | CD | CS);

  const paramSize = law ? 64 + 4 * LAW_VALUES : 64;
  const paramBuf = new ArrayBuffer(paramSize);
  const pu = new Uint32Array(paramBuf), pf = new Float32Array(paramBuf);
  pu[0] = n; pu[1] = G; pu[2] = K; pu[3] = nCells;
  pu[10] = NEAR_CAP$1; pu[12] = SPRING_CHUNK; pu[13] = Math.max(1, Math.floor(n / 1000));
  pu[14] = nChunks; pu[15] = pyrSize;
  const params = buf(paramSize, GPUBufferUsage.UNIFORM | CD);
  const nbU = upload(new Uint32Array([nBlocks, 0, 0, 0]), GPUBufferUsage.UNIFORM | CD);
  const fireU = upload(new Uint32Array([fireGroups, 0, 0, 0]), GPUBufferUsage.UNIFORM | CD);

  const bind = (p, list) => device.createBindGroup({
    layout: p.getBindGroupLayout(0),
    entries: list.map((b, i) => ({ binding: i, resource: { buffer: b } })),
  });
  const g = {
    HIST: bind(pipes.HIST, [params, pos, boxB]),
    BOX: bind(pipes.BOX, [params, boxB]),
    BIN: bind(pipes.BIN, [params, pos, boxB, cellCount, nodeCell, nodeSlot]),
    SCAN_BLOCKS: bind(pipes.SCAN_BLOCKS, [cellCount, start, blockSums]),
    SCAN_TOP: bind(pipes.SCAN_TOP, [blockSums, nbU]),
    SCAN_ADD: bind(pipes.SCAN_ADD, [start, blockSums]),
    PLACE: bind(pipes.PLACE, [params, nodeCell, nodeSlot, start, slotted]),
    ORDER: bind(pipes.ORDER, [params, pos, massB, nodeCell, nodeSlot, start, slotted, sp, perm]),
    SPRINGS: bind(pipes.SPRINGS, [params, chunksB, csrB, pos, springF]),
    AGG0: bind(pipes.AGG0, [params, start, sp, cells]),
    LOCAL: bind(pipes.LOCAL, [params, boxB, cells]),
    FORCE: bind(pipes.FORCE, [params, sp, perm, start, cells, springF, rowChunkB, pos, vel]),
    FIRE_REDUCE: bind(pipes.FIRE_REDUCE, [params, vel, fireB]),
    FIRE_STATE: bind(pipes.FIRE_STATE, [fireU, fireB]),
    FIRE_INTEGRATE: bind(pipes.FIRE_INTEGRATE, [params, pos, vel, massB, fireB]),
  };
  const pyrGroups = [];
  for (let l = 0; l < K; l++) {
    const count = (G >> (l + 1)) ** 2;
    const u = upload(new Uint32Array([count, levelOff[l], levelOff[l + 1], 0]), GPUBufferUsage.UNIFORM | CD);
    pyrGroups.push({ count, group: bind(pipes.PYR, [u, cells]) });
  }
  const errors = await Promise.all([device.popErrorScope(), device.popErrorScope()]);
  const setupError = errors.find(Boolean);
  if (setupError) {
    owned.forEach(b => b.destroy());
    throw new Error('could not create the GPU buffers: ' + setupError.message);
  }

  // The law-variant pipelines read P from a ring of per-step copies, one slot per step of a submit
  let ring = null, ringGroups = null, ringSlots = 0, ringData = null;
  function growRing(slots) {
    if (ring) ring.destroy();
    ringSlots = Math.max(64, slots);
    ring = device.createBuffer({ size: ringSlots * SLOT, usage: GPUBufferUsage.UNIFORM | CD });
    ringData = new ArrayBuffer(ringSlots * SLOT);
    const entry = { buffer: ring, size: paramSize };
    ringGroups = {
      LOCAL: device.createBindGroup({ layout: pipes.LOCAL_STEP.getBindGroupLayout(0), entries: [
        { binding: 0, resource: entry }, { binding: 1, resource: { buffer: boxB } }, { binding: 2, resource: { buffer: cells } }] }),
      FORCE: device.createBindGroup({ layout: pipes.FORCE_STEP.getBindGroupLayout(0), entries: [entry].concat(
        [sp, perm, start, cells, springF, rowChunkB, pos, vel].map(buffer => ({ buffer }))).map((resource, i) => ({ binding: i, resource })) }),
    };
  }

  const nodeGroups = Math.ceil(n / WG$3);
  const histGroups = Math.min(nodeGroups, 128);
  let fireMode = false;

  function setFire(state) { device.queue.writeBuffer(fireB, 0, new Float32Array(state || [0.1, 0, 0, 0])); }
  function resetFire() { setFire(null); }
  resetFire();

  function dispatch(cp, name, groups) {
    cp.setPipeline(pipes[name]); cp.setBindGroup(0, g[name]); cp.dispatchWorkgroups(groups);
  }

  // `slot`: the step's copy of P in the ring for LOCAL and FORCE, or -1 for the static P
  function encodeStep(cp, slot) {
    dispatch(cp, 'HIST', histGroups);
    dispatch(cp, 'BOX', 1);
    dispatch(cp, 'BIN', nodeGroups);
    dispatch(cp, 'SCAN_BLOCKS', nBlocks);
    dispatch(cp, 'SCAN_TOP', 1);
    dispatch(cp, 'SCAN_ADD', Math.ceil(nCells / 256));
    dispatch(cp, 'PLACE', nodeGroups);
    dispatch(cp, 'ORDER', nodeGroups);
    if (nChunks) dispatch(cp, 'SPRINGS', Math.ceil(nChunks / WG$3));
    dispatch(cp, 'AGG0', Math.ceil(nCells / WG$3));
    cp.setPipeline(pipes.PYR);
    for (const { count, group } of pyrGroups) { cp.setBindGroup(0, group); cp.dispatchWorkgroups(Math.ceil(count / 256)); }
    if (slot < 0) {
      dispatch(cp, 'LOCAL', Math.ceil(levelOff[K] / WG$3));
      dispatch(cp, 'FORCE', nodeGroups);
    } else {
      const offset = [slot * SLOT];
      cp.setPipeline(pipes.LOCAL_STEP); cp.setBindGroup(0, ringGroups.LOCAL, offset); cp.dispatchWorkgroups(Math.ceil(levelOff[K] / WG$3));
      cp.setPipeline(pipes.FORCE_STEP); cp.setBindGroup(0, ringGroups.FORCE, offset); cp.dispatchWorkgroups(nodeGroups);
    }
    if (fireMode) {
      dispatch(cp, 'FIRE_REDUCE', fireGroups);
      dispatch(cp, 'FIRE_STATE', 1);
      dispatch(cp, 'FIRE_INTEGRATE', nodeGroups);
    }
  }

  return {
    kind: 'grid',
    G,
    pos,
    vel,
    mass: massB,
    fire: fireB,
    variants,
    setParams(s) {
      pf[4] = s.gravity; pf[5] = s.springLength; pf[6] = s.springCoefficient; pf[7] = s.dragCoefficient;
      pf[8] = s.timeStep; pf[9] = s.maxVelocity; pu[11] = s.integrator === 'fire' ? 1 : 0;
      fireMode = pu[11] === 1;
      device.queue.writeBuffer(params, 0, paramBuf);
    },
    // The law's numbers for the next steps (see writeLawValues in ../wgsl/print.js)
    setLawValues(values) {
      pf.set(values, 16);
      device.queue.writeBuffer(params, 64, paramBuf, 64);
    },
    resetFire,
    setFire,
    // Encodes `count` steps, `perSubmit` (64) per compute pass and submit.
    //  - timestampWrites: {querySet}, written at the start of the first pass and the end of the last;
    //  - beforeFinish(encoder) runs on the last encoder, so callers can append copies;
    //  - lawSteps(s, out, offset): writes the law's numbers of step s of this call into `out`; the
    //    steps then run the law-variant pipelines, each with its own copy of P.
    run(count, { timestampWrites = null, beforeFinish = null, perSubmit = 64, lawSteps = null } = {}) {
      if (lawSteps && !variants) throw new Error('this engine was built without per-step law values');
      for (let done = 0; done < count;) {
        const c = Math.min(perSubmit, count - done);
        if (lawSteps) {
          if (c > ringSlots) growRing(c);
          const bytes = new Uint8Array(paramBuf);
          const slots = new Uint8Array(ringData);
          for (let s = 0; s < c; s++) {
            slots.set(bytes, s * SLOT);
            lawSteps(done + s, new Float32Array(ringData, s * SLOT, paramSize / 4), 16);
          }
          device.queue.writeBuffer(ring, 0, ringData, 0, c * SLOT);
        }
        const enc = device.createCommandEncoder();
        const first = done === 0, last = done + c === count;
        let tw;
        if (timestampWrites && (first || last)) {
          tw = { querySet: timestampWrites.querySet };
          if (first) tw.beginningOfPassWriteIndex = 0;
          if (last) tw.endOfPassWriteIndex = 1;
        }
        const cp = enc.beginComputePass(tw ? { timestampWrites: tw } : undefined);
        for (let s = 0; s < c; s++) encodeStep(cp, lawSteps ? s : -1);
        cp.end();
        if (last && beforeFinish) beforeFinish(enc);
        device.queue.submit([enc.finish()]);
        done += c;
      }
    },
    // Debug: the box state (grid box, bounding box side, histogram centre).
    boxBuffer: boxB,
    destroy() {
      for (const b of owned) b.destroy();
      if (ring) ring.destroy();
    },
  };
}

// For checks: the WGSL of every shader for a law (null for 1/r^2)
function shaderCode(law = null) {
  const code = Object.assign({}, SHADERS);
  for (const [name, make] of Object.entries(LAW_SHADERS)) code[name] = make(law);
  return code;
}

// WGSL of the grid field (design 6.7 and 9.2): the GPU version of modules/gridfield, with the
// same grid and the same numbers. One step:
//
//   MINMAX: smallest and largest position per axis (integer atomics on order-preserving bits), and
//     the largest |deposit value| when that reads columns
//   PARAMS: one thread; the grid's corner, cell and sizes as the CPU module computes them, the
//     sizes of the indirect dispatches, and the smoothing's coefficients (kept while they last)
//   BIN, SCAN x2, ORDER: a counting sort of the bodies by base cell (within a cell, in the order
//     the atomic counter gave them). ORDER lists the bodies of crowded cells, those with more than
//     CROWD bodies, in chunks of CROWD
//   CROWD: a thread per chunk adds its bodies' weights at their cell's 2^D or 3^D grid points, then
//     adds each total to that point's 64-bit sum with integer atomics (no workgroups when no cell
//     is crowded)
//   DEPOSIT: a thread per grid point gathers the bodies of the 2^D or 3^D base cells around it,
//     less crowded cells, and takes CROWD's sum where it has one: along x those cells are
//     neighbours in the sorted order, so each stencil row is one run. A thread so sums at most
//     3^D x CROWD bodies. (Gathering crowded cells too cost 13 ms a step at megaStars' start at
//     100k, 23,946 bodies in a cell, and 158 ms at a 1M pile-up. A thread per body adding with
//     atomics cost 2.8x the gather on relaxed layouts with hubs, its atomics queueing on busy
//     points.) Both add in 64-bit fixed point: integer sums are the same bits in any order, so the
//     deposit repeats exactly.
//   SMOOTH: one dispatch per axis, a line solve (Thomas) per grid line. Along x in 2D a workgroup
//     runs each line as a scan of affine maps; elsewhere a thread runs a line, loading 8 points
//     per wait (measured: one thread per line, a point per load, cost 0.28 of a 0.39 ms step)
//   RESIDUAL, SMOOTH again: from REFINE_GAMMA on, one step of iterative refinement keeps the
//     smoothed field in two words (gridField + gridLo), so slopes stay within 1e-6 of the CPU's
//     however far the smoothing reaches (see residual())
//   GATHER: a thread per body writes the value and gradient columns
//
// No float atomics anywhere, and no float sum whose order a race decides, so steps repeat exactly.
//
// Buffers owned here (the caller's are positions and the columns, through colRefs):
//   gridMeta  u32 words, see META; then the smoothing's coefficient tables (f32 bits)
//   gridCount bodies per grid cell (atomic; the scan zeroes it for the next step)
//   gridStart where each cell's bodies start in the sorted order, counted from its block of
//             2,048 cells (one more entry for the end), then where each block starts: readers add
//             the two (grid_start()), which saves a pass over every grid point
//   gridKey   per body: its cell and its slot in it, and its deposit value when that reads columns
//   gridSp    per sorted body: its offsets in its base cell per axis and that cell along x (and its
//             value, in 2D in the third word; in 3D in a second vec4)
//   gridChunk CROWD's indirect dispatch arguments, the count of chunks, then per chunk its first
//             sorted body and its cell
//   gridAcc   per grid point, CROWD's sum: [low word, high word] of a 64-bit integer (DEPOSIT reads
//             and clears it, so it is 0 between steps)
//   gridField the field, a density per grid point
//   gridLo    with smoothing: the deposit, then the residual, then the field's low word
const WG$2 = 256;
// Threads of a smoothing workgroup that runs one line per thread
const LINE_WG = 64;
// Bodies per block of the counting sort's scan
const SCAN_BLOCK = 2048;
// A cell with more bodies than this is crowded: CROWD adds its bodies, in chunks of this many
const CROWD = 64;
// Fixed-point units per unit of deposit (weight x value / the largest value): 2^30 a term, so a
// sum of up to 2^24 bodies fits 64 bits with room
const FIXED = 1073741824;

// Words of gridMeta
const META = {
  MIN: 0,        // D order-preserving keys
  MAX: 4,        // D keys
  K0: 8,         // lattice: the index of the grid's first point per axis (i32)
  SIZE: 12,      // grid points per axis
  CELL: 16,      // the cell, f32: CELL + CELL_LOW is the CPU's f64 cell to about 1e-14
  UNIT: 17,      // what one body deposits per unit weight: value / cell^D (or 1 / cell^D)
  TOTAL: 18,     // grid points in use
  FLAG: 19,      // this step: 0 ok, 1 lattice wider than maxCells, 2 no grid (field 0), 3 over capacity
  MA: 20,        // the anchor A = MA * cell + RA per axis (box: the grid's corner; lattice: -phase);
  RA: 24,        //   MA a whole number, both f32
  CELL_LOW: 27,
  VMAX: 28,      // the largest |deposit value| of the step (MINMAX), when it reads columns (f32 bits)
  SCALE: 29,     // fixed-point units per unit of weight x value: 2^30 / VMAX, or 2^30 (f32)
  BLOCKS: 35,    // blocks of the scan
  TAB_LAST: 30,  // last entry of the coefficient tables
  TAB_GAMMA: 31, // diffuse / cell^2 the tables hold (f32 bits)
  TAB_DONE: 32,  // entries they hold, or CONVERGED: entries past the last equal it
  ZERO: 33,      // always 0: grid_hold() in kernels without GU
  REFINE: 34,    // 1 when this step's smoothing takes the refinement step (see residual())
  STATUS: 36,    // sticky: [1 too wide | 3 over capacity, cells across (f32), cell (f32), axis]; then
                 //   this step's grid points (for the cost estimate, see build.js) and 3 spare words
  IND: 44,       // indirect dispatch arguments, 3 words each: scan blocks, deposit, smooth per axis, the
                 // residual, smooth per axis again (0 workgroups when the step does not refine)
  TABLE: 80,     // coefficient tables (see params()): 1 / pivot, then mu; tableSize entries each
};
const IND_SCAN = META.IND, IND_DEPOSIT = META.IND + 3, IND_SMOOTH = META.IND + 6;
const IND_RESIDUAL = META.IND + 15, IND_SMOOTH_LOW = META.IND + 18;
// Words of the status (META.STATUS) the runner reads back
const STATUS_WORDS = 8;
// Smoothing from this gamma (diffuse / cell^2) on takes the refinement step: below it the plain
// f32 field's values and slopes are within half the tolerance of the CPU's. Measured over every
// option in 2D and 3D, on small and full-size grids, and ru-4 on its graphs: at most 4.97e-6 of
// the RMS below gamma 2; 6.8e-6 at 2.5 (a 127^3 lattice), 6.3e-6 at 3 (977^2), 9.6e-6 at 16.
const REFINE_GAMMA = 2;
const CONVERGED = 0xffffffff;

function each$2(n, fn, sep = ' ') {
  const out = [];
  for (let k = 0; k < n; k++) out.push(fn(k));
  return out.join(sep);
}

/**
 * Smoothing per axis: 'scan' (a workgroup per line) along contiguous 2D lines, 'lines' (a thread
 * per line, batched loads) elsewhere. That mix measured fastest (gridproto/RESULTS.md, variant M).
 */
function smoothVariant(D, axis) {
  return D === 2 && axis === 0 ? 'scan' : 'lines';
}

/**
 * Words of the coefficient tables: a line is at most maxCells + 4 points (2 spare and the
 * quadratic stencil's padding)
 */
function tableSize(maxCells) {
  return maxCells + 8;
}

/**
 * Grid points the buffers hold: every grid that fits maxCells (2 spare points and the quadratic
 * stencil's padding per axis)
 */
function gridCapacity(D, maxCells) {
  return Math.ceil((Math.pow(maxCells + 4, D) + 1) / SCAN_BLOCK) * SCAN_BLOCK;
}

/**
 * Words of gridChunk for n bodies: a crowded cell of c bodies makes ceil(c / CROWD) chunks, so
 * there are at most n / CROWD + n / (CROWD + 1)
 */
function gridChunkWords(n) {
  return 4 + 4 * Math.ceil(n / CROWD);
}

/**
 * The kernels of one grid field: {NAME: {code, bindings}}, where `bindings` lists
 * {name, kind: 'uniform' | 'step' | 'read' | 'storage'} in binding order ('step' is the caller's
 * step values: a uniform, at a dynamic offset when the caller says so).
 *
 * spec: {D, anchor, weights, smooth, self, maxCells, capacity, label, pos, outputs: {value,
 * gradient}, deposit: null | {lines, code, buffers}, values: {decl(binding), at(name)}}.
 * colRefs (`pos`, outputs) are {buffer, at(row, axis)}; `deposit` is the per-body value printed
 * as WGSL of row `i`, reading the caller's `buffers`.
 */
function gridKernels(spec) {
  const { D, label } = spec;
  const k = {};
  k[`${label}_MINMAX`] = minmax(spec);
  k[`${label}_PARAMS`] = params(spec);
  k[`${label}_BIN`] = bin(spec);
  k[`${label}_SCAN_BLOCKS`] = scanBlocks(spec);
  k[`${label}_SCAN_TOP`] = scanTop(spec);
  k[`${label}_ORDER`] = order(spec);
  k[`${label}_CROWD`] = crowd(spec);
  k[`${label}_DEPOSIT`] = deposit(spec);
  if (spec.smooth) {
    for (let axis = 0; axis < D; axis++) k[`${label}_SMOOTH${axis}`] = smooth(spec, axis);
    k[`${label}_RESIDUAL`] = residual(spec);
  }
  k[`${label}_GATHER`] = gather(spec);
  return k;
}

// --- shared pieces ---------------------------------------------------------------------------

function quadratic(spec) {
  return spec.weights === 'quadratic';
}

// Words per body in gridKey, and vec4s per sorted body in gridSp
function keyWords(spec) {
  return spec.deposit ? 3 : 2;
}
function spWords(spec) {
  return spec.deposit && spec.D === 3 ? 2 : 1;
}

function common(spec) {
  const quad = quadratic(spec);
  return `struct GridU { n: u32, maxCells: u32, capacity: u32, tableSize: u32, zero: u32, unused0: u32, unused1: u32, unused2: u32 };
const GRID_PAD: i32 = ${quad ? 1 : 0};
fn grid_finite(x: f32) -> bool { return (bitcast<u32>(x) & 0x7f800000u) != 0x7f800000u; }
fn grid_enc(v: f32) -> u32 { let u = bitcast<u32>(v); return select(u | 0x80000000u, ~u, (u & 0x80000000u) != 0u); }
fn grid_dec(u: u32) -> f32 { return bitcast<f32>(select(~u, u & 0x7fffffffu, (u & 0x80000000u) != 0u)); }
${quad ? `// quadratic (triangular-shaped cloud) weights and slopes of the points at offset d of the base
fn grid_w(f: f32, d: i32) -> f32 {
  if (d < 0) { let t = 0.5 - f; return 0.5 * t * t; }
  if (d == 0) { return 0.75 - f * f; }
  let t = 0.5 + f; return 0.5 * t * t;
}
fn grid_s(f: f32, d: i32) -> f32 {
  if (d < 0) { return f - 0.5; }
  if (d == 0) { return -2.0 * f; }
  return 0.5 + f;
}` : `// linear (cloud-in-cell) weights and slopes of the points at offset d of the base
fn grid_w(f: f32, d: i32) -> f32 { return select(1.0 - f, f, d == 1); }
fn grid_s(f: f32, d: i32) -> f32 { return select(-1.0, 1.0, d == 1); }`}
`;
}

// Declarations of a kernel's bindings, in order
function declare(spec, bindings) {
  return bindings.map((b, index) => {
    if (b.kind === 'step') return spec.values.decl(index);
    if (b.kind === 'uniform') return `@group(0) @binding(${index}) var<uniform> ${b.name}: ${b.type};`;
    return `@group(0) @binding(${index}) var<storage, ${b.kind === 'read' ? 'read' : 'read_write'}> ${b.name}: ${b.type};`;
  }).join('\n');
}

// grid_opq(x) is x, in a way the compiler cannot see through (GU.zero is 0). Metal compiles with
// fast math, which reassociates sums: without it, the exact arithmetic below folds away.
const OPAQUE = 'fn grid_opq(x: f32) -> f32 { return bitcast<f32>(bitcast<u32>(x) ^ GU.zero); }\n';
// spec.opaque === false (tests of the canary only): the barriers are plain, as a compiler that sees
// through them would make them
const SEEN_THROUGH = 'fn grid_opq(x: f32) -> f32 { return x; }\n';

function kernel(spec, bindings, body) {
  const opaque = bindings.some(b => b.name === 'GU') ? (spec.opaque === false ? SEEN_THROUGH : OPAQUE) : '';
  return { code: common(spec) + declare(spec, bindings) + '\n' + opaque + body, bindings: bindings.map(b => ({ name: b.name, kind: b.kind })) };
}

const U = { name: 'GU', kind: 'uniform', type: 'GridU' };
const STEP = { name: 'V', kind: 'step' };
const metaRead = { name: 'gridMeta', kind: 'read', type: 'array<u32>' };
const metaWrite = { name: 'gridMeta', kind: 'storage', type: 'array<u32>' };
const field = access => ({ name: 'gridField', kind: access, type: 'array<f32>' });
// the smoothed field's low word (see residual())
const low = access => ({ name: 'gridLo', kind: access, type: 'array<f32>' });
const chunks = (access, type) => ({ name: 'gridChunk', kind: access, type });

// The caller's buffers named by colRefs, once each
function callerBuffers(refs, access) {
  const names = [];
  refs.forEach(ref => { if (names.indexOf(ref.buffer) < 0) names.push(ref.buffer); });
  return names.map(name => ({ name, kind: access, type: 'array<f32>' }));
}

function f32At(word) {
  return `bitcast<f32>(gridMeta[${word}u])`;
}

// This step's grid, from gridMeta
function gridLets(spec) {
  const box = spec.anchor === 'box';
  let s = `  let cell = ${f32At(META.CELL)}; let clo = ${f32At(META.CELL_LOW)}; let total = gridMeta[${META.TOTAL}u]; let flag = gridMeta[${META.FLAG}u];\n`;
  for (let k = 0; k < spec.D; k++) {
    s += `  let s${k} = i32(gridMeta[${META.SIZE + k}u]); let ma${k} = ${f32At(META.MA + k)}; let ra${k} = ${f32At(META.RA + k)};`;
    s += box ? '\n' : ` let k${k} = bitcast<i32>(gridMeta[${META.K0 + k}u]);\n`;
  }
  return s;
}

// Body `i`: its base point b along each axis (the grid coordinate g = (x - A) / cell, floored;
// rounded for quadratic weights), its offset f from it, and its base cell c in the grid (clamped,
// so a body rounding past the edge stays inside). g is not formed: with cell = c + clo and
// A = MA cell + RA, x = m c + r (r from a fused multiply-add, exact) gives
// g = (m - MA) + (r - RA - m clo) / cell, so f is exact to about 1e-7 of a cell however wide the
// grid, as the CPU's f64 is. (In f32, g itself would be off by up to 6e-5 cells at 1,000 cells.)
function bodyLets(spec) {
  const box = spec.anchor === 'box', quad = quadratic(spec);
  let s = '';
  for (let k = 0; k < spec.D; k++) {
    s += `  let x${k} = ${spec.pos.at('i', k)};\n`;
    s += `  let m${k} = floor(x${k} / cell);\n`;
    s += `  let t${k} = grid_opq(fma(-m${k}, cell, x${k})) - ra${k} - m${k} * clo${quad ? ' + 0.5 * cell' : ''};\n`;
    s += `  let q${k} = floor(t${k} / cell);\n`;
    s += `  let b${k} = (m${k} - ma${k}) + q${k};\n`;
    s += `  let f${k} = t${k} / cell - q${k}${quad ? ' - 0.5' : ''};\n`;
    s += `  let c${k} = clamp(i32(b${k})${box ? '' : ` - k${k}`}, GRID_PAD, s${k} - 2);\n`;
  }
  s += `  let ok = ${each$2(spec.D, k => `grid_finite(x${k})`, ' && ')};\n`;
  return s;
}

function cellId(D) {
  return D === 3 ? 'c0 + c1 * s0 + c2 * s0 * s1' : 'c0 + c1 * s0';
}

// --- kernels ---------------------------------------------------------------------------------

// Smallest and largest position per axis; with a deposit value read from columns, also the
// largest |value| (non-negative floats order as their bits)
function minmax(spec) {
  const { D } = spec;
  const bindings = [U, { name: spec.pos.buffer, kind: 'read', type: 'array<f32>' }, { name: 'gridMeta', kind: 'storage', type: 'array<atomic<u32>>' }];
  if (spec.deposit) depositBindings(spec, bindings);
  const value = spec.deposit ? `
    ${spec.deposit.lines.join('\n    ')}
    most = max(most, abs(${spec.deposit.code}));` : '';
  return kernel(spec, bindings, `var<workgroup> grid_mn: array<atomic<u32>, ${D}>;
var<workgroup> grid_mx: array<atomic<u32>, ${D}>;
var<workgroup> grid_most: atomic<u32>;
@compute @workgroup_size(${WG$2})
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_index) li: u32, @builtin(num_workgroups) nwg: vec3u) {
  if (li < ${D}u) { atomicStore(&grid_mn[li], 0xffffffffu); atomicStore(&grid_mx[li], 0u); }
  if (li == 0u) { atomicStore(&grid_most, 0u); }
  workgroupBarrier();
  ${each$2(D, k => `var mn${k} = 3.4e38; var mx${k} = -3.4e38;`)} var most = 0.0;
  for (var i = gid.x; i < GU.n; i += nwg.x * ${WG$2}u) {
    ${each$2(D, k => `let x${k} = ${spec.pos.at('i', k)};`)}
    if (!(${each$2(D, k => `grid_finite(x${k})`, ' && ')})) { continue; }
    ${each$2(D, k => `mn${k} = min(mn${k}, x${k}); mx${k} = max(mx${k}, x${k});`)}${value}
  }
  ${each$2(D, k => `atomicMin(&grid_mn[${k}], grid_enc(mn${k})); atomicMax(&grid_mx[${k}], grid_enc(mx${k}));`, '\n  ')}
  ${spec.deposit ? 'atomicMax(&grid_most, bitcast<u32>(most));' : ''}
  workgroupBarrier();
  if (li == 0u) {
    ${each$2(D, k => `atomicMin(&gridMeta[${META.MIN + k}u], atomicLoad(&grid_mn[${k}])); atomicMax(&gridMeta[${META.MAX + k}u], atomicLoad(&grid_mx[${k}]));`, '\n    ')}
    ${spec.deposit ? `atomicMax(&gridMeta[${META.VMAX}u], atomicLoad(&grid_most));` : ''}
  }
}`);
}

// The step values and the caller's buffers a deposit value read from columns needs
function depositBindings(spec, bindings) {
  bindings.push(STEP);
  spec.deposit.buffers.forEach(name => { if (!bindings.some(b => b.name === name)) bindings.push({ name, kind: 'read', type: 'array<f32>' }); });
}

// Numbers held as hi + lo (PARAMS, and the canary)
const DOUBLE = `// a + b = s + e exactly (two-sum)
fn grid_sum(a: f32, b: f32) -> vec2f {
  let s = grid_opq(a + b);
  let bb = grid_opq(s - a);
  return vec2f(s, grid_opq(a - grid_opq(s - bb)) + grid_opq(b - bb));
}
fn grid_add(x: vec2f, y: vec2f) -> vec2f {
  let s = grid_sum(x.x, y.x);
  return grid_sum(s.x, s.y + x.y + y.y);
}
// x / k for a whole number k
fn grid_over(x: vec2f, k: f32) -> vec2f {
  let q = x.x / k;
  return grid_sum(q, (grid_opq(fma(-q, k, x.x)) + x.y) / k);
}
// floor((v - A) / cell) and the fraction left, with A = ma cell + ra (as bodyLets computes them)
fn grid_index(v: vec2f, ma: f32, ra: f32, cell: vec2f) -> vec2f {
  let m = floor(v.x / cell.x);
  let t = grid_opq(fma(-m, cell.x, v.x)) + v.y - ra - m * cell.y;
  let q = floor(t / cell.x);
  return vec2f(m - ma + q, t / cell.x - q);
}
`;

// The grid of this step, as modules/gridfield places it:
//  - box: corner = smallest - margin, cell = max(cell, widest span / maxCells), and per axis
//    min(ceil(span / cell), maxCells) + 2 + 2 * pad points (the min: f32 can land an ulp over
//    maxCells);
//  - lattice: points at multiples of the cell, from floor((smallest - margin) / cell) to
//    floor((largest + margin) / cell), plus 2 + 2 * pad. Positions are relative to the caller's
//    origin; `phase` (origin mod cell) puts them back on the lattice.
// pad is 1 for quadratic weights, whose stencil reaches a point further.
function params(spec) {
  const { D } = spec;
  const box = spec.anchor === 'box', at = spec.values.at;
  const TS = tableSize(spec.maxCells);
  const maxOf = names => names.reduce((a, b) => `max(${a}, ${b})`);
  const split = (w, word) => `grid_split(${w}, ${word}u);`;
  const lines = [];
  lines.push(`  let cellBase = ${at('cell')}; let margin = ${at('margin')};`);
  lines.push(`  let mg = vec2f(margin, ${at('marginLow')});`);
  lines.push('  var flag = 0u;');
  lines.push('  if (!(grid_finite(cellBase) && cellBase > 0.0 && grid_finite(margin) && margin >= 0.0)) { flag = 2u; }');
  lines.push(`  if (${each$2(D, k => `gridMeta[${META.MIN + k}u] > gridMeta[${META.MAX + k}u]`, ' || ')}) { flag = 2u; }`);
  for (let k = 0; k < D; k++) {
    lines.push(`  let mn${k} = grid_dec(gridMeta[${META.MIN + k}u]); let mx${k} = grid_dec(gridMeta[${META.MAX + k}u]);`);
    lines.push(`  gridMeta[${META.MIN + k}u] = 0xffffffffu; gridMeta[${META.MAX + k}u] = 0u;`);
  }
  // the cell as hi + lo: the CPU's f64 cell to about 1e-14, so the grid coordinates of bodies 1,000
  // cells away still agree with the CPU's
  lines.push(`  var cell = vec2f(cellBase, ${at('cellLow')});`);
  lines.push(`  ${each$2(D, k => `var sz${k} = 0u;`)}`);
  lines.push(`  ${each$2(D, k => `var ma${k} = 0.0; var ra${k} = 0.0;`)}`);
  const pad = quadratic(spec) ? 1 : 0;
  if (box) {
    for (let k = 0; k < D; k++) lines.push(`  let span${k} = grid_add(grid_sum(mx${k}, -mn${k}), 2.0 * mg);`);
    lines.push('  let most = f32(GU.maxCells);');
    for (let k = 0; k < D; k++) lines.push(`  { let fit = grid_over(span${k}, most); if (fit.x > cell.x || (fit.x == cell.x && fit.y > cell.y)) { cell = fit; } }`);
    lines.push('  if (!(grid_finite(cell.x) && cell.x > 0.0)) { flag = 2u; }');
    lines.push('  if (flag == 0u) {');
    for (let k = 0; k < D; k++) {
      // the corner, smallest - margin - pad * cell, as MA * cell + RA
      lines.push(`    let corner${k} = grid_add(grid_add(vec2f(mn${k}, 0.0), -mg), ${pad ? `-cell` : 'vec2f(0.0, 0.0)'});`);
      lines.push(`    ma${k} = floor(corner${k}.x / cell.x); ra${k} = grid_opq(fma(-ma${k}, cell.x, corner${k}.x)) + corner${k}.y - ma${k} * cell.y;`);
      lines.push(`    let fit${k} = grid_index(span${k}, 0.0, 0.0, cell);`);
      lines.push(`    sz${k} = min(u32(fit${k}.x) + select(0u, 1u, fit${k}.y > 0.0), GU.maxCells) + ${2 + 2 * pad}u;`);
    }
    lines.push('  }');
  } else {
    lines.push('  var widest = 0.0; var wideAxis = 0u;');
    lines.push('  if (flag == 0u) {');
    for (let k = 0; k < D; k++) {
      // positions are relative to the caller's origin: A = -phase puts them back on the lattice
      lines.push(`    let ph${k} = ${at('phase' + k)};`);
      lines.push(`    ma${k} = floor(-ph${k} / cell.x); ra${k} = grid_opq(fma(-ma${k}, cell.x, -ph${k})) - ma${k} * cell.y;`);
      lines.push(`    let lo${k} = grid_index(grid_add(vec2f(mn${k}, 0.0), -mg), ma${k}, ra${k}, cell).x;`);
      lines.push(`    let hi${k} = grid_index(grid_add(vec2f(mx${k}, 0.0), mg), ma${k}, ra${k}, cell).x;`);
      lines.push(`    let across${k} = hi${k} - lo${k};`);
      lines.push(`    if (!(across${k} <= f32(GU.maxCells)) && !(across${k} <= widest)) { widest = across${k}; wideAxis = ${k}u; }`);
      lines.push(`    sz${k} = u32(max(across${k}, 0.0)) + ${2 + 2 * pad}u;`);
      lines.push(`    gridMeta[${META.K0 + k}u] = bitcast<u32>(i32(lo${k}) - GRID_PAD);`);
    }
    lines.push('  }');
    lines.push('  if (flag == 0u && widest > 0.0) { flag = 1u; }');
    // sticky: the runner halts at the next readback and names the numbers
    lines.push(`  if (flag == 1u && gridMeta[${META.STATUS}u] == 0u) {`);
    lines.push(`    gridMeta[${META.STATUS}u] = 1u; gridMeta[${META.STATUS + 1}u] = bitcast<u32>(widest);`);
    lines.push(`    gridMeta[${META.STATUS + 2}u] = bitcast<u32>(cell.x); gridMeta[${META.STATUS + 3}u] = wideAxis;`);
    lines.push('  }');
  }
  for (let k = 0; k < D; k++) lines.push(`  gridMeta[${META.MA + k}u] = bitcast<u32>(ma${k}); gridMeta[${META.RA + k}u] = bitcast<u32>(ra${k});`);
  lines.push('  var total = 0u;');
  lines.push(`  if (flag == 0u) { total = ${each$2(D, k => `sz${k}`, ' * ')}; }`);
  lines.push('  if (flag == 0u && total > GU.capacity) {');
  lines.push(`    if (gridMeta[${META.STATUS}u] == 0u) { gridMeta[${META.STATUS}u] = 3u; gridMeta[${META.STATUS + 1}u] = bitcast<u32>(f32(total)); gridMeta[${META.STATUS + 2}u] = bitcast<u32>(cell.x); }`);
  lines.push('    flag = 3u; total = 0u;');
  lines.push('  }');
  for (let k = 0; k < D; k++) lines.push(`  gridMeta[${META.SIZE + k}u] = sz${k};`);
  lines.push(`  gridMeta[${META.STATUS + 4}u] = total;`);
  lines.push(`  gridMeta[${META.CELL}u] = bitcast<u32>(cell.x); gridMeta[${META.CELL_LOW}u] = bitcast<u32>(cell.y);`);
  lines.push(`  gridMeta[${META.TOTAL}u] = total; gridMeta[${META.FLAG}u] = flag;`);
  // deposits are densities: per unit area (or volume) of a cell
  const area = each$2(D, () => 'cell.x', ' * ');
  lines.push(`  gridMeta[${META.UNIT}u] = bitcast<u32>(${spec.deposit ? '1.0' : at('value')} / (${area}));`);
  // fixed-point units per unit of weight x value (see deposit())
  if (spec.deposit) {
    lines.push(`  let vmax = ${f32At(META.VMAX)}; gridMeta[${META.VMAX}u] = 0u;`);
    lines.push(`  gridMeta[${META.SCALE}u] = bitcast<u32>(select(0.0, ${FIXED}.0 / vmax, vmax > 0.0 && grid_finite(vmax)));`);
  } else {
    lines.push(`  gridMeta[${META.SCALE}u] = bitcast<u32>(f32(${FIXED}.0));`);
  }
  lines.push(`  let blocks = (total + ${SCAN_BLOCK}u) / ${SCAN_BLOCK}u;`);
  lines.push(`  gridMeta[${META.BLOCKS}u] = blocks;`);
  lines.push(`  gridMeta[${IND_SCAN}u] = blocks; gridMeta[${IND_SCAN + 1}u] = 1u; gridMeta[${IND_SCAN + 2}u] = 1u;`);
  lines.push(`  ${split(`(total + ${WG$2 - 1}u) / ${WG$2}u`, IND_DEPOSIT)}`);
  // no chunks of crowded cells yet (ORDER lists them)
  lines.push('  gridChunk[0] = 0u; gridChunk[1] = 1u; gridChunk[2] = 1u; gridChunk[3] = 0u;');
  if (spec.smooth) {
    for (let k = 0; k < D; k++) {
      const lineCount = `select(0u, total / sz${k}, total > 0u)`;
      lines.push(`  ${split(smoothVariant(D, k) === 'scan' ? lineCount : `(${lineCount} + ${LINE_WG - 1}u) / ${LINE_WG}u`, IND_SMOOTH + 3 * k)}`);
    }
    // One implicit heat step: per axis a line solve with 1 + 2 gamma on the diagonal and -gamma
    // next to it, gamma = diffuse / cell^2 (zero outside the grid). Thomas's pivots m_i depend on
    // the distance from the line's start only, so one table serves every line and axis; it
    // converges within a few dozen entries, past which readers clamp, and is kept until gamma
    // changes or a longer line needs more of it.
    // The pivots come from mu_i = m_i - gamma: mu_0 = 1 + gamma, mu_i = 1 + gamma mu_{i-1} / m_{i-1},
    // m_i = gamma + mu_i, so no step subtracts. Thomas's own m_i = 1 + 2 gamma - gamma^2 / m_{i-1}
    // loses the 1 of 1 + 2 gamma to f32 rounding, which the pivots' fixed point amplifies: the solve
    // was off by about gamma times f32's precision (1e-5 at gamma 16), and is now off by about
    // sqrt(gamma) times it. The table holds 1 / m_i, and mu_i for the self term.
    lines.push(`  let diffuse = ${at('diffuse')};`);
    lines.push('  let gam = select(0.0, diffuse / (cell.x * cell.x), diffuse > 0.0);');
    lines.push(`  let refine = flag == 0u && gam >= ${REFINE_GAMMA}.0;`);
    lines.push(`  gridMeta[${META.REFINE}u] = select(0u, 1u, refine);`);
    lines.push(`  ${split(`select(0u, (total + ${WG$2 - 1}u) / ${WG$2}u, refine)`, IND_RESIDUAL)}`);
    for (let k = 0; k < D; k++) {
      lines.push(`  for (var w = 0u; w < 3u; w++) { gridMeta[${IND_SMOOTH_LOW + 3 * k}u + w] = select(0u, gridMeta[${IND_SMOOTH + 3 * k}u + w], refine || w == 2u); }`);
    }
    lines.push(`  let need = ${maxOf(Array.from({ length: D }, (_, k) => `sz${k}`))};`);
    lines.push(`  let held = gridMeta[${META.TAB_DONE}u];`);
    lines.push(`  if (flag == 0u && (gridMeta[${META.TAB_GAMMA}u] != bitcast<u32>(gam) || (held != ${CONVERGED}u && held < need))) {`);
    lines.push(`    let ti = ${META.TABLE}u; let tu = ${META.TABLE + TS}u;`);
    lines.push('    var mu = 1.0 + gam; var inv = 1.0 / (gam + mu); var mu1 = -1.0; var inv1 = -1.0;');
    lines.push('    gridMeta[ti] = bitcast<u32>(inv); gridMeta[tu] = bitcast<u32>(mu);');
    lines.push(`    var last = 0u; var done = ${CONVERGED}u;`);
    lines.push('    loop {');
    lines.push('      if (last + 1u >= need) { done = need; break; }');
    lines.push('      let mu2 = 1.0 + gam * mu * inv; let inv2 = 1.0 / (gam + mu2);');
    lines.push('      last += 1u;');
    lines.push('      gridMeta[ti + last] = bitcast<u32>(inv2); gridMeta[tu + last] = bitcast<u32>(mu2);');
    // converged: the numbers repeat, or (f32 rounding) alternate between two; stopping at a
    // relative tolerance instead left the clamped entries 4e-7 off, which the solve amplifies
    lines.push('      if ((mu2 == mu && inv2 == inv) || (mu2 == mu1 && inv2 == inv1)) { break; }');
    lines.push('      mu1 = mu; inv1 = inv; mu = mu2; inv = inv2;');
    lines.push('    }');
    lines.push(`    gridMeta[${META.TAB_LAST}u] = last; gridMeta[${META.TAB_GAMMA}u] = bitcast<u32>(gam); gridMeta[${META.TAB_DONE}u] = done;`);
    lines.push('  }');
  }
  return kernel(spec, [U, STEP, metaWrite, chunks('storage', 'array<u32>')], `fn grid_split(w: u32, at: u32) { gridMeta[at] = min(w, 65535u); gridMeta[at + 1u] = (w + 65534u) / 65535u; gridMeta[at + 2u] = 1u; }
${DOUBLE}@compute @workgroup_size(1)
fn main() {
${lines.join('\n')}
}`);
}

// A thread per body: its base cell, and its slot in it from the cell's atomic counter (and its
// deposit value)
function bin(spec) {
  const KW = keyWords(spec);
  const bindings = [U, metaRead, { name: spec.pos.buffer, kind: 'read', type: 'array<f32>' },
    { name: 'gridCount', kind: 'storage', type: 'array<atomic<u32>>' }, { name: 'gridKey', kind: 'storage', type: 'array<u32>' }];
  if (spec.deposit) depositBindings(spec, bindings);
  const value = spec.deposit ? `${spec.deposit.lines.map(line => '  ' + line).join('\n')}
  gridKey[${KW}u * i + 2u] = bitcast<u32>(${spec.deposit.code});\n` : '';
  return kernel(spec, bindings, `@compute @workgroup_size(${WG$2})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= GU.n) { return; }
${gridLets(spec)}  if (flag != 0u) { return; }
${bodyLets(spec)}${value}  if (!ok) { gridKey[${KW}u * i] = 0xffffffffu; return; }
  let cid = u32(${cellId(spec.D)});
  gridKey[${KW}u * i] = cid;
  gridKey[${KW}u * i + 1u] = atomicAdd(&gridCount[cid], 1u);
}`);
}

// Exclusive scan of the counts in blocks of 2,048 (256 threads x 8); zeroes the counts for the
// next step. Block totals go after the starts.
function scanBlocks(spec) {
  return kernel(spec, [{ name: 'gridCount', kind: 'storage', type: 'array<u32>' }, { name: 'gridStart', kind: 'storage', type: 'array<u32>' }],
    `var<workgroup> tmp: array<u32, 256>;
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) li: u32, @builtin(workgroup_id) wid: vec3u) {
  let base = wid.x * ${SCAN_BLOCK}u + li * 8u;
  var a: array<u32, 8>;
  var t = 0u;
  for (var m = 0u; m < 8u; m++) { a[m] = gridCount[base + m]; gridCount[base + m] = 0u; t += a[m]; }
  tmp[li] = t;
  workgroupBarrier();
  for (var off = 1u; off < 256u; off <<= 1u) {
    var v = tmp[li];
    if (li >= off) { v += tmp[li - off]; }
    workgroupBarrier();
    tmp[li] = v;
    workgroupBarrier();
  }
  var ex = tmp[li] - t;
  for (var m = 0u; m < 8u; m++) { gridStart[base + m] = ex; ex += a[m]; }
  if (li == 255u) { gridStart[${spec.capacity}u + wid.x] = tmp[255]; }
}`);
}

// One workgroup scans the block totals (PER per thread)
function scanTop(spec) {
  const PER = Math.max(1, Math.ceil(spec.capacity / SCAN_BLOCK / 256));
  return kernel(spec, [metaRead, { name: 'gridStart', kind: 'storage', type: 'array<u32>' }], `var<workgroup> tmp: array<u32, 256>;
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) li: u32) {
  let nb = gridMeta[${META.BLOCKS}u];
  let top = ${spec.capacity}u;
  let base = li * ${PER}u;
  var a: array<u32, ${PER}>;
  var t = 0u;
  for (var m = 0u; m < ${PER}u; m++) { if (base + m < nb) { a[m] = gridStart[top + base + m]; } else { a[m] = 0u; } t += a[m]; }
  tmp[li] = t;
  workgroupBarrier();
  for (var off = 1u; off < 256u; off <<= 1u) {
    var v = tmp[li];
    if (li >= off) { v += tmp[li - off]; }
    workgroupBarrier();
    tmp[li] = v;
    workgroupBarrier();
  }
  var ex = tmp[li] - t;
  for (var m = 0u; m < ${PER}u; m++) { if (base + m < nb) { gridStart[top + base + m] = ex; } ex += a[m]; }
}`);
}

// Where cell e's bodies start in the sorted order (see gridStart above)
function startOf(spec) {
  return `fn grid_start(e: u32) -> u32 { return gridStart[e] + gridStart[${spec.capacity}u + e / ${SCAN_BLOCK}u]; }\n`;
}

// Each body's record at its place in the sorted order: its cell's start plus its slot. The first
// body of every CROWD bodies of a crowded cell lists a chunk for CROWD.
function order(spec) {
  const { D } = spec;
  const KW = keyWords(spec), SPW = spWords(spec);
  const value = spec.deposit ? `bitcast<f32>(gridKey[${KW}u * i + 2u])` : '0.0';
  let record;
  if (D === 2) record = `  gridSp[at] = vec4f(f0, f1, ${value}, f32(c0));`;
  else if (SPW === 1) record = '  gridSp[at] = vec4f(f0, f1, f2, f32(c0));';
  else record = `  gridSp[${SPW}u * at] = vec4f(f0, f1, f2, f32(c0));\n  gridSp[${SPW}u * at + 1u] = vec4f(${value}, 0.0, 0.0, 0.0);`;
  return kernel(spec, [U, metaRead, { name: spec.pos.buffer, kind: 'read', type: 'array<f32>' }, { name: 'gridKey', kind: 'read', type: 'array<u32>' },
    { name: 'gridStart', kind: 'read', type: 'array<u32>' }, { name: 'gridSp', kind: 'storage', type: 'array<vec4f>' }, chunks('storage', 'array<atomic<u32>>')], `${startOf(spec)}@compute @workgroup_size(${WG$2})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= GU.n) { return; }
${gridLets(spec)}  if (flag != 0u) { return; }
  let cid = gridKey[${KW}u * i];
  if (cid == 0xffffffffu) { return; }
${bodyLets(spec)}  let slot = gridKey[${KW}u * i + 1u];
  let start = grid_start(cid);
  let at = start + slot;
${record}
  if (slot % ${CROWD}u == 0u && grid_start(cid + 1u) - start > ${CROWD}u) {
    let k = atomicAdd(&gridChunk[3], 1u);
    atomicStore(&gridChunk[4u + 2u * k], at); atomicStore(&gridChunk[5u + 2u * k], cid);
    atomicMax(&gridChunk[0], k / ${WG$2}u + 1u);
  }
}`);
}

// The stencil offsets of a body's base cell: [d0, d1(, d2)] for each of its 2^D or 3^D grid points
function stencil(spec) {
  const ds = quadratic(spec) ? [-1, 0, 1] : [0, 1];
  const out = [];
  const walk = (k, cur) => { if (k === spec.D) { out.push(cur); return; } for (const d of ds) walk(k + 1, cur.concat(d)); };
  walk(0, []);
  return out;
}

// A body's term at one grid point, in fixed-point units: an integer of at most 2^30 (weight w,
// value v already scaled). Added to the 64-bit sum `a` (low, high): the high word takes the low
// word's carry and a negative term's sign.
function addTerm(spec, a) {
  return spec.deposit
    ? `{ let tq = i32(round(w * v)); let sum = ${a}.x + bitcast<u32>(tq); ${a} = vec2u(sum, ${a}.y + bitcast<u32>(tq >> 31u) + select(0u, 1u, sum < ${a}.x)); }`
    : `{ let tq = u32(max(w, 0.0) * v + 0.5); let sum = ${a}.x + tq; ${a} = vec2u(sum, ${a}.y + select(0u, 1u, sum < ${a}.x)); }`;
}

// Sorted body q's record: e (offsets, cell along x) and v, its value in fixed-point units
function recordLets(spec) {
  const SPW = spWords(spec);
  const value = !spec.deposit ? 'scale' : spec.D === 2 ? 'e.z * scale' : `gridSp[${SPW}u * q + 1u].x * scale`;
  return `let e = gridSp[${SPW === 1 ? 'q' : `${SPW}u * q`}]; let v = ${value};`;
}

// A thread per chunk of a crowded cell: its bodies' terms at the cell's grid points, summed in
// registers, then each sum added to the point's 64-bit sum in gridAcc with integer atomics (the
// high word takes the low word's carry). However the adds interleave, the sums end the same.
function crowd(spec) {
  const { D } = spec;
  const points = stencil(spec);
  const key = c => c.map(d => ({ '-1': 'm', 0: 'z', 1: 'p' })[d]).join('');
  const ds = quadratic(spec) ? [-1, 0, 1] : [0, 1];
  const axes = ['e.x', 'e.y', 'e.z'];
  const weights = Array.from({ length: D }, (_, k) => ds.map(d => `let w${k}${key([d])} = grid_w(${axes[k]}, ${d});`).join(' ')).join('\n    ');
  const strides = ['', ' * s0', ' * s0 * s1'];
  return kernel(spec, [metaRead, { name: 'gridStart', kind: 'read', type: 'array<u32>' }, { name: 'gridSp', kind: 'read', type: 'array<vec4f>' },
    chunks('read', 'array<u32>'), { name: 'gridAcc', kind: 'storage', type: 'array<atomic<u32>>' }], `${startOf(spec)}fn grid_flush(t: u32, a: vec2u) {
  if (a.x == 0u && a.y == 0u) { return; }
  let old = atomicAdd(&gridAcc[2u * t], a.x);
  let high = a.y + select(0u, 1u, old + a.x < old);
  if (high != 0u) { atomicAdd(&gridAcc[2u * t + 1u], high); }
}
@compute @workgroup_size(${WG$2})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let k = gid.x;
  if (k >= gridChunk[3]) { return; }
  let first = gridChunk[4u + 2u * k]; let cid = gridChunk[5u + 2u * k];
  let last = min(first + ${CROWD}u, grid_start(cid + 1u));
  let scale = ${f32At(META.SCALE)};
  ${each$2(D, k => `let s${k} = i32(gridMeta[${META.SIZE + k}u]);`)}
  ${points.map(c => `var a${key(c)} = vec2u(0u, 0u);`).join(' ')}
  for (var q = first; q < last; q++) {
    ${recordLets(spec)}
    ${weights}
    ${points.map(c => `{ let w = ${c.map((d, k) => `w${k}${key([d])}`).join(' * ')}; ${addTerm(spec, 'a' + key(c))} }`).join('\n    ')}
  }
  ${points.map(c => `grid_flush(u32(i32(cid) + ${c.map((d, k) => `(${d})${strides[k]}`).join(' + ')}), a${key(c)});`).join('\n  ')}
}`);
}

// A thread per grid point: the terms of the bodies in the base cells around it, a run of the
// sorted order per stencil row, in 64-bit fixed point; crowded cells' terms come from CROWD's sum
// in gridAcc. The sum becomes the field, a density per unit area (or volume). With smoothing it is
// also the refinement's starting point in gridLo.
function deposit(spec) {
  const { D } = spec;
  const quad = quadratic(spec);
  const ds = quad ? [-1, 0, 1] : [0, 1];
  const rows = [];
  if (D === 2) ds.forEach(d1 => rows.push([d1]));
  else ds.forEach(d2 => ds.forEach(d1 => rows.push([d1, d2])));
  const w = `grid_w(e.x, j0 - i32(e.w)) * grid_w(e.y, d1)${D === 3 ? ' * grid_w(e.z, d2)' : ''}`;
  const run = (from, to) => `acc = grid_run(acc, ${from}, ${to}, j0, ${D === 3 ? 'd1, d2' : 'd1'}, scale);`;
  // each stencil row's run [beg, fin) of the sorted order, through `inner`
  const body = (inner, pad) => rows.map(([d1, d2]) => {
    const conds = ['cy >= 0 && cy < s1'];
    if (D === 3) conds.push('cz >= 0 && cz < s2');
    return `{
  let d1 = ${d1}; let cy = j1 - d1;${D === 3 ? ` let d2 = ${d2}; let cz = j2 - d2;` : ''}
  if (${conds.join(' && ')}) {
    let row = cy * s0${D === 3 ? ' + cz * s0 * s1' : ''};
    let beg = grid_start(u32(row + lo0));
    let fin = grid_start(u32(row + hi0 + 1));
    ${inner}
  }
}`.split('\n').join('\n' + pad);
  }).join('\n' + pad);
  // no crowded cell this step (the usual case): every run whole
  const calm = body(run('beg', 'fin'), '    ');
  // else a run of up to CROWD bodies whole (none of its cells is crowded), a longer one cell by
  // cell, crowded cells left to CROWD
  const crowded = body(`if (fin - beg <= ${CROWD}u) { ${run('beg', 'fin')} } else {
      for (var cx = lo0; cx <= hi0; cx++) {
        let s = grid_start(u32(row + cx)); let e = grid_start(u32(row + cx + 1));
        if (e - s <= ${CROWD}u) { ${run('s', 'e')} } else { near = true; }
      }
    }`, '    ');
  const bindings = [metaRead, { name: 'gridStart', kind: 'read', type: 'array<u32>' }, { name: 'gridSp', kind: 'read', type: 'array<vec4f>' },
    chunks('read', 'array<u32>'), { name: 'gridAcc', kind: 'storage', type: 'array<u32>' }, field('storage')];
  // with smoothing, the deposit stays in gridLo too: the residual needs it
  if (spec.smooth) bindings.push(low('storage'));
  const unit = f32At(META.UNIT);
  return kernel(spec, bindings, `${startOf(spec)}// the terms of sorted bodies [beg, fin) at grid point (j0, row offsets d1, d2), added to acc
fn grid_run(sum: vec2u, beg: u32, fin: u32, j0: i32, d1: i32, ${D === 3 ? 'd2: i32, ' : ''}scale: f32) -> vec2u {
  var acc = sum;
  for (var q = beg; q < fin; q++) { ${recordLets(spec)} let w = ${w}; ${addTerm(spec, 'acc')} }
  return acc;
}
// a 64-bit sum as f32; a negative one is negated first, or f32(high) * 2^32 and f32(low) would
// cancel (a small negative sum came out 0, or 2.5% off)
fn grid_total(a: vec2u) -> f32 {
  let neg = (a.y & 0x80000000u) != 0u;
  let lo = select(a.x, ~a.x + 1u, neg);
  let hi = select(a.y, ~a.y + select(0u, 1u, a.x == 0u), neg);
  let size = f32(hi) * 4294967296.0 + f32(lo);
  return select(size, -size, neg);
}
@compute @workgroup_size(${WG$2})
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
  let t = gid.x + gid.y * nwg.x * ${WG$2}u;
${gridLets(spec)}  if (t >= total) { return; }
  let scale = ${f32At(META.SCALE)};
  let j0 = i32(t % u32(s0));
  let r = t / u32(s0);
  ${D === 3 ? 'let j1 = i32(r % u32(s1)); let j2 = i32(r / u32(s1));' : 'let j1 = i32(r);'}
  let lo0 = max(j0 - 1, 0);
  let hi0 = min(j0${quad ? ' + 1' : ''}, s0 - 1);
  var acc = vec2u(0u, 0u);
  if (gridChunk[3] == 0u) {
    ${calm}
  } else {
    var near = false;
    ${crowded}
    if (near) {
      let a = vec2u(gridAcc[2u * t], gridAcc[2u * t + 1u]);
      gridAcc[2u * t] = 0u; gridAcc[2u * t + 1u] = 0u;
      let sum = acc.x + a.x;
      acc = vec2u(sum, acc.y + a.y + select(0u, 1u, sum < acc.x));
    }
  }
  let deposited = select(0.0, grid_total(acc) * (${unit} / scale), scale > 0.0);
  gridField[t] = deposited;${spec.smooth ? `\n  if (gridMeta[${META.REFINE}u] != 0u) { gridLo[t] = deposited; }` : ''}
}`);
}

// One step of iterative refinement for the smoothing. The f32 sweeps leave a few ulps of noise
// in every point of the smoothed field X, and a slope is a difference of neighbouring points,
// which on a field smoothed over many cells is a small difference of large numbers: at gamma 256
// the slopes were off by 1.9e-5 of their RMS. So the field is kept in two words, X + Y:
// R = u - (A_x A_y ...) X, then Y = the same smoothing of R (the second pass of the SMOOTH
// kernels, on gridLo). A_k = 1 + gamma L_k with L_k f = (f - f_left) + (f - f_right) (zero outside
// the grid); R is formed from those differences, never from (1 + 2 gamma) X, so its own rounding
// is noise the second smoothing averages away. Both words then hold the field to about 1e-12.
// gridLo holds the deposit u on entry (DEPOSIT) and R on exit.
function residual(spec) {
  const { D } = spec;
  const offsets = [];
  const walk = (k, cur) => { if (k === D) { offsets.push(cur); return; } for (const d of [-1, 0, 1]) walk(k + 1, cur.concat(d)); };
  walk(0, []);
  const key = o => o.map(d => ({ '-1': 'm', 0: 'z', 1: 'p' })[d]).join('');
  const strides = ['', ' * s0', ' * s0 * s1'];
  // neighbours outside the grid are 0; their loads are clamped inside it and the value dropped
  const loads = offsets.map(o => {
    const inside = o.map((d, k) => (d === 0 ? null : d < 0 ? `j${k} > 0` : `j${k} + 1 < s${k}`)).filter(Boolean);
    const idx = o.map((d, k) => `${d === 0 ? `j${k}` : d < 0 ? `max(j${k} - 1, 0)` : `min(j${k} + 1, s${k} - 1)`}${strides[k]}`).join(' + ');
    const load = `gridField[u32(${idx})]`;
    return `let x${key(o)} = ${inside.length ? `select(0.0, ${load}, ${inside.join(' && ')})` : load};`;
  });
  // (prod_{k in axes} L_k) X at the centre, as nested differences: L along the first axis of the
  // set at every offset of the others, and so on
  const products = [];
  const termOf = axes => {
    // values over offsets of `axes` (others at 0), reduced one axis at a time
    let table = new Map();
    offsets.filter(o => o.every((d, k) => axes.indexOf(k) >= 0 || d === 0)).forEach(o => table.set(key(o), `x${key(o)}`));
    let free = axes.slice();
    while (free.length) {
      const axis = free.shift();
      const next = new Map();
      table.forEach((code, k) => {
        const o = k.split('').map(c => ({ m: -1, z: 0, p: 1 })[c]);
        if (o[axis] !== 0) return;
        const at = d => table.get(key(o.map((v, a) => (a === axis ? d : v))));
        const name = `l${axes.join('')}_${axis}_${k}`;
        products.push(`let ${name} = grid_hold(grid_hold(${code} - ${at(-1)}) + grid_hold(${code} - ${at(1)}));`);
        next.set(k, name);
      });
      table = next;
    }
    return table.get(key(Array(D).fill(0)));
  };
  const sets = [];
  for (let mask = 1; mask < 1 << D; mask++) sets.push(Array.from({ length: D }, (_, k) => k).filter(k => mask & (1 << k)));
  const bySize = [1, 2, 3].map(size => sets.filter(set => set.length === size).map(termOf)).filter(list => list.length);
  const gammas = ['gam', 'gam * gam', 'gam * gam * gam'];
  const sum = bySize.map((list, i) => `grid_hold(${gammas[i]} * grid_hold(${list.join(' + ')}))`).join(' + ');
  // fast math would otherwise fold the differences back into (1 + 4 gamma + ...) X - ..., whose
  // cancellation is what the refinement is there to avoid
  const hold = spec.opaque === false ? 'x' : `bitcast<f32>(bitcast<u32>(x) ^ gridMeta[${META.ZERO}u])`;
  return kernel(spec, [metaRead, field('read'), low('storage')], `fn grid_hold(x: f32) -> f32 { return ${hold}; }
@compute @workgroup_size(${WG$2})
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
  let t = gid.x + gid.y * nwg.x * ${WG$2}u;
  let total = gridMeta[${META.TOTAL}u];
  if (t >= total) { return; }
  let gam = ${f32At(META.TAB_GAMMA)};
  ${each$2(D, k => `let s${k} = i32(gridMeta[${META.SIZE + k}u]);`)}
  let j0 = i32(t % u32(s0));
  let r = t / u32(s0);
  ${D === 3 ? 'let j1 = i32(r % u32(s1)); let j2 = i32(r / u32(s1));' : 'let j1 = i32(r);'}
  ${loads.join('\n  ')}
  ${products.join('\n  ')}
  gridLo[t] = grid_hold(gridLo[t] - x${key(Array(D).fill(0))}) - grid_hold(${sum});
}`);
}

// First point, stride and length of line l along `axis`
function lineBase(axis) {
  if (axis === 0) return 'let base = l * u32(s0); let step = 1u; let L = u32(s0);';
  if (axis === 1) return 'let base = (l % u32(s0)) + (l / u32(s0)) * u32(s0 * s1); let step = u32(s0); let L = u32(s1);';
  return 'let base = l; let step = u32(s0 * s1); let L = u32(s2);';
}

function smooth(spec, axis) {
  const { D } = spec;
  const TS = tableSize(spec.maxCells);
  const sizes = `let s0 = i32(gridMeta[${META.SIZE}u]); let s1 = i32(gridMeta[${META.SIZE + 1}u]);${D === 3 ? ` let s2 = i32(gridMeta[${META.SIZE + 2}u]);` : ''}`;
  // 1 / m_m from the table (see params()): forward d_m = (u_m + gamma d_{m-1}) / m_m, backward
  // x_m = d_m + (gamma / m_m) x_{m+1}
  const tables = `let K = gridMeta[${META.TAB_LAST}u]; let gam = ${f32At(META.TAB_GAMMA)};
  let ti = ${META.TABLE}u;`;
  const bindings = [metaRead, field('storage')];
  if (smoothVariant(D, axis) === 'scan') {
    // A workgroup per line, every thread busy: both sweeps are first-order linear recurrences,
    // x_m = alpha_m x_{m-1} + beta_m, so each thread composes the affine maps of its PER points, a
    // workgroup scan composes the segments, and each thread replays its points from the value
    // entering its segment.
    const PWG = 256;
    const PER = Math.ceil(TS / PWG);
    return kernel(spec, bindings, `var<workgroup> sa: array<f32, ${PWG}>;
var<workgroup> sb: array<f32, ${PWG}>;
var<workgroup> wlines: u32;
// inclusive scan of affine maps (A, B), x -> A x + B, earlier maps applied first
fn grid_scan(li: u32) {
  for (var off = 1u; off < ${PWG}u; off <<= 1u) {
    var A = sa[li]; var B = sb[li];
    if (li >= off) { let Ap = sa[li - off]; let Bp = sb[li - off]; B = A * Bp + B; A = A * Ap; }
    workgroupBarrier();
    sa[li] = A; sb[li] = B;
    workgroupBarrier();
  }
}
@compute @workgroup_size(${PWG})
fn main(@builtin(local_invocation_index) li: u32, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
  if (li == 0u) { wlines = select(0u, gridMeta[${META.TOTAL}u] / gridMeta[${META.SIZE + axis}u], gridMeta[${META.TOTAL}u] > 0u); }
  let lines = workgroupUniformLoad(&wlines);
  ${sizes}
  let l = wid.x + wid.y * nwg.x;
  if (l >= lines) { return; }
  ${lineBase(axis)}
  ${tables}
  let m0 = li * ${PER}u;
  var u: array<f32, ${PER}>;
  for (var k = 0u; k < ${PER}u; k++) { let m = m0 + k; if (m < L) { u[k] = gridField[base + m * step]; } else { u[k] = 0.0; } }
  // forward: d_m = alpha_m d_{m-1} + u_m inv_m, alpha_m = gamma inv_m (alpha_0 = 0)
  var A = 1.0; var B = 0.0;
  for (var k = 0u; k < ${PER}u; k++) {
    let m = m0 + k;
    if (m < L) { let iv = bitcast<f32>(gridMeta[ti + min(m, K)]); let al = select(gam * iv, 0.0, m == 0u); A = al * A; B = al * B + u[k] * iv; }
  }
  sa[li] = A; sb[li] = B;
  workgroupBarrier();
  grid_scan(li);
  var d = select(0.0, sb[max(li, 1u) - 1u], li > 0u);
  workgroupBarrier();
  for (var k = 0u; k < ${PER}u; k++) {
    let m = m0 + k;
    if (m < L) { let iv = bitcast<f32>(gridMeta[ti + min(m, K)]); let al = select(gam * iv, 0.0, m == 0u); d = al * d + u[k] * iv; u[k] = d; }
  }
  // backward: x_m = g_m x_{m+1} + d_m, g_m = gamma inv_m (g_{L-1} = 0), scanned from the end
  A = 1.0; B = 0.0;
  for (var k = ${PER - 1}; k >= 0; k--) {
    let m = m0 + u32(k);
    if (m < L) { let g = select(gam * bitcast<f32>(gridMeta[ti + min(m, K)]), 0.0, m == L - 1u); A = g * A; B = g * B + u[k]; }
  }
  let r = ${PWG - 1}u - li;
  sa[r] = A; sb[r] = B;
  workgroupBarrier();
  grid_scan(r);
  var x = select(0.0, sb[max(r, 1u) - 1u], r > 0u);
  for (var k = ${PER - 1}; k >= 0; k--) {
    let m = m0 + u32(k);
    if (m < L) { let g = select(gam * bitcast<f32>(gridMeta[ti + min(m, K)]), 0.0, m == L - 1u); x = g * x + u[k]; u[k] = x; }
  }
  for (var k = 0u; k < ${PER}u; k++) { let m = m0 + k; if (m < L) { gridField[base + m * step] = u[k]; } }
}`);
  }
  // A thread per line, loading 8 points per wait
  return kernel(spec, bindings, `@compute @workgroup_size(${LINE_WG})
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
  let l = gid.x + gid.y * nwg.x * ${LINE_WG}u;
  let total = gridMeta[${META.TOTAL}u];
  ${sizes}
  if (total == 0u || l >= total / gridMeta[${META.SIZE + axis}u]) { return; }
  ${lineBase(axis)}
  ${tables}
  var d = gridField[base] * bitcast<f32>(gridMeta[ti]);
  gridField[base] = d;
  var u: array<f32, 8>; var cf: array<f32, 8>;
  var m = 1u;
  loop {
    if (m + 8u > L) { break; }
    for (var k = 0u; k < 8u; k++) { u[k] = gridField[base + (m + k) * step]; cf[k] = bitcast<f32>(gridMeta[ti + min(m + k, K)]); }
    for (var k = 0u; k < 8u; k++) { d = (u[k] + gam * d) * cf[k]; u[k] = d; }
    for (var k = 0u; k < 8u; k++) { gridField[base + (m + k) * step] = u[k]; }
    m += 8u;
  }
  for (; m < L; m++) { let idx = base + m * step; d = (gridField[idx] + gam * d) * bitcast<f32>(gridMeta[ti + min(m, K)]); gridField[idx] = d; }
  var x = d;
  var q = i32(L) - 2;
  loop {
    if (q < 7) { break; }
    for (var k = 0; k < 8; k++) { u[k] = gridField[base + u32(q - k) * step]; cf[k] = gam * bitcast<f32>(gridMeta[ti + min(u32(q - k), K)]); }
    for (var k = 0; k < 8; k++) { x = u[k] + cf[k] * x; u[k] = x; }
    for (var k = 0; k < 8; k++) { gridField[base + u32(q - k) * step] = u[k]; }
    q -= 8;
  }
  for (; q >= 0; q--) { let idx = base + u32(q) * step; x = gridField[idx] + gam * bitcast<f32>(gridMeta[ti + min(u32(q), K)]) * x; gridField[idx] = x; }
}`);
}

// A thread per body: value = sum over its stencil of w * F, gradient = sum of grad w * F / cell.
// self 'exclude' leaves the body's own share out: without smoothing its deposit at each point;
// with smoothing what it reads back of its own smoothed deposit (see selfLines).
function gather(spec) {
  const { D } = spec;
  const quad = quadratic(spec);
  const ds = quad ? [-1, 0, 1] : [0, 1];
  const exclude = spec.self === 'exclude' ? (spec.smooth ? 'smoothed' : 'plain') : null;
  const name = d => ({ '-1': 'm', 0: 'z', 1: 'p' })[d];
  let pre = '';
  for (let k = 0; k < D; k++) {
    for (const d of ds) pre += `  let w${k}${name(d)} = grid_w(f${k}, ${d}); let q${k}${name(d)} = grid_s(f${k}, ${d});\n`;
  }
  const combos = [];
  const walk = (k, cur) => { if (k === D) { combos.push(cur); return; } for (const d of ds) walk(k + 1, cur.concat(d)); };
  walk(0, []);
  const strides = ['', ' * s0', ' * s0 * s1'];
  // the field at each stencil point (less the body's own deposit); a smoothed field comes in two
  // words, gridField + gridLo (see residual()), the low one only on steps that refine
  const local = (c, word) => word + c.map(name).join('');
  const loads = (word, buffer) => combos.map(c => {
    const idx = c.map((d, k) => `(c${k} + (${d}))${strides[k]}`).join(' + ');
    const wp = c.map((d, k) => `w${k}${name(d)}`).join(' * ');
    return `let ${local(c, word)} = ${buffer}[u32(${idx})]${exclude === 'plain' ? ` - u * ${wp}` : ''};`;
  });
  const value = word => combos.map(c => `${c.map((d, k) => `w${k}${name(d)}`).join(' * ')} * ${local(c, word)}`).join(' + ');
  // The slope along g from differences of neighbouring points, as the CPU's linear code does: on
  // a smooth field, slope * F rounded per point leaves a residue that differences do not. The
  // quadratic slopes add up to 0, so sum_j s_j F_j = s_m (F_m - F_z) + s_p (F_p - F_z).
  const slope = (g, word) => combos.filter(c => c[g] === 0).map(c => {
    const others = c.map((d, k) => (k === g ? null : `w${k}${name(d)}`)).filter(Boolean).join(' * ');
    const at = shift => local(c.map((d, k) => (k === g ? shift : d)), word);
    // (opaque, or fast math multiplies out the differences, and the hi and lo words with them)
    const along = quad ? `(q${g}m * grid_opq(${at(-1)} - ${at(0)}) + q${g}p * grid_opq(${at(1)} - ${at(0)}))` : `grid_opq(${at(1)} - ${at(0)})`;
    return others ? `grid_opq(${along} * ${others})` : along;
  }).join(' + ');
  let terms = loads('o', 'gridField').concat([`var v = ${value('o')};`], Array.from({ length: D }, (_, g) => `var gr${g} = ${slope(g, 'o')};`)).join('\n  ');
  if (spec.smooth) {
    terms += `\n  if (gridMeta[${META.REFINE}u] != 0u) {\n    ` + loads('l', 'gridLo').concat([`v += ${value('l')};`],
      Array.from({ length: D }, (_, g) => `gr${g} += ${slope(g, 'l')};`)).join('\n    ') + '\n  }';
  }
  const outRefs = [spec.outputs.value, spec.outputs.gradient];
  const bindings = [U, metaRead, { name: spec.pos.buffer, kind: 'read', type: 'array<f32>' }, field('read')]
    .concat(spec.smooth ? [low('read')] : [], callerBuffers(outRefs, 'storage'));
  if (exclude && spec.deposit) bindings.push({ name: 'gridKey', kind: 'read', type: 'array<u32>' });
  const write = (v, g) => `${spec.outputs.value.at('i', 0)} = ${v}; ${each$2(D, k => `${spec.outputs.gradient.at('i', k)} = ${g(k)};`)}`;
  const unit = f32At(META.UNIT);
  return kernel(spec, bindings, `${exclude === 'smoothed' ? selfFunctions(spec) : ''}@compute @workgroup_size(${WG$2})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= GU.n) { return; }
${gridLets(spec)}  // no grid (a cell of 0, no body at a finite position): the field is 0, as on the CPU
  if (flag == 2u) { ${write('0.0', () => '0.0')} return; }
  // a lattice too wide (the runner halts at the next readback): the columns keep their numbers
  if (flag != 0u) { return; }
${bodyLets(spec)}  if (!ok) { ${write('0.0', () => '0.0')} return; }
  let u = ${exclude && spec.deposit ? `bitcast<f32>(gridKey[${keyWords(spec)}u * i + 2u]) * ${unit}` : unit};
${pre}  ${terms}
${exclude === 'smoothed' ? selfLines(spec) : ''}  ${write('v', k => `gr${k} / cell`)}
}`);
}

// What a body reads back of its own smoothed deposit. The smoothing is a line solve A_k per axis,
// so that is u * prod_k (w_k' A_k^-1 w_k), and its slope along k replaces factor k with
// s_k' A_k^-1 w_k (w_k: the body's weights on its points of axis k, s_k their slopes). Only the
// 2 x 2 or 3 x 3 block of A_k^-1 at those points is needed: its diagonal is
// 1 / (m_p + n_p - (1 + 2 gamma)) = 1 / (mu_p + nu_p - 1), with m the forward pivots and n the
// backward ones, which for this matrix are the forward ones counted from the line's other end
// (mu = m - gamma, see params()); off the diagonal, (A^-1)_{p,q} = (gamma / m_p) (A^-1)_{p+1,q}
// for p < q. (modules/gridfield: inverseNearDiagonal, selfCode.)
function selfFunctions(spec) {
  const TS = tableSize(spec.maxCells);
  return `fn grid_mu(p: i32, K: u32) -> f32 { return bitcast<f32>(gridMeta[${META.TABLE + TS}u + min(u32(p), K)]); }
fn grid_keep(p: i32, K: u32, gam: f32) -> f32 { return gam * bitcast<f32>(gridMeta[${META.TABLE}u + min(u32(p), K)]); }
fn grid_d(p: i32, L: i32, K: u32) -> f32 { return 1.0 / (grid_mu(p, K) + grid_mu(L - 1 - p, K) - 1.0); }
`;
}

function selfLines(spec) {
  const { D } = spec;
  const per = quadratic(spec) ? 3 : 2;
  const ds = quadratic(spec) ? [-1, 0, 1] : [0, 1];
  const name = d => ({ '-1': 'm', 0: 'z', 1: 'p' })[d];
  const lines = [`  let sK = gridMeta[${META.TAB_LAST}u]; let sg = ${f32At(META.TAB_GAMMA)};`];
  for (let k = 0; k < D; k++) {
    const G = (i, j) => `G${k}_${Math.min(i, j)}${Math.max(i, j)}`;
    lines.push(`  let st${k} = c${k} - GRID_PAD;`);
    for (let i = 0; i < per; i++) lines.push(`  let ${G(i, i)} = grid_d(st${k} + ${i}, s${k}, sK);`);
    for (let i = 0; i + 1 < per; i++) lines.push(`  let ${G(i, i + 1)} = grid_keep(st${k} + ${i}, sK, sg) * ${G(i + 1, i + 1)};`);
    if (per === 3) lines.push(`  let ${G(0, 2)} = grid_keep(st${k}, sK, sg) * ${G(1, 2)};`);
    const row = i => ds.map((d, j) => `${G(i, j)} * w${k}${name(d)}`).join(' + ');

    lines.push(`  let r${k}_0 = ${row(0)}; let r${k}_1 = ${row(1)};${per === 3 ? ` let r${k}_2 = ${row(2)};` : ''}`);
    lines.push(`  let tilt${k} = ${per === 3 ? `q${k}m * (r${k}_0 - r${k}_1) + q${k}p * (r${k}_2 - r${k}_1)` : `r${k}_1 - r${k}_0`};`);
    lines.push(`  let read${k} = ${ds.map((d, i) => `w${k}${name(d)} * r${k}_${i}`).join(' + ')};`);
  }
  lines.push(`  v -= u * ${each$2(D, k => `read${k}`, ' * ')};`);
  for (let k = 0; k < D; k++) lines.push(`  gr${k} -= u * ${each$2(D, m => (m === k ? `tilt${m}` : `read${m}`), ' * ')};`);
  return lines.join('\n') + '\n';
}

/**
 * Kernels that check, on a device, the exact arithmetic the grid relies on (canary.js): its
 * two-sums and grid coordinates (grid_opq), and the refinement's residual (grid_hold). They are
 * printed by the code that prints the grid's own kernels, so a compiler that sees through a
 * barrier there sees through it here too. `opaque: false` leaves the barriers out (for tests:
 * the canary must then fail).
 *   SUMS: C[2], C[3] = grid_sum(C[0], C[1]); C[7], C[8] = grid_over((C[4], C[5]), C[6]); body i's
 *     base point and offset per axis (2D box, gridMeta's grid) at C[16 + 4 i ...]
 *   RESIDUAL2, RESIDUAL3: residual() on gridMeta's grid
 */
function gridCanaryKernels({ opaque = true } = {}) {
  const base = { anchor: 'box', weights: 'linear', label: 'GRID_CANARY', opaque };
  const sums = Object.assign({ D: 2, pos: { buffer: 'X', at: (row, k) => `X[${row} * 2u + ${k}u]` } }, base);
  return {
    SUMS: kernel(sums, [U, metaRead, { name: 'X', kind: 'read', type: 'array<f32>' }, { name: 'C', kind: 'storage', type: 'array<f32>' }], `${DOUBLE}@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i == 0u) {
    let e = grid_sum(C[0], C[1]);
    C[2] = e.x; C[3] = e.y;
    let q = grid_over(vec2f(C[4], C[5]), C[6]);
    C[7] = q.x; C[8] = q.y;
  }
  if (i >= GU.n) { return; }
${gridLets(sums)}${bodyLets(sums)}  C[16u + 4u * i] = b0; C[17u + 4u * i] = f0; C[18u + 4u * i] = b1; C[19u + 4u * i] = f1;
}`),
    RESIDUAL2: residual(Object.assign({ D: 2 }, base)),
    RESIDUAL3: residual(Object.assign({ D: 3 }, base)),
  };
}

// The grid field's plan, made without a device: the stage's options (modules/gridfield describes
// its stage with shape 'grid'), buffers and their bytes (with the refusal when they do not fit the
// device), the WGSL of its kernels and the numbers it reads per step. build.js makes it real.
//
//   const grid = planGrid({ stage, D, n, limits, pos, column, values });
//   grid.refusal     // null, or why it cannot run here (with the numbers)
//   grid.buffers     // bytes per buffer
//   grid.kernels     // {NAME: {code, bindings}}
//   grid.slotNames   // the step's numbers it reads: cell, margin, diffuse, value, phase0..,
//                    // param:<name>, builtIn:<name> (gridSlotValues() gives the first ones)
//
// `pos` and `column(name)` give colRefs, {buffer, at(row, axis)}: the positions at the start of
// the step, the columns the deposit value reads, and the two columns the field writes (into.value,
// into.gradient). `values`, when given, is the caller's step slot: {decl(binding), at(name)};
// without it the grid has a uniform of its own (build.js setValues()). `limits.gridArithmetic`,
// when the device was checked (canary.js), says which exact arithmetic it keeps: what needs the
// rest is refused.

const AX$3 = 'xyzw';
// Numbers of the stage that the host works out per step (simulator.stageValues())
const NUMBERS = ['cell', 'cellLow', 'margin', 'marginLow', 'diffuse', 'value'];
// What a grid stage's plan says while the device's check (canary.js) is not done yet
const GRID_PENDING = 'pending a one-time check of this GPU\'s arithmetic (runOnGpu waits for it, and refuses the stage if the GPU fails it)';
// The widest box grid, per D, that keeps within half the tolerance when a device's compiler sees
// through grid_opq (canary.js). Measured on Metal with the barriers left out: a box's cell and
// corner then lose their low words, and 2D boxes were off by 1.9e-6 at 16 cells and 6.9e-6 at 32;
// 3D by 1.3e-6 at 8 and 9.8e-6 at 16. Lattices, whose cell comes from the host, held 4e-6 up to
// 2,048 cells (grid-work/plaincells-seen*.json).
const PLAIN_BOX_CELLS = { 2: 16, 3: 8 };

/**
 * The grid's own numbers per step, by slot name (gridSlotValues() gives them); the stage's params
 * and built in values come as 'param:<name>' and 'builtIn:<name>'
 */
function gridNumbers(D) {
  return NUMBERS.concat(Array.from({ length: D }, (_, k) => 'phase' + k));
}

/**
 * The grid field of program stage `stage` (shape 'grid') for n bodies in D dimensions: see the top
 * of this file. `label` prefixes its kernels' names (one plan per grid stage).
 */
function planGrid({ stage, D, n, limits, pos, column, values = null, label = 'GRID', warn, printer }) {
  const refuse = (reason, buffers = {}) => ({ refusal: reason, buffers, kernels: {}, slotNames: [], dispatches: 0 });
  const args = stage.args || {};
  if (D !== 2 && D !== 3) return refuse(`grid fields are 2D and 3D; this layout is ${D}D`);
  const maxCells = args.maxCells;
  if (!(maxCells >= 1) || Math.floor(maxCells) !== maxCells) return refuse(`the grid's maxCells should be a positive whole number, not ${maxCells}`);
  for (const key of ['cell', 'margin', 'diffuse']) {
    const number = args[key];
    if (number && number.kind === 'number') {
      const problem = f32Problem(number.value);
      if (problem) return refuse(`the grid's ${key}: ${problem}`);
    }
  }

  // What the device's compiler does not keep exact (canary.js); unknown (no device) passes, and so
  // does a check not done yet, with a warning (runOnGpu waits for it)
  const exact = limits.gridArithmetic;
  const pending = !!(exact && exact.pending);
  if (pending && warn) warn(`${stage.name} runs, ${GRID_PENDING}`);
  if (exact && !exact.sums && args.anchor === 'box' && maxCells > PLAIN_BOX_CELLS[D]) {
    return refuse(`${exact.reason}. Without exact arithmetic a ${D}D box grid wider than ${PLAIN_BOX_CELLS[D]} cells per axis is off by more than half the ` +
      `tolerance, and this one may reach ${maxCells}. Set maxCells to ${PLAIN_BOX_CELLS[D]}, use the 'lattice' anchor, or run on the CPU`);
  }
  if (exact && !(exact.sums && exact.residual) && args.diffuse) {
    // smoothing over diffuse / cell^2 >= REFINE_GAMMA needs the refinement step, which needs both
    const gamma = gammaBound(args);
    if (!(gamma < REFINE_GAMMA)) {
      return refuse(`${exact.reason}. Without exact arithmetic smoothing with diffuse / cell^2 of ${REFINE_GAMMA} or more is off by more than half the ` +
        `tolerance, and this grid's ${Number.isFinite(gamma) ? `is ${+gamma.toPrecision(4)}` : 'comes from expressions, known only as it runs'}. Run it on the CPU`);
    }
  }

  // The step's numbers: the caller's slot, or a uniform of the grid's own
  const names = gridNumbers(D);
  stage.params.forEach(param => names.push('param:' + param.name));
  (stage.builtIns || []).forEach(name => names.push('builtIn:' + name));
  let own = null;
  if (!values) {
    const floats = Math.max(16, Math.ceil(names.length / 4) * 4);
    own = { names, floats };
    values = {
      decl: binding => `@group(0) @binding(${binding}) var<uniform> V: array<vec4f, ${floats / 4}>;`,
      at: name => {
        const index = names.indexOf(name);
        if (index < 0) throw new Error(`the grid reads no number ${name}`);
        return `V[${index >> 2}].${AX$3[index & 3]}`;
      },
    };
  }

  // The deposit value per body, when it reads columns; else the host gives it per step
  let deposit = null;
  try {
    deposit = printDeposit(args.value, stage, D, {
      param: name => values.at('param:' + name),
      builtIn: name => values.at('builtIn:' + name),
      column,
    }, printer || createPrinter(warn));
  } catch (e) {
    return refuse('the deposit value: ' + e.message);
  }

  const capacity = gridCapacity(D, maxCells);
  const TS = tableSize(maxCells);
  const keyWords = deposit ? 3 : 2, spWords = deposit && D === 3 ? 2 : 1;
  const size = bytes => Math.max(16, Math.ceil(bytes / 16) * 16);
  const buffers = {
    gridMeta: size((META.TABLE + 2 * TS) * 4),
    gridCount: size(capacity * 4),
    gridStart: size((capacity + capacity / 2048) * 4),
    gridKey: size(keyWords * n * 4),
    gridSp: size(spWords * n * 16),
    gridChunk: size(gridChunkWords(n) * 4),
    // crowded cells' 64-bit sums
    gridAcc: size(2 * capacity * 4),
    gridField: size(capacity * 4),
  };
  // a smoothed field's low word (the refinement step, see residual() in wgsl.js)
  if (args.diffuse) buffers.gridLo = size(capacity * 4);
  const largest = Math.min(limits.maxStorageBufferBindingSize, limits.maxBufferSize);
  const over = Object.keys(buffers).filter(name => buffers[name] > largest);
  if (over.length) {
    const name = over.sort((a, b) => buffers[b] - buffers[a])[0];
    return refuse(`a ${D}D grid of up to ${maxCells.toLocaleString('en-US')} cells per axis at ${n.toLocaleString('en-US')} bodies needs ` +
      `${megabytes$3(buffers[name])} for ${name}; this device allows ${megabytes$3(largest)} per buffer`, buffers);
  }
  if (Math.ceil(n / WG$2) > limits.maxComputeWorkgroupsPerDimension) return refuse(`grid fields run up to ${(limits.maxComputeWorkgroupsPerDimension * WG$2).toLocaleString('en-US')} bodies`);

  const into = args.into || {};
  const spec = {
    D, label, maxCells, capacity,
    anchor: args.anchor, weights: args.weights, self: args.self, smooth: !!args.diffuse,
    pos, outputs: { value: column(into.value), gradient: column(into.gradient) }, deposit, values,
  };
  const kernels = gridKernels(spec);
  return {
    refusal: null, D, n, label, maxCells, capacity, tableSize: TS, anchor: args.anchor,
    smooth: spec.smooth, deposit: !!deposit, buffers, kernels, values, own, pending,
    slotNames: names,
    // MINMAX, PARAMS, BIN, 2 scans, ORDER, CROWD, DEPOSIT, GATHER; with smoothing a sweep per
    // axis, the residual and a sweep per axis again
    dispatches: 9 + (spec.smooth ? 2 * D + 1 : 0),
  };
}

// diffuse / cell^2 at most, when both are numbers in the description (a box's cell only grows);
// else Infinity
function gammaBound(args) {
  const number = x => (x && x.kind === 'number' ? x.value : NaN);
  const gamma = number(args.diffuse) / (number(args.cell) * number(args.cell));
  return gamma >= 0 ? gamma : Infinity;
}

/**
 * The first of a grid's numbers for a step (simulator.stageValues()) that does not fit f32, as
 * {name, value}, or null. The device would turn them into NaN or no grid without a word.
 */
function gridNumberProblem(numbers) {
  const names = { cell: 'grid cell', margin: 'grid margin', diffuse: 'smoothing\'s diffuse', value: 'deposit value' };
  for (const name of Object.keys(names)) {
    const value = numbers[name];
    if (value === null || value === undefined) continue;
    if (!Number.isFinite(value) || Math.abs(value) > F32_MAX) return { name: names[name], value };
  }
  return null;
}

/**
 * What plan() says about a grid stage on a device with `limits` (for n bodies in D dimensions):
 * {runs: true, how} or {runs: false, reason}.
 */
function checkGrid(stage, D, n, limits, printer) {
  const ref = buffer => ({ buffer, at: (row, k) => `${buffer}[${row} + ${k}u]` });
  const plan = planGrid({ stage, D, n, limits, printer, pos: ref('X'), column: () => ref('S') });
  if (plan.refusal) return { runs: false, reason: plan.refusal };
  const args = stage.args;
  return {
    runs: true,
    how: `a ${args.anchor} grid of up to ${args.maxCells.toLocaleString('en-US')} cells per axis, ${args.weights} weights` +
      `${plan.smooth ? ', smoothed' : ''}${args.self === 'exclude' ? ', own share left out' : ''}: ${plan.dispatches} dispatches` +
      `${plan.pending ? `; ${GRID_PENDING}` : ''}`,
  };
}

/**
 * The grid's own numbers for one step, from simulator.stageValues(name, context) of its stage:
 * {cell, cellLow, margin, marginLow, diffuse, value, phase0, ...}. `origin` is the f64 origin of the positions on the
 * device: on a lattice, phase_k = origin_k mod cell puts relative positions back on the lattice
 * (0 when the origin sits on it).
 */
function gridSlotValues(numbers, origin, D, anchor) {
  // the f32 cell and margin, plus what f32 drops of them (the device works in hi + lo)
  const low = x => (Number.isFinite(x) && Math.abs(x) < 3e38 ? x - Math.fround(x) : 0);
  const out = {
    cell: numbers.cell,
    cellLow: low(numbers.cell),
    margin: numbers.margin,
    marginLow: low(numbers.margin),
    diffuse: numbers.diffuse || 0,
    value: numbers.value === null || numbers.value === undefined ? 1 : numbers.value,
  };
  const cell = numbers.cell;
  for (let k = 0; k < D; k++) {
    const o = origin ? origin[k] : 0;
    out['phase' + k] = anchor === 'lattice' && o !== 0 && cell > 0 && cell < Infinity ? o - cell * Math.floor(o / cell) : 0;
  }
  return out;
}

/**
 * True when the grid stage's numbers can change from one step to the next within a call (so
 * every queued step needs its own slot)
 */
function gridIsDynamic(stage) {
  const args = stage.args || {};
  if (stage.when) return true;
  if (['cell', 'margin', 'diffuse', 'value'].some(key => args[key] && args[key].kind === 'host')) return true;
  if (stage.params.some(param => param.kind === 'host')) return true;
  return (stage.builtIns || []).indexOf('step') >= 0;
}

/**
 * GPU time of one step of the grid at its worst, in ms on an M4 Max (the engine scales it by the
 * device's speed), for the runner's bound on steps per submit. Measured at 1M bodies: piled into
 * one cell 1.0-1.1 ms (BIN's counter takes every body); about 64 bodies in every cell, the gather's
 * longest threads, 0.38-0.68 ms; the grid at maxCells 0.63 ms (2,003^2 lattice), 0.88 ms (131^3)
 * and 1.43 ms (2,050^2 box, smoothed and refined).
 */
function gridCappedMs(plan) {
  return 0.1 + 1.2 * plan.n / 1e6 + 0.3 * plan.capacity / 1e6;
}

/**
 * GPU ms of a relaxed step of the grid on an M4 Max, at most: n bodies and `points` grid points
 * this step. A lower envelope of the measured steps (100k and 1M bodies, 2D and 3D, both grids of
 * timegrid.js), so a step timed on a device, divided by it, gives that device's factor or more
 * (build.js observeTime()).
 */
function gridRelaxedMs(plan, points) {
  return 0.02 + 0.25 * plan.n / 1e6 + (plan.smooth ? 0.15 : 0.03) * points / 1e6;
}

/**
 * The message to halt with for the 4 status words of a grid (build.js `status`), or null.
 * Sticky: the first problem stays until the grid is built again.
 */
function gridStatus(words, plan, stageName) {
  const code = words[0];
  if (!code) return null;
  const f = new Float32Array(new Uint32Array([words[1], words[2]]).buffer);
  const cells = Number.isFinite(f[0]) ? Math.round(f[0]) : f[0];
  const cell = +f[1].toPrecision(6);
  if (code === 1) {
    // a smoothed lattice: the CPU module's words, numbers as it prints them (it stops too)
    const spans = `Grid field ${stageName}: the layout spans ${cells} cells at cell ${cell}`;
    if (plan.smooth) return `${spans}; maxCells is ${plan.maxCells}`;
    // without smoothing the CPU keeps going past maxCells (in bricks of cells); the GPU's grid is dense
    return `${spans}, more than the GPU's maxCells of ${plan.maxCells}; the CPU runs this lattice at any width. Raise maxCells, or run on the CPU`;
  }
  return `Grid field ${stageName}: the grid needs ${cells} cells, more than its buffers hold (${plan.capacity})`;
}

/**
 * The per-body deposit value as WGSL of row `i`, or null when it reads no column (the host gives
 * it per step then): {lines, code, buffers}. Names resolve as the CPU module resolves them:
 * params, then columns, then built in values.
 */
function printDeposit(value, stage, D, scope, printer) {
  const columns = new Set(stage.reads.filter(r => r.space === 'nodes' && r.column !== 'pos').map(r => r.column));
  if (!columns.size) return null;
  if (!value || value.kind !== 'expression') throw new Error('a deposit value that reads columns should be an expression');
  const params = new Set(stage.params.map(p => p.name));
  const builtIns = new Set(stage.builtIns || []);
  const used = [];
  const compiled = formula.compile(value.text, {
    D,
    name(id) {
      if (params.has(id)) return { type: 'num', code: scope.param(id) };
      if (columns.has(id)) {
        const ref = scope.column(id);
        if (used.indexOf(ref.buffer) < 0) used.push(ref.buffer);
        return { type: 'num', code: ref.at('i', 0) };
      }
      if (builtIns.has(id)) return { type: 'num', code: scope.builtIn(id) };
      return undefined;
    },
  }, printer);
  if (!compiled.result || compiled.result.type !== 'num') throw new Error('it should give a number');
  return { lines: compiled.lines, code: compiled.result.code, buffers: used };
}

function megabytes$3(bytes) {
  return (bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0) + ' MiB';
}

// Reading the step as data (simulator.program()): the stages that compute physics, and the stage
// runOnGpu() adds to guard layout.step().

// The stage runOnGpu() adds so that layout.step() throws while the GPU runs the layout
const GUARD = 'runsOnGpu';
// The stock step, in the order the CPU runs it
const STOCK_STAGES = ['clear', 'repulsion', 'drag', 'springs', 'integrate'];

function isGuard(stage) {
  return stage.name === GUARD && stage.shape === 'guard';
}

/**
 * The stages of `program` that compute physics: all but the guard.
 */
function physicsStages(program) {
  return program.stages.filter(stage => !isGuard(stage));
}

// WGSL of the generic grid pyramid: the far field of the tree passes (the stock repulsion and the
// addRepulsion passes walked with it) for every plan that is not the exact 2D stock step, in 2D
// and 3D, with K charges at once (design 6.6 and 9.1). It is today's grid engine
// (templates/grid.js) with every coordinate unrolled per axis and every cell sum kept per charge:
//
//   robust box -> bin bodies into a G^D Morton grid (counting sort; index order within a cell, so
//   runs repeat exactly) -> per cell, each charge's sum and centre -> 2^D reductions up to one
//   cell -> per cell, the far field of its interaction list (children of the parent's 3^D
//   neighbours that are not my neighbours) as a field and a Jacobian per charge at the cell's
//   middle -> per body, in the node kernel that fuses the section: exact pairs in its 3^D cells
//   and the far field down its chain of cells, each charge weighted by the body's sensitivity.
//
// Charges. Channel 0 opens nothing here (the pyramid has no theta) but sets the shared centre: a
// channel with centroid 'shared' acts from channel 0's centre of the cell (from the mean of its
// bodies when channel 0 weighs nothing there), the others from their own centre. Centres weight
// positions by |charge|, so charges of any sign have one (the CPU tree asks for charges >= 0
// there; for those the two agree). Channels with one law object evaluate it once per pair, and a
// law is not evaluated where the weight of its channels is 0 (as the CPU's K-charge tree does).
//
// Buffers (all owned by the pyramid, except the columns it reads through `colRef`s):
//   treeBox   box state: bounding box, grid box, histogram centre, then D histograms
//   treeCount atomic body counts per finest cell (zeroed by the scan)
//   treeWork  [cell (bit 31: outside the box) and slot per body: 2n | bodies by atomic slot: n]
//   treeMeta  [start per finest cell | (row, cell) per sorted body: 2n | sorted slot per row: n |
//              bodies per cell of every level]
//   treeSp    per sorted body: position, then each channel's charge (vec4s)
//   treeCells [lookup tables | per cell of every level: charge sums and centres | per cell of
//              every level but the top: the local expansion (centre, then field and Jacobian per
//              channel) | per sorted body: the push of crowded near cells per channel]
//   treeLists [heavy count, crowded count, status, work, occupied count | heavy finest cells (3D) |
//              crowded cells | occupied finest cells (3D)]

const WG$1 = 256;
const HIST_BINS = 1024;
// Workgroups of TREE_HIST, at most
const HIST_GROUPS = 128;
// A finest cell whose charge per body passes this many times the mean is heavy (see TREE_HEAVY)
const HEAVY = 8;
// Workgroups of TREE_HEAVY, and threads in each
const HEAVY_GROUPS = 64, HEAVY_THREADS = 64;
// Workgroups that TREE_LOCAL adds for crowded cells (see tree_crowd)
const CROWD_GROUPS = 128;
// treeLists: heavy count, crowded count, status (the largest crowded cell of the first step whose
// crowded work was over the cap, else 0; it stays until the buffers are made again, so a readback
// after a batch sees it), that step's work (millions of pair evaluations), occupied count, hub
// count, 1 spare, the last step's crowded work (millions of pair evaluations, weighted by the
// charges: the cap's unit, see CHARGE_WEIGHT), then the lists. BOX clears all but the status every
// step.
const LIST_HEAD = 8;
// Heavy bodies (hubs): a body whose charges pass HEAVY times the mean takes its far field from
// TREE_LOCAL's HUB_GROUPS extra workgroups (see tree_hub), at most HUB_MAX of them a step
const HUB_GROUPS = 32;
const HUB_MAX = 2047;
const AX$2 = 'xyzw';

function each$1(n, fn, sep = ' ') {
  const out = [];
  for (let k = 0; k < n; k++) out.push(fn(k));
  return out.join(sep);
}

// The crowded work of a pair evaluation with K charges, in evaluations with one: the distance and
// the law once, an accumulation per charge (gpu-critic-2's pyrcap.js: 5 charges took 1.9 times
// one charge's time)
const chargeWeight = K => 1 + (K - 1) / 4;

// Literal for a float the generator knows (always with a decimal point)
function lit(value) {
  let text = String(Math.fround(value));
  if (/^-?\d+$/.test(text)) text += '.0';
  else if (/e/.test(text) && !/\./.test(text)) text = text.replace('e', '.0e');
  return value < 0 ? '(' + text + ')' : text;
}

// Word `w` of a record loaded into vec4 locals `name0`, `name1`, ...
function word(name, w) {
  return `${name}${w >> 2}.${AX$2[w & 3]}`;
}

function loadVec4s(name, buffer, base, count) {
  return each$1(count, j => `let ${name}${j} = ${buffer}[${base}${j ? ` + ${j}u` : ''}];`);
}

// `words` (WGSL expressions) as vec4f constructors, zero padded
function vec4sOf(words) {
  const out = [];
  for (let j = 0; j < words.length; j += 4) {
    const four = [0, 1, 2, 3].map(q => (j + q < words.length ? words[j + q] : '0.0'));
    out.push(`vec4f(${four.join(', ')})`);
  }
  return out;
}

// vec4 writes of `words` (WGSL expressions) at `base`, zero padded
function storeVec4s(buffer, base, words) {
  return vec4sOf(words).map((v, j) => `${buffer}[${base}${j ? ` + ${j}u` : ''}] = ${v};`).join(' ');
}

/**
 * The layout of a pyramid for `D` and `channels` ([{own}]: own centre or channel 0's): record
 * words, vec4 strides and the box state. Channel 0 always has its own centre.
 */
function pyramidLayout(D, channels, tableWords = 0) {
  const K = channels.length;
  const JN = D * (D + 1) / 2;
  // cell record: S_0, C_0, then per channel S_c and its own centre if it has one
  const S = [], C = [];
  let w = 0;
  channels.forEach((channel, c) => {
    S.push(w++);
    if (c === 0 || channel.own) { C.push(w); w += D; } else C.push(C[0]);
  });
  const CSW = w;
  // bodies per cell: in the record's padding when it has some, else in treeMeta
  const CNT = CSW % 4 ? CSW : -1;
  // local expansion: its centre, then per channel the field, the Jacobian and, for a channel at
  // second order (`second`), the field's second derivatives (T[c] is -1 for the others)
  const TN = D * (D + 1) * (D + 2) / 6;
  const F = [], J = [], T = [];
  w = D;
  channels.forEach(channel => {
    F.push(w); J.push(w + D); w += D + JN;
    if (channel.second) { T.push(w); w += TN; } else T.push(-1);
  });
  const LSW = w;
  const pairs = [], triples = [];
  for (let a = 0; a < D; a++) for (let b = a; b < D; b++) pairs.push([a, b]);
  for (let a = 0; a < D; a++) for (let b = a; b < D; b++) for (let c = b; c < D; c++) triples.push([a, b, c]);
  return {
    D, K, JN, pairs, TN, triples, T,
    SPW: D + K, SP4: Math.ceil((D + K) / 4),
    S, C, CSW, CS4: Math.ceil(CSW / 4), CNT,
    F, J, LSW, LS4: Math.ceil(LSW / 4),
    TAB4: Math.ceil(tableWords / 4),
    box: boxLayout(D),
    bits: Math.floor(31 / D),
  };
}

// Box state (u32 words) for D axes
function boxLayout(D) {
  const L = { BB_MIN: 0, BB_MAX: D, ORIGIN: 2 * D, SIDE: 3 * D, INV: 3 * D + 1, CENTRE: 3 * D + 2, DIAG: 4 * D + 2 };
  L.HEADER = Math.ceil((4 * D + 3) / 4) * 4;
  // |charge| summed per HIST workgroup, then over them (BOX): the mean that makes a body heavy
  L.PART = L.HEADER + D * HIST_BINS;
  L.TOTAL = L.PART + HIST_GROUPS;
  L.size = L.TOTAL + 1;
  return L;
}

// Bit spreading for Morton codes (bit b of x goes to bit b * D), with the classic magic numbers
function spreadSteps(D, bits) {
  const at = [];
  for (let i = 0; i < bits; i++) at.push(i);
  const steps = [];
  for (let j = Math.floor(Math.log2(Math.max(1, bits - 1))); j >= 0; j--) {
    const shift = (1 << j) * (D - 1);
    for (let i = 0; i < bits; i++) if ((i >> j) & 1) at[i] += shift;
    let mask = 0;
    for (const p of at) mask = (mask | (1 << p)) >>> 0;
    steps.push([shift, mask >>> 0]);
  }
  return steps;
}

const hex = v => '0x' + (v >>> 0).toString(16) + 'u';

function mortonFns(D, bits) {
  const steps = spreadSteps(D, bits);
  const low = ((1 << bits) - 1) >>> 0;
  const back = [];
  for (let j = steps.length - 1; j >= 0; j--) back.push([steps[j][0], j ? steps[j - 1][1] : low]);
  return /* wgsl */`
fn tree_spread(v: u32) -> u32 {
  var x = v & ${hex(low)};
  ${steps.map(([sh, m]) => `x = (x | (x << ${sh}u)) & ${hex(m)};`).join(' ')}
  return x;
}
fn tree_compact(v: u32) -> u32 {
  var x = v & ${hex(steps[steps.length - 1][1])};
  ${back.map(([sh, m]) => `x = (x | (x >> ${sh}u)) & ${hex(m)};`).join(' ')}
  return x;
}`;
}

// Direction for two coincident bodies, from their indices: deterministic and antisymmetric,
// tree_jitter(a, b) == -tree_jitter(b, a), with length 0.01 (2D: today's, templates/grid.js)
function jitterFn(D) {
  const hash = `var h = min(a, b) * 747796405u + max(a, b) * 2891336453u + 1u;
  h = ((h >> 16u) ^ h) * 0x45d9f3bu; h = ((h >> 16u) ^ h) * 0x45d9f3bu; h = (h >> 16u) ^ h;`;
  if (D === 2) {
    return `
fn tree_jitter(a: u32, b: u32) -> vec2f {
  ${hash}
  let angle = f32(h) * (6.2831853 / 4294967296.0);
  return select(-0.01, 0.01, a < b) * vec2f(cos(angle), sin(angle));
}`;
  }
  return `
fn tree_jitter(a: u32, b: u32) -> vec3f {
  ${hash}
  let z = f32(h & 0xffffu) * (2.0 / 65536.0) - 1.0;
  let angle = f32(h >> 16u) * (6.2831853 / 65536.0);
  let s = sqrt(max(0.0, 1.0 - z * z));
  return select(-0.01, 0.01, a < b) * vec3f(s * cos(angle), s * sin(angle), z);
}`;
}

// Nested loops over a box of cells lo<k>..hi<k> (variables x<k>), with the Morton code of the
// current cell in mm0 and `body` innermost
function boxLoops(D, body, indent, lo = 'lo', hi = 'hi') {
  let open = '', close = '';
  for (let k = D - 1; k >= 0; k--) {
    const pad = indent + '  '.repeat(D - 1 - k);
    open += `${pad}for (var x${k} = ${lo}${k}; x${k} <= ${hi}${k}; x${k}++) {\n`;
    open += `${pad}  let mm${k} = ${k === D - 1 ? '' : `mm${k + 1} | `}(tree_spread(u32(x${k})) << ${k}u);\n`;
    close = `${pad}}\n` + close;
  }
  const pad = indent + '  '.repeat(D);
  return open + body.trim().split('\n').map(line => pad + line.trim()).join('\n') + '\n' + close;
}

// max(a, max(b, c)) of WGSL terms
function maxOf(terms) {
  return terms.reduce((acc, term) => (acc ? `max(${acc}, ${term})` : term), '');
}

// Thread index over a 1D or 2D grid of workgroups (2D past 65,535 workgroups, see build.js)
const LINEAR$1 = `@builtin(global_invocation_id) gid: vec3u, @builtin(num_workgroups) nwg: vec3u`;
const LINEAR_ID = `gid.x + gid.y * nwg.x * ${WG$1}u`;

/**
 * The struct of the pyramid's uniform. `lawWords`: numbers of the laws kept here (0 when the
 * caller's step values hold them).
 */
function paramsStruct(lawWords) {
  return /* wgsl */`
struct TreeParams {
  n: u32, G: u32, levels: u32, nCells: u32,
  locOff: u32, metaTag: u32, metaRow: u32, metaCount: u32,
  nearCap: u32, outlierRank: u32, gravity: f32, top: u32,
  localGroups: u32, crowdOff: u32, workCap: f32, crowdList: u32,
  occList: u32, hubOff: u32, hubList: u32, pad0: u32,${lawWords ? `
  law: array<vec4f, ${Math.ceil(lawWords / 4)}>,` : ''}
};`;
}

// ---------------------------------------------------------------------------------------------
// Laws: per law group, functions of r (and r^2) for F(r)/r (k1) and (F(r)/r - F'(r))/r^2 (k2)
// ---------------------------------------------------------------------------------------------

function lawFunctions(spec) {
  const { groups, L } = spec;
  const printer = createPrinter(spec.warn);
  return groups.map((group, g) => {
    if (group.isDefault) {
      return `
fn tree_k1_${g}(r: f32, r2: f32) -> f32 { return 1.0 / (r2 * r); }
fn tree_k12_${g}(r: f32, r2: f32) -> vec2f { let k1 = 1.0 / (r2 * r); return vec2f(k1, 3.0 * k1 / r2); }${group.second ? `
fn tree_k123_${g}(r: f32, r2: f32) -> vec3f { let k1 = 1.0 / (r2 * r); let k2 = 3.0 * k1 / r2; return vec3f(k1, k2, 5.0 * k2 / r2); }` : ''}`;
    }
    const law = group.law;
    const prologue = lawPrologue(law, i => group.value(i));
    const tables = (group.tables || []).map(table => tableFns(g, table)).join('');
    const body = (k2) => withTables$1(g, law.emit(printer, L.D, 'r', 'k1', k2 ? 'k2' : undefined));
    return `${tables}
fn tree_k1_${g}(r: f32, r2: f32) -> f32 { ${prologue} ${body(false)} return k1; }
fn tree_k12_${g}(r: f32, r2: f32) -> vec2f { ${prologue} ${body(true)} return vec2f(k1, k2); }${group.second ? `
// k3 = -k2'(r) / r, from k2 at r (1 +- 1/64)
fn tree_k123_${g}(r: f32, r2: f32) -> vec3f {
  let k = tree_k12_${g}(r, r2);
  let rp = r * 1.015625; let rm = r * 0.984375;
  let kp = tree_k12_${g}(rp, rp * rp).y; let km = tree_k12_${g}(rm, rm * rm).y;
  return vec3f(k.x, k.y, (km - kp) * 32.0 / r2);
}` : ''}${law.hasRange ? `
fn tree_in_${g}(r2: f32) -> bool { ${prologue} return r2 <= lawRange2; }` : ''}`;
  }).join('\n');
}

// A table call printed by the law compiler (lawFunctions.T.value(x) and its derivative) becomes a
// lookup in treeCells
function withTables$1(g, code) {
  const arg = '(\\(?[^()]*\\)?)';
  return code
    .replace(new RegExp(`\\(lawFunctions\\.(\\w+)\\.derivative \\? lawFunctions\\.\\w+\\.derivative\\(${arg}\\) : 0\\)`, 'g'), `tree_slope_${g}_$1($2)`)
    .replace(new RegExp(`lawFunctions\\.(\\w+)\\.value\\(${arg}\\)`, 'g'), `tree_table_${g}_$1($2)`);
}

// Linear interpolation of the library's tables (lib/formula.js createTable): the first value at
// and below `from`, the last at and past `to`; the slope of the straight piece as the derivative
function tableFns(g, table) {
  const last = table.length - 1;
  const scale = last / (table.to - table.from);
  const read = idx => `tree_tableWord(${table.base}u + ${idx})`;
  return `
fn tree_table_${g}_${table.name}(x: f32) -> f32 {
  let q = (x - ${lit(table.from)}) * ${lit(scale)};
  if (!(q > 0.0)) { return ${read('0u')}; }
  if (q >= ${lit(last)}) { return ${read(`${last}u`)}; }
  let k = u32(q);
  let a = ${read('k')};
  return a + (${read('k + 1u')} - a) * (q - f32(k));
}
fn tree_slope_${g}_${table.name}(x: f32) -> f32 {
  let q = (x - ${lit(table.from)}) * ${lit(scale)};
  if (!(q > 0.0) || q >= ${lit(last)}) { return 0.0; }
  let k = u32(q);
  return (${read('k + 1u')} - ${read('k')}) * ${lit(scale)};
}`;
}

function tableWordFn(L) {
  return L.TAB4 ? `
fn tree_tableWord(w: u32) -> f32 { return treeCells[w >> 2u][w & 3u]; }` : '';
}

// Is any of `channels` weighing something at a source (an expression per channel)?
function nonzero(channels, value) {
  return channels.map(c => `${value(c)} != 0.0`).join(' || ');
}

// ---------------------------------------------------------------------------------------------
// Kernels
// ---------------------------------------------------------------------------------------------

/**
 * The structure kernels and the node section of a pyramid. `spec`:
 *   {D, channels: [{own, group}], groups: [{isDefault, law, value(i), tables, channels}], L,
 *    pos: colRef, charges: [colRef], lawWords, values?: {decl(binding), gravity}, warn}
 * colRef: {buffer, type?, at(row, axis)}.
 */
function pyramidKernels(spec) {
  const { D, L } = spec;
  const K = L.K;
  const BL = L.box;
  const HB = HIST_BINS;
  const common = paramsStruct(spec.lawWords) + mortonFns(D, L.bits) + jitterFn(D);
  const tp = `@group(0) @binding(0) var<uniform> TP: TreeParams;`;
  const stepDecl = spec.values ? spec.values.decl : null;
  const gravity = spec.values && spec.values.gravity ? spec.values.gravity : 'TP.gravity';

  // The caller's buffers a kernel reads columns from, each bound once, read only
  const columnBindings = (refs, first) => {
    const seen = [];
    refs.forEach(ref => { if (seen.indexOf(ref.buffer) < 0) seen.push(ref.buffer); });
    const types = {};
    refs.forEach(ref => { types[ref.buffer] = ref.type || 'array<f32>'; });
    return {
      names: seen,
      decl: seen.map((name, k) => `@group(0) @binding(${first + k}) var<storage, read> ${name}: ${types[name]};`).join('\n'),
    };
  };
  const posAt = (row, k) => spec.pos.at(row, k);

  const hubs = !!spec.hubs;
  // The near cells reach SEP cells around a body's cell (1: 3^D cells; 2 for laws that fall
  // slower than 1/r^2 in 2D, whose far field is mostly monopoles at every level: a source cell
  // then sits at least 3 cells away, not 2), and the interaction lists start past them.
  const SEP = spec.sep || 1, SIDE = 2 * SEP + 1, NEAR = SIDE ** D;
  // The step's crowded work in millions of pair evaluations: each crowded cell SCAN_BLOCKS listed,
  // times the bodies of its near cells (rounded up per cell, so the sum does not depend on the
  // list's order), from the starts. ORDER and AGG0 ask it in crowded cells only, before the cap is
  // checked in TREE_LOCAL: on a step the cap refuses they skip those cells (ranking a pile of 150k
  // bodies took 37.5 ms a step, summing it 20 ms; gpu-critic-2's m3-r1). `load` reads treeLists.
  const crowdWorkFn = load => /* wgsl */`
fn tree_crowd_work() -> u32 {
  let crowded = ${load('1u')};
  let Gi = i32(TP.G);
  var work = 0u;
  for (var l = 0u; l < crowded; l++) {
    let b = ${load('TP.crowdList + l')};
    ${each$1(D, k => `let x${k} = i32(tree_compact(b >> ${k}u));`, ' ')}
    var targets = 0u;
    for (var nu = 0u; nu < ${NEAR}u; nu++) {
      ${each$1(D, k => `let y${k} = x${k} + i32((nu / ${SIDE ** k}u) % ${SIDE}u) - ${SEP};`, ' ')}
      if (${each$1(D, k => `y${k} < 0 || y${k} >= Gi`, ' || ')}) { continue; }
      let y = ${each$1(D, k => `(tree_spread(u32(y${k})) << ${k}u)`, ' | ')};
      targets += select(TP.n, treeMeta[y + 1u], y + 1u < TP.nCells) - treeMeta[y];
    }
    let nb = select(TP.n, treeMeta[b + 1u], b + 1u < TP.nCells) - treeMeta[b];
    work += u32(ceil(f32(nb) * f32(targets) * 1e-6));
  }
  return work;
}
// the cap refuses this step's crowded cells (weighted by the charges, see chargeWeight)
fn tree_refused() -> bool { return f32(tree_crowd_work()) * ${lit(chargeWeight(K) * 1e6)} > TP.workCap; }`;
  const HIST = (() => {
    const cols = columnBindings(hubs ? [spec.pos].concat(spec.charges) : [spec.pos], 1);
    return common + /* wgsl */`
${tp}
${cols.decl}
@group(0) @binding(${1 + cols.names.length}) var<storage, read_write> treeBox: array<atomic<u32>>;
var<workgroup> hist: array<atomic<u32>, ${D * HB}>;
var<workgroup> wb: array<atomic<u32>, ${2 * D}>;${hubs ? `
var<workgroup> qpart: array<f32, ${WG$1}>;
var<workgroup> qneed: u32;` : ''}
fn fenc(v: f32) -> u32 { let u = bitcast<u32>(v); return select(u | 0x80000000u, ~u, (u & 0x80000000u) != 0u); }
fn hbin(d: f32) -> u32 {
  let key = u32(clamp(i32(bitcast<u32>(abs(d)) >> 20u) - 824, 0, 511));
  return select(512u + key, 511u - key, d < 0.0);
}
@compute @workgroup_size(${WG$1})
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_index) li: u32,
        @builtin(num_workgroups) nwg: vec3u, @builtin(workgroup_id) wid: vec3u) {
  for (var b = li; b < ${D * HB}u; b += ${WG$1}u) { atomicStore(&hist[b], 0u); }
  if (li < ${D}u) { atomicStore(&wb[li], 0xffffffffu); } else if (li < ${2 * D}u) { atomicStore(&wb[li], 0u); }${hubs ? `
  // the |charge| total comes from the last step's top cell (BOX); the first step sums it here
  if (li == 0u) { qneed = select(0u, 1u, atomicLoad(&treeBox[${BL.TOTAL}]) == 0u); }
  let needQ = workgroupUniformLoad(&qneed) != 0u;` : `
  workgroupBarrier();`}
  ${each$1(D, k => `let c${k} = bitcast<f32>(atomicLoad(&treeBox[${BL.CENTRE + k}]));`)}
  ${each$1(D, k => `var mn${k} = 3e38; var mx${k} = -3e38;`)}${hubs ? `
  var qs = 0.0;` : ''}
  for (var i = gid.x; i < TP.n; i += nwg.x * ${WG$1}u) {
    ${each$1(D, k => `let p${k} = ${posAt('i', k)};`)}
    if (!(${each$1(D, k => `abs(p${k}) < 1e37`, ' && ')})) { continue; } // NaN or inf${hubs ? `
    if (needQ) { qs += ${spec.charges.map(ref => `abs(${ref.at('i', 0)})`).join(' + ')}; }` : ''}
    ${each$1(D, k => `mn${k} = min(mn${k}, p${k}); mx${k} = max(mx${k}, p${k});`)}
    ${each$1(D, k => `atomicAdd(&hist[${k * HB}u + hbin(p${k} - c${k})], 1u);`)}
  }
  ${each$1(D, k => `atomicMin(&wb[${k}], fenc(mn${k})); atomicMax(&wb[${D + k}], fenc(mx${k}));`)}
  workgroupBarrier();
  for (var b = li; b < ${D * HB}u; b += ${WG$1}u) {
    let v = atomicLoad(&hist[b]);
    if (v != 0u) { atomicAdd(&treeBox[${BL.HEADER}u + b], v); }
  }
  if (li == 0u) {
    ${each$1(D, k => `atomicMin(&treeBox[${BL.BB_MIN + k}], atomicLoad(&wb[${k}])); atomicMax(&treeBox[${BL.BB_MAX + k}], atomicLoad(&wb[${D + k}]));`, '\n    ')}
  }${hubs ? `
  // this workgroup's |charge| sum, in a fixed tree (BOX adds the workgroups' in order)
  if (needQ) {
    qpart[li] = qs;
    for (var h = ${WG$1 / 2}u; h > 0u; h >>= 1u) {
      workgroupBarrier();
      if (li < h) { qpart[li] += qpart[li + h]; }
    }
    if (li == 0u) { atomicStore(&treeBox[${BL.PART}u + wid.x], bitcast<u32>(qpart[0])); }
  }` : ''}
}`;
  })();

  // One workgroup: quantiles from the histograms -> grid box: the bounding box, shrunk to the
  // [k, n - 1 - k] quantile range (k = outlierRank) plus a 25% margin when that is smaller, so
  // ordinary layouts get exactly the bounding box. Moves the histogram centre to the median and
  // resets the histograms and the bounding box for the next step.
  const heavyCells = !!spec.heavyCells;
  const BOX = common + /* wgsl */`
${tp}
@group(0) @binding(1) var<storage, read_write> treeBox: array<u32>;
@group(0) @binding(2) var<storage, read_write> treeLists: array<u32>;
var<workgroup> scan: array<u32, ${WG$1}>;
var<workgroup> found: array<f32, ${3 * D}>;
var<workgroup> total: u32;${hubs ? `
var<workgroup> qsum: array<f32, ${WG$1}>;
var<workgroup> qneed: u32;` : ''}
fn fdec(u: u32) -> f32 { return bitcast<f32>(select(~u, u & 0x7fffffffu, (u & 0x80000000u) != 0u)); }
fn keyLo(key: u32) -> f32 { return select(bitcast<f32>((key + 824u) << 20u), 0.0, key == 0u); }
fn keyHi(key: u32) -> f32 { return bitcast<f32>((key + 825u) << 20u); }
fn edgeLo(s: u32) -> f32 { return select(-keyHi(511u - s), keyLo(s - 512u), s >= 512u); }
fn edgeHi(s: u32) -> f32 { return select(-keyLo(511u - s), keyHi(s - 512u), s >= 512u); }
@compute @workgroup_size(${WG$1})
fn main(@builtin(local_invocation_index) li: u32) {
  if (li < ${3 * D}u) { found[li] = 0.0; }
  if (li < ${LIST_HEAD}u && li != 2u && li != 3u) { treeLists[li] = 0u; }${hubs ? `
  // The total |charge| (AGG0's measure of a hub): the first step adds HIST's workgroups' sums in
  // a fixed tree; the top cell's writer (tree_block) sets it for the next, so HIST reads no
  // charges then
  if (li == 0u) { qneed = select(0u, 1u, treeBox[${BL.TOTAL}] == 0u); }
  if (workgroupUniformLoad(&qneed) != 0u) {
    qsum[li] = select(0.0, bitcast<f32>(treeBox[${BL.PART}u + li]), li < min((TP.n + ${WG$1 - 1}u) / ${WG$1}u, ${HIST_GROUPS}u));
    for (var h = ${WG$1 / 2}u; h > 0u; h >>= 1u) {
      workgroupBarrier();
      if (li < h) { qsum[li] += qsum[li + h]; }
    }
    if (li == 0u) { treeBox[${BL.TOTAL}] = bitcast<u32>(qsum[0]); }
  }` : ''}
  for (var a = 0u; a < ${D}u; a++) {
    let base = ${BL.HEADER}u + a * ${HB}u + li * 4u;
    var cs = array<u32, 4>(treeBox[base], treeBox[base + 1u], treeBox[base + 2u], treeBox[base + 3u]);
    let t = cs[0] + cs[1] + cs[2] + cs[3];
    scan[li] = t;
    workgroupBarrier();
    for (var off = 1u; off < ${WG$1}u; off <<= 1u) {
      var v = scan[li];
      if (li >= off) { v += scan[li - off]; }
      workgroupBarrier();
      scan[li] = v;
      workgroupBarrier();
    }
    let count = scan[${WG$1 - 1}];
    if (li == 0u) { total = count; }
    var cum = scan[li] - t;
    if (count > 0u) {
      let k = min(TP.outlierRank, (count - 1u) / 2u);
      let rLo = k; let rHi = count - 1u - k; let rMed = count / 2u;
      for (var j = 0u; j < 4u; j++) {
        let s = li * 4u + j;
        let e = cum + cs[j];
        if (rLo >= cum && rLo < e) { found[a * 3u] = edgeLo(s); }
        if (rHi >= cum && rHi < e) { found[a * 3u + 1u] = edgeHi(s); }
        if (rMed >= cum && rMed < e) { found[a * 3u + 2u] = 0.5 * (edgeLo(s) + edgeHi(s)); }
        cum = e;
      }
    }
    for (var j = 0u; j < 4u; j++) { treeBox[base + j] = 0u; }
    workgroupBarrier();
  }
  if (li == 0u) {
    if (total > 0u) {
      var span = 0.0;
      ${each$1(D, k => `let c${k} = bitcast<f32>(treeBox[${BL.CENTRE + k}]); let qLo${k} = c${k} + found[${3 * k}]; let qHi${k} = c${k} + found[${3 * k + 1}]; span = max(span, qHi${k} - qLo${k});`, '\n      ')}
      let margin = 0.25 * span;
      var side = 0.0; var diag = 0.0;
      ${each$1(D, k => `let lo${k} = max(fdec(treeBox[${BL.BB_MIN + k}]), qLo${k} - margin); let hi${k} = min(fdec(treeBox[${BL.BB_MAX + k}]), qHi${k} + margin); side = max(side, hi${k} - lo${k}); diag = max(diag, fdec(treeBox[${BL.BB_MAX + k}]) - fdec(treeBox[${BL.BB_MIN + k}]));`, '\n      ')}
      side = max(side * 1.0001, 1e-3);
      ${each$1(D, k => `treeBox[${BL.ORIGIN + k}] = bitcast<u32>(0.5 * (lo${k} + hi${k}) - 0.5 * side); treeBox[${BL.CENTRE + k}] = bitcast<u32>(c${k} + found[${3 * k + 2}]);`, '\n      ')}
      treeBox[${BL.SIDE}] = bitcast<u32>(side); treeBox[${BL.INV}] = bitcast<u32>(f32(TP.G) / side);
      treeBox[${BL.DIAG}] = bitcast<u32>(diag);
    }
    ${each$1(D, k => `treeBox[${BL.BB_MIN + k}] = 0xffffffffu; treeBox[${BL.BB_MAX + k}] = 0u;`, '\n    ')}
  }
}`;

  const BIN = (() => {
    const cols = columnBindings([spec.pos], 1);
    const b = 1 + cols.names.length;
    return common + /* wgsl */`
${tp}
${cols.decl}
@group(0) @binding(${b}) var<storage, read> treeBox: array<u32>;
@group(0) @binding(${b + 1}) var<storage, read_write> treeCount: array<atomic<u32>>;
@group(0) @binding(${b + 2}) var<storage, read_write> treeWork: array<u32>;
@compute @workgroup_size(${WG$1})
fn main(${LINEAR$1}) {
  let i = ${LINEAR_ID};
  if (i >= TP.n) { return; }
  let inv = bitcast<f32>(treeBox[${BL.INV}]);
  let gmax = f32(TP.G - 1u);
  ${each$1(D, k => `let q${k} = (${posAt('i', k)} - bitcast<f32>(treeBox[${BL.ORIGIN + k}])) * inv;`, '\n  ')}
  // outside the box (by more than half a cell): clamped into a border cell
  let inside = ${each$1(D, k => `q${k} > -0.5 && q${k} < gmax + 1.5`, ' && ')};
  let c = ${each$1(D, k => `(tree_spread(u32(clamp(floor(q${k}), 0.0, gmax))) << ${k}u)`, ' | ')};
  treeWork[2u * i] = c | select(0x80000000u, 0u, inside);
  treeWork[2u * i + 1u] = atomicAdd(&treeCount[c], 1u);
}`;
  })();

  // Exclusive scan of the counts (nCells = a multiple of 1,024, at most 2^20) in blocks of 1,024
  // into the starts, listing the crowded cells (past the near cap); zeroes the counts for the next
  // step
  const SCAN_BLOCKS = paramsStruct(spec.lawWords) + /* wgsl */`
@group(0) @binding(0) var<storage, read_write> treeCount: array<u32>;
@group(0) @binding(1) var<storage, read_write> treeMeta: array<u32>;
@group(0) @binding(2) var<storage, read_write> blockSums: array<u32>;
@group(0) @binding(3) var<uniform> TP: TreeParams;
@group(0) @binding(4) var<storage, read_write> treeLists: array<atomic<u32>>;
var<workgroup> tmp: array<u32, 256>;
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) li: u32, @builtin(workgroup_id) wid: vec3u) {
  let base = wid.x * 1024u + li * 4u;
  let a0 = treeCount[base]; let a1 = treeCount[base + 1u]; let a2 = treeCount[base + 2u]; let a3 = treeCount[base + 3u];
  if (max(max(a0, a1), max(a2, a3)) > TP.nearCap) {
    let a = array<u32, 4>(a0, a1, a2, a3);
    for (var k = 0u; k < 4u; k++) {
      if (a[k] > TP.nearCap) { atomicStore(&treeLists[TP.crowdList + atomicAdd(&treeLists[1], 1u)], base + k); }
    }
  }
  treeCount[base] = 0u; treeCount[base + 1u] = 0u; treeCount[base + 2u] = 0u; treeCount[base + 3u] = 0u;
  let t = a0 + a1 + a2 + a3;
  tmp[li] = t;
  workgroupBarrier();
  for (var off = 1u; off < 256u; off <<= 1u) {
    var v = tmp[li];
    if (li >= off) { v += tmp[li - off]; }
    workgroupBarrier();
    tmp[li] = v;
    workgroupBarrier();
  }
  let ex = tmp[li] - t;
  treeMeta[base] = ex; treeMeta[base + 1u] = ex + a0; treeMeta[base + 2u] = ex + a0 + a1; treeMeta[base + 3u] = ex + a0 + a1 + a2;
  if (li == 255u) { blockSums[wid.x] = tmp[255]; }
}`;

  const SCAN_TOP = /* wgsl */`
@group(0) @binding(0) var<storage, read_write> blockSums: array<u32>;
@group(0) @binding(1) var<uniform> nb: vec4u;
var<workgroup> tmp: array<u32, 256>;
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) li: u32) {
  let base = li * 4u;
  var a = vec4u(0u);
  for (var k = 0u; k < 4u; k++) { if (base + k < nb.x) { a[k] = blockSums[base + k]; } }
  let t = a.x + a.y + a.z + a.w;
  tmp[li] = t;
  workgroupBarrier();
  for (var off = 1u; off < 256u; off <<= 1u) {
    var v = tmp[li];
    if (li >= off) { v += tmp[li - off]; }
    workgroupBarrier();
    tmp[li] = v;
    workgroupBarrier();
  }
  var ex = tmp[li] - t;
  for (var k = 0u; k < 4u; k++) { if (base + k < nb.x) { blockSums[base + k] = ex; } ex += a[k]; }
}`;

  const SCAN_ADD = paramsStruct(spec.lawWords) + /* wgsl */`
${tp}
@group(0) @binding(1) var<storage, read_write> treeMeta: array<u32>;
@group(0) @binding(2) var<storage, read> blockSums: array<u32>;
@compute @workgroup_size(${WG$1})
fn main(${LINEAR$1}) {
  let e = ${LINEAR_ID};
  if (e >= TP.nCells) { return; }
  treeMeta[e] += blockSums[e >> 10u];
}`;

  // Counting sort, part 1: bodies in the (run-dependent) order of the atomic slots
  const PLACE = paramsStruct(spec.lawWords) + /* wgsl */`
${tp}
@group(0) @binding(1) var<storage, read> treeMeta: array<u32>;
@group(0) @binding(2) var<storage, read_write> treeWork: array<u32>;
@compute @workgroup_size(${WG$1})
fn main(${LINEAR$1}) {
  let i = ${LINEAR_ID};
  if (i >= TP.n) { return; }
  treeWork[2u * TP.n + treeMeta[treeWork[2u * i] & 0x7fffffffu] + treeWork[2u * i + 1u]] = i;
}`;

  // Part 2: within a cell, bodies go in index order, so sums run in the same order every time and
  // runs repeat exactly (today's template ranks cells of up to 1,024 bodies only).
  // Writes each body's position and charges, its (row, cell), and its slot by row.
  const ORDER = (() => {
    const cols = columnBindings([spec.pos].concat(spec.charges), 1);
    const b = 1 + cols.names.length;
    const words = [];
    for (let k = 0; k < D; k++) words.push(`${posAt('i', k)}`);
    spec.charges.forEach(ref => words.push(ref.at('i', 0)));
    return paramsStruct(spec.lawWords) + mortonFns(D, L.bits) + /* wgsl */`
${tp}
${cols.decl}
@group(0) @binding(${b}) var<storage, read> treeWork: array<u32>;
@group(0) @binding(${b + 1}) var<storage, read_write> treeMeta: array<u32>;
@group(0) @binding(${b + 2}) var<storage, read_write> treeSp: array<vec4f>;
@group(0) @binding(${b + 3}) var<storage, read> treeLists: array<u32>;
${crowdWorkFn(i => `treeLists[${i}]`)}
@compute @workgroup_size(${WG$1})
fn main(${LINEAR$1}) {
  let i = ${LINEAR_ID};
  if (i >= TP.n) { return; }
  let raw = treeWork[2u * i];
  let c = raw & 0x7fffffffu;
  let s = treeMeta[c];
  let e = select(TP.n, treeMeta[c + 1u], c + 1u < TP.nCells);
  var rank = treeWork[2u * i + 1u];
  // A crowded cell keeps the atomic order on a step the cap refuses (nothing is computed from it),
  // and so does a cell of more than 65,536 bodies (65,536^2 pairs are refused)
  if (e - s <= 65536u && !(e - s > TP.nearCap && tree_refused())) {
    rank = 0u;
    for (var t = s; t < e; t++) { if (treeWork[2u * TP.n + t] < i) { rank++; } }
  }
  let k = s + rank;
  ${storeVec4s('treeSp', `k * ${L.SP4}u`, words)}
  treeMeta[TP.metaTag + 2u * k] = i;
  treeMeta[TP.metaTag + 2u * k + 1u] = raw;
  treeMeta[TP.metaRow + i] = k;
}`;
  })();

  // Finest cells: count, each channel's sum and centre (channel 0's centre falls back to the
  // mean of the bodies where its charges sum to 0). Bodies clamped into a border cell are left
  // out: at their real positions they would drag the cell's centres (and the expansions taken
  // there) far from its bodies. They still push their neighbours as exact pairs, and the rest
  // of the layout, far by definition, does without their push.
  const own = [];
  spec.channels.forEach((ch, c) => { if (c === 0 || ch.own) own.push(c); });
  const recordWords = (S, C, count) => {
    const words = [];
    for (let c = 0; c < K; c++) {
      words[L.S[c]] = S(c);
      if (own.indexOf(c) >= 0) for (let k = 0; k < D; k++) words[L.C[c] + k] = C(c, k);
    }
    if (L.CNT >= 0) words[L.CNT] = `f32(${count})`;
    return words;
  };
  // Records in registers, and the reduction of 2^D children (in child order, so runs repeat
  // exactly). `load` declares a child's vec4s a0.. and count n, and skips an empty child.
  const recType = `struct TreeRec { v: array<vec4f, ${L.CS4}>, n: u32 };`;
  const recOf = (name, words, count) => `var ${name}: TreeRec; ${vec4sOf(words).map((v, j) => `${name}.v[${j}] = ${v};`).join(' ')} ${name}.n = ${count};`;
  const putRec = (cell, r, metaCount) => each$1(L.CS4, j => `treeCells[${L.TAB4}u + (${cell}) * ${L.CS4}u + ${j}u] = ${r}.v[${j}];`) +
    (L.CNT < 0 ? ` treeMeta[${metaCount} + ${cell}] = ${r}.n;` : '');
  const CH = 1 << D;
  const parentOf = load => `
  ${each$1(K, c => `var m${c} = 0.0;`)}
  ${own.map(c => `var w${c} = 0.0; ` + each$1(D, k => `var s${c}_${k} = 0.0;`)).join(' ')}
  ${each$1(D, k => `var u${k} = 0.0;`)}
  var cnt = 0u;
  for (var ch = 0u; ch < ${CH}u; ch++) {
    ${load('ch')}
    cnt += n;
    ${each$1(K, c => `m${c} += ${word('a', L.S[c])};`)}
    ${own.map(c => `w${c} += abs(${word('a', L.S[c])}); ` + each$1(D, k => `s${c}_${k} += abs(${word('a', L.S[c])}) * ${word('a', L.C[c] + k)};`)).join(' ')}
    ${each$1(D, k => `u${k} += f32(n) * ${word('a', L.C[0] + k)};`)}
  }
  let mean = select(0.0, 1.0 / f32(cnt), cnt > 0u);
  ${own.map(c => `let i${c} = select(0.0, 1.0 / w${c}, w${c} != 0.0);`).join(' ')}
  ${each$1(D, k => `let c0_${k} = select(u${k} * mean, s0_${k} * i0, w0 != 0.0);`)}
  ${recOf('r', recordWords(c => `m${c}`, (c, k) => (c === 0 ? `c0_${k}` : `s${c}_${k} * i${c}`), 'cnt'), 'cnt')}`;

  // A workgroup's WG cells of one level are whole groups of 2^D children in Morton order, so it
  // reduces UP levels above them in its own memory (4 in 2D, 2 in 3D): TREE_AGG0 the first UP
  // above the finest cells, then each TREE_PYR dispatch UP more. At 10k bodies in 2D that is 2
  // dispatches instead of 8, and small graphs spend most of a step between dispatches. UP is 0
  // when the records do not fit in workgroup memory: one TREE_PYR dispatch per level then.
  const UP = spec.blockSteps || 0;
  const block = UP ? /* wgsl */`
var<workgroup> wRec: array<vec4f, ${WG$1 * L.CS4}>;${L.CNT < 0 ? `
var<workgroup> wCnt: array<u32, ${WG$1}>;` : ''}
fn tree_up(first: u32) -> TreeRec {${parentOf(ch => `let child = first + ${ch};
    ${L.CNT < 0 ? `let n = wCnt[child];
    if (n == 0u) { continue; }
    ${loadVec4s('a', 'wRec', `child * ${L.CS4}u`, L.CS4)}` : `${loadVec4s('a', 'wRec', `child * ${L.CS4}u`, L.CS4)}
    let n = u32(${word('a', L.CNT)});
    if (n == 0u) { continue; }`}`)}
  return r;
}
// r: this thread's record, in a level of \`count\` cells from cell \`off\`; \`at\`: the workgroup's first
// cell there. Writes the cells of up to \`steps\` levels above, as far as the WG cells reach.
fn tree_block(li: u32, at: u32, r: TreeRec, count: u32, off: u32, steps: u32, metaCount: u32) {
  ${each$1(L.CS4, j => `wRec[li * ${L.CS4}u + ${j}u] = r.v[${j}];`)}${L.CNT < 0 ? ' wCnt[li] = r.n;' : ''}
  var cells = count;
  var base = off;
  for (var j = 1u; j <= steps; j++) {
    workgroupBarrier();
    let parents = base + cells;
    cells = cells >> ${D}u;
    let first = at >> (${D}u * j);
    let live = li < (${WG$1}u >> (${D}u * j)) && first + li < cells;
    var up: TreeRec;
    if (live) {
      up = tree_up(li * ${CH}u);
      ${putRec('parents + first + li', 'up', 'metaCount')}${hubs ? `
      // the top cell: the next step's |charge| total (see BOX)
      if (cells == 1u) { treeBox[${BL.TOTAL}] = bitcast<u32>(${each$1(K, c => `abs(up.v[${L.S[c] >> 2}].${AX$2[L.S[c] & 3]})`, ' + ')}); }` : ''}
    }
    workgroupBarrier();
    if (live) { ${each$1(L.CS4, j => `wRec[li * ${L.CS4}u + ${j}u] = up.v[${j}];`)}${L.CNT < 0 ? ' wCnt[li] = up.n;' : ''} }
    base = parents;
  }
}` : '';

  const AGG0 = paramsStruct(spec.lawWords) + mortonFns(D, L.bits) + recType + /* wgsl */`
${tp}
@group(0) @binding(1) var<storage, read> treeSp: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> treeMeta: array<u32>;
@group(0) @binding(3) var<storage, read_write> treeCells: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> treeLists: array<atomic<u32>>;${hubs ? `
@group(0) @binding(5) var<storage, read_write> treeBox: array<u32>;` : ''}
${crowdWorkFn(i => `atomicLoad(&treeLists[${i}])`)}${spec.heads ? `
var<workgroup> wgOccupied: atomic<u32>;
var<workgroup> wgBase: u32;` : ''}${block}
@compute @workgroup_size(${WG$1})
fn main(${LINEAR$1}, @builtin(local_invocation_index) li: u32) {
  let c = ${LINEAR_ID};${spec.heads ? `
  if (li == 0u) { atomicStore(&wgOccupied, 0u); }
  workgroupBarrier();` : ''}
  var r: TreeRec;
  if (c < TP.nCells) { r = tree_aggregate(c); }${spec.heads ? `
  // the occupied finest cells, listed for LOCAL (a workgroup adds its own at once)
  var slot = 0xffffffffu;
  if (c < TP.nCells && r.n != 0u) { slot = atomicAdd(&wgOccupied, 1u); }
  workgroupBarrier();
  if (li == 0u) { wgBase = atomicAdd(&treeLists[4], atomicLoad(&wgOccupied)); }
  let base = workgroupUniformLoad(&wgBase);
  if (slot != 0xffffffffu) { atomicStore(&treeLists[TP.occList + base + slot], c); }` : ''}${UP ? `
  tree_block(li, c - li, r, TP.nCells, 0u, min(${UP}u, TP.levels), TP.metaCount);` : ''}
}
fn tree_aggregate(c: u32) -> TreeRec {
  let s = treeMeta[c];
  let e = select(TP.n, treeMeta[c + 1u], c + 1u < TP.nCells);
  // a crowded cell (SCAN_BLOCKS listed it): its near pushes are TREE_LOCAL's crowd workgroups'
  // work, and on a step the cap refuses nothing is computed from its sums
  if (e - s > TP.nearCap && tree_refused()) { var none: TreeRec; ${putRec('c', 'none', 'TP.metaCount')} return none; }
  ${each$1(K, q => `var m${q} = 0.0;`)}
  ${own.map(q => `var w${q} = 0.0; ` + each$1(D, k => `var s${q}_${k} = 0.0;`)).join(' ')}
  ${each$1(D, k => `var u${k} = 0.0;`)}
  // only a border cell can hold clamped bodies
  let border = ${each$1(D, k => `tree_compact(c >> ${k}u) == 0u || tree_compact(c >> ${k}u) == TP.G - 1u`, ' || ')};${hubs ? `
  let heavyQ = ${lit(HEAVY)} * bitcast<f32>(treeBox[${BL.TOTAL}]) / f32(TP.n);` : ''}
  var cnt = 0u;
  for (var t = s; t < e; t++) {
    if (border && treeMeta[TP.metaTag + 2u * t + 1u] >= 0x80000000u) { continue; }
    cnt++;
    ${loadVec4s('b', 'treeSp', `t * ${L.SP4}u`, L.SP4)}${hubs ? `
    if (${each$1(K, q => `abs(${word('b', D + q)})`, ' + ')} > heavyQ) {
      let h = atomicAdd(&treeLists[5], 1u);
      if (h < ${HUB_MAX}u) { atomicStore(&treeLists[TP.hubList + h], t); }
    }` : ''}
    ${each$1(K, q => `m${q} += ${word('b', D + q)};`)}
    ${own.map(q => `w${q} += abs(${word('b', D + q)}); ` + each$1(D, k => `s${q}_${k} += abs(${word('b', D + q)}) * ${word('b', k)};`)).join(' ')}
    ${each$1(D, k => `u${k} += ${word('b', k)};`)}
  }
  let mean = select(0.0, 1.0 / f32(cnt), cnt > 0u);
  ${own.map(q => `let i${q} = select(0.0, 1.0 / w${q}, w${q} != 0.0);`).join(' ')}
  ${each$1(D, k => `let c0_${k} = select(u${k} * mean, s0_${k} * i0, w0 != 0.0);`)}
  ${recOf('r', recordWords(q => `m${q}`, (q, k) => (q === 0 ? `c0_${k}` : `s${q}_${k} * i${q}`), 'cnt'), 'cnt')}
  ${putRec('c', 'r', 'TP.metaCount')}
  return r;
}`;

  // Levels above: with UP, a dispatch reads one level's records into its workgroups and reduces
  // UP levels above it (tree_block); without, one level up a dispatch
  const PYR = recType + (UP ? /* wgsl */`
struct Level { count: u32, off: u32, steps: u32, metaCount: u32 };
@group(0) @binding(0) var<uniform> lv: Level;
@group(0) @binding(1) var<storage, read_write> treeCells: array<vec4f>;${L.CNT < 0 ? `
@group(0) @binding(2) var<storage, read_write> treeMeta: array<u32>;` : ''}${hubs ? `
@group(0) @binding(${L.CNT < 0 ? 3 : 2}) var<storage, read_write> treeBox: array<u32>;` : ''}${block}
@compute @workgroup_size(${WG$1})
fn main(${LINEAR$1}, @builtin(local_invocation_index) li: u32) {
  let q = ${LINEAR_ID};
  var r: TreeRec;
  if (q < lv.count) {
    ${each$1(L.CS4, j => `r.v[${j}] = treeCells[${L.TAB4}u + (lv.off + q) * ${L.CS4}u + ${j}u];`)}
    r.n = ${L.CNT < 0 ? 'treeMeta[lv.metaCount + lv.off + q]' : `u32(r.v[${L.CNT >> 2}].${AX$2[L.CNT & 3]})`};
  }
  tree_block(li, q - li, r, lv.count, lv.off, lv.steps, lv.metaCount);
}` : /* wgsl */`
struct Level { count: u32, childOff: u32, parentOff: u32, metaCount: u32 };
@group(0) @binding(0) var<uniform> lv: Level;
@group(0) @binding(1) var<storage, read_write> treeCells: array<vec4f>;${L.CNT < 0 ? `
@group(0) @binding(2) var<storage, read_write> treeMeta: array<u32>;` : ''}${hubs ? `
@group(0) @binding(${L.CNT < 0 ? 3 : 2}) var<storage, read_write> treeBox: array<u32>;` : ''}
@compute @workgroup_size(${WG$1})
fn main(${LINEAR$1}) {
  let q = ${LINEAR_ID};
  if (q >= lv.count) { return; }${parentOf(ch => `let child = lv.childOff + ${CH}u * q + ${ch};
    ${L.CNT < 0 ? `let n = treeMeta[lv.metaCount + child];
    if (n == 0u) { continue; }
    ${loadVec4s('a', 'treeCells', `${L.TAB4}u + child * ${L.CS4}u`, L.CS4)}` : `${loadVec4s('a', 'treeCells', `${L.TAB4}u + child * ${L.CS4}u`, L.CS4)}
    let n = u32(${word('a', L.CNT)});
    if (n == 0u) { continue; }`}`)}
  ${putRec('lv.parentOff + q', 'r', 'lv.metaCount')}${hubs ? `
  if (lv.count == 1u) { treeBox[${BL.TOTAL}] = bitcast<u32>(${each$1(K, c => `abs(r.v[${L.S[c] >> 2}].${AX$2[L.S[c] & 3]})`, ' + ')}); }` : ''}
}`);

  const lawCode = lawFunctions(spec) + tableWordFn(L);
  const lawGroups = spec.groups;
  // The centres channels act from: channel 0's (shared) and each own one
  const centres = [{ word: L.C[0], channels: [] }];
  spec.channels.forEach((ch, c) => {
    if (c === 0 || !ch.own) centres[0].channels.push(c);
    else centres.push({ word: L.C[c], channels: [c] });
  });

  // A source of charge `S` at d = source - point, added to channel c's field F, Jacobian J
  // (d/dp of S k1(r) d = S (k2 d d^T - k1 I)) and, at second order, T (the next derivative:
  // S (k3 d_a d_b d_c - k2 (delta_ab d_c + delta_ac d_b + delta_bc d_a))), from k = (k1, k2[, k3])
  const expansionTerms = (c, S) => {
    const lines = [`let g${c} = ${S} * k.x; let h${c} = ${S} * k.y;`];
    lines.push(each$1(D, k => `F${c}_${k} += g${c} * d${k};`));
    lines.push(L.pairs.map(([p, q], e) => `J${c}_${e} += h${c} * d${p} * d${q}${p === q ? ` - g${c}` : ''};`).join(' '));
    if (L.T[c] >= 0) {
      lines.push(`let u${c} = ${S} * k.z;`);
      lines.push(L.triples.map(([a, b, q], e) => {
        const deltas = [];
        if (a === b) deltas.push(`d${q}`);
        if (a === q) deltas.push(`d${b}`);
        if (b === q) deltas.push(`d${a}`);
        return `T${c}_${e} += u${c} * d${a} * d${b} * d${q}${deltas.length ? ` - h${c} * (${deltas.join(' + ')})` : ''};`;
      }).join(' '));
    }
    return lines.join('\n');
  };
  // The far field of one source cell record `a` (loaded) at the point (x<k>), for every channel:
  // field and Jacobian into F<c>_<k>, J<c>_<e> (jacobian), or field only (monopole) into acc<c>_<k>
  const sourceCell = (at, jacobian) => centres.map(centre => {
    const lines = [];
    lines.push(`{`);
    lines.push(each$1(D, k => `let d${k} = ${word('a', centre.word + k)} - ${at(k)};`));
    lines.push(`let r2 = ${each$1(D, k => `d${k} * d${k}`, ' + ')};`);
    const groups = [];
    centre.channels.forEach(c => {
      const g = spec.channels[c].group;
      let entry = groups.find(x => x.g === g);
      if (!entry) groups.push(entry = { g, channels: [] });
      entry.channels.push(c);
    });
    lines.push(`if (r2 > 0.0) {`);
    lines.push(`let r = sqrt(r2);`);
    groups.forEach(({ g, channels }) => {
      const conds = [];
      // a source whose charges weigh nothing pushes nothing (in 3D most cells are empty)
      conds.push(`(${nonzero(channels, c => word('a', L.S[c]))})`);
      if (lawGroups[g].law && lawGroups[g].law.hasRange) conds.push(`tree_in_${g}(r2)`);
      const open = conds.length ? `if (${conds.join(' && ')}) {` : '{';
      lines.push(open);
      if (jacobian) {
        lines.push(lawGroups[g].second ? `let k = tree_k123_${g}(r, r2);` : `let k = tree_k12_${g}(r, r2);`);
        channels.forEach(c => lines.push(expansionTerms(c, word('a', L.S[c]))));
      } else {
        lines.push(`let k1 = tree_k1_${g}(r, r2);`);
        channels.forEach(c => {
          lines.push(each$1(D, k => `acc${c}_${k} += (${word('a', L.S[c])} * k1) * d${k};`));
        });
      }
      lines.push(`}`);
    });
    lines.push(`}`);
    lines.push(`}`);
    return lines.join('\n');
  }).join('\n');

  // Bodies in cell `index` (any level)
  const countAt = index => (L.CNT < 0 ? `treeMeta[TP.metaCount + ${index}]` : `u32(treeCells[${L.TAB4}u + (${index}) * ${L.CS4}u + ${L.CNT >> 2}u].${AX$2[L.CNT & 3]})`);
  // The interaction list of cell (xl<k>) at level `off` (cells of size w): children of the
  // parent's 3^D neighbours that are not my neighbours, skipping empty parents
  const interactionList = (body, indent) => `
${indent}let poff = off + ${each$1(D, () => 'Gl', ' * ')};
${indent}let Gp = Gi / 2;
${indent}${each$1(D, k => `let lo${k} = max((xl${k} >> 1u) - ${SEP}, 0); let hi${k} = min((xl${k} >> 1u) + ${SEP}, Gp - 1);`)}
${boxLoops(D, `
if (${countAt('poff + mm0')} == 0u) { continue; }
for (var ch = 0u; ch < ${1 << D}u; ch++) {
  ${each$1(D, k => `let y${k} = 2 * x${k} + i32((ch >> ${k}u) & 1u);`)}
  if (${each$1(D, k => `abs(y${k} - xl${k}) <= ${SEP}`, ' && ')}) { continue; }
  let src = off + ((mm0 << ${D}u) | ch);
  ${loadVec4s('a', 'treeCells', `${L.TAB4}u + src * ${L.CS4}u`, L.CS4)}
  ${body}
}`, indent)}`;

  // With more finest cells than bodies (3D), most finest cells are empty, and a thread per cell
  // would leave most of a SIMD group idle: there AGG0 lists the occupied finest cells and LOCAL
  // runs a thread per entry (up to n of them), then a thread per cell above.
  const heads = spec.heads;
  const valueBinding = stepDecl ? '\n' + stepDecl(5) : '';

  // Crowded cells (more than nearCap bodies; AGG0 lists them). The section skips them, and the
  // CROWD_GROUPS workgroups TREE_LOCAL adds after its own compute their bodies' pushes on every
  // body of their 3^D cells, per channel, exactly: a workgroup owns the targets whose slot is its
  // index modulo CROWD_GROUPS, its threads split a crowded cell's bodies, and partial sums add up
  // in a fixed tree, so no thread does more than a cell's size / 256 pairs per target and runs
  // repeat exactly. If the step's crowded work passes TP.workCap pair evaluations, nothing is
  // computed and the status word names the largest cell: the runner halts at the readback
  // (pyramidStatus()).
  const CR4 = Math.ceil(D * K / 4);
  const crowdWord = (c, k) => c * D + k;
  const crowdPair = (() => {
    const lines = [];
    lines.push(loadVec4s('b', 'treeSp', `j * ${L.SP4}u`, L.SP4));
    lines.push(each$1(D, k => `var d${k} = ${word('b', k)} - p${k};`));
    lines.push(`var r2 = ${each$1(D, k => `d${k} * d${k}`, ' + ')};`);
    lines.push(`if (r2 == 0.0) { let jt = tree_jitter(i, treeMeta[TP.metaTag + 2u * j]); ${each$1(D, k => `d${k} = jt.${AX$2[k]};`)} r2 = ${each$1(D, k => `d${k} * d${k}`, ' + ')}; }`);
    lines.push(`let r = sqrt(r2);`);
    lawGroups.forEach((group, g) => {
      const conds = [];
      if (K > 1) conds.push(`(${nonzero(group.channels, c => word('b', D + c))})`);
      if (group.law && group.law.hasRange) conds.push(`tree_in_${g}(r2)`);
      const body = [`let k1 = tree_k1_${g}(r, r2);`].concat(group.channels.map(c => each$1(D, k => `cr${c}_${k} += (${word('b', D + c)} * k1) * d${k};`))).join(' ');
      lines.push(conds.length ? `if (${conds.join(' && ')}) { ${body} }` : `{ ${body} }`);
    });
    return lines.join('\n');
  })();
  const crowdFn = /* wgsl */`
var<workgroup> crowdPart: array<f32, ${WG$1 * D}>;
var<workgroup> crowdHead: vec4u;
var<workgroup> crowdRange: vec4u;
${crowdWorkFn(i => `atomicLoad(&treeLists[${i}])`)}
fn tree_count(b: u32) -> u32 { return select(TP.n, treeMeta[b + 1u], b + 1u < TP.nCells) - treeMeta[b]; }
// cell b's near cell number nu (base SIDE digits, minus SEP per axis), or nCells off the grid
fn tree_near(b: u32, nu: u32) -> u32 {
  let Gi = i32(TP.G);
  ${each$1(D, k => `let x${k} = i32(tree_compact(b >> ${k}u)) + i32((nu / ${SIDE ** k}u) % ${SIDE}u) - ${SEP};`)}
  if (${each$1(D, k => `x${k} < 0 || x${k} >= Gi`, ' || ')}) { return TP.nCells; }
  return ${each$1(D, k => `(tree_spread(u32(x${k})) << ${k}u)`, ' | ')};
}
fn tree_crowd(w: u32, li: u32) {
  // (a 2D grid of workgroups may pad past CROWD_GROUPS)
  if (w >= ${CROWD_GROUPS}u) { return; }
  if (li == 0u) {
    let crowded = atomicLoad(&treeLists[1]);
    var biggest = 0u;
    for (var l = 0u; l < crowded; l++) { biggest = max(biggest, tree_count(atomicLoad(&treeLists[TP.crowdList + l]))); }
    // the work ORDER and AGG0 refused by (tree_crowd_work)
    let work = f32(tree_crowd_work()) * 1e6;
    // in evaluations of one charge (chargeWeight)
    let weighted = work * ${lit(chargeWeight(K))};
    let over = weighted > TP.workCap;
    crowdHead = vec4u(crowded, select(0u, 1u, over), 0u, 0u);
    if (w == 0u) {
      atomicStore(&treeLists[7], u32(min(weighted * 1e-6, 4e9)));
      if (over && atomicLoad(&treeLists[2]) == 0u) {
        atomicStore(&treeLists[3], u32(min(work * 1e-6, 4e9)));
        atomicStore(&treeLists[2], biggest);
      }
    }
  }
  let head = workgroupUniformLoad(&crowdHead);
  if (head.y != 0u) { return; }
  // A target cell is visited from each crowded cell near it, and done from the first of them in
  // neighbour order: its bodies then take every crowded neighbour's push in that order, so the
  // sums do not depend on the order AGG0 listed the cells in.
  for (var l = 0u; l < head.x; l++) {
    for (var nu = 0u; nu < ${NEAR}u; nu++) {
      workgroupBarrier();
      if (li == 0u) {
        let b = atomicLoad(&treeLists[TP.crowdList + l]);
        let a = tree_near(b, nu);
        crowdRange = vec4u(0u);
        if (a < TP.nCells) {
          var first = TP.nCells;
          for (var m = 0u; m < ${NEAR}u; m++) {
            let x = tree_near(a, m);
            if (x < TP.nCells && tree_count(x) > TP.nearCap) { first = x; break; }
          }
          if (first == b) { crowdRange = vec4u(a, treeMeta[a], treeMeta[a] + tree_count(a), 0u); }
        }
      }
      let tr = workgroupUniformLoad(&crowdRange);
      var t = tr.y + (w + ${CROWD_GROUPS}u - tr.y % ${CROWD_GROUPS}u) % ${CROWD_GROUPS}u;
      loop {
        if (t >= tr.z) { break; }
        let i = treeMeta[TP.metaTag + 2u * t];
        ${loadVec4s('me', 'treeSp', `t * ${L.SP4}u`, L.SP4)}
        ${each$1(D, k => `let p${k} = ${word('me', k)};`)}
        ${each$1(K, c => each$1(D, k => `var cr${c}_${k} = 0.0;`))}
        for (var m = 0u; m < ${NEAR}u; m++) {
          let x = tree_near(tr.x, m);
          if (x >= TP.nCells) { continue; }
          let xs = treeMeta[x];
          let xe = xs + tree_count(x);
          if (xe - xs <= TP.nearCap) { continue; }
          for (var j = xs + li; j < xe; j += ${WG$1}u) {
            if (j == t) { continue; }
            ${crowdPair}
          }
        }${each$1(K, c => `
        ${each$1(D, k => `crowdPart[li * ${D}u + ${k}u] = cr${c}_${k};`)}
        workgroupBarrier();
        for (var h = ${WG$1 / 2}u; h > 0u; h >>= 1u) {
          if (li < h) { ${each$1(D, k => `crowdPart[li * ${D}u + ${k}u] += crowdPart[(li + h) * ${D}u + ${k}u];`)} }
          workgroupBarrier();
        }
        if (li == 0u) { ${each$1(D, k => `treeCells[TP.crowdOff + t * ${CR4}u + ${crowdWord(c, k) >> 2}u].${AX$2[crowdWord(c, k) & 3]} = crowdPart[${k}u];`)} }
        workgroupBarrier();`, '')}
        t += ${CROWD_GROUPS}u;
      }
    }
  }
}`;

  // Heavy bodies (hubs, AGG0 lists them). A hub's push is the small residue of its leaves'
  // pushes from every side, and the leaves sit mostly in cells 2 cells away, where the expansions
  // of the hub's chain take them as monopoles at every level: megaStars after 200 steps was 1.6
  // times the CPU tree's error, 83% of it at the main hub (its cell too full of leaves to count
  // as a heavy cell). A hub takes its far field at its own position, with interaction lists that
  // start a cell further out at every level above the finest; HUB_GROUPS workgroups of TREE_LOCAL
  // take a hub each, their threads split the lists, and the sums add up in a fixed tree. The
  // section reads the result through the hub's number in its tag (bits 20 to 30).
  const R = SEP + 1, RS = 2 * R + 1, CAND = (RS ** D) << D;
  // The field at the hub's position of one body of its ring (loaded as `b`), every channel
  const ringPair = (() => {
    const lines = [loadVec4s('b', 'treeSp', `t * ${L.SP4}u`, L.SP4), each$1(D, k => `let d${k} = ${word('b', k)} - p${k};`), `let r2 = ${each$1(D, k => `d${k} * d${k}`, ' + ')};`, 'if (r2 > 0.0) {', 'let r = sqrt(r2);'];
    lawGroups.forEach((group, g) => {
      const conds = [`(${nonzero(group.channels, c => word('b', D + c))})`];
      if (group.law && group.law.hasRange) conds.push(`tree_in_${g}(r2)`);
      lines.push(`if (${conds.join(' && ')}) { let k1 = tree_k1_${g}(r, r2); ${group.channels.map(c => each$1(D, k => `acc${c}_${k} += (${word('b', D + c)} * k1) * d${k};`)).join(' ')} }`);
    });
    lines.push('}');
    return lines.join(' ');
  })();
  const hubFn = hubs ? /* wgsl */`
var<workgroup> hubHead: u32;
fn tree_hub(w: u32, li: u32) {
  if (w >= ${HUB_GROUPS}u) { return; }
  if (li == 0u) { hubHead = min(atomicLoad(&treeLists[5]), ${HUB_MAX}u); }
  let count = workgroupUniformLoad(&hubHead);
  for (var hb = w; hb < count; hb += ${HUB_GROUPS}u) {
    let k = atomicLoad(&treeLists[TP.hubList + hb]);
    let raw = treeMeta[TP.metaTag + 2u * k + 1u];
    let c = raw & 0x7fffffffu;
    ${loadVec4s('me', 'treeSp', `k * ${L.SP4}u`, L.SP4)}
    ${each$1(D, q => `let p${q} = ${word('me', q)};`)}
    ${each$1(D, q => `let cx${q} = i32(tree_compact(c >> ${q}u));`)}
    ${each$1(K, q => each$1(D, k => `var acc${q}_${k} = 0.0;`))}
    var off = 0u; var Gl = TP.G;
    for (var l = 0u; l < TP.levels; l++) {
      let Gi = i32(Gl);
      let Gp = Gi / 2;
      let poff = off + ${each$1(D, () => 'Gl', ' * ')};
      // the finest level skips my near cells only; the levels above the cells a list has had
      let skip = select(${R}, ${SEP}, l == 0u);
      // (3D: 1,000 candidates, a few a thread)
      for (var cand = li; cand < ${CAND}u; cand += ${WG$1}u) {
        let pi = cand >> ${D}u;
        let ch = cand & ${(1 << D) - 1}u;
        ${each$1(D, k => `let xl${k} = cx${k} >> l; let x${k} = (xl${k} >> 1u) + i32((pi / ${RS ** k}u) % ${RS}u) - ${R};`)}
        if (${each$1(D, k => `x${k} >= 0 && x${k} < Gp`, ' && ')}) {
          let mm0 = ${each$1(D, k => `(tree_spread(u32(x${k})) << ${k}u)`, ' | ')};
          ${each$1(D, k => `let y${k} = 2 * x${k} + i32((ch >> ${k}u) & 1u);`)}
          if (${countAt('poff + mm0')} != 0u && !(${each$1(D, k => `abs(y${k} - xl${k}) <= skip`, ' && ')})) {
            let src = off + ((mm0 << ${D}u) | ch);${D === 3 ? `
            // 3D: the ring just past the near cells body by body, as TREE_HEAVY takes it (a hub's
            // leaves sit there; as monopoles, relaxed megaStars in 3D was 2.6 times the CPU tree's error)
            if (l == 0u && ${maxOf(Array.from({ length: D }, (_, k) => `abs(y${k} - xl${k})`))} == ${SEP + 1}) {
              let s0 = treeMeta[src];
              let e0 = select(TP.n, treeMeta[src + 1u], src + 1u < TP.nCells);
              for (var t = s0; t < e0; t++) {
${ringPair}
              }
              continue;
            }` : ''}
            ${loadVec4s('a', 'treeCells', `${L.TAB4}u + src * ${L.CS4}u`, L.CS4)}
${sourceCell(k => `p${k}`, false)}
          }
        }
      }
      off += ${each$1(D, () => 'Gl', ' * ')}; Gl >>= 1u;
    }${each$1(K, q => `
    ${each$1(D, k => `crowdPart[li * ${D}u + ${k}u] = acc${q}_${k};`)}
    workgroupBarrier();
    for (var h = ${WG$1 / 2}u; h > 0u; h >>= 1u) {
      if (li < h) { ${each$1(D, k => `crowdPart[li * ${D}u + ${k}u] += crowdPart[(li + h) * ${D}u + ${k}u];`)} }
      workgroupBarrier();
    }
    if (li == 0u) { ${each$1(D, k => `treeCells[TP.hubOff + hb * ${CR4}u + ${crowdWord(q, k) >> 2}u].${AX$2[crowdWord(q, k) & 3]} = crowdPart[${k}u];`)} }
    workgroupBarrier();`, '')}
    if (li == 0u) { treeMeta[TP.metaTag + 2u * k + 1u] = raw | ((hb + 1u) << 20u); }
  }
}` : '';

  const LOCAL = common + lawCode + /* wgsl */`
${tp}
@group(0) @binding(1) var<storage, read_write> treeCells: array<vec4f>;
@group(0) @binding(2) var<storage, ${hubs ? 'read_write' : 'read'}> treeMeta: array<u32>;
@group(0) @binding(3) var<storage, read_write> treeLists: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read> treeSp: array<vec4f>;${valueBinding}
${crowdFn}${hubFn}
@compute @workgroup_size(${WG$1})
fn main(${LINEAR$1}, @builtin(workgroup_id) wid: vec3u, @builtin(local_invocation_index) li: u32) {
  let wl = wid.x + wid.y * nwg.x;${hubs ? `
  if (wl >= TP.localGroups + ${CROWD_GROUPS}u) {
    tree_hub(wl - TP.localGroups - ${CROWD_GROUPS}u, li);
    return;
  }` : ''}
  if (wl >= TP.localGroups) {
    tree_crowd(wl - TP.localGroups, li);
    return;
  }
  let t = ${LINEAR_ID};
  var off = 0u; var Gl = TP.G; var l = 0u; var c = 0u;${heads ? `
  if (t < TP.n) {
    if (t >= atomicLoad(&treeLists[4])) { return; }
    c = atomicLoad(&treeLists[TP.occList + t]);
  } else {
    var u = t - TP.n + TP.nCells;` : `
  {
    var u = t;`}
    loop {
      if (l >= TP.levels) { return; }
      let count = ${each$1(D, () => 'Gl', ' * ')};
      if (u < off + count) { break; }
      off += count; Gl >>= 1u; l++;
    }
    c = u - off;
  }
  ${loadVec4s('m', 'treeCells', `${L.TAB4}u + (off + c) * ${L.CS4}u`, L.CS4)}
  let cnt = ${L.CNT < 0 ? 'treeMeta[TP.metaCount + off + c]' : `u32(${word('m', L.CNT)})`};
  if (cnt == 0u) { return; }${heavyCells ? `
  // a heavy finest cell (a hub amid its leaves) is done by TREE_HEAVY
  if (off == 0u) {
    ${loadVec4s('top', 'treeCells', `${L.TAB4}u + TP.top * ${L.CS4}u`, L.CS4)}
    if ((${each$1(K, q => `abs(${word('m', L.S[q])})`, ' + ')}) * f32(TP.n) > ${lit(HEAVY)} * f32(cnt) * (${each$1(K, q => `abs(${word('top', L.S[q])})`, ' + ')})) {
      atomicStore(&treeLists[${LIST_HEAD}u + atomicAdd(&treeLists[0], 1u)], c);
      return;
    }
  }` : ''}
  let Gi = i32(Gl);
  ${each$1(D, k => `let xl${k} = i32(tree_compact(c >> ${k}u));`, ' ')}
  // the expansion centre: the cell's centre of channel 0's charge (of its bodies when that is
  // 0), where its bodies are, rather than its middle: half the error or less on hub graphs
  ${each$1(D, k => `let ce${k} = ${word('m', L.C[0] + k)};`)}
  ${each$1(K, c => each$1(D, k => `var F${c}_${k} = 0.0;`) + ' ' + L.pairs.map((_, e) => `var J${c}_${e} = 0.0;`).join(' ') + ' ' + (L.T[c] >= 0 ? L.triples.map((_, e) => `var T${c}_${e} = 0.0;`).join(' ') : ''), '\n  ')}
${interactionList(sourceCell(k => `ce${k}`, true), '  ')}
  let o = TP.locOff + (off + c) * ${L.LS4}u;
  ${storeVec4s('treeCells', 'o', (() => {
    const words = [];
    for (let k = 0; k < D; k++) words[k] = `ce${k}`;
    for (let c = 0; c < K; c++) {
      for (let k = 0; k < D; k++) words[L.F[c] + k] = `F${c}_${k}`;
      L.pairs.forEach((_, e) => { words[L.J[c] + e] = `J${c}_${e}`; });
      if (L.T[c] >= 0) L.triples.forEach((_, e) => { words[L.T[c] + e] = `T${c}_${e}`; });
    }
    return words;
  })())}
}`;

  // A heavy finest cell's expansion (LOCAL left it to this kernel): its interaction list with
  // the cells at distance 2 that hold two bodies or more taken body by body, so that a hub amid
  // its leaves does not feel their cells' monopoles (on relaxed hub layouts in 3D the hubs' pushes
  // were 1.5 to 2.7 times further from exact than the CPU tree's). A workgroup takes a cell and
  // its threads split the list; partial sums add up in a fixed tree, so runs repeat exactly.
  // A fixed number of workgroups walk the list, which holds the few hubs' cells.
  const NC = K * (D + L.JN) + L.T.filter(t => t >= 0).length * L.TN;
  let HT = HEAVY_THREADS;
  while (HT > 8 && HT * NC * 4 > 16384) HT >>= 1;
  const NQ = 3 ** D << D;
  // the field and Jacobian at ce of one body (loaded as `b`), every channel
  const bodySource = (() => {
    const lines = [];
    lines.push(each$1(D, k => `let d${k} = ${word('b', k)} - ce${k};`));
    lines.push(`let r2 = ${each$1(D, k => `d${k} * d${k}`, ' + ')};`);
    lines.push(`if (r2 > 0.0) {`);
    lines.push(`let r = sqrt(r2);`);
    lawGroups.forEach((group, g) => {
      const conds = [`(${nonzero(group.channels, c => word('b', D + c))})`];
      if (group.law && group.law.hasRange) conds.push(`tree_in_${g}(r2)`);
      lines.push(`if (${conds.join(' && ')}) {`);
      lines.push(group.second ? `let k = tree_k123_${g}(r, r2);` : `let k = tree_k12_${g}(r, r2);`);
      group.channels.forEach(c => lines.push(expansionTerms(c, word('b', D + c))));
      lines.push(`}`);
    });
    lines.push(`}`);
    return lines.join('\n');
  })();
  const accNames = [];
  for (let c = 0; c < K; c++) {
    for (let k = 0; k < D; k++) accNames.push(`F${c}_${k}`);
    L.pairs.forEach((_, e) => accNames.push(`J${c}_${e}`));
    if (L.T[c] >= 0) L.triples.forEach((_, e) => accNames.push(`T${c}_${e}`));
  }
  const HEAVY_KERNEL = common + lawCode + /* wgsl */`
${tp}
@group(0) @binding(1) var<storage, read> treeSp: array<vec4f>;
@group(0) @binding(2) var<storage, read> treeMeta: array<u32>;
@group(0) @binding(3) var<storage, read_write> treeCells: array<vec4f>;
@group(0) @binding(4) var<storage, read> treeLists: array<u32>;${stepDecl ? '\n' + stepDecl(5) : ''}
var<workgroup> parts: array<f32, ${HT * NC}>;
var<workgroup> todo: u32;
@compute @workgroup_size(${HT})
fn main(@builtin(local_invocation_index) li: u32, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
  if (li == 0u) { todo = treeLists[0]; }
  let count = workgroupUniformLoad(&todo);
  let Gi = i32(TP.G);
  let Gp = Gi / 2;
  let poff = ${each$1(D, () => 'TP.G', ' * ')};
  for (var h = wid.x; h < count; h += nwg.x) {
    let c = treeLists[${LIST_HEAD}u + h];
    ${loadVec4s('m', 'treeCells', `${L.TAB4}u + c * ${L.CS4}u`, L.CS4)}
    ${each$1(D, k => `let ce${k} = ${word('m', L.C[0] + k)};`)}
    ${each$1(D, k => `let xl${k} = i32(tree_compact(c >> ${k}u));`)}
    ${accNames.map(x => `var ${x} = 0.0;`).join(' ')}
    for (var q = li; q < ${NQ}u; q += ${HT}u) {
      let pi = q >> ${D}u;
      let ch = q & ${(1 << D) - 1}u;
      ${each$1(D, k => `let x${k} = (xl${k} >> 1u) + i32((pi / ${3 ** k}u) % 3u) - 1;`)}
      if (${each$1(D, k => `x${k} < 0 || x${k} >= Gp`, ' || ')}) { continue; }
      let mm0 = ${each$1(D, k => `(tree_spread(u32(x${k})) << ${k}u)`, ' | ')};
      if (${countAt('poff + mm0')} == 0u) { continue; }
      ${each$1(D, k => `let y${k} = 2 * x${k} + i32((ch >> ${k}u) & 1u);`)}
      let dist = ${maxOf(Array.from({ length: D }, (_, k) => `abs(y${k} - xl${k})`))};
      if (dist <= 1) { continue; }
      let src = (mm0 << ${D}u) | ch;
      ${loadVec4s('a', 'treeCells', `${L.TAB4}u + src * ${L.CS4}u`, L.CS4)}
      if (!(${nonzero(spec.channels.map((_, q) => q), q => word('a', L.S[q]))})) { continue; }
      if (dist == 2 && ${L.CNT < 0 ? 'treeMeta[TP.metaCount + src]' : `u32(${word('a', L.CNT)})`} >= 2u) {
        let s0 = treeMeta[src];
        let e0 = select(TP.n, treeMeta[src + 1u], src + 1u < TP.nCells);
        for (var t = s0; t < e0; t++) {
          ${loadVec4s('b', 'treeSp', `t * ${L.SP4}u`, L.SP4)}
          ${bodySource}
        }
      } else {
${sourceCell(k => `ce${k}`, true)}
      }
    }
    ${accNames.map((x, j) => `parts[li * ${NC}u + ${j}u] = ${x};`).join(' ')}
    workgroupBarrier();
    for (var w = ${HT / 2}u; w > 0u; w >>= 1u) {
      if (li < w) { for (var j = 0u; j < ${NC}u; j++) { parts[li * ${NC}u + j] += parts[(li + w) * ${NC}u + j]; } }
      workgroupBarrier();
    }
    if (li == 0u) {
      ${storeVec4s('treeCells', `TP.locOff + c * ${L.LS4}u`, (() => {
    const words = [];
    for (let k = 0; k < D; k++) words[k] = `ce${k}`;
    let j = 0;
    for (let c = 0; c < K; c++) {
      for (let k = 0; k < D; k++) words[L.F[c] + k] = `parts[${j++}]`;
      L.pairs.forEach((_, e) => { words[L.J[c] + e] = `parts[${j++}]`; });
      if (L.T[c] >= 0) L.triples.forEach((_, e) => { words[L.T[c] + e] = `parts[${j++}]`; });
    }
    return words;
  })())}
    }
    workgroupBarrier();
  }
}`;

  // The section: the push on the body in sorted slot k (row i) with sensitivities s[c]
  const vec = `vec${D}f`;
  const nearPair = (() => {
    const lines = [];
    lines.push(loadVec4s('q', 'treeSp', `t * ${L.SP4}u`, L.SP4));
    lines.push(each$1(D, k => `var d${k} = ${word('q', k)} - p${k};`));
    lines.push(`var r2 = ${each$1(D, k => `d${k} * d${k}`, ' + ')};`);
    lines.push(`if (r2 == 0.0) { let jt = tree_jitter(i, treeMeta[TP.metaTag + 2u * t]); ${each$1(D, k => `d${k} = jt.${AX$2[k]};`)} r2 = ${each$1(D, k => `d${k} * d${k}`, ' + ')}; }`);
    lines.push(`let r = sqrt(r2);`);
    lines.push(`var g = 0.0;`);
    lawGroups.forEach((group, gi) => {
      const weight = group.channels.map(c => `s[${c}] * ${word('q', D + c)}`).join(' + ');
      const conds = [];
      if (K > 1 && !group.isDefault) conds.push(`wt${gi} != 0.0`);
      if (group.law && group.law.hasRange) conds.push(`tree_in_${gi}(r2)`);
      lines.push(`let wt${gi} = ${weight};`);
      const add = `g += wt${gi} * tree_k1_${gi}(r, r2);`;
      lines.push(conds.length ? `if (${conds.join(' && ')}) { ${add} }` : add);
    });
    lines.push(each$1(D, k => `na${k} += g * d${k};`));
    return lines.join('\n');
  })();

  const nearField = `
  // near field: exact pairs in my 3^D cells; a crowded cell's pushes come summed by TREE_LOCAL
  var crowded = false;
  {
    ${each$1(D, k => `let lo${k} = max(cx${k} - ${SEP}, 0); let hi${k} = min(cx${k} + ${SEP}, Gi - 1);`, ' ')}
${boxLoops(D, `
let s0 = treeMeta[mm0];
let e0 = select(TP.n, treeMeta[mm0 + 1u], mm0 + 1u < TP.nCells);
if (e0 - s0 > TP.nearCap) { crowded = true; continue; }
for (var t = s0; t < e0; t++) {
  if (t == k) { continue; }
  ${nearPair}
}`, '    ')}
  }
  if (crowded) {
    ${loadVec4s('cw', 'treeCells', `TP.crowdOff + k * ${CR4}u`, CR4)}
    ${each$1(D, q => `na${q} += ${each$1(K, c => `s[${c}] * ${word('cw', c * D + q)}`, ' + ')};`)}
  }`;

  const farInside = `
    var off = 0u; var Gl = TP.G; var cc = c;
    for (var l = 0u; l < TP.levels; l++) {
      ${loadVec4s('e', 'treeCells', `TP.locOff + (off + cc) * ${L.LS4}u`, L.LS4)}
      ${each$1(D, k => `let h${k} = p${k} - ${word('e', k)};`)}
      ${each$1(K, c => each$1(D, q => `b${q} += s[${c}] * (${word('e', L.F[c] + q)} + ${each$1(D, r => {
    const e = L.pairs.findIndex(([x, y]) => (x === q && y === r) || (x === r && y === q));
    return `${word('e', L.J[c] + e)} * h${r}`;
  }, ' + ')}${L.T[c] >= 0 ? ' + 0.5 * (' + each$1(D, r => each$1(D, t => {
    const key = [q, r, t].sort().join();
    const e = L.triples.findIndex(x => x.join() === key);
    return `${word('e', L.T[c] + e)} * h${r} * h${t}`;
  }, ' + '), ' + ') + ')' : ''});`), '\n      ')}
      off += ${each$1(D, () => 'Gl', ' * ')}; Gl >>= 1u; cc >>= ${D}u;
    }`;

  const farOutside = `
    var off = 0u; var Gl = TP.G;
    ${each$1(K, c => each$1(D, k => `var acc${c}_${k} = 0.0;`))}
    for (var l = 0u; l < TP.levels; l++) {
      let Gi = i32(Gl);
      ${each$1(D, k => `let xl${k} = cx${k} >> l;`)}
${interactionList(sourceCell(k => `p${k}`, false), '      ')}
      off += ${each$1(D, () => 'Gl', ' * ')}; Gl >>= 1u;
    }
    ${each$1(K, c => each$1(D, k => `b${k} += s[${c}] * acc${c}_${k};`), '\n    ')}`;

  const forceFn = /* wgsl */`
fn tree_force(k: u32, s: array<f32, ${K}>) -> ${vec} {
  if (${each$1(K, c => `s[${c}] == 0.0`, ' && ')}) { return ${vec}(0.0); }
  let i = treeMeta[TP.metaTag + 2u * k];
  let raw = treeMeta[TP.metaTag + 2u * k + 1u];
  let c = raw & ${hubs ? '0xfffffu' : '0x7fffffffu'};
  ${loadVec4s('me', 'treeSp', `k * ${L.SP4}u`, L.SP4)}
  ${each$1(D, q => `let p${q} = ${word('me', q)};`)}
  let Gi = i32(TP.G);
  ${each$1(D, q => `let cx${q} = i32(tree_compact(c >> ${q}u));`, ' ')}
  ${each$1(D, q => `var na${q} = 0.0;`)}
  ${each$1(D, q => `var b${q} = 0.0;`)}
${nearField}
  ${hubs ? `let hub = (raw >> 20u) & 0x7ffu;
  if (hub != 0u) {
    // a hub: its far field from tree_hub
    ${loadVec4s('hw', 'treeCells', `TP.hubOff + (hub - 1u) * ${CR4}u`, CR4)}
    ${each$1(D, q => `b${q} += ${each$1(K, cc => `s[${cc}] * ${word('hw', crowdWord(cc, q))}`, ' + ')};`)}
  } else ` : ''}if (raw == c) {
    // far field: local expansions down my chain of parent cells${farInside}
  } else {
    // clamped into a border cell: monopoles of the interaction lists at my real position${farOutside}
  }
  return ${gravity} * ${vec}(${each$1(D, q => `na${q} + b${q}`, ', ')});
}
// The charge of channel c of the body in sorted slot k (its sensitivity when the two are one column)
fn tree_charge(k: u32, c: u32) -> f32 {
  let w = ${D}u + c;
  return treeSp[k * ${L.SP4}u + (w >> 2u)][w & 3u];
}
fn tree_slot(i: u32) -> u32 { return treeMeta[TP.metaRow + i]; }
fn tree_row(k: u32) -> u32 { return treeMeta[TP.metaTag + 2u * k]; }`;

  const section = {
    bindings: [{ name: 'treeSp', access: 'read', type: 'array<vec4f>' }, { name: 'treeMeta', access: 'read', type: 'array<u32>' },
      { name: 'treeCells', access: 'read', type: 'array<vec4f>' }],
    uniform: { name: 'TP', struct: paramsStruct(spec.lawWords), decl: b => `@group(0) @binding(${b}) var<uniform> TP: TreeParams;` },
    declarations: mortonFns(D, L.bits) + jitterFn(D) + lawCode + forceFn,
    row: t => `tree_row(${t})`,
    // `t`: the thread's sorted slot (null: find it from the row i); `force`: D variables to add
    // to; `sensitivity(c)`: WGSL for channel c's sensitivity of row i, or null when it is the
    // charge column itself
    code({ t, i, force, sensitivity }) {
      const slot = t === null || t === undefined ? `tree_slot(${i})` : t;
      const s = [];
      for (let c = 0; c < K; c++) {
        const expr = sensitivity ? sensitivity(c) : null;
        s.push(expr === null || expr === undefined ? `tree_charge(tk, ${c}u)` : expr);
      }
      return `{ let tk = ${slot}; let tf = tree_force(tk, array<f32, ${K}>(${s.join(', ')})); ${each$1(D, q => `${force[q]} += tf.${AX$2[q]};`)} }`;
    },
  };

  return {
    kernels: { TREE_HIST: HIST, TREE_BOX: BOX, TREE_BIN: BIN, TREE_SCAN_BLOCKS: SCAN_BLOCKS, TREE_SCAN_TOP: SCAN_TOP,
      TREE_SCAN_ADD: SCAN_ADD, TREE_PLACE: PLACE, TREE_ORDER: ORDER, TREE_AGG0: AGG0, TREE_PYR: PYR, TREE_LOCAL: LOCAL,
      ...(heavyCells ? { TREE_HEAVY: HEAVY_KERNEL } : {}) },
    columns: {
      TREE_HIST: columnBindings(hubs ? [spec.pos].concat(spec.charges) : [spec.pos], 1).names,
      TREE_BIN: columnBindings([spec.pos], 1).names,
      TREE_ORDER: columnBindings([spec.pos].concat(spec.charges), 1).names,
    },
    section,
    heavyGroups: HEAVY_GROUPS,
  };
}

// The generic pyramid's plan, made without a device: grid size, buffers and their bytes (with the
// refusal when they do not fit the device), the WGSL of its structure kernels and the section a
// node kernel fuses to add the push at each body. build.js makes it real on a device.
//
//   const pyr = planPyramid({ D, n, limits, channels, pos });
//   pyr.refusal     // null, or why this device cannot hold it (with the numbers)
//   pyr.buffers     // bytes per buffer
//   pyr.kernels     // WGSL by kernel name
//   pyr.section     // {bindings, uniform, declarations, row(t), code({t, i, force, sensitivity})}
//
// A channel is {stage, law, centroid, charge, sensitivity}: `law` a compiled law of the library
// (null for 1/r^2), `centroid` 'own' or 'shared' (channel 0 always has its own centre),
// `charge` and `pos` colRefs: {buffer, type?, at(row, axis)}, the caller's columns.

// Bodies of an overfull cell past this many are sampled with weights. Today's template samples
// past 64, which on relaxed hub graphs left cells of 65 to 330 bodies sampled and their pushes
// 15 to 100% off, and dense clusters (a hub's leaves at the start) further off. Up to 1,024 a
// cell is exact, as it is also the size up to which ORDER sorts a cell by index; past it a body
// still sees at most 3^D x 1,024 bodies.
const NEAR_CAP = 1024;
const AX$1 = 'xyzw';

/**
 * Cells per axis for n bodies in D dimensions. 2D: today's grid (templates/grid.js), G^2 >= n / 2
 * from 32 to 1,024, twice as fine up to 8,192 bodies: real graphs pile their leaves around hubs
 * and in clusters, and at today's grid their near cells held 30 to 150 bodies (megaStars took 1.27
 * times today's template, npmMix4 1.48, yeast 1.12; twice as fine, 0.69 to 0.83). Above that the
 * cells' own work grows past what it saves on a uniform layout (100k: 1.17 times). 3D: the smallest
 * G with G^3 >= max(1,024, 2n), at most 2^20 cells. (Round 3 had G^3 >= n / 2: on hub graphs that
 * put most bodies of megaStars in 30 crowded cells.)
 */
function chooseGrid(n, D) {
  if (D === 2) {
    let G = 32;
    while (G * G * 2 < n && G < 1024) G *= 2;
    return G <= 64 ? 2 * G : G;
  }
  let G = 2;
  while ((G ** D < 1024 || G ** D < 2 * n) && (2 * G) ** D <= (1 << 20)) G *= 2;
  return G;
}

/**
 * The pyramid for `n` bodies: see the top of this file. `values`, when given, holds the law
 * numbers per step instead of the pyramid's uniform: {decl(binding), law(c, k), gravity}.
 * `peak`, when known, is the charges' largest sum of |charges| of one body over its mean (no
 * hubs in 3D below HEAVY). `grid` forces the cells per axis and `blocks: false` one TREE_PYR
 * dispatch per level (for measurements and tests).
 */
function planPyramid({ D, n, limits, channels, pos, values = null, grid = 0, peak, heads, heavyCells, hubs, secondOrder, separation, blocks = true, warn }) {
  const refuse = (reason, buffers = {}) => ({ refusal: reason, buffers, kernels: {}, section: null, dispatches: 0 });
  if (D !== 2 && D !== 3) return refuse(`the grid pyramid is 2D and 3D; this layout is ${D}D`);
  if (!channels.length) return refuse('a tree pass needs at least one charge');

  // Law groups: channels with one law object (or one law spec, or 1/r^2) evaluate it once
  const groups = [];
  const printer = createPrinter(warn);
  for (let c = 0; c < channels.length; c++) {
    const law = channels[c].law && !channels[c].law.isDefault ? channels[c].law : null;
    let group = groups.find(g => (law ? g.law === law || (g.law && g.law.spec === law.spec) : g.isDefault));
    if (!group) {
      if (law) {
        const problem = lawProblem(law, D, printer);
        if (problem) return refuse(`${channels[c].stage || 'channel ' + c}: ${problem}`);
      }
      group = { law, isDefault: !law, channels: [], first: c };
      groups.push(group);
    }
    group.channels.push(c);
  }
  // Tables live at the start of treeCells, law numbers in TP.law unless the caller holds them
  let tableWords = 0, lawWords = 0;
  groups.forEach(group => {
    if (!group.law) return;
    group.tables = group.law.describe().tables.map(table => {
      const entry = { name: table.name, from: table.from, to: table.to, length: table.values.length, values: table.values, base: tableWords };
      tableWords += table.values.length;
      return entry;
    });
    group.base = lawWords;
    lawWords += Math.ceil(lawValueCount(group.law) / 4) * 4;
    group.value = values ? k => values.law(group.first, k) : k => `TP.law[${(group.base + k) >> 2}].${AX$1[(group.base + k) & 3]}`;
  });
  // A law whose push falls slower than 1/r^2 has a far field that is the sum of every level's
  // small errors: a/r in 2D was 1.3 to 2.5 times the CPU tree's error. Its channels get
  // second-order expansions (not for tables: their slope is piecewise constant), and in 2D wider
  // near cells (`sep` below): a/r is then 0.14 to 0.26 times, and in 3D (second order only) laws
  // down to a constant push 0.32 to 0.62 times.
  groups.forEach(group => {
    group.second = secondOrder !== undefined ? !!secondOrder && !(group.tables || []).length :
      !!group.law && !(group.tables || []).length && slowLaw(group.law, D);
  });
  const own = channels.map((channel, c) => {
    const group = groups.findIndex(g => g.channels.indexOf(c) >= 0);
    return { own: c === 0 || channel.centroid !== 'shared', group, second: groups[group].second };
  });
  const L = pyramidLayout(D, own, tableWords);

  const G = grid || chooseGrid(n, D);
  if (G ** D > (1 << 20)) return refuse(`the grid pyramid takes up to 2^20 cells; ${G}^${D} is more`);
  // Wider near cells for a law that falls slower than 1/r^2, in 2D (see wgsl.js; in 3D they would
  // cost 4.6 times the interaction lists). Heavy finest cells (hubs amid their leaves, see
  // TREE_HEAVY): 3D needs them, 2D measured within the accuracy gate without; with wider near
  // cells their ring is in the near cells already.
  const sep = separation !== undefined ? separation : (D === 2 && groups.some(group => group.second) ? 2 : 1);
  const heavy = (heavyCells === undefined ? D === 3 : heavyCells) && sep === 1;
  // Hubs (bodies whose charges pass HEAVY times the mean) take their far field from tree_hub:
  // megaStars after 200 steps was 1.6 times the CPU tree's error in 2D, 83% of it at the main hub,
  // and v1-1's own 3D layout of megaStars 1.40 times, 95% at the hubs (the heavy cells did not
  // close it). A 3D step without hubs pays 2% for them (10k and 100k), so 3D plans them only
  // when the charges may have one.
  const hub = hubs === undefined ? D === 2 || !(peak <= HEAVY) : !!hubs;
  const { sizes, buffers } = layoutSizes(D, n, G, L, channels.length, heavy, hub);
  const nCells = sizes.nCells, levels = sizes.levels;

  const largest = Math.min(limits.maxStorageBufferBindingSize, limits.maxBufferSize);
  const over = Object.keys(buffers).filter(name => buffers[name] > largest);
  if (over.length) {
    const name = over.sort((a, b) => buffers[b] - buffers[a])[0];
    return refuse(`the tree pass with ${channels.length} charge${channels.length > 1 ? 's' : ''} in ${D}D at ${n.toLocaleString('en-US')} bodies needs ` +
      `${megabytes$2(buffers[name])} for ${name === 'treeCells' ? 'its cells' : name}; this device allows ${megabytes$2(largest)} per buffer`, buffers);
  }
  if (Math.ceil(n / WG$1) > limits.maxComputeWorkgroupsPerDimension ** 2) return refuse(`the grid pyramid runs up to ${(limits.maxComputeWorkgroupsPerDimension ** 2 * WG$1).toLocaleString('en-US')} bodies`);

  // Levels of the pyramid a workgroup reduces in its own memory (see tree_block in wgsl.js): its
  // WG records, and the counts when they have no room in the records
  const blockBytes = WG$1 * L.CS4 * 16 + (L.CNT < 0 ? WG$1 * 4 : 0) + 16;
  const blockSteps = blocks && blockBytes <= (limits.maxComputeWorkgroupStorageSize || 16384) ? Math.floor(Math.log2(WG$1) / D) : 0;
  const spec = {
    D, L, groups, lawWords: values ? 0 : lawWords, values, warn, heads: heads === undefined ? nCells > n : heads, heavyCells: heavy, hubs: hub,
    sep, blockSteps,
    channels: own, pos, charges: channels.map(channel => channel.charge),
  };
  const out = pyramidKernels(spec);
  return {
    refusal: null, D, n, K: channels.length, layout: L, groups, sizes, buffers, heads: spec.heads, heavyCells: spec.heavyCells, hubs: hub,
    lawWords: spec.lawWords, values, channels,
    kernels: out.kernels, columns: out.columns, section: out.section,
    // HIST, BOX, BIN, 3 scans, PLACE, ORDER, AGG0, PYRs, LOCAL (with the crowded cells'
    // workgroups), and HEAVY in 3D
    dispatches: 10 + pyrLevels(levels, blockSteps).length + (spec.heavyCells ? 1 : 0),
    blockSteps,
    heavyGroups: out.heavyGroups,
  };
}

/**
 * The TREE_PYR dispatches for `levels` levels above the finest cells: [{from, steps}], the level
 * each starts from and how many it reduces. With `blockSteps` (UP in wgsl.js), TREE_AGG0 has done
 * the first ones; without, one level a dispatch.
 */
function pyrLevels(levels, blockSteps) {
  const out = [];
  if (!blockSteps) {
    for (let l = 0; l < levels; l++) out.push({ from: l, steps: 1 });
    return out;
  }
  for (let l = Math.min(blockSteps, levels); l < levels; l += blockSteps) out.push({ from: l, steps: Math.min(blockSteps, levels - l) });
  return out;
}

// Grid sizes, offsets into the buffers, and bytes per buffer
function layoutSizes(D, n, G, L, K, heavy, hubs = false) {
  const levels = Math.log2(G), nCells = G ** D;
  const levelOff = [];
  let pyrSize = 0;
  for (let l = 0, g = G; l <= levels; l++, g >>= 1) { levelOff.push(pyrSize); pyrSize += g ** D; }
  // local expansions: every level but the top
  const localCells = levelOff[levels];
  const locOff = L.TAB4 + pyrSize * L.CS4;
  // the crowded cells' pushes per sorted body; at most n / (cap + 1) crowded cells
  const crowdOff = locOff + localCells * L.LS4;
  const crowdMax = Math.floor(n / (NEAR_CAP + 1)) + 1;
  // then the hubs' far fields (see tree_hub)
  const CR4 = Math.ceil(D * K / 4);
  const hubOff = crowdOff + n * CR4;
  const occList = LIST_HEAD + (heavy ? nCells : 0) + crowdMax;
  const hubList = occList + (nCells > n ? Math.min(n, nCells) : 0);
  const size = bytes => Math.max(16, Math.ceil(bytes / 16) * 16);
  return {
    sizes: { n, G, levels, nCells, levelOff, pyrSize, localCells, locOff, crowdOff, crowdList: LIST_HEAD + (heavy ? nCells : 0),
      occList, hubOff, hubList,
      metaTag: nCells, metaRow: nCells + 2 * n, metaCount: nCells + 3 * n },
    buffers: {
      treeBox: size(boxLayout(D).size * 4),
      treeCount: size(nCells * 4),
      treeBlocks: size(Math.max(nCells / 1024, 4) * 4),
      treeWork: size(3 * n * 4),
      treeMeta: size((nCells + 3 * n + pyrSize) * 4),
      treeSp: size(n * L.SP4 * 16),
      treeCells: size((hubOff + (hubs ? HUB_MAX * CR4 : 0)) * 16),
      treeLists: size((hubList + (hubs ? HUB_MAX : 0)) * 4),
    },
  };
}

// True when the law's push falls slower than 1/r^2 somewhere: its k1 = F(r)/r, probed with its
// numbers of this step over r = 2^-8 .. 2^24, has a local slope above -2.5 (1/r^2 has -3)
function slowLaw(law, D) {
  const body = law.prologue('values') + ' var k1; ' + law.emit(D, 'r', 'k1') + ' return k1;';
  const k1 = new Function('r', 'values', 'lawFunctions', body);
  let last = null;
  for (let e = -8; e <= 24; e++) {
    const value = Math.abs(k1(2 ** e, law.values, law.functions));
    if (last !== null && last > 0 && value > 0 && Math.log2(value / last) > -2.5) return true;
    last = value;
  }
  return false;
}

// Why the GPU cannot print `law`, or null
function lawProblem(law, D, printer) {
  if (Object.keys(law.functions).filter(name => law.tableNames.indexOf(name) < 0).length) {
    return 'laws with JavaScript functions run on the CPU only';
  }
  try {
    law.emit(printer, D, 'r', 'k1', 'k2');
  } catch (e) {
    return 'the law: ' + e.message;
  }
  for (const table of law.describe().tables) {
    // tiny values may become 0, which a table can afford; values past f32 cannot
    const bad = Array.from(table.values).find(v => !Number.isFinite(v) || Math.abs(v) > F32_MAX);
    if (bad !== undefined) return `the law's table ${table.name}: ${f32Problem(bad)}`;
  }
  const problem = lawValueProblem(law);
  if (problem) return `the law's ${problem.name} is ${problem.problem}`;
  return null;
}

function megabytes$2(bytes) {
  return (bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0) + ' MiB';
}

// A pair formula (simulator.addPairFormula) in WGSL, for a gather: one thread works for one body
// ("me") and visits the other bodies near it ("other"). The CPU runs the formula once per pair,
// with i the lower store row, and adds the push and the accumulations to both ends. A gather
// runs it at both ends instead, and each end keeps only what lands on its own row:
//
//  - the i-variant: me is i (`x_i` reads me, `x_j` the other body); it keeps `x_i += v`;
//  - the j-variant: me is j (`x_i` reads the other body, `x_j` me); it keeps `x_j += v`.
//
// A symmetric stage uses the i-variant when my store row is lower than the other's and the
// j-variant otherwise, so both ends evaluate the formula with the CPU's roles and get the same
// push. A one-sided stage (symmetric: false) runs for (i, j) and for (j, i) on the CPU, each run
// pushing body i: me is always i. Either way the caller adds `push / r * (pos_me - pos_other)` to
// my force, and pairs at r = 0 are skipped before the formula, as on the CPU.
//
// The printed code reads `pair_r`, assigns `pair_push` and adds into `pair_acc_<column>`
// (`pair_acc_<column>_<k>` for vectors), all declared by the caller. `force_i += v` adds into my
// force sum, the one pairCandidate() adds the push to (`options.force`). Both regimes print
// through here: the one-kernel step's all-pairs loop below N*, and the chunk kernel of the cell
// sort above it (wgsl.js).

/**
 * The columns a pair stage adds into, with their widths (1 or D): what a pass adds up per body.
 * Additions into `force` (`force_i += v`, like the push) go into the pass's force sum instead.
 */
function pairAccumulators(stage, D, columns) {
  const out = [];
  stage.writes.forEach(write => {
    if (write.space !== 'nodes' || write.mode !== 'add' || write.column === 'force' || write.via) return;
    if (out.some(a => a.column === write.column)) return;
    const column = columns[write.column];
    const width = column && column.width === 'D' ? D : 1;
    out.push({ column: write.column, width, startAtZero: (stage.args.startAtZero || []).indexOf(write.column) >= 0 });
  });
  return out;
}

/**
 * The columns a pair formula reads at either end (pos excluded): what a gather needs of the
 * other body, and of me.
 */
function pairReads(stage) {
  const out = [];
  stage.reads.forEach(read => {
    if (read.space !== 'nodes' || read.column === 'pos' || out.indexOf(read.column) >= 0) return;
    out.push(read.column);
  });
  return out;
}

/**
 * The WGSL of `stage`'s formula for a gather. `options`:
 *  - D, printer (a WGSL printer, wgsl/print.js), columns: name -> {width} (program().columns);
 *  - read(column, who, k): the k-th number of `column` of 'me' or 'other', as formulas see it
 *    (positions with the origin added);
 *  - param(name), builtIn(name), sum(name, k): the stage's numbers;
 *  - force(k): my force sum on axis k, which `force_i += v` adds into (pair_force_<k>; give
 *    pairCandidate() the same).
 * Returns {i, j, accumulators, reads}: `i` and `j` are lists of WGSL statements (`j` is null
 * for a one-sided stage). Throws what the GPU cannot print.
 */
function printPairFormula(stage, options) {
  const { D, printer } = options;
  if (stage.tables && stage.tables.length) throw new Error('WebGPU does not run lookup tables in pair formulas yet');
  const symmetric = stage.args.symmetric !== false;
  const accumulators = pairAccumulators(stage, D, options.columns);
  const variant = role => formula.compile(stage.formula, scope(stage, options, role, accumulators), printer).lines;
  return {
    i: variant('i'),
    j: symmetric ? variant('j') : null,
    accumulators,
    reads: pairReads(stage),
  };
}

/**
 * The WGSL of one candidate pair of a gather, for either regime: the chunk kernel above N* and a
 * loop over all bodies below it. The caller declares `d<k>` (my position minus the other's, on
 * axis k) and passes `r2` (their squared length), `radius`, the store rows `me` and `other`, and
 * `force(k)`, the sum my push goes into; `valid` is an extra condition (e.g. the other body is
 * not padding). Pairs on the same spot and pairs at r >= radius are skipped; `reach2`, a squared
 * radius with a margin, spares far pairs the root. Returns lines of WGSL.
 */
function pairCandidate(printed, { D, me, other, r2, radius, force, reach2 = null, valid = null }) {
  const indent = lines => lines.map(line => '    ' + line);
  const roles = printed.j
    ? [`if (${me} < ${other}) {`].concat(indent(printed.i), ['} else {'], indent(printed.j), ['}'])
    : ['{'].concat(indent(printed.i), ['}']);
  const near = [`${r2} > 0.0`].concat(reach2 ? [`${r2} <= ${reach2}`] : [], valid ? [valid] : []);
  const out = [
    // bodies on the same spot have no direction to push along
    `if (${near.join(' && ')}) {`,
    `  let pair_r = sqrt(${r2});`,
    `  if (pair_r < ${radius}) {`,
    '    var pair_push = 0.0;',
  ].concat(roles.map(line => '    ' + line), [
    '    let pair_scale = pair_push / pair_r;',
    '    ' + Array.from({ length: D }, (_, k) => `${force(k)} += pair_scale * d${k};`).join(' '),
    '  }',
    '}',
  ]);
  return out;
}

/**
 * The name the printed code adds into for `column` (its k-th number for vectors).
 */
function accumulatorName(column, k, width) {
  return width === 1 ? `pair_acc_${column}` : `pair_acc_${column}_${k}`;
}

// What names mean when me plays `role` ('i' or 'j')
function scope(stage, options, role, accumulators) {
  const { D, columns } = options;
  const who = end => (end === role ? 'me' : 'other');
  return {
    D,
    name(key) {
      if (key === 'r') return { type: 'num', code: 'pair_r' };
      if (key === 'push') {
        return { type: 'num', code: 'pair_push', write: (op, value) => [`pair_push ${op} ${value.code};`] };
      }
      const end = /^(\w+)_([ij])$/.exec(key);
      if (end && (end[1] === 'pos' || (columns[end[1]] && !columns[end[1]].hidden))) return endName(end[1], end[2]);
      if (stage.params.some(p => p.name === key)) return { type: 'num', code: options.param(key) };
      if (options.sumWidth && options.sumWidth(key)) {
        const width = options.sumWidth(key);
        const codes = Array.from({ length: width }, (_, k) => options.sum(key, k));
        return width === 1 ? { type: 'num', code: codes[0] } : { type: 'vec', codes };
      }
      if (stage.builtIns.indexOf(key) >= 0) return { type: 'num', code: options.builtIn(key) };
      return undefined;
    },
  };

  function endName(column, end) {
    const info = column === 'pos' ? { width: 'D' } : columns[column];
    const width = info.width === 'D' ? D : 1;
    const force = column === 'force';
    const accumulator = force || accumulators.some(a => a.column === column);
    // a formula never reads what it adds into, nor the force (the library refuses both), so those
    // have no value
    const codes = Array.from({ length: width }, (_, k) => (accumulator ? 'pair_unread' : options.read(column, who(end), k)));
    // my end's additions go into the pass's sums, the force into my force sum; the other end's are
    // left to the other body
    const sum = k => (force ? (options.force ? options.force(k) : `pair_force_${k}`) : accumulatorName(column, k, width));
    const write = accumulator ? (op, value) => {
      if (end !== role) return [];
      const values = value.codes || [value.code];
      return Array.from({ length: width }, (_, k) => `${sum(k)} ${op} ${values[k]};`);
    } : null;
    const out = width === 1 ? { type: 'num', code: codes[0] } : { type: 'vec', codes };
    if (write) {
      out.write = write;
      out.ops = ['+=', '-='];
    }
    return out;
  }
}

// WGSL of the pair formulas' lowering above N* (design section 6.4), in 2, 3 and 4 dimensions.
// One cell sort per radius, then per stage a chunk kernel and a gather:
//
//   BIN        per body: its cell (side = the radius, a hair larger), the cell's bucket in a
//              hashed table of 2n or more buckets (the CPU's hash), a slot by u32 atomics
//   SCAN_*     exclusive scan of the bucket counts in blocks of 1,024, then the blocks' offsets;
//              readers add the two (pair_start)
//   PLACE      per body: into its bucket at its slot (run-dependent order); a body of a bucket of
//              more than 1,024 claims chunks of work to rank itself
//   ARGS_RANK  one thread: the rank work against the cap, the indirect dispatch size of RANK
//   RANK       per rank chunk (crowded buckets only): how many of 256 bodies of its bucket have a
//              lower index, added up with atomics (integers, so the order does not matter)
//   ORDER      per bucket slot: the body's rank in its bucket, by index (counted directly up to
//              1,024 bodies), so each bucket lists its bodies the same way in every run. Writes
//              the body's snapshot there (position, columns the formulas read, index); counts its
//              candidates in the distinct buckets of its 3^D cells (two cells may share a bucket:
//              a mask marks the repeats) and claims ceil(count / 256) chunks, in bucket order, so
//              threads next to each other read the same cells; writes its home record (first
//              chunk, cell, mask)
//   ARGS       one thread: the pair work against the cap. Over it: no pair work this step, and the
//              status for the runner (it halts at the next readback with the stage and the count).
//              Else the indirect dispatch size of EVAL, as a 2D grid
//   EVAL       per chunk: up to 256 candidates, filtered by r < radius, the formula with the
//              CPU's roles; one partial (push and accumulators) per chunk
//   GATHER     per body: its chunks added up in order, into the plan's output columns
//
// Everything that adds floats does it in an order that does not depend on the run, so pair
// results repeat exactly. Atomic order only decides where a chunk's partial is stored.

const WG = 256;
const EVAL_WG = 64;
const RANK_WG = 64;
// Candidates per chunk: the most pair tests one thread makes
const CHUNK = 256;
// Buckets up to this many bodies are ranked by the body itself in ORDER
const RANK_DIRECT = 1024;
// Cells are a hair larger than the radius: two bodies closer than the radius stay in neighbouring
// cells despite f32 rounding of x / side, up to about 1e4 cells from the origin
const CELL_GROWTH = 1 + 1 / 1024;
// Cell coordinates are clamped here, so that adding the neighbour offsets cannot overflow
const CELL_LIMIT$1 = 1073741823;

// A step whose pair work is over the cap runs in slices of at most the cap, each in its own
// submit (see build.js); at most this many per step
const MAX_SLICES = 64;
// Words of pairArgs; a sliced step's indirect dispatch sizes per slice from SLICE_EVAL and
// SLICE_RANK (3 words each)
const ARGS = {
  RANK_X: 0, RANK_Y: 1, RANK_Z: 2, EVAL_X: 3, EVAL_Y: 4, EVAL_Z: 5,
  RANK_TOTAL: 6, FLAGS: 7, ALLOC: 8, OK: 9, EVAL_COUNT: 10, RANK_COUNT: 11,
  SLICE_EVAL: 16, SLICE_RANK: 16 + 3 * MAX_SLICES, WORDS: 16 + 6 * MAX_SLICES,
};
const OVER = 1, CROWDED = 2;
// Words per body in pairBody: bucket, slot, rank, first chunk, chunks, first rank chunk, then the
// cell
const BODY = { BUCKET: 0, SLOT: 1, RANK: 2, FIRST: 3, COUNT: 4, RANK_FIRST: 5, CELL: 6 };

const AX = 'xyzw';

function each(n, fn, sep = ' ') {
  const out = [];
  for (let k = 0; k < n; k++) out.push(fn(k));
  return out.join(sep);
}

function u32$1(value) {
  return value + 'u';
}

const LINEAR = '@builtin(global_invocation_id) gid: vec3u, @builtin(num_workgroups) nwg: vec3u';
const linearId = wg => `gid.x + gid.y * nwg.x * ${u32$1(wg)}`;

// A sliced step's numbers, at a dynamic offset: the slices of the step (k), or which slice this
// dispatch works on (index; its chunks start at index * PP.cap)
const SLICE = binding => `struct PairSlice { k: u32, index: u32, pad0: u32, pad1: u32 };
@group(0) @binding(${binding}) var<uniform> SL: PairSlice;`;

const PARAMS = `struct PairParams { n: u32, mask: u32, size: u32, blocks: u32, cap: u32, sort: u32, owners: u32, home: u32 };
@group(0) @binding(0) var<uniform> PP: PairParams;`;

// Where bucket b starts: its offset in its block of 1,024, plus the block's (bucket `size` is n)
const START_FN = `fn pair_start(b: u32) -> u32 {
  return pairStart[b] + pairStart[PP.size + 1u + (b >> 10u)];
}`;

/**
 * Words per body record, per home record (first chunk, cell, mask) and per snapshot entry for `D`
 * and the snapshot's columns ([{width}]).
 */
function pairLayout(D, columns) {
  const words = D + columns.reduce((total, c) => total + c.width, 0) + 1;
  const maskWords = Math.ceil(3 ** D / 32);
  return { body: BODY.CELL + D, home: 1 + D + maskWords, maskWords, snap4: Math.ceil(words / 4), index: words - 1 };
}

// The bucket of a cell: the CPU's hash (lib/createNeighborGrid.js), masked by the table's size
function hashFn(D) {
  return `fn pair_hash(${each(D, k => `c${k}: i32`, ', ')}) -> u32 {
  var h = 0x165667b1u;
  ${each(D, k => `h = (h ^ bitcast<u32>(c${k})) * 0x27d4eb2du; h ^= h >> 15u;`, '\n  ')}
  return h & PP.mask;
}`;
}

// The neighbour cell o of cell (c0, c1, ...): offset (o / 3^k) % 3 - 1 on axis k
function neighbourHash(D, o) {
  return `pair_hash(${each(D, k => `c${k} + i32((${o} / ${u32$1(3 ** k)}) % 3u) - 1`, ', ')})`;
}

// Code that counts the candidates in the distinct buckets of the 3^D cells around (c0, c1, ...)
// into `candidates`, and sets bit o of mask<o / 32> when cell o's bucket repeats an earlier one.
// Unrolled up to 3D, so the buckets stay in registers
function countNeighbours(D, indent) {
  const cells = 3 ** D, words = Math.ceil(cells / 32);
  const lines = ['var candidates = 0u;'];
  for (let w = 0; w < words; w++) lines.push(`var mask${w} = 0u;`);
  if (D <= 3) {
    for (let o = 0; o < cells; o++) {
      lines.push(`let pb${o} = ${neighbourHash(D, u32$1(o))};`);
      const repeats = [];
      for (let q = 0; q < o; q++) repeats.push(`pb${o} == pb${q}`);
      const add = `candidates += pair_start(pb${o} + 1u) - pair_start(pb${o});`;
      lines.push(o ? `if (${repeats.join(' || ')}) { mask${o >> 5} |= ${u32$1(2 ** (o & 31))}; } else { ${add} }` : add);
    }
  } else {
    lines.push(
      `var seen: array<u32, ${cells}>;`,
      `for (var o = 0u; o < ${u32$1(cells)}; o++) {`,
      `  let pb = ${neighbourHash(D, 'o')};`,
      '  var repeat = false;',
      '  for (var q = 0u; q < o; q++) { repeat = repeat || seen[q] == pb; }',
      '  seen[o] = pb;',
      `  if (repeat) { ${each(words, w => `if ((o >> 5u) == ${u32$1(w)}) { mask${w} |= 1u << (o & 31u); }`)} continue; }`,
      '  candidates += pair_start(pb + 1u) - pair_start(pb);',
      '}');
  }
  return lines.map(line => indent + line).join('\n');
}

// Code that walks the distinct buckets of the 3^D cells around (c0, c1, ...), skipping those the
// mask marks: `body` runs for each, with `pb` its bucket
function forNeighbourBuckets(D, body, indent) {
  const cells = 3 ** D, words = Math.ceil(cells / 32);
  const word = words === 1 ? 'mask0' : 'select(select(mask0, mask1, o >= 32u), mask2, o >= 64u)';
  const lines = [
    `for (var o = 0u; o < ${u32$1(cells)}; o++) {`,
    `  if (((${word} >> (o & 31u)) & 1u) != 0u) { continue; }`,
    `  let pb = ${neighbourHash(D, 'o')};`,
  ].concat(body.map(line => '  ' + line), ['}']);
  return lines.map(line => indent + line).join('\n');
}

// Writes the indirect dispatch size for `count` threads of `wg` into pairArgs from `at`
function gridArgs(name, count, wg, at, maxGroups) {
  return [
    `let ${name}W = (${count} + ${u32$1(wg - 1)}) / ${u32$1(wg)};`,
    `pairArgs[${at}] = min(${name}W, ${u32$1(maxGroups)}); pairArgs[${at + 1}] = (${name}W + ${u32$1(maxGroups - 1)}) / ${u32$1(maxGroups)}; pairArgs[${at + 2}] = 1u;`,
  ].join(' ');
}

/**
 * The structure kernels of one sort: {name: {code, bindings}}. `spec`: {D, layout, snapshot:
 * [{column, width, ref}], pos (colRef), slot: {decl(binding), at(index)}, radius (slot index),
 * maxGroups}.
 */
function sortKernels(spec) {
  const { D, layout, slot } = spec;
  const B = layout.body;
  const hash = hashFn(D);
  const out = {};

  out.BIN = {
    bindings: ['uniform', 'dynamic', 'read', 'storage', 'storage'],
    code: `${PARAMS}
${slot.decl(1)}
@group(0) @binding(2) var<storage, read> X: array<f32>;
@group(0) @binding(3) var<storage, read_write> pairCount: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> pairBody: array<u32>;
${hash}
@compute @workgroup_size(${WG})
fn main(${LINEAR}) {
  let i = ${linearId(WG)};
  if (i >= PP.n) { return; }
  let inv = 1.0 / (${slot.at(spec.radius)} * ${CELL_GROWTH});
  ${each(D, k => `let c${k} = i32(clamp(floor(${spec.pos.at('i', k)} * inv), ${-CELL_LIMIT$1}.0, ${CELL_LIMIT$1}.0));`, '\n  ')}
  let h = pair_hash(${each(D, k => `c${k}`, ', ')});
  let record = i * ${u32$1(B)};
  pairBody[record + ${u32$1(BODY.BUCKET)}] = h;
  pairBody[record + ${u32$1(BODY.SLOT)}] = atomicAdd(&pairCount[h], 1u);
  pairBody[record + ${u32$1(BODY.RANK)}] = 0u;
  ${each(D, k => `pairBody[record + ${u32$1(BODY.CELL + k)}] = bitcast<u32>(c${k});`, ' ')}
}
`,
  };

  // Exclusive scan of the counts in blocks of 1,024 (the table holds a multiple of 1,024); zeroes
  // the counts for the next step. pairStart: [start in its block per bucket | 0 | block offsets,
  // then n]
  out.SCAN_BLOCKS = {
    bindings: ['uniform', 'storage', 'storage'],
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read_write> pairCount: array<u32>;
@group(0) @binding(2) var<storage, read_write> pairStart: array<u32>;
var<workgroup> tmp: array<u32, 256>;
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) li: u32, @builtin(workgroup_id) wid: vec3u) {
  let base = wid.x * 1024u + li * 4u;
  let a0 = pairCount[base]; let a1 = pairCount[base + 1u]; let a2 = pairCount[base + 2u]; let a3 = pairCount[base + 3u];
  pairCount[base] = 0u; pairCount[base + 1u] = 0u; pairCount[base + 2u] = 0u; pairCount[base + 3u] = 0u;
  let t = a0 + a1 + a2 + a3;
  tmp[li] = t;
  workgroupBarrier();
  for (var off = 1u; off < 256u; off <<= 1u) {
    var v = tmp[li];
    if (li >= off) { v += tmp[li - off]; }
    workgroupBarrier();
    tmp[li] = v;
    workgroupBarrier();
  }
  let ex = tmp[li] - t;
  pairStart[base] = ex; pairStart[base + 1u] = ex + a0; pairStart[base + 2u] = ex + a0 + a1; pairStart[base + 3u] = ex + a0 + a1 + a2;
  if (li == 255u) { pairStart[PP.size + 1u + wid.x] = tmp[255]; }
}
`,
  };

  // One workgroup: the block sums become block offsets, 1,024 at a time with a carry; the offset
  // past the last block is n, so pair_start(size) is n
  out.SCAN_TOP = {
    bindings: ['uniform', 'storage'],
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read_write> pairStart: array<u32>;
var<workgroup> tmp: array<u32, 256>;
var<workgroup> carry: u32;
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) li: u32) {
  if (li == 0u) { carry = 0u; }
  workgroupBarrier();
  let sums = PP.size + 1u;
  for (var done = 0u; done < PP.blocks; done += 1024u) {
    let base = done + li * 4u;
    var a = vec4u(0u);
    for (var k = 0u; k < 4u; k++) { if (base + k < PP.blocks) { a[k] = pairStart[sums + base + k]; } }
    let t = a.x + a.y + a.z + a.w;
    tmp[li] = t;
    workgroupBarrier();
    for (var off = 1u; off < 256u; off <<= 1u) {
      var v = tmp[li];
      if (li >= off) { v += tmp[li - off]; }
      workgroupBarrier();
      tmp[li] = v;
      workgroupBarrier();
    }
    var ex = carry + tmp[li] - t;
    for (var k = 0u; k < 4u; k++) { if (base + k < PP.blocks) { pairStart[sums + base + k] = ex; } ex += a[k]; }
    workgroupBarrier();
    if (li == 255u) { carry += tmp[255]; }
    workgroupBarrier();
  }
  if (li == 0u) { pairStart[sums + PP.blocks] = carry; }
}
`,
  };

  out.PLACE = {
    bindings: ['uniform', 'read', 'storage', 'storage', 'storage'],
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read> pairStart: array<u32>;
@group(0) @binding(2) var<storage, read_write> pairBody: array<u32>;
@group(0) @binding(3) var<storage, read_write> pairList: array<u32>;
@group(0) @binding(4) var<storage, read_write> pairArgs: array<atomic<u32>>;
${START_FN}
@compute @workgroup_size(${WG})
fn main(${LINEAR}) {
  let i = ${linearId(WG)};
  if (i >= PP.n) { return; }
  let record = i * ${u32$1(B)};
  let h = pairBody[record + ${u32$1(BODY.BUCKET)}];
  let s = pair_start(h);
  let k = pair_start(h + 1u) - s;
  pairList[s + pairBody[record + ${u32$1(BODY.SLOT)}]] = i;
  if (k > ${u32$1(RANK_DIRECT)}) {
    atomicOr(&pairArgs[${ARGS.FLAGS}], ${u32$1(CROWDED)});
    let ranks = (k + ${u32$1(CHUNK - 1)}) / ${u32$1(CHUNK)};
    let first = atomicAdd(&pairArgs[${ARGS.RANK_TOTAL}], ranks);
    pairBody[record + ${u32$1(BODY.RANK_FIRST)}] = first;
    // past the cap nothing is written, and ARGS_RANK stops the step
    if (first <= PP.cap && first + ranks <= PP.cap) {
      for (var c = 0u; c < ranks; c++) { pairList[PP.n + first + c] = i; }
    }
  }
}
`,
  };

  // One thread: rank work over the cap stops the step's pair work, and the status keeps the first
  // stage and count that went over until the runner reads it
  const stop = (count, code, capacity = 'PP.cap') => `pairArgs[${ARGS.OK}] = 0u;
    if (pairStatus[0] == 0u) {
      pairStatus[0] = ${u32$1(code)};
      pairStatus[1] = PP.sort;
      // a total at or under the cap has wrapped past 2^32
      pairStatus[2] = select(0xffffffffu, ${count}, ${count} > ${capacity});
      pairStatus[3] = ${capacity};
    }`;
  out.ARGS_RANK = {
    bindings: ['uniform', 'storage', 'storage'],
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read_write> pairArgs: array<u32>;
@group(0) @binding(2) var<storage, read_write> pairStatus: array<u32>;
@compute @workgroup_size(1)
fn main() {
  let ranks = pairArgs[${ARGS.RANK_TOTAL}];
  let crowded = (pairArgs[${ARGS.FLAGS}] & ${u32$1(CROWDED)}) != 0u;
  pairArgs[${ARGS.OK}] = 1u;
  pairArgs[${ARGS.RANK_X}] = 0u; pairArgs[${ARGS.RANK_Y}] = 1u; pairArgs[${ARGS.RANK_Z}] = 1u;
  pairArgs[${ARGS.RANK_COUNT}] = 0u;
  if (crowded && ranks > PP.cap) {
    ${stop('ranks', 2)}
  } else if (crowded) {
    ${gridArgs('rank', 'ranks', RANK_WG, ARGS.RANK_X, spec.maxGroups)}
    pairArgs[${ARGS.RANK_COUNT}] = ranks;
  }
  pairArgs[${ARGS.RANK_TOTAL}] = 0u;
}
`,
  };

  out.RANK = {
    bindings: ['uniform', 'read', 'read', 'storage', 'read'],
    indirect: ARGS.RANK_X,
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read> pairArgs: array<u32>;
@group(0) @binding(2) var<storage, read> pairStart: array<u32>;
@group(0) @binding(3) var<storage, read_write> pairBody: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read> pairList: array<u32>;
${START_FN}
@compute @workgroup_size(${RANK_WG})
fn main(${LINEAR}) {
  let t = ${linearId(RANK_WG)};
  if (t >= pairArgs[${ARGS.RANK_COUNT}]) { return; }
  let i = pairList[PP.n + t];
  let record = i * ${u32$1(B)};
  let c = t - atomicLoad(&pairBody[record + ${u32$1(BODY.RANK_FIRST)}]);
  let h = atomicLoad(&pairBody[record + ${u32$1(BODY.BUCKET)}]);
  let lo = pair_start(h) + c * ${u32$1(CHUNK)};
  let hi = min(pair_start(h + 1u), lo + ${u32$1(CHUNK)});
  var lower = 0u;
  for (var at = lo; at < hi; at++) { lower += select(0u, 1u, pairList[at] < i); }
  if (lower > 0u) { atomicAdd(&pairBody[record + ${u32$1(BODY.RANK)}], lower); }
}
`,
  };

  // The snapshot of a body: its position (relative, as the device keeps it), the columns the
  // sort's formulas read, its store row (the formulas' roles; `spec.row` when the device keeps
  // the rows in another order); as u32 words, so the row stays exact
  const words = [];
  for (let k = 0; k < D; k++) words.push(`bitcast<u32>(${spec.pos.at('i', k)})`);
  spec.snapshot.forEach(c => { for (let k = 0; k < c.width; k++) words.push(`bitcast<u32>(${c.ref.at('i', k)})`); });
  while (words.length < layout.index) words.push('0u');
  words.push(spec.row ? spec.row.at('i') : 'i');
  while (words.length < layout.snap4 * 4) words.push('0u');
  const columnBuffers = [];
  spec.snapshot.forEach(c => { if (columnBuffers.indexOf(c.ref.buffer) < 0) columnBuffers.push(c.ref.buffer); });
  if (spec.row && columnBuffers.indexOf(spec.row.buffer) < 0) columnBuffers.push(spec.row.buffer);
  out.ORDER = orderKernel(spec, words, columnBuffers, false);
  out.ORDER_S = orderKernel(spec, words, columnBuffers, true);

  out.ARGS = {
    bindings: ['uniform', 'storage', 'storage'],
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read_write> pairArgs: array<u32>;
@group(0) @binding(2) var<storage, read_write> pairStatus: array<u32>;
@compute @workgroup_size(1)
fn main() {
  let total = pairArgs[${ARGS.ALLOC}];
  pairStatus[4u + PP.sort] = total;
  pairArgs[${ARGS.EVAL_X}] = 0u; pairArgs[${ARGS.EVAL_Y}] = 1u; pairArgs[${ARGS.EVAL_Z}] = 1u;
  pairArgs[${ARGS.EVAL_COUNT}] = 0u;
  if ((pairArgs[${ARGS.FLAGS}] & ${u32$1(OVER)}) != 0u || total > PP.cap) {
    ${stop('total', 1)}
  } else if (pairArgs[${ARGS.OK}] != 0u) {
    ${gridArgs('eval', 'total', EVAL_WG, ARGS.EVAL_X, spec.maxGroups)}
    pairArgs[${ARGS.EVAL_COUNT}] = total;
  }
  pairArgs[${ARGS.FLAGS}] = 0u; pairArgs[${ARGS.ALLOC}] = 0u;
}
`,
  };
  Object.assign(out, slicedSortKernels(spec, stop));
  return out;
}

// The kernels a sliced step adds to its sort (ORDER_S is ORDER's variant). Its pair work and rank
// work run in slices of at most PP.cap chunks, each in a submit of its own; owner lists are
// written per slice, so memory stays at one slice:
//   PLACE_S        PLACE, without writing rank chunk owners
//   ARGS_RANK_S    ARGS_RANK against the step's slices (SL.k of them); a dispatch size per slice
//   RANK_OWNERS_S  per body of a crowded bucket: the owners of its rank chunks in this slice
//   RANK_S         RANK over this slice's rank chunks
//   ARGS_S         ARGS against the step's slices; a dispatch size per slice
//   EVAL_OWNERS_S  per body: the owners (its place in bucket order) of its chunks in this slice
function slicedSortKernels(spec, stop) {
  const { layout } = spec;
  const B = layout.body;
  const out = {};
  // a slice's chunks, from `first` for `count`, clipped to slice SL.index
  const clip = (first, count) => `let base = SL.index * PP.cap;
  let lo = max(${first}, base);
  let hi = min(${first} + ${count}, base + PP.cap);`;
  // the indirect dispatch size of each slice of `total` chunks, `wg` threads a workgroup
  const sliceArgs = (total, wg, at) => `for (var s = 0u; s < SL.k; s++) {
      let count = select(0u, min(PP.cap, ${total} - s * PP.cap), ${total} > s * PP.cap);
      let w = (count + ${u32$1(wg - 1)}) / ${u32$1(wg)};
      pairArgs[${u32$1(at)} + 3u * s] = min(w, ${u32$1(spec.maxGroups)});
      pairArgs[${u32$1(at)} + 3u * s + 1u] = (w + ${u32$1(spec.maxGroups - 1)}) / ${u32$1(spec.maxGroups)};
      pairArgs[${u32$1(at)} + 3u * s + 2u] = 1u;
    }`;
  const zeroArgs = at => `for (var s = 0u; s < SL.k; s++) { pairArgs[${u32$1(at)} + 3u * s] = 0u; pairArgs[${u32$1(at)} + 3u * s + 1u] = 1u; pairArgs[${u32$1(at)} + 3u * s + 2u] = 1u; }`;

  out.PLACE_S = {
    bindings: ['uniform', 'read', 'storage', 'storage', 'storage'],
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read> pairStart: array<u32>;
@group(0) @binding(2) var<storage, read_write> pairBody: array<u32>;
@group(0) @binding(3) var<storage, read_write> pairList: array<u32>;
@group(0) @binding(4) var<storage, read_write> pairArgs: array<atomic<u32>>;
${START_FN}
@compute @workgroup_size(${WG})
fn main(${LINEAR}) {
  let i = ${linearId(WG)};
  if (i >= PP.n) { return; }
  let record = i * ${u32$1(B)};
  let h = pairBody[record + ${u32$1(BODY.BUCKET)}];
  let s = pair_start(h);
  let k = pair_start(h + 1u) - s;
  pairList[s + pairBody[record + ${u32$1(BODY.SLOT)}]] = i;
  if (k > ${u32$1(RANK_DIRECT)}) {
    atomicOr(&pairArgs[${ARGS.FLAGS}], ${u32$1(CROWDED)});
    pairBody[record + ${u32$1(BODY.RANK_FIRST)}] = atomicAdd(&pairArgs[${ARGS.RANK_TOTAL}], (k + ${u32$1(CHUNK - 1)}) / ${u32$1(CHUNK)});
  }
}
`,
  };

  out.ARGS_RANK_S = {
    bindings: ['uniform', 'storage', 'storage', 'dynamic'],
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read_write> pairArgs: array<u32>;
@group(0) @binding(2) var<storage, read_write> pairStatus: array<u32>;
${SLICE(3)}
@compute @workgroup_size(1)
fn main() {
  let ranks = pairArgs[${ARGS.RANK_TOTAL}];
  let crowded = (pairArgs[${ARGS.FLAGS}] & ${u32$1(CROWDED)}) != 0u;
  let capacity = SL.k * PP.cap;
  pairArgs[${ARGS.OK}] = 1u;
  pairArgs[${ARGS.RANK_COUNT}] = 0u;
  ${zeroArgs(ARGS.SLICE_RANK)}
  if (crowded && ranks > capacity) {
    ${stop('ranks', 4, 'capacity')}
  } else if (crowded) {
    ${sliceArgs('ranks', RANK_WG, ARGS.SLICE_RANK)}
    pairArgs[${ARGS.RANK_COUNT}] = ranks;
  }
  pairArgs[${ARGS.RANK_TOTAL}] = 0u;
}
`,
  };

  out.RANK_OWNERS_S = {
    bindings: ['uniform', 'read', 'read', 'read', 'storage', 'dynamic'],
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read> pairArgs: array<u32>;
@group(0) @binding(2) var<storage, read> pairStart: array<u32>;
@group(0) @binding(3) var<storage, read> pairBody: array<u32>;
@group(0) @binding(4) var<storage, read_write> pairList: array<u32>;
${SLICE(5)}
${START_FN}
@compute @workgroup_size(${WG})
fn main(${LINEAR}) {
  let i = ${linearId(WG)};
  if (i >= PP.n || pairArgs[${ARGS.RANK_COUNT}] == 0u) { return; }
  let record = i * ${u32$1(B)};
  let h = pairBody[record + ${u32$1(BODY.BUCKET)}];
  let k = pair_start(h + 1u) - pair_start(h);
  if (k <= ${u32$1(RANK_DIRECT)}) { return; }
  ${clip(`pairBody[record + ${u32$1(BODY.RANK_FIRST)}]`, `(k + ${u32$1(CHUNK - 1)}) / ${u32$1(CHUNK)}`)}
  for (var c = lo; c < hi; c++) { pairList[PP.n + c - base] = i; }
}
`,
  };

  out.RANK_S = {
    bindings: ['uniform', 'read', 'read', 'storage', 'read', 'dynamic'],
    indirect: ARGS.SLICE_RANK,
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read> pairArgs: array<u32>;
@group(0) @binding(2) var<storage, read> pairStart: array<u32>;
@group(0) @binding(3) var<storage, read_write> pairBody: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read> pairList: array<u32>;
${SLICE(5)}
${START_FN}
@compute @workgroup_size(${RANK_WG})
fn main(${LINEAR}) {
  let t = ${linearId(RANK_WG)};
  let chunk = SL.index * PP.cap + t;
  if (t >= PP.cap || chunk >= pairArgs[${ARGS.RANK_COUNT}]) { return; }
  let i = pairList[PP.n + t];
  let record = i * ${u32$1(B)};
  let c = chunk - atomicLoad(&pairBody[record + ${u32$1(BODY.RANK_FIRST)}]);
  let h = atomicLoad(&pairBody[record + ${u32$1(BODY.BUCKET)}]);
  let lo = pair_start(h) + c * ${u32$1(CHUNK)};
  let hi = min(pair_start(h + 1u), lo + ${u32$1(CHUNK)});
  var lower = 0u;
  for (var at = lo; at < hi; at++) { lower += select(0u, 1u, pairList[at] < i); }
  if (lower > 0u) { atomicAdd(&pairBody[record + ${u32$1(BODY.RANK)}], lower); }
}
`,
  };

  out.ARGS_S = {
    bindings: ['uniform', 'storage', 'storage', 'dynamic'],
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read_write> pairArgs: array<u32>;
@group(0) @binding(2) var<storage, read_write> pairStatus: array<u32>;
${SLICE(3)}
@compute @workgroup_size(1)
fn main() {
  let total = pairArgs[${ARGS.ALLOC}];
  let capacity = SL.k * PP.cap;
  pairStatus[4u + PP.sort] = total;
  pairArgs[${ARGS.EVAL_COUNT}] = 0u;
  ${zeroArgs(ARGS.SLICE_EVAL)}
  if ((pairArgs[${ARGS.FLAGS}] & ${u32$1(OVER)}) != 0u || total > capacity) {
    ${stop('total', 3, 'capacity')}
  } else if (pairArgs[${ARGS.OK}] != 0u) {
    ${sliceArgs('total', EVAL_WG, ARGS.SLICE_EVAL)}
    pairArgs[${ARGS.EVAL_COUNT}] = total;
  }
  pairArgs[${ARGS.FLAGS}] = 0u; pairArgs[${ARGS.ALLOC}] = 0u;
}
`,
  };

  out.EVAL_OWNERS_S = {
    bindings: ['uniform', 'read', 'read', 'storage', 'dynamic'],
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read> pairArgs: array<u32>;
@group(0) @binding(2) var<storage, read> pairBody: array<u32>;
@group(0) @binding(3) var<storage, read_write> pairList: array<u32>;
${SLICE(4)}
@compute @workgroup_size(${WG})
fn main(${LINEAR}) {
  let i = ${linearId(WG)};
  if (i >= PP.n || pairArgs[${ARGS.EVAL_COUNT}] == 0u) { return; }
  let record = i * ${u32$1(B)};
  let p = pairList[PP.home + PP.n * ${u32$1(layout.home)} + i];
  ${clip(`pairBody[record + ${u32$1(BODY.FIRST)}]`, `pairBody[record + ${u32$1(BODY.COUNT)}]`)}
  for (var c = lo; c < hi; c++) { pairList[PP.owners + c - base] = p; }
}
`,
  };
  return out;
}

// ORDER (see the top of this file). `words`: the snapshot's words, `columnBuffers`: the buffers
// its columns come from. Sliced, it checks the claimed chunks against the step's slices and
// keeps each body's place in bucket order for the slices' owner lists, instead of writing them
function orderKernel(spec, words, columnBuffers, sliced) {
  const { D, layout } = spec;
  const B = layout.body;
  // a sliced step may claim up to its slices' chunks, and leaves the chunk owners to each slice
  const capacity = sliced ? 'capacity' : 'PP.cap';
  return {
    bindings: ['uniform', 'storage', 'read', 'storage', 'storage', 'storage', 'read'].concat(columnBuffers.map(() => 'read'), sliced ? ['dynamic'] : []),
    columns: columnBuffers,
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read_write> pairArgs: array<atomic<u32>>;
@group(0) @binding(2) var<storage, read> pairStart: array<u32>;
@group(0) @binding(3) var<storage, read_write> pairBody: array<u32>;
@group(0) @binding(4) var<storage, read_write> pairList: array<u32>;
@group(0) @binding(5) var<storage, read_write> pairSnap: array<vec4u>;
@group(0) @binding(6) var<storage, read> X: array<f32>;
${columnBuffers.map((name, k) => `@group(0) @binding(${7 + k}) var<storage, read> ${name}: array<f32>;`).join('\n')}${sliced ? '\n' + SLICE(7 + columnBuffers.length) : ''}
var<workgroup> claimed: atomic<u32>;
var<workgroup> base: u32;
var<workgroup> fits: u32;
${hashFn(D)}
${START_FN}
@compute @workgroup_size(${WG})
fn main(${LINEAR}, @builtin(local_invocation_index) li: u32) {
  let q = ${linearId(WG)};
  let live = q < PP.n && atomicLoad(&pairArgs[${ARGS.OK}]) != 0u;
  var i = 0u; var p = 0u; var chunks = 0u; var mine = 0u;
  ${each(D, k => `var c${k} = 0;`)}
  ${each(layout.maskWords, w => `var home${w} = 0u;`)}
  if (live) {
    i = pairList[q];
    let record = i * ${u32$1(B)};
    let h = pairBody[record + ${u32$1(BODY.BUCKET)}];
    let s = pair_start(h);
    let e = pair_start(h + 1u);
    var rank = pairBody[record + ${u32$1(BODY.RANK)}];
    if (e - s <= ${u32$1(RANK_DIRECT)}) {
      rank = 0u;
      for (var t = s; t < e; t++) { rank += select(0u, 1u, pairList[t] < i); }
    }
    p = s + rank;
    ${each(layout.snap4, w => `pairSnap[p * ${u32$1(layout.snap4)} + ${u32$1(w)}] = vec4u(${words.slice(4 * w, 4 * w + 4).join(', ')});`, '\n    ')}
    ${each(D, k => `c${k} = bitcast<i32>(pairBody[record + ${u32$1(BODY.CELL + k)}]);`)}
${countNeighbours(D, '    ')}
    ${each(layout.maskWords, w => `home${w} = mask${w};`)}
    // the body's own bucket is among them, so every body has a chunk
    chunks = (candidates + ${u32$1(CHUNK - 1)}) / ${u32$1(CHUNK)};
    mine = atomicAdd(&claimed, chunks);
  }
  // chunks are handed out per workgroup, in bucket order; past the cap nothing is written, and
  // ARGS stops the step
  workgroupBarrier();
  if (li == 0u) {
    let total = atomicLoad(&claimed);
    base = atomicAdd(&pairArgs[${ARGS.ALLOC}], total);${sliced ? '\n    let capacity = SL.k * PP.cap;' : ''}
    fits = select(0u, 1u, base <= ${capacity} && base + total <= ${capacity});
    if (fits == 0u) { atomicOr(&pairArgs[${ARGS.FLAGS}], ${u32$1(OVER)}); }
  }
  workgroupBarrier();
  if (live && fits != 0u) {
    let first = base + mine;
    let record = i * ${u32$1(B)};
    pairBody[record + ${u32$1(BODY.FIRST)}] = first;
    pairBody[record + ${u32$1(BODY.COUNT)}] = chunks;
    let home = PP.home + p * ${u32$1(layout.home)};
    pairList[home] = first;
    ${each(D, k => `pairList[home + ${u32$1(1 + k)}] = bitcast<u32>(c${k});`)}
    ${each(layout.maskWords, w => `pairList[home + ${u32$1(1 + D + w)}] = home${w};`)}
    ${sliced ? `pairList[PP.home + PP.n * ${u32$1(layout.home)} + i] = p;` : 'for (var c = 0u; c < chunks; c++) { pairList[PP.owners + first + c] = p; }'}
  }
}
`,
  };
}

/**
 * The chunk kernel and the gather of one pair stage: {EVAL, GATHER} as {code, bindings}.
 * `spec`: {D, layout, stage, snapshot: [{column, width, word}], columns (program's, by name),
 * slot, radius, param(name), builtIn(name), sums: {width(name), at(name, k), buffer}, origin(k),
 * outputs: {force: colRef, <accumulator>: colRef}, printer}.
 */
function stageKernels(spec) {
  const { D, layout, slot } = spec;
  const B = layout.body;
  const wordOf = (column, k) => spec.snapshot.find(c => c.column === column).word + k;
  // a number of a snapshot entry loaded into vec4u locals (me0, me1, ... or other0, ...)
  const field = (who, w) => `${who}${w >> 2}.${AX[w & 3]}`;
  const fieldF = (who, w) => `bitcast<f32>(${field(who, w)})`;
  const read = (column, who, k) => {
    if (column === 'pos') return `(${fieldF(who, k)} + ${spec.origin(k)})`;
    return fieldF(who, wordOf(column, k));
  };
  const printed = printPairFormula(spec.stage, {
    D, printer: spec.printer, columns: spec.columns, read,
    param: spec.param, builtIn: spec.builtIn,
    sumWidth: name => spec.sums.width(name), sum: (name, k) => spec.sums.at(name, k),
  });
  const accumulators = printed.accumulators;
  const partialWords = D + accumulators.reduce((total, a) => total + a.width, 0);
  const sumsRead = spec.stage.sums.length > 0;
  const candidate = pairCandidate(printed, { D, me: 'me', other: 'other', r2: 'r2', radius: 'radius', reach2: 'reach2', force: k => `pair_force_${k}` });
  const totals = [];
  for (let k = 0; k < D; k++) totals.push(`pair_force_${k}`);
  accumulators.forEach(a => { for (let k = 0; k < a.width; k++) totals.push(accumulatorName(a.column, k, a.width)); });
  const load = (who, base) => each(layout.snap4, w => `let ${who}${w} = pairSnap[${base} * ${u32$1(layout.snap4)} + ${u32$1(w)}];`, ' ');

  // A sliced step's chunk kernel works on the chunks of one slice: thread t on chunk
  // SL.index * PP.cap + t, its owner and partial at t
  const evalKernel = sliced => ({
    bindings: ['uniform', 'dynamic', 'read', 'read', 'read', 'read', 'storage'].concat(sumsRead ? ['read'] : [], sliced ? ['dynamic'] : []),
    indirect: sliced ? ARGS.SLICE_EVAL : ARGS.EVAL_X,
    partialWords,
    code: `${PARAMS}
${slot.decl(1)}
@group(0) @binding(2) var<storage, read> pairArgs: array<u32>;
@group(0) @binding(3) var<storage, read> pairStart: array<u32>;
@group(0) @binding(4) var<storage, read> pairList: array<u32>;
@group(0) @binding(5) var<storage, read> pairSnap: array<vec4u>;
@group(0) @binding(6) var<storage, read_write> pairPartial: array<f32>;
${sumsRead ? `@group(0) @binding(7) var<storage, read> ${spec.sums.buffer}: array<f32>;` : ''}${sliced ? '\n' + SLICE(sumsRead ? 8 : 7) : ''}
${hashFn(D)}
${START_FN}
@compute @workgroup_size(${EVAL_WG})
fn main(${LINEAR}) {
  let t = ${linearId(EVAL_WG)};
  ${sliced ? `let chunk = SL.index * PP.cap + t;
  if (t >= PP.cap || chunk >= pairArgs[${ARGS.EVAL_COUNT}]) { return; }` : `if (t >= pairArgs[${ARGS.EVAL_COUNT}]) { return; }`}
  let p = pairList[PP.owners + t];
  ${load('me', 'p')}
  let me = me${layout.index >> 2}.${AX[layout.index & 3]};
  let home = PP.home + p * ${u32$1(layout.home)};
  ${each(D, k => `let c${k} = bitcast<i32>(pairList[home + ${u32$1(1 + k)}]);`)}
  ${each(layout.maskWords, w => `let mask${w} = pairList[home + ${u32$1(1 + D + w)}];`)}
  let radius = ${slot.at(spec.radius)};
  // most candidates are farther than the radius: the squared test spares them the root, with a
  // margin that drops only pairs the exact test drops
  let reach2 = radius * radius * 1.0001;
  ${totals.map(name => `var ${name} = 0.0;`).join(' ')}
  var skip = (${sliced ? 'chunk' : 't'} - pairList[home]) * ${u32$1(CHUNK)};
  var left = ${u32$1(CHUNK)};
${forNeighbourBuckets(D, [
    'let s = pair_start(pb);',
    'let k = pair_start(pb + 1u) - s;',
    'if (skip >= k) { skip -= k; continue; }',
    'let lo = s + skip;',
    'skip = 0u;',
    'let hi = min(s + k, lo + left);',
    'left -= hi - lo;',
    'for (var at = lo; at < hi; at++) {',
    `  ${load('other', 'at')}`,
    `  let other = other${layout.index >> 2}.${AX[layout.index & 3]};`,
    `  ${each(D, k => `let d${k} = ${fieldF('me', k)} - ${fieldF('other', k)};`)}`,
    `  let r2 = ${each(D, k => `d${k} * d${k}`, ' + ')};`,
  ].concat(candidate.map(line => '  ' + line), [
    '}',
    'if (left == 0u) { break; }',
  ]), '  ')}
  let out = t * ${u32$1(partialWords)};
  ${totals.map((name, w) => `pairPartial[out + ${u32$1(w)}] = ${name};`).join(' ')}
}
`,
  });

  const outputBuffers = [];
  const outputs = [];
  for (let k = 0; k < D; k++) outputs.push(spec.outputs.force.at('i', k));
  accumulators.forEach(a => { for (let k = 0; k < a.width; k++) outputs.push(spec.outputs[a.column].at('i', k)); });
  [spec.outputs.force].concat(accumulators.map(a => spec.outputs[a.column])).forEach(ref => {
    if (outputBuffers.indexOf(ref.buffer) < 0) outputBuffers.push(ref.buffer);
  });
  const GATHER = {
    bindings: ['uniform', 'read', 'read', 'read'].concat(outputBuffers.map(() => 'storage')),
    columns: outputBuffers,
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read> pairArgs: array<u32>;
@group(0) @binding(2) var<storage, read> pairBody: array<u32>;
@group(0) @binding(3) var<storage, read> pairPartial: array<f32>;
${outputBuffers.map((name, k) => `@group(0) @binding(${4 + k}) var<storage, read_write> ${name}: array<f32>;`).join('\n')}
@compute @workgroup_size(${WG})
fn main(${LINEAR}) {
  let i = ${linearId(WG)};
  if (i >= PP.n) { return; }
  ${outputs.map((_, w) => `var total${w} = 0.0;`).join(' ')}
  if (pairArgs[${ARGS.EVAL_COUNT}] != 0u) {
    let record = i * ${u32$1(B)};
    let first = pairBody[record + ${u32$1(BODY.FIRST)}];
    let count = pairBody[record + ${u32$1(BODY.COUNT)}];
    for (var c = 0u; c < count; c++) {
      let at = (first + c) * ${u32$1(partialWords)};
      ${outputs.map((_, w) => `total${w} += pairPartial[at + ${u32$1(w)}];`).join(' ')}
    }
  }
  ${outputs.map((ref, w) => `${ref} = total${w};`).join(' ')}
}
`,
  };

  // A slice's gather adds the body's chunks in this slice onto what the slices before added (the
  // first slice starts from 0): the same additions in the same order as GATHER
  const GATHER_S = {
    bindings: ['uniform', 'read', 'read', 'read'].concat(outputBuffers.map(() => 'storage'), ['dynamic']),
    columns: outputBuffers,
    code: `${PARAMS}
@group(0) @binding(1) var<storage, read> pairArgs: array<u32>;
@group(0) @binding(2) var<storage, read> pairBody: array<u32>;
@group(0) @binding(3) var<storage, read> pairPartial: array<f32>;
${outputBuffers.map((name, k) => `@group(0) @binding(${4 + k}) var<storage, read_write> ${name}: array<f32>;`).join('\n')}
${SLICE(4 + outputBuffers.length)}
@compute @workgroup_size(${WG})
fn main(${LINEAR}) {
  let i = ${linearId(WG)};
  if (i >= PP.n) { return; }
  let opening = SL.index == 0u;
  ${outputs.map((ref, w) => `var total${w} = select(${ref}, 0.0, opening);`).join(' ')}
  var added = false;
  if (pairArgs[${ARGS.EVAL_COUNT}] != 0u) {
    let record = i * ${u32$1(B)};
    let first = pairBody[record + ${u32$1(BODY.FIRST)}];
    let base = SL.index * PP.cap;
    let lo = max(first, base);
    let hi = min(first + pairBody[record + ${u32$1(BODY.COUNT)}], base + PP.cap);
    for (var c = lo; c < hi; c++) {
      let at = (c - base) * ${u32$1(partialWords)};
      ${outputs.map((_, w) => `total${w} += pairPartial[at + ${u32$1(w)}];`).join(' ')}
      added = true;
    }
  }
  if (opening || added) { ${outputs.map((ref, w) => `${ref} = total${w};`).join(' ')} }
}
`,
  };
  return { EVAL: evalKernel(false), GATHER, EVAL_S: evalKernel(true), GATHER_S, accumulators, partialWords };
}

// The plan of the pair formulas' lowering above N* (design section 6.4), made without a device:
// one cell sort per radius, a chunk kernel and a gather per stage, their buffers and the cap on a
// step's work. build.js makes it real on a device; the caller's node kernel adds each stage's
// totals at the stage's place (section()).
//
//   const pairs = planPairs({ D, n, limits, stages, columns, sums, slot, pos, origin });
//   pairs.refusal    // null, or why this device cannot run it (with the numbers)
//   pairs.kernels    // WGSL by kernel name; pairs.bindings: binding types by kernel name
//   pairs.section(name).code({ force, local })   // WGSL for the node kernel
//
// A stage is {stage (from program()), radius, gate, params, builtIns, outputs}: slot indices of
// its radius and gate (undefined when ungated), maps of its params and built in values to slot
// indices, and the colRefs the gather writes its totals to: `force` (D numbers per body) and one
// per accumulator (pairOutputs() lists them). Stages whose radius is the same number share a
// sort. colRefs are {buffer, at(row, k)} as in the pyramid.

// Pair tests a step may make: past it the step runs no pair work and the runner halts, naming the
// stage and the count. An M4 Max makes 43 to 260 billion tests a second (the fewer pass the
// radius, the faster), so the cap is at most 6 ms a step there, and a first submit of 64 steps
// at the cap 0.4 s, far from the 2-second watchdog. It is also 2.7e8 pair tests: the CPU's own
// step would take seconds
const PAIR_WORK_CAP = 1 << 28;
// Above N*, in 5 dimensions and more, pair formulas run as exact pairs up to this many bodies
// (the scheduler's all-pairs loop, with pairCandidate())
const MAX_PAIRS$1 = 16384;

/**
 * The totals a pair stage's gather writes per body: [{name, width}], `force` first. The caller
 * keeps room for them (hidden columns) and passes their colRefs as the stage's `outputs`.
 */
function pairOutputs(stage, D, columns) {
  return [{ name: 'force', width: D }].concat(pairAccumulators(stage, D, columns).map(a => ({ name: a.column, width: a.width })));
}

/**
 * See the top of this file. `columns`: name -> {width, hidden, ref} (program().columns.nodes with
 * the device's colRef of every column a formula may read); `sums`: name -> {width, at(k)} and
 * `sumBuffer` (the buffer they live in); `slot`: {decl(binding), at(index)}; `origin(k)`: slot
 * index of the origin's k-th number; `cap`: pair tests per step (PAIR_WORK_CAP).
 */
function planPairs({ D, n, limits, stages, columns, sums = {}, sumBuffer = 'S', slot, pos, origin, row = null, cap = PAIR_WORK_CAP, warn }) {
  const refuse = reason => ({ refusal: reason, kernels: {}, bindings: {}, buffers: {}, sorts: [], stages: [] });
  if (D >= 5) {
    if (n <= MAX_PAIRS$1) return refuse(`the cell sort runs in 2 to 4 dimensions; ${D}D pair formulas run in the all-pairs loop`);
    return refuse(`pair formulas in ${D}D run as exact pairs up to ${MAX_PAIRS$1.toLocaleString('en-US')} bodies; this layout has ` +
      `${n.toLocaleString('en-US')} (more needs a tree search)`);
  }
  const printer = createPrinter(warn);

  // Sorts: one per radius; radii that are the same number share one
  const sorts = [];
  stages.forEach(entry => {
    const radius = entry.stage.args.radius;
    const key = radius && radius.kind === 'number' ? 'number:' + radius.value : 'stage:' + entry.stage.name;
    let sort = sorts.find(s => s.key === key);
    if (!sort) {
      sort = { key, index: sorts.length, radius: entry.radius, stages: [] };
      sorts.push(sort);
    }
    sort.stages.push(entry);
  });

  // The snapshot of each sort: the columns its formulas read, at either end
  const reads = new Set();
  for (const sort of sorts) {
    const snapshot = [];
    let word = D;
    for (const entry of sort.stages) {
      for (const column of pairReads(entry.stage)) {
        if (snapshot.some(c => c.column === column)) continue;
        const info = columns[column];
        if (!info || !info.ref) return refuse(`${entry.stage.name}: WebGPU has no column ${column}`);
        const width = info.width === 'D' ? D : info.width;
        if (width !== 1 && width !== D) return refuse(`${entry.stage.name}: WebGPU reads columns of 1 or D numbers per body; ${column} has ${width}`);
        snapshot.push({ column, width, word, ref: info.ref });
        word += width;
        reads.add(column);
      }
    }
    sort.snapshot = snapshot;
    sort.layout = pairLayout(D, snapshot);
  }

  // Sizes: the hashed table has 2n buckets or more (a multiple of 1,024), and a step's chunks are
  // capped by the work cap, by what n bodies can need at most, and by the device's buffers
  const size = Math.max(1024, 2 ** Math.ceil(Math.log2(2 * Math.max(1, n))));
  const largest = Math.min(limits.maxStorageBufferBindingSize, limits.maxBufferSize);
  const sizeOf = bytes => Math.max(16, Math.ceil(bytes / 16) * 16);
  let partialWords = D;
  stages.forEach(entry => {
    const words = D + pairAccumulators(entry.stage, D, columns).reduce((total, a) => total + a.width, 0);
    partialWords = Math.max(partialWords, words);
  });
  const capChunks = Math.max(1, Math.min(
    Math.floor(cap / CHUNK),
    n * Math.ceil(n / CHUNK),
    Math.floor(largest / (4 * partialWords)),
    Math.floor((largest / 4 - n * (1 + 1 + 1 + 4 + 3)) / 2),
  ));

  const maxGroups = limits.maxComputeWorkgroupsPerDimension;
  const kernels = {}, bindings = {}, kernelStages = {}, buffers = {};
  const add = (name, kernel, names) => {
    kernels[name] = kernel.code;
    bindings[name] = kernel.bindings;
    kernelStages[name] = names;
  };
  for (const sort of sorts) {
    const names = sort.stages.map(entry => entry.stage.name);
    const out = sortKernels({ D, layout: sort.layout, snapshot: sort.snapshot, pos, row, slot, radius: sort.radius, maxGroups });
    sort.kernels = {};
    sort.columns = out.ORDER.columns;
    Object.keys(out).forEach(part => {
      const name = `PAIR_${part}_${sort.index}`;
      sort.kernels[part] = name;
      add(name, out[part], names);
    });
    const s = sort.index;
    buffers['pairCount' + s] = sizeOf(size * 4);
    buffers['pairStart' + s] = sizeOf((size + 2 + size / 1024) * 4);
    buffers['pairBody' + s] = sizeOf(n * sort.layout.body * 4);
    // [bodies by atomic slot | rank chunk owners | chunk owners | home records by bucket slot |
    // each body's bucket slot (sliced steps)]
    buffers['pairList' + s] = sizeOf((n + 2 * capChunks + n * sort.layout.home + n) * 4);
    buffers['pairArgs' + s] = sizeOf(ARGS.WORDS * 4);
    buffers['pairSnap' + s] = sizeOf(n * sort.layout.snap4 * 16);
  }

  const planned = [];
  for (let k = 0; k < stages.length; k++) {
    const entry = stages[k];
    const sort = sorts.find(s => s.stages.indexOf(entry) >= 0);
    let out;
    try {
      out = stageKernels({
        D, layout: sort.layout, stage: entry.stage, snapshot: sort.snapshot, columns, slot, radius: sort.radius,
        param: name => slot.at(entry.params[name]), builtIn: name => slot.at(entry.builtIns[name]),
        sums: { width: name => (sums[name] ? sums[name].width : 0), at: (name, i) => sums[name].at(i), buffer: sumBuffer },
        origin: i => slot.at(origin(i)), outputs: entry.outputs, printer,
      });
    } catch (e) {
      return refuse(`${entry.stage.name}: ${e.message}`);
    }
    const names = [entry.stage.name];
    add(`PAIR_EVAL_${k}`, out.EVAL, names);
    add(`PAIR_GATHER_${k}`, out.GATHER, names);
    add(`PAIR_EVAL_S_${k}`, out.EVAL_S, names);
    add(`PAIR_GATHER_S_${k}`, out.GATHER_S, names);
    buffers['pairPartial' + k] = sizeOf(capChunks * out.partialWords * 4);
    planned.push({
      name: entry.stage.name, index: k, sort: sort.index, gate: entry.gate, radius: sort.radius,
      accumulators: out.accumulators, partialWords: out.partialWords, outputs: entry.outputs,
      kernels: { EVAL: `PAIR_EVAL_${k}`, GATHER: `PAIR_GATHER_${k}`, EVAL_S: `PAIR_EVAL_S_${k}`, GATHER_S: `PAIR_GATHER_S_${k}` },
      gatherColumns: out.GATHER.columns,
      sumBuffer: entry.stage.sums.length ? sumBuffer : null,
      params: entry.params, builtIns: entry.builtIns,
    });
  }
  buffers.pairStatus = sizeOf((4 + sorts.length) * 4);

  const over = Object.keys(buffers).filter(name => buffers[name] > largest);
  if (over.length) {
    const name = over.sort((a, b) => buffers[b] - buffers[a])[0];
    return refuse(`the pair formulas at ${n.toLocaleString('en-US')} bodies need ${megabytes$1(buffers[name])} for ${name}; this device allows ${megabytes$1(largest)} per buffer`);
  }

  return {
    refusal: null, D, n, size, blocks: size / 1024, capChunks, cap: capChunks * CHUNK,
    sorts, stages: planned, kernels, bindings, kernelStages, buffers,
    reads: Array.from(reads),
    // per sort: bin, 2 scans, place, rank args, rank, order, args; per stage: chunks and gather
    // (a sliced step adds per slice: rank owners, rank, chunk owners, and per stage chunks and
    // gather, each slice in a submit of its own)
    dispatches: 8 * sorts.length + 2 * stages.length,
    section: name => section(planned.find(s => s.name === name), D, slot),
  };
}

/**
 * The status the guard writes (u32 words, build.js reads them back) as a message for the runner,
 * or null when every step ran its pair work.
 */
function statusMessage(plan, words) {
  if (!words || words[0] === 0) return null;
  const code = words[0];
  const sort = plan.sorts[words[1]];
  const names = sort ? sort.stages.map(entry => entry.stage.name) : ['a pair stage'];
  const cap = words[3] * CHUNK;
  // codes 2 and 4: rank work (ordering crowded cells) is what tripped, and the pair work after it
  // is larger still; codes 3 and 4: a sliced step needed more slices than its last measurement
  const rank = code === 2 || code === 4;
  const needs = words[2] === 0xffffffff ? `more than ${count(cap)}` : `${rank ? 'at least' : 'about'} ${count(words[2] * CHUNK)}`;
  const what = rank ? 'pair tests (counting only the work of ordering its crowded cells)' : 'pair tests';
  const who = names.length > 1 ? `the pair formulas ${names.join(', ')} needed ${needs} ${what} each` : `the pair formula ${names[0]} needed ${needs} ${what}`;
  const limit = code >= 3
    ? `more than the ${count(cap)} planned for it from the last measurement, in slices that each keep a submit short`
    : `the GPU runs at most ${count(cap)} in one submit, to keep submits short (the GPU watchdog stops long ones)`;
  return `${who} in one step; ${limit}. Bodies crowd into a few cells, or the radius is large for the layout. A ` +
    'layout that starts with its bodies piled up clears in 20 to 40 steps at 100k bodies: start the stage later ' +
    "(when: 'step > 40') or lower its radius";
}

// The node kernel's part of a stage: at the stage's place, `x += v` columns start from their value
// at the stage's start (or from 0 with startAtZero), and the force and every accumulator get the
// totals the gather wrote. On steps where the stage is gated off nothing changes; where its radius
// is not positive, it only zeroes, as on the CPU.
function section(stage, D, slot) {
  return {
    stage,
    code({ force, local, row = 'row' }) {
      const totals = [];
      for (let k = 0; k < D; k++) totals.push(`${force[k]} += ${stage.outputs.force.at(row, k)};`);
      const zero = [];
      stage.accumulators.forEach(a => {
        for (let k = 0; k < a.width; k++) {
          if (a.startAtZero) zero.push(`${local(a.column, k)} = 0.0;`);
          totals.push(`${local(a.column, k)} += ${stage.outputs[a.column].at(row, k)};`);
        }
      });
      const body = zero.concat([`if (${slot.at(stage.radius)} > 0.0) { ${totals.join(' ')} }`]);
      if (stage.gate === undefined) return body;
      return [`if (${slot.at(stage.gate)} != 0.0) {`].concat(body.map(line => '  ' + line), ['}']);
    },
  };
}

function count(value) {
  return value >= 1e6 ? value.toExponential(1).replace('e+', 'e') : value.toLocaleString('en-US');
}

function megabytes$1(bytes) {
  return (bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0) + ' MiB';
}

// Numbers between the simulator's store (f64, by row) and the device (f32). Positions go up
// relative to an f64 origin, so f32 keeps its precision wherever the layout sits: the origin is
// 0 on an axis where the drawing sits around 0 (then readbacks are a plain copy), else the
// drawing's middle. The stock grid template also renumbers large graphs along a Hilbert curve,
// so bodies close in space are close in memory; readbacks undo that on the GPU, so positions
// always come back in the store's order.

// Graphs at least this large are renumbered along a Hilbert curve (2D) or in Morton order (3D)
const HILBERT_MIN_NODES = 4096;
// Movement is measured on about this many bodies of a large graph, in runs of MOVEMENT_RUN rows
// spread over it: one row in every k would cost a cache miss per row (twice as much on readback
// memory that was just mapped)
const MOVEMENT_SAMPLE = 16384;
const MOVEMENT_RUN = 256;

/**
 * The origin of positions on the device: per axis 0 when the drawing's middle is no farther from
 * 0 than its spread (f32 then loses at most a bit), else the middle.
 */
function chooseOrigin(pos, n, D) {
  const origin = new Float64Array(D);
  if (!n) return origin;
  const stride = Math.max(1, Math.floor(n / 4096));
  for (let k = 0; k < D; k++) {
    const sample = [];
    for (let i = 0; i < n; i += stride) sample.push(pos[i * D + k]);
    sample.sort((a, b) => a - b);
    const q = t => sample[Math.min(sample.length - 1, Math.max(0, Math.round(t * (sample.length - 1))))];
    const middle = q(0.5), spread = q(0.999) - q(0.001);
    origin[k] = Math.abs(middle) <= Math.max(spread, 1e-3) ? 0 : middle;
  }
  return origin;
}

/**
 * Positions of the first n rows of the store, relative to `origin`, as f32.
 */
function relativePositions(pos, n, D, origin) {
  const out = new Float32Array(n * D);
  for (let i = 0, at = 0; i < n; i++) for (let k = 0; k < D; k++, at++) out[at] = pos[at] - origin[k];
  return out;
}

/**
 * Positions read from the device (f32, relative to `origin`, in the store's order) into the store
 * as f64. Returns the CPU integrator's measure of movement per step (the squared sum over axes of
 * the summed |dx|, over the bodies), measured on a sample of a large graph. When graph edits
 * moved rows since `bodies` (the simulator's bodies when the data was read), bodies get their
 * positions wherever they are now, bodies that left are skipped, and the movement is unknown
 * (null): the store's rows are not the ones the device moved.
 */
function writePositionsBack(simulator, bodies, data, D, origin, steps) {
  const store = simulator.store, n = bodies.length;
  if (!n) return 0;
  if (rowsMoved(simulator, bodies)) {
    for (let i = 0; i < n; i++) {
      const body = bodies[i];
      if (body.store !== store) continue;
      for (let k = 0; k < D; k++) store.pos[body.index * D + k] = origin[k] + data[i * D + k];
    }
    return null;
  }
  const pos = store.pos;
  const sums = new Float64Array(D);
  const runs = n <= MOVEMENT_SAMPLE ? 1 : Math.floor(MOVEMENT_SAMPLE / MOVEMENT_RUN);
  const gap = n / runs, length = runs === 1 ? n : MOVEMENT_RUN;
  for (let r = 0; r < runs; r++) {
    const from = Math.floor(r * gap) * D, to = from + length * D;
    for (let at = from; at < to; at += D) {
      for (let k = 0; k < D; k++) sums[k] += Math.abs(origin[k] + data[at + k] - pos[at + k]);
    }
  }
  if (origin.every(x => x === 0)) pos.set(data.subarray(0, n * D));
  else addOrigin(pos, data, n, D, origin);
  let total = 0;
  const scale = n / (runs * length) / steps;
  for (let k = 0; k < D; k++) { const t = sums[k] * scale; total += t * t; }
  return total / n;
}

// pos = origin + data for n rows, unrolled for 2D and 3D: a loop over the axes in every row costs
// 3.9 ms at 1M bodies in 2D, against 0.8 ms (and 0.2 for a plain copy when the origin is 0)
function addOrigin(pos, data, n, D, origin) {
  const end = n * D;
  if (D === 2) {
    const o0 = origin[0], o1 = origin[1];
    for (let at = 0; at < end; at += 2) { pos[at] = o0 + data[at]; pos[at + 1] = o1 + data[at + 1]; }
  } else if (D === 3) {
    const o0 = origin[0], o1 = origin[1], o2 = origin[2];
    for (let at = 0; at < end; at += 3) { pos[at] = o0 + data[at]; pos[at + 1] = o1 + data[at + 1]; pos[at + 2] = o2 + data[at + 2]; }
  } else {
    for (let i = 0, at = 0; i < n; i++) for (let k = 0; k < D; k++, at++) pos[at] = origin[k] + data[at];
  }
}

/**
 * The same for positions in another order: row i's are at toInternal[i] of `data` (D numbers a
 * row). `mirror`, when given, gets the f32 numbers in the store's order in the same pass (reading
 * the readback in this order costs a cache miss per row: twice would cost twice).
 */
function writePermutedBack(simulator, bodies, data, toInternal, origin, steps, mirror, D = 2) {
  const store = simulator.store, n = bodies.length;
  if (!n) return 0;
  const moved = rowsMoved(simulator, bodies);
  const pos = store.pos;
  const sums = new Float64Array(D);
  for (let i = 0; i < n; i++) {
    const from = D * toInternal[i];
    if (moved) {
      const body = bodies[i];
      if (body.store === store) for (let k = 0; k < D; k++) pos[D * body.index + k] = origin[k] + data[from + k];
      continue;
    }
    for (let k = 0; k < D; k++) {
      const f = data[from + k], x = origin[k] + f;
      sums[k] += Math.abs(x - pos[D * i + k]);
      pos[D * i + k] = x;
      if (mirror) mirror[D * i + k] = f;
    }
  }
  let total = 0;
  for (let k = 0; k < D; k++) { const t = sums[k] / steps; total += t * t; }
  return moved ? null : total / n;
}

/**
 * The device's order of the rows of a large layout (`toDevice[row]`), or null to keep the store's:
 * along a Hilbert curve in 2D, in Morton order in 3D, through a robust box of the positions, so
 * bodies close in space are close in memory. At 1M bodies in 2D the generic step took 1.45 times
 * today's template in the store's (random) order and 0.96 times in this one.
 */
function bodyOrder(pos, n, D) {
  if (n < HILBERT_MIN_NODES || n >= 16777216 || (D !== 2 && D !== 3)) return null;
  if (D === 2) {
    const xs = new Float64Array(n), ys = new Float64Array(n);
    for (let i = 0; i < n; i++) { xs[i] = pos[2 * i]; ys[i] = pos[2 * i + 1]; }
    return hilbertOrder(xs, ys, robustCenter(xs, ys));
  }
  // 3D: 9 bits an axis, so a key and a row (< 2^24) fit a double exactly
  const box = [];
  const stride = Math.max(1, Math.floor(n / 4096));
  for (let k = 0; k < 3; k++) {
    const sample = [];
    for (let i = 0; i < n; i += stride) sample.push(pos[3 * i + k]);
    sample.sort((a, b) => a - b);
    const q = t => sample[Math.min(sample.length - 1, Math.max(0, Math.round(t * (sample.length - 1))))];
    box.push([q(0.001), q(0.999)]);
  }
  const side = Math.max(...box.map(([lo, hi]) => hi - lo)) || 1, N = 512;
  const keys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let code = 0;
    for (let k = 0; k < 3; k++) {
      const c = Math.min(N - 1, Math.max(0, Math.floor((pos[3 * i + k] - box[k][0]) / side * N)));
      for (let b = 0; b < 9; b++) if (c & (1 << b)) code += 2 ** (3 * b + k);
    }
    keys[i] = code * 16777216 + i;
  }
  keys.sort();
  const out = new Uint32Array(n);
  for (let k = 0; k < n; k++) out[keys[k] % 16777216] = k;
  return out;
}

/**
 * True when graph edits moved the rows of `bodies` (rows of removed bodies were dropped since).
 */
function rowsMoved(simulator, bodies) {
  const store = simulator.store, n = bodies.length, last = bodies[n - 1];
  return !(n === 0 || (store.n >= n && last.store === store && last.index === n - 1));
}

/**
 * The stock template's data from the store of `simulator` (2D): {n, edges, init, mass, velocity,
 * toInternal, bodies, origin}. `velocity` holds (vx, vy, 0, pinned) per body, as the template keeps
 * it, in its order; `init` the positions relative to `origin`, in its order. With `hilbert`, rows
 * are renumbered along a Hilbert curve.
 */
function readLayout(simulator, hilbert) {
  const store = simulator.store, springs = simulator.springStore;
  const n = store.n, pos = store.pos;
  const xs = new Float64Array(n), ys = new Float64Array(n);
  for (let i = 0; i < n; i++) { xs[i] = pos[2 * i]; ys[i] = pos[2 * i + 1]; }
  // Bodies on exactly the same spot would stay in one grid cell: repeats move onto a small spiral
  separateCoincident(xs, ys);
  const robust = robustCenter(xs, ys);
  // today's module's origin, the drawing's middle: the same f32 numbers, so the same layout step
  // for step (chooseOrigin's 0 near the middle changes their rounding, and the drawing diverges)
  const origin = Float64Array.of(robust.x, robust.y);
  const toInternal = n >= HILBERT_MIN_NODES ? hilbertOrder(xs, ys, robust) : identity(n);

  const init = new Float32Array(2 * n), mass = new Float32Array(n), velocity = new Float32Array(4 * n);
  for (let i = 0; i < n; i++) {
    const k = toInternal[i];
    init[2 * k] = xs[i] - origin[0]; init[2 * k + 1] = ys[i] - origin[1];
    mass[k] = store.mass[i];
  }
  writeVelocities(store, toInternal, velocity);

  // Springs between two different bodies; a spring from a body to itself pulls it nowhere
  const from = springs.from, to = springs.to;
  const list = [];
  for (let s = 0; s < springs.n; s++) {
    if (from[s] !== to[s]) list.push(toInternal[from[s]], toInternal[to[s]]);
  }
  return { n, edges: Uint32Array.from(list), init, mass, velocity, toInternal, permuted: n >= HILBERT_MIN_NODES && hilbert, bodies: simulator.bodies.slice(), origin };
}

/**
 * (vx, vy, 0, pinned) per body, in the template's order, from the store.
 */
function writeVelocities(store, toInternal, out) {
  const v = store.velocity, pinned = store.pinned;
  for (let i = 0, n = toInternal.length; i < n; i++) {
    const k = 4 * toInternal[i];
    out[k] = v[2 * i]; out[k + 1] = v[2 * i + 1]; out[k + 2] = 0; out[k + 3] = pinned[i] ? 1 : 0;
  }
  return out;
}

/**
 * Masses of the store in the template's order.
 */
function writeMasses(store, toInternal, out) {
  const mass = store.mass;
  for (let i = 0, n = toInternal.length; i < n; i++) out[toInternal[i]] = mass[i];
  return out;
}

function identity(n) {
  const out = new Uint32Array(n);
  for (let i = 0; i < n; i++) out[i] = i;
  return out;
}

// Nodes that start at exactly the same point would stay on top of each other (and pile into
// one grid cell). Every repeat of a point moves onto a golden-angle spiral around it, so
// k copies cover a disc of radius ~sqrt(k) at unit density. Deterministic: depends only on
// the node order.
function separateCoincident(xs, ys) {
  const n = xs.length;
  if (n < 2) return;
  let size = 1;
  while (size < 2 * n) size <<= 1;
  const table = new Int32Array(size).fill(-1);
  const repeats = new Uint32Array(n);
  const f = new Float64Array(2), w = new Uint32Array(f.buffer);
  for (let i = 0; i < n; i++) {
    f[0] = xs[i] + 0; f[1] = ys[i] + 0; // + 0 turns -0 into 0
    let h = (Math.imul(w[0] ^ w[1], 0x9e3779b1) ^ Math.imul(w[2] ^ w[3], 0x85ebca77)) >>> 0;
    h = (h ^ (h >>> 15)) & (size - 1);
    let first = -1;
    for (;;) {
      const j = table[h];
      if (j === -1) { table[h] = i; break; }
      if (xs[j] === xs[i] && ys[j] === ys[i]) { first = j; break; }
      h = (h + 1) & (size - 1);
    }
    if (first >= 0) {
      const k = ++repeats[first];
      const r = Math.sqrt(k), angle = k * 2.399963229728653;
      xs[i] = xs[first] + r * Math.cos(angle);
      ys[i] = ys[first] + r * Math.sin(angle);
    }
  }
}

// Median of a strided sample (the f32 origin) and a robust extent for the Hilbert curve.
function robustCenter(xs, ys) {
  const n = xs.length;
  if (!n) return { x: 0, y: 0, minX: 0, minY: 0, side: 1 };
  const stride = Math.max(1, Math.floor(n / 4096));
  const sx = [], sy = [];
  for (let i = 0; i < n; i += stride) { sx.push(xs[i]); sy.push(ys[i]); }
  const sortedX = Float64Array.from(sx).sort(), sortedY = Float64Array.from(sy).sort();
  const q = (arr, t) => arr[Math.min(arr.length - 1, Math.max(0, Math.round(t * (arr.length - 1))))];
  const minX = q(sortedX, 0.001), maxX = q(sortedX, 0.999), minY = q(sortedY, 0.001), maxY = q(sortedY, 0.999);
  return { x: q(sortedX, 0.5), y: q(sortedY, 0.5), minX, minY, side: Math.max(maxX - minX, maxY - minY) || 1 };
}

// Internal index of every node along a Hilbert curve through the start positions.
function hilbertOrder(xs, ys, box) {
  const n = xs.length, N = 4096;
  const keys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let x = Math.min(N - 1, Math.max(0, Math.floor((xs[i] - box.minX) / box.side * N)));
    let y = Math.min(N - 1, Math.max(0, Math.floor((ys[i] - box.minY) / box.side * N)));
    let d = 0;
    for (let s = N >> 1; s > 0; s >>= 1) {
      const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
      d += s * s * ((3 * rx) ^ ry);
      if (ry === 0) {
        if (rx === 1) { x = s - 1 - x; y = s - 1 - y; }
        const t = x; x = y; y = t;
      }
    }
    keys[i] = d * 16777216 + i; // key < 2^24, i < 2^24: exact in a double
  }
  keys.sort();
  const out = new Uint32Array(n);
  for (let k = 0; k < n; k++) out[keys[k] % 16777216] = k;
  return out;
}

// The generic plan: from the step as data (simulator.program()) to sections of code in CPU stage
// order, cut into kernels by the fusion rules (design section 7), plus where every column lives
// and what each step's slot of numbers holds. emit.js prints the kernels, engine.js runs them.
//
// Regime 'pairs': every tree pass is exact all-pairs inside a node kernel, over tiles of 256
// bodies in workgroup memory. Up to the small-graph size N* the whole step is then one kernel;
// sums and FIRE add their own small kernels. In 4 or more dimensions it runs up to 16,384 bodies.
// Regime 'pyramid' (2D and 3D above N*, which is 2,560 in 3D): the first group of tree passes is
// the generic grid pyramid (../pyramid): its structure dispatches run right before the node kernel
// that holds its section, and that kernel runs its threads in the pyramid's cell order (thread t
// works on row tree_row(t)), so bodies near each other in space run together. Further groups stay
// exact pairs.
//
// Links (design section 6.3). Every link sits in the rows of both its bodies (CSR), with its index
// and the body's role (from or to). A link stage that pulls, or adds into body columns, is a
// gather in a node kernel: each body evaluates the formula for its links with the true roles and
// keeps its own end's share. Above N*, a hub's thousands of links would keep one thread busy while
// its workgroup waits: there LINK_CHUNKS goes through chunks of 8 links of a row first, a thread
// each, and the body's section adds its chunks in order. A link stage that only writes link
// columns runs a thread per link, in a link kernel of its own.
//
// Pair formulas (section 6.4): up to N* (and in 5D and up, to 16,384 bodies) a node section goes
// through every other body and evaluates the formula with the CPU's roles (../pairs/formula.js);
// above it the pair track's cell sort, work list, chunks and gather (../pairs) run before the node
// kernel that holds the stage's section, which adds the totals the gather wrote.
//
// Grid fields (section 6.7, ../grid): a unit of its own dispatches, the gather of its two columns
// included. It runs at the start of the step when nothing before it in the step writes what it
// reads or touches what it writes (ru-4's and v1-6's), else at its place, between node kernels.
//
// Sums per group (section 6.5): a node section writes each row's value, then GROUP_RUNS adds up
// runs of up to 256 rows of one group (in an order the host sorts by group) and GROUP_SUM adds
// each group's runs in order.
//
// Buffers (one binding each per kernel, the same layout for every kernel):
//   P  uniform: n, workgroups, FIRE's workgroups, links (written when the data is built)
//   V  uniform, at a dynamic offset: the slot of the step being run (see slots below)
//   S  storage read_write: velocity, force, node columns that stages write, link columns that
//      stages write (link order), sum results, per-row values of sums per group, FIRE state,
//      partial sums
//   H  storage read: node columns only the host writes (mass, pinned, ...), link columns only the
//      host writes, in CSR order (each link at both of its ends), and lookup tables (formulas' and
//      laws'), read through table_<id>() functions
//   L  storage read (u32): [first entry of each row (n + 1) | other body of each entry (2m) | link
//      and role of each entry (2m) | entry of each link at its from end (m) | from (m) | to (m) |
//      where the blocks below start (1 + group columns) | the chunks of links | a block per group
//      column (sums per group)]
//   X, Y  storage read / read_write: positions at the start of the step and after it; they swap
//      every step, so other rows' positions are always read from a buffer nothing writes
// Every column is a block of `cap` rows (`cap * D` numbers for vectors, row by row), at an
// offset that is a constant of the WGSL; `cap` leaves room for the graph to grow.

const THREADS$1 = 256;
// Up to this many bodies the whole step is one kernel and repulsion is exact over all pairs
// (design section 6.1; it measured about 2k on an M4 Max, so this default is conservative). In 3D
// the pyramid costs more: exact pairs stay faster up to 2.7k-3k bodies there (G5, M4 Max)
const SMALL_GRAPH = 1024;
const SMALL_GRAPH_3D = 2560;
// Up to this many bodies the exact all-pairs loop runs where the pyramid does not (4D and up)
const MAX_PAIRS = 16384;
// Rows of one group that one thread of GROUP_RUNS adds up
const GROUP_RUN = 256;
// Links of a row that one thread of LINK_CHUNKS goes through, above N* (today's SPRINGS does 8)
const LINK_CHUNK = 8;
// A body with more links than this makes gathers go through chunks
const HUB_DEGREE = 64;
const AXES$1 = 'xyzw';
// Floats per slot of the step ring: a multiple of the 256-byte uniform offset alignment
const SLOT_FLOATS = 64;

// Settings every slot carries, at fixed places
const SETTING_VALUES = ['n', 'gravity', 'timeStep', 'dragCoefficient', 'springLength', 'springCoefficient', 'maxVelocity'];

/**
 * The number at place `index` of the step's slot, in WGSL
 */
function slotValue(index) {
  return `V[${index >> 2}].${AXES$1[index & 3]}`;
}

/**
 * The generic plan of `program`, or {refusal} when it cannot take it (the stages themselves are
 * checked by check.js before). `laws` maps a tree stage's name to its compiled law (null for
 * 1/r^2); `options.limits` the device's (for the pyramid's buffers), `options.warn` takes the
 * printer's warnings, `options.smallGraph` overrides N* (for measurements). `options.data` holds
 * what the plan needs to know of the store: {linksDefault: no link has its own length or
 * stiffness, groups: {column: number of groups}, maxDegree, peak(columns)}.
 */
function genericPlan(program, laws, options = {}) {
  const D = program.dims, n = program.spaces.nodes, m = program.spaces.links;
  const data = options.data || { linksDefault: true, groups: {} };
  const smallGraph = options.smallGraph || (D === 3 ? SMALL_GRAPH_3D : SMALL_GRAPH);
  // above N*, when a body has many links, gathers go through chunks of links first (on graphs
  // without hubs going through a row's links in place is faster: 10k 1.07 against 1.12 of
  // today's step, 100k 1.05 against 1.08; megaStars 1.28 against 3.67)
  const chunked = n > smallGraph && (data.maxDegree === undefined || data.maxDegree > HUB_DEGREE);
  const stages = physicsStages(program);
  const columnInfo = Object.create(null);
  program.columns.nodes.forEach(column => { columnInfo[column.name] = column; });
  const linkInfo = Object.create(null);
  (program.columns.links || []).forEach(column => { linkInfo[column.name] = column; });
  const sumInfo = Object.create(null);
  program.sums.forEach(sum => { sumInfo[sum.name] = sum; });

  // --- sections, in CPU order -------------------------------------------------------------
  const sections = [], skipped = [];
  for (let at = 0; at < stages.length; at++) {
    const stage = stages[at];
    const kind = stage.builtIn || stage.shape;
    if (kind === 'clear') sections.push({ kind: 'clear', stage });
    else if (kind === 'drag') {
      // FIRE removes energy its own way
      if (stage.args.skipped) skipped.push(stage.name);
      else sections.push({ kind: 'drag', stage });
    }
    else if (kind === 'springs') sections.push({ kind: 'springs', stage });
    else if (kind === 'repulsion' || kind === 'tree') {
      // tree stages next to each other walk together: one tile loop with a channel each
      const walk = [];
      while (at < stages.length && (stages[at].builtIn === 'repulsion' || (!stages[at].builtIn && stages[at].shape === 'tree'))) {
        const tree = stages[at];
        const channel = tree.args.channels[0];
        // a charge with the centroid 'shared' acts from its walk's first charge's centre (the K-charge
        // tree's args, when the library gives them)
        walk.push({ stage: tree, charge: channel.charge, sensitivity: channel.sensitivity, law: laws[tree.name] || null, centroid: channel.centroid || 'own' });
        at++;
      }
      at--;
      sections.push({ kind: 'pairs', channels: walk, stage: walk[0].stage });
    } else if (kind === 'link') {
      const pulls = stage.writes.some(write => write.via === 'pull');
      const adds = stage.writes.some(write => write.space === 'nodes' && write.end);
      sections.push({ kind: pulls || adds ? 'gather' : 'linkset', stage, pulls });
    } else if (kind === 'node') sections.push({ kind: 'formula', stage });
    else if (kind === 'grid') sections.push({ kind: 'grid', stage });
    else if (kind === 'host') sections.push({ kind: 'host', stage });
    else if (kind === 'pair') sections.push({ kind: 'pairformula', stage });
    else if (kind === 'sum') {
      const sum = sumInfo[stage.name];
      sections.push({ kind: sum.group ? 'groupsum' : 'sum', stage, sum });
    } else if (kind === 'integrate') sections.push({ kind: stage.args.integrator === 'fire' ? 'fire' : 'euler', stage });
  }
  if (sections.filter(s => s.kind === 'euler' || s.kind === 'fire').length !== 1) {
    return { refusal: 'WebGPU needs exactly one integrate stage' };
  }
  // tree passes, links and pairs read other bodies' positions from the start of the step
  const integrateAt = sections.findIndex(s => s.kind === 'euler' || s.kind === 'fire');
  const late = sections.slice(integrateAt + 1).find(s => s.kind === 'pairs' || s.kind === 'gather' || s.kind === 'springs' || s.kind === 'pairformula' || s.kind === 'grid' || (s.kind === 'linkset' && readsPositions(s)));
  if (late) return { refusal: `WebGPU runs tree passes, pair formulas, grid fields and link stages that read positions before the integrate stage only (${late.stage.name} comes after it)` };
  // pair formulas above N* (in 2D to 4D) run through the cell sort; else every pair is looked at
  const pairSort = n > smallGraph && D <= 4;
  const pairSections = sections.filter(s => s.kind === 'pairformula');
  pairSections.forEach(section => { section.sort = pairSort; });
  if (pairSections.length && !pairSort && n > MAX_PAIRS) {
    return { refusal: `pair formulas in ${D}D run as exact pairs, for up to ${MAX_PAIRS.toLocaleString('en-US')} bodies; this layout has ${n.toLocaleString('en-US')} (more needs a tree search)` };
  }
  // A tree pass joins the walk before it when the stages between only add to the force and
  // don't read it (drag, springs, addRepulsion's default place before integrate): the order of
  // additions is all that changes
  for (let k = 0; k < sections.length; k++) {
    // a walk whose charges share its first one's centre keeps that first charge: it stays apart
    if (sections[k].kind !== 'pairs' || sections[k].channels.some(c => c.centroid === 'shared')) continue;
    let p = k - 1;
    while (p >= 0 && sections[p].kind !== 'pairs' && onlyAddsForce(sections[p])) p--;
    if (p >= 0 && sections[p].kind === 'pairs') {
      sections[p].channels.push(...sections[k].channels);
      sections.splice(k, 1);
      k--;
    }
  }
  // Above N* in 2D and 3D, the first group of tree passes walks the pyramid
  const walks = sections.filter(s => s.kind === 'pairs');
  const pyramidWalk = n > smallGraph && D <= 3 && walks.length ? walks[0] : null;
  if (pyramidWalk) pyramidWalk.kind = 'tree';
  if (n > MAX_PAIRS && sections.some(s => s.kind === 'pairs')) {
    return {
      refusal: D > 3
        ? `WebGPU runs repulsion in ${D}D as exact pairs, for up to ${MAX_PAIRS.toLocaleString('en-US')} bodies (its grid pyramid is 2D and 3D); this layout has ${n.toLocaleString('en-US')}`
        : `WebGPU's grid pyramid takes one group of tree passes per step above ${MAX_PAIRS.toLocaleString('en-US')} bodies; this step has ${walks.length} (passes next to each other walk together)`,
    };
  }

  // Sums that read nothing an earlier stage of the step writes (no column, no sum) go first, in
  // one pass
  // So do grid fields that read nothing an earlier stage writes, and whose columns no earlier stage
  // reads or writes (rule 4: producers go early), before those sums
  const written = new Set(), summed = new Set(), touched = new Set();
  const hoisted = [], hoistedGrids = [];
  const rest = [];
  sections.forEach(section => {
    const isSum = section.kind === 'sum' || section.kind === 'groupsum';
    if (isSum && !readsAny(section.stage, written) && !section.stage.sums.some(name => summed.has(name))) hoisted.push(section);
    else if (section.kind === 'grid' && !readsAny(section.stage, written) && ![...writesOf(section)].some(column => touched.has(column))) hoistedGrids.push(section);
    else rest.push(section);
    writesOf(section).forEach(column => { written.add(column); touched.add(column); });
    readsOf(section).forEach(column => touched.add(column));
    if (isSum) summed.add(section.stage.name);
  });

  // --- node columns -------------------------------------------------------------------------
  const used = new Set(['pos', 'velocity', 'force', 'pinned']);
  const writtenByStages = new Set();
  sections.forEach(section => {
    readsOf(section).forEach(column => used.add(column));
    writesOf(section).forEach(column => { used.add(column); writtenByStages.add(column); });
  });
  const cap = capacity(n), capL = capacity(m);
  const columns = Object.create(null);
  let sSize = 0, hSize = 0;
  const place = (name, buffer, width) => {
    const size = cap * width;
    const offset = buffer === 'S' ? sSize : hSize;
    if (buffer === 'S') sSize += size; else hSize += size;
    columns[name] = { name, width, buffer, offset, type: columnInfo[name] ? columnInfo[name].type : 'f64' };
  };
  used.forEach(name => {
    if (name === 'pos') { columns.pos = { name: 'pos', width: D, buffer: 'X', offset: 0, type: 'f64' }; return; }
    const info = columnInfo[name];
    // the adaptive time step's counters: formulas don't see them, and it does not run here
    if (!info || info.hidden) return;
    const width = info.width === 'D' ? D : info.width;
    const inS = name === 'velocity' || name === 'force' || writtenByStages.has(name);
    place(name, inS ? 'S' : 'H', width);
  });

  // Large layouts keep their rows on the device in a spatial order (buffers.js bodyOrder), and the
  // engine permutes on the way up and back. Pair formulas still take their roles from the store's
  // rows (design 5.3): their sorts read them from a column of their own.
  const permuted = options.renumber !== false && n >= HILBERT_MIN_NODES && n < 16777216 && (D === 2 || D === 3);
  let rowColumn = null;
  if (permuted && pairSections.some(s => s.sort)) {
    rowColumn = { buffer: 'H', offset: hSize };
    hSize += cap;
  }

  // --- link columns: the host's in CSR order in H, the stages' in link order in S --------------
  const usedLinks = new Set(), linkWritten = new Set();
  sections.forEach(section => {
    if (section.kind === 'springs') {
      // the stock springs read the links' own lengths and stiffness once some link has them
      if (!data.linksDefault) { usedLinks.add('length'); usedLinks.add('coefficient'); }
      return;
    }
    if (section.kind !== 'gather' && section.kind !== 'linkset') return;
    section.stage.reads.forEach(read => {
      // while every link has the defaults, `length` and `coefficient` are the settings
      if (read.space === 'links' && !(data.linksDefault && (read.column === 'length' || read.column === 'coefficient'))) usedLinks.add(read.column);
    });
    section.stage.writes.forEach(write => { if (write.space === 'links') { usedLinks.add(write.column); linkWritten.add(write.column); } });
  });
  // a column a stage writes is read where it is written, also by stages that only read it
  sections.forEach(section => {
    if (section.kind !== 'gather' && section.kind !== 'linkset') return;
    section.stage.reads.forEach(read => { if (read.space === 'links' && linkWritten.has(read.column)) usedLinks.add(read.column); });
  });
  // a column a stage writes is read from where it writes it, by the springs too
  if (sections.some(s => s.kind === 'springs')) ['length', 'coefficient'].forEach(name => { if (linkWritten.has(name)) usedLinks.add(name); });
  const linkColumns = Object.create(null);
  usedLinks.forEach(name => {
    const info = linkInfo[name];
    const stageWritten = linkWritten.has(name) || (info && /^stage:/.test(info.writer || ''));
    if (stageWritten) {
      linkColumns[name] = { name, buffer: 'S', order: 'link', offset: sSize, type: info ? info.type : 'f64' };
      sSize += capL;
    } else {
      linkColumns[name] = { name, buffer: 'H', order: 'csr', offset: hSize, type: info ? info.type : 'f64' };
      hSize += 2 * capL;
    }
  });
  // what the stock springs read: the settings while every link has the defaults
  sections.forEach(section => { if (section.kind === 'springs') section.own = !!(linkColumns.length || linkColumns.coefficient); });

  // lookup tables of formulas and of laws in tile loops (the pyramid keeps its own), in H
  const tables = [];
  const addTable = spec => {
    tables.push({ id: tables.length, name: spec.name, from: spec.from, to: spec.to, values: spec.values, offset: hSize });
    hSize += spec.values.length;
    return tables.length - 1;
  };
  sections.forEach(section => {
    if (section.kind === 'pairs') {
      section.channels.forEach(channel => {
        if (!channel.law) return;
        channel.tables = Object.create(null);
        channel.law.describe().tables.forEach(spec => { channel.tables[spec.name] = addTable(spec); });
      });
      return;
    }
    if (!section.stage || !section.stage.tables || !section.stage.tables.length) return;
    section.tables = Object.create(null);
    section.stage.tables.forEach(spec => { section.tables[spec.name] = addTable(spec); });
  });

  // chunked gathers: per chunk, the force it adds and what it adds into each column
  const maxChunks = Math.ceil(2 * m / LINK_CHUNK) + n;
  sections.forEach(section => {
    if ((section.kind !== 'springs' && section.kind !== 'gather') || !chunked) return;
    const parts = [];
    // the force: from a pull, or added at an end (force_i += ...)
    const forceAtEnd = section.kind === 'gather' && section.stage.writes.some(write => write.space === 'nodes' && write.end && write.column === 'force');
    if (section.kind === 'springs' || section.pulls || forceAtEnd) parts.push({ column: 'force', width: D });
    if (section.kind === 'gather') {
      section.stage.writes.forEach(write => {
        if (write.space === 'nodes' && write.end && write.column !== 'force' && !parts.some(p => p.column === write.column)) {
          parts.push({ column: write.column, width: columns[write.column].width });
        }
      });
    }
    const width = parts.reduce((total, part) => total + part.width, 0);
    section.chunks = { offset: sSize, width, parts };
    sSize += maxChunks * width;
  });

  // --- sums: results, per-row values of sums per group, FIRE's state, partial sums -------------
  const groups = Math.max(1, Math.ceil(cap / THREADS$1));
  const sums = Object.create(null);
  const groupColumns = [];
  sections.forEach(section => {
    if (section.kind !== 'sum' && section.kind !== 'groupsum') return;
    const width = section.sum.width === 'D' ? D : section.sum.width;
    const sum = sums[section.stage.name] = { name: section.stage.name, width, offset: sSize, grouped: section.kind === 'groupsum' };
    if (!sum.grouped) { sSize += width; return; }
    sum.column = section.sum.group;
    sum.count = data.groups[sum.column] || 0;
    if (groupColumns.indexOf(sum.column) < 0) groupColumns.push(sum.column);
    sum.block = groupColumns.indexOf(sum.column);
    sSize += Math.max(1, sum.count) * width;
    sum.rows = sSize; sSize += cap * width;
    // runs: at most one per 256 rows plus one per group
    sum.runs = sSize; sSize += (Math.ceil(n / GROUP_RUN) + sum.count + 1) * width;
  });
  // what the pair track's gathers write per body (hidden columns), above N*
  pairSections.forEach(section => {
    if (!section.sort) return;
    section.outputs = Object.create(null);
    pairOutputs(section.stage, D, columnInfo).forEach(output => {
      const offset = sSize;
      sSize += cap * output.width;
      section.outputs[output.name] = { buffer: 'S', width: output.width, at: (row, k) => `S[${offset}u + ${row} * ${output.width}u + ${k}u]` };
    });
  });
  const fire = sSize; sSize += 4;
  const firePartials = sSize; sSize += 4 * THREADS$1;
  const partials = sSize;
  const sumWidth = Object.values(sums).filter(sum => !sum.grouped).reduce((total, sum) => total + sum.width, 0);
  sSize += Math.max(4, groups * Math.max(1, sumWidth));

  // --- the slot of numbers per step -----------------------------------------------------------
  const slot = createSlotTable();
  SETTING_VALUES.forEach(key => slot.add('setting', key));
  // the f64 origin of positions on the device: formulas that read pos itself add it back
  for (let k = 0; k < D; k++) slot.add('setting', 'origin_' + k);
  sections.forEach(section => {
    if (section.kind === 'pairs' || section.kind === 'tree') {
      section.channels.forEach(channel => {
        if (channel.stage.when) channel.gate = slot.add('gate', channel.stage.name);
        if (channel.law) channel.values = slot.addLaw(channel.stage.name, channel.law);
      });
      return;
    }
    const stage = section.stage;
    // a host step's `when` and numbers are the host's
    if (section.kind === 'host') return;
    if (stage.when) section.gate = slot.add('gate', stage.name);
    if (section.kind === 'pairformula') section.radius = slot.add('radius', stage.name);
    section.params = Object.create(null);
    stage.params.forEach(param => { section.params[param.name] = slot.add('param', stage.name, param.name); });
    // formulas read built in values as their stage gets them; built in stages read the settings
    section.builtIns = Object.create(null);
    if (!stage.builtIn) stage.builtIns.forEach(name => { section.builtIns[name] = slot.add('builtIn', stage.name, name); });
    // a grid field's own numbers: its cell, margin, smoothing, deposit value, lattice phase
    if (section.kind === 'grid') {
      section.numbers = Object.create(null);
      gridNumbers(D).forEach(name => { section.numbers[name] = slot.add('grid', stage.name, name); });
    }
  });

  // --- kernels --------------------------------------------------------------------------------
  const kernels = [];
  let current = null;
  let afterIntegrate = false;
  const open = () => {
    current = { kind: 'node', name: '', sections: [], afterIntegrate, sums: [], groupSums: [] };
    kernels.push(current);
  };
  // A node kernel ends: its sums get their results right after it
  const close = () => {
    if (current) reductions(current);
    current = null;
  };
  const reductions = kernel => {
    if (kernel.sums.length) {
      kernels.push({ kind: 'reduce', name: kernel.hoisted ? 'SUMS_REDUCE' : '', sums: kernel.sums.slice(), gates: kernel.sections.filter(s => s.kind === 'sum').map(s => s.gate) });
    }
    groupColumns.forEach(column => {
      const list = kernel.groupSums.filter(sum => sum.column === column);
      if (!list.length) return;
      const gates = list.map(sum => kernel.sections.find(s => s.stage && s.stage.name === sum.name).gate);
      kernels.push({ kind: 'groupRuns', name: '', column, sums: list, gates });
      kernels.push({ kind: 'groupSum', name: '', column, sums: list, gates });
    });
  };
  hoistedGrids.forEach(section => kernels.push({ kind: 'grid', name: '', section, gates: [section.gate], hoisted: true }));
  if (hoisted.length) {
    current = {
      kind: 'node', name: 'SUMS', sections: hoisted, afterIntegrate: false, hoisted: true,
      sums: hoisted.filter(s => s.kind === 'sum').map(s => sums[s.stage.name]),
      groupSums: hoisted.filter(s => s.kind === 'groupsum').map(s => sums[s.stage.name]),
    };
    kernels.push(current);
    close();
  }
  for (let k = 0; k < rest.length; k++) {
    const section = rest[k];
    if (section.kind === 'fire') {
      close();
      kernels.push({ kind: 'fireReduce', name: 'FIRE_REDUCE' }, { kind: 'fireState', name: 'FIRE_STATE' });
      // FIRE moves bodies from the step's positions; later sections read the new ones
      open();
      current.sections.push(section);
      afterIntegrate = true;
      continue;
    }
    if (section.kind === 'host') {
      // the step stops here on the steps where the host step runs (see runner.js)
      close();
      kernels.push({ kind: 'host', name: section.stage.name, section });
      continue;
    }
    if (section.kind === 'grid') {
      // its own dispatches, between node kernels
      close();
      kernels.push({ kind: 'grid', name: '', section, gates: [section.gate] });
      continue;
    }
    if (section.kind === 'linkset') {
      // a thread per link: a kernel of its own, shared with the link stages right after it
      const previous = kernels[kernels.length - 1];
      if (current || !previous || previous.kind !== 'link') {
        close();
        kernels.push({ kind: 'link', name: '', sections: [] });
      }
      kernels[kernels.length - 1].sections.push(section);
      continue;
    }
    if (!current) open();
    // a tile loop, a gather and the pyramid read other rows of some columns (the pyramid before
    // its kernel): a node section earlier in this kernel must not have written them (rule 2); the
    // pyramid also orders the threads of its kernel, so a kernel holds at most one
    const others = otherReadsOf(section);
    if (others.size) {
      const kernelWrites = new Set();
      current.sections.forEach(s => writesOf(s).forEach(column => kernelWrites.add(column)));
      if ([...others].some(column => kernelWrites.has(column)) || (section.kind === 'tree' && current.tree)) { close(); open(); }
    }
    // the chunks of a gather and the pair sort run before their node kernel: they must not read
    // what it writes
    if (section.kind === 'pairformula' && section.sort) {
      const kernelWrites = new Set();
      current.sections.forEach(s => writesOf(s).forEach(column => kernelWrites.add(column)));
      if ([...readsOf(section)].some(column => kernelWrites.has(column))) { close(); open(); }
      current.pairStages = (current.pairStages || []).concat([section.stage.name]);
    }
    if (section.chunks) {
      const kernelWrites = new Set();
      current.sections.forEach(s => writesOf(s).forEach(column => kernelWrites.add(column)));
      if ([...readsOf(section)].some(column => kernelWrites.has(column))) { close(); open(); }
      kernels.splice(kernels.indexOf(current), 0, { kind: 'chunks', name: '', section, gates: [section.gate] });
    }
    if (section.kind === 'tree') current.tree = section;
    current.sections.push(section);
    if (section.kind === 'euler') afterIntegrate = true;
    if (section.kind === 'sum') current.sums.push(sums[section.stage.name]);
    if (section.kind === 'groupsum') current.groupSums.push(sums[section.stage.name]);
    if (section.kind === 'sum' || section.kind === 'groupsum') {
      // a later stage reads the result in this step: the kernel ends, the results are added up
      const readLater = rest.slice(k + 1).some(s => s.stage && s.stage.sums && s.stage.sums.indexOf(section.stage.name) >= 0);
      const nextIsSum = k + 1 < rest.length && (rest[k + 1].kind === 'sum' || rest[k + 1].kind === 'groupsum');
      if (readLater && !nextIsSum) close();
    }
  }
  close();
  // names in step order
  kernels.forEach((kernel, index) => {
    if (kernel.name || kernel.kind === 'host') return;
    const prefix = { node: 'STEP', reduce: 'REDUCE', link: 'LINKS', groupRuns: 'GROUP_RUNS', groupSum: 'GROUP_SUM', chunks: 'LINK_CHUNKS', grid: 'GRID' }[kernel.kind];
    kernel.name = prefix + index;
  });

  // the stages each kernel computes, for error reports
  const kernelStages = Object.create(null);
  kernels.forEach(kernel => {
    const names = [];
    (kernel.sections || []).forEach(section => {
      if (section.kind === 'pairs' || section.kind === 'tree') section.channels.forEach(c => names.push(c.stage.name));
      else names.push(section.stage.name);
    });
    if (kernel.kind === 'reduce' || kernel.kind === 'groupRuns' || kernel.kind === 'groupSum') kernel.sums.forEach(sum => names.push(sum.name));
    if (kernel.kind === 'chunks' || kernel.kind === 'grid') names.push(kernel.section.stage.name);
    if (kernel.kind === 'fireReduce' || kernel.kind === 'fireState') names.push(integrateName(sections));
    kernelStages[kernel.name] = names;
  });
  const done = slot.done();

  // The pair track's plan of the pair formulas above N*: they read the plan's columns, sums and
  // slot, and their gathers write the hidden columns above
  let pairs = null;
  if (pairSections.some(s => s.sort)) {
    const columnRefs = Object.create(null);
    program.columns.nodes.forEach(info => {
      const column = columns[info.name];
      const width = info.width === 'D' ? D : info.width;
      const ref = column && column.buffer !== 'X' ? { buffer: column.buffer, at: (row, k) => `${column.buffer}[${column.offset}u + ${row}${width > 1 ? ` * ${width}u + ${k}u` : ''}]` } : null;
      columnRefs[info.name] = { width: info.width, hidden: info.hidden, ref };
    });
    const sumRefs = Object.create(null);
    Object.values(sums).forEach(sum => { if (!sum.grouped) sumRefs[sum.name] = { width: sum.width, at: k => `S[${sum.offset + k}u]` }; });
    pairs = planPairs({
      D, n, limits: options.limits, warn: options.warn,
      stages: pairSections.filter(s => s.sort).map(section => ({
        stage: section.stage, radius: section.radius, gate: section.gate,
        params: section.params, builtIns: section.builtIns, outputs: section.outputs,
      })),
      columns: columnRefs, sums: sumRefs, sumBuffer: 'S',
      slot: { decl: binding => `@group(0) @binding(${binding}) var<uniform> V: array<vec4f, ${done.floats / 4}>;`, at: slotValue },
      pos: { buffer: 'X', at: (row, k) => `X[${row} * ${D}u + ${k}u]` },
      origin: k => slot.add('setting', 'origin_' + k),
      row: rowColumn ? { buffer: 'H', at: row => `u32(H[${rowColumn.offset}u + ${row}])` } : null,
    });
    if (pairs.refusal) return { refusal: pairs.refusal };
    Object.keys(pairs.kernelStages).forEach(name => { kernelStages[name] = pairs.kernelStages[name]; });
  }

  // The pyramid reads positions and charges from this plan's buffers, and the law numbers and
  // gravity from the step's slot
  let pyramid = null;
  if (pyramidWalk) {
    const colRef = name => {
      const column = columns[name];
      return { buffer: column.buffer, at: row => `${column.buffer}[${column.offset}u + ${row}]` };
    };
    // the charges' peak, when only the host writes them (stages may write any value later)
    const charges = pyramidWalk.channels.map(c => c.charge);
    const peak = data.peak && charges.every(name => columns[name].buffer === 'H') ? data.peak(charges) : undefined;
    pyramid = planPyramid({
      D, n, limits: options.limits, warn: options.warn, peak,
      channels: pyramidWalk.channels.map((c, k) => ({ stage: c.stage.name, law: c.law, centroid: k === 0 ? 'own' : c.centroid, charge: colRef(c.charge) })),
      pos: { buffer: 'X', at: (row, k) => `X[${row} * ${D}u + ${k}u]` },
      values: {
        decl: binding => `@group(0) @binding(${binding}) var<uniform> V: array<vec4f, ${done.floats / 4}>;`,
        law: (c, k) => slotValue(pyramidWalk.channels[c].values + k),
        gravity: slotValue(slot.add('setting', 'gravity')),
      },
    });
    if (pyramid.refusal) return { refusal: pyramid.refusal };
    pyramidWalk.pyramid = pyramid;
    Object.keys(pyramid.kernels).forEach(name => { kernelStages[name] = pyramidWalk.channels.map(c => c.stage.name); });
  }

  // Grid fields read positions and columns from this plan's buffers, and their numbers from the
  // step's slot
  const colRefOf = name => {
    const column = columns[name];
    return {
      buffer: column.buffer,
      at: (row, k) => column.width === 1 ? `${column.buffer}[${column.offset}u + ${row}]` : `${column.buffer}[${column.offset}u + ${row} * ${column.width}u + ${k}u]`,
    };
  };
  for (const kernel of kernels) {
    if (kernel.kind !== 'grid') continue;
    const section = kernel.section;
    section.grid = planGrid({
      stage: section.stage, D, n, limits: options.limits, warn: options.warn, label: kernel.name,
      pos: { buffer: 'X', at: (row, k) => `X[${row} * ${D}u + ${k}u]` },
      column: colRefOf,
      values: {
        decl: binding => `@group(0) @binding(${binding}) var<uniform> V: array<vec4f, ${done.floats / 4}>;`,
        at: name => slotValue(name.startsWith('param:') ? section.params[name.slice(6)] : name.startsWith('builtIn:') ? section.builtIns[name.slice(8)] : section.numbers[name]),
      },
    });
    if (section.grid.refusal) return { refusal: `${section.stage.name}: ${section.grid.refusal}` };
    Object.keys(section.grid.kernels).forEach(name => { kernelStages[name] = [section.stage.name]; });
  }

  // charges and positions of a tile: D + one per distinct charge column
  let tile = 0;
  sections.forEach(section => {
    if (section.kind === 'pairs') tile = Math.max(tile, D + new Set(section.channels.map(c => c.charge)).size);
  });

  return {
    template: 'generic',
    regime: pyramidWalk ? 'pyramid' : 'pairs',
    permuted,
    rowColumn,
    pyramid,
    D,
    nodes: n,
    links: m,
    cap,
    capL,
    groups,
    columns,
    linkColumns,
    groupColumns,
    chunked,
    tables,
    pairs,
    hostSteps: kernels.filter(k => k.kind === 'host').map(k => k.name),
    sums,
    sumWidth,
    S: { size: sSize, fire, firePartials, partials },
    H: { size: hSize },
    slot: done,
    sections,
    skipped,
    kernelList: kernels,
    kernelStages,
    tileFloats: tile,
    fire: sections.some(s => s.kind === 'fire'),
    springs: sections.some(s => s.kind === 'springs'),
    inertia: integrateArgs(sections).inertia,
    // what of the store this plan depends on: a change of it needs a new plan
    dataKey: JSON.stringify(data),
  };
}

/**
 * Rows a generic plan keeps room for: the graph can grow by a quarter before buffers and
 * pipelines (whose WGSL holds the offsets) are made again.
 */
function capacity(n) {
  return Math.max(THREADS$1, Math.ceil(Math.ceil(n * 1.25) / THREADS$1) * THREADS$1);
}

function integrateName(sections) {
  const integrate = sections.find(s => s.kind === 'euler' || s.kind === 'fire');
  return integrate ? integrate.stage.name : 'integrate';
}

function integrateArgs(sections) {
  const integrate = sections.find(s => s.kind === 'euler' || s.kind === 'fire');
  return integrate ? integrate.stage.args : { inertia: 'mass' };
}

// Body columns a section reads (own or other rows)
function readsOf(section) {
  const out = new Set();
  if (section.kind === 'pairs' || section.kind === 'tree') {
    section.channels.forEach(c => { out.add(c.charge); out.add(c.sensitivity); });
    out.add('pos'); out.add('pinned');
    return out;
  }
  section.stage.reads.forEach(read => { if (read.space === 'nodes') out.add(read.column); });
  if (section.kind === 'euler' || section.kind === 'fire') out.add(section.stage.args.inertia);
  if (section.kind === 'springs') out.add('pos');
  return out;
}

// Body columns a section reads in other bodies' rows
function otherReadsOf(section) {
  const out = new Set();
  if (section.kind === 'pairs' || section.kind === 'tree') {
    section.channels.forEach(c => out.add(c.charge));
    out.add('pos');
    return out;
  }
  if (section.kind === 'springs') { out.add('pos'); return out; }
  if (!section.stage) return out;
  section.stage.reads.forEach(read => { if (read.space === 'nodes' && (read.rows === 'other' || read.end)) out.add(read.column); });
  return out;
}

// Body columns a section writes
function writesOf(section) {
  const out = new Set();
  if (section.kind === 'pairs' || section.kind === 'tree' || section.kind === 'springs') { out.add('force'); return out; }
  section.stage.writes.forEach(write => { if (write.space === 'nodes') out.add(write.column); });
  return out;
}

// A link stage that reads positions (its formula reads r)
function readsPositions(section) {
  return section.stage.reads.some(read => read.space === 'nodes' && read.column === 'pos');
}

// True for a section that writes nothing but additions to the force, and does not read it
function onlyAddsForce(section) {
  if (section.kind === 'sum' || section.kind === 'groupsum' || section.kind === 'euler' || section.kind === 'fire' || !section.stage) return false;
  const stage = section.stage;
  return stage.writes.every(write => (write.space === 'nodes' && write.column === 'force' && write.mode === 'add')) &&
    !stage.reads.some(read => read.space === 'nodes' && read.column === 'force');
}

function readsAny(stage, columns) {
  return stage.reads.some(read => read.space === 'nodes' && columns.has(read.column));
}

// Where each number of a step's slot lives: settings first, then gates, params, built in values
// and laws' numbers, in the order the plan asks for them
function createSlotTable() {
  const entries = [];
  const byKey = Object.create(null);
  return {
    add(kind, stage, name) {
      const key = kind + ':' + stage + (name === undefined ? '' : ':' + name);
      if (byKey[key] !== undefined) return byKey[key];
      byKey[key] = entries.length;
      entries.push({ kind, stage, name, index: entries.length });
      return byKey[key];
    },
    addLaw(stage, law) {
      const key = 'law:' + stage;
      if (byKey[key] !== undefined) return byKey[key];
      const first = entries.length;
      byKey[key] = first;
      const count = lawCount(law);
      for (let k = 0; k < count; k++) entries.push({ kind: 'law', stage, name: k, index: entries.length });
      return first;
    },
    done() {
      const floats = Math.max(SLOT_FLOATS, Math.ceil(entries.length / SLOT_FLOATS) * SLOT_FLOATS);
      return { entries, floats, bytes: floats * 4 };
    },
  };
}

// The numbers a law reads (see writeLawValues in ../wgsl/print.js)
function lawCount(law) {
  const hoisted = Object.keys(law.values).filter(key => /^\$h\d+$/.test(key)).length;
  return law.paramNames.length + hoisted + (law.hasRange ? 1 : 0);
}

// What the WGSL of every generic kernel shares (emit.js, links.js): the bindings, where a column's
// row lives, the names of locals, and what names mean in a formula.

const AXES = 'xyzw';

/**
 * The bindings every kernel of a plan shares (one pipeline layout for all of them)
 */
function header(plan) {
  return `struct Params { n: u32, groups: u32, fireGroups: u32, links: u32 };
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<uniform> V: array<vec4f, ${plan.slot.floats / 4}>;
@group(0) @binding(2) var<storage, read_write> S: array<f32>;
@group(0) @binding(3) var<storage, read> H: array<f32>;
@group(0) @binding(4) var<storage, read> L: array<u32>;
@group(0) @binding(5) var<storage, read> X: array<f32>;
@group(0) @binding(6) var<storage, read_write> Y: array<f32>;
${(plan.tables || []).map(tableFunctions).join('')}`;
}

// A lookup table of samples at even steps from `from` to `to` (formula.createTable): linear
// between samples, the end values outside; its slope is the segment's (0 outside)
function tableFunctions(table) {
  const last = table.values.length - 1;
  const scale = last / (table.to - table.from);
  const at = k => `H[${u32(table.offset)} + ${k}]`;
  const q = `let q = (x - ${f32Literal(table.from)}) * ${f32Literal(scale)};`;
  return `fn table_${table.id}(x: f32) -> f32 {
  ${q}
  if (!(q > 0.0)) { return ${at('0u')}; }
  if (q >= ${f32Literal(last)}) { return ${at(u32(last))}; }
  let k = u32(q);
  let a = ${at('k')};
  return a + (${at('k + 1u')} - a) * (q - f32(k));
}
fn slope_${table.id}(x: f32) -> f32 {
  ${q}
  if (!(q > 0.0) || q >= ${f32Literal(last)}) { return 0.0; }
  let k = u32(q);
  return (${at('k + 1u')} - ${at('k')}) * ${f32Literal(scale)};
}
`;
}

// A number the generator knows, as an f32 literal
function f32Literal(value) {
  let text = String(Math.fround(value));
  if (/^-?\d+$/.test(text)) text += '.0';
  else if (/e/.test(text) && !/\./.test(text)) text = text.replace('e', '.0e');
  return value < 0 ? '(' + text + ')' : text;
}

/**
 * A law's code with its table calls (the law compiler prints lawFunctions.T.value(x) and the
 * slope's guard) turned into table_<id>() and slope_<id>(): `tables` maps names to ids
 */
function withTables(code, tables) {
  if (!tables) return code;
  const arg = '(\\(?[^()]*\\)?)';
  return code
    .replace(new RegExp(`\\(lawFunctions\\.(\\w+)\\.derivative \\? lawFunctions\\.\\w+\\.derivative\\(${arg}\\) : 0\\)`, 'g'), (all, name, x) => `slope_${tables[name]}(${x})`)
    .replace(new RegExp(`lawFunctions\\.(\\w+)\\.value\\(${arg}\\)`, 'g'), (all, name, x) => `table_${tables[name]}(${x})`);
}

const BINDINGS = ['uniform', 'dynamic', 'storage', 'read', 'read', 'read', 'storage'];
// The kernel with the pyramid's section also reads its uniform and three buffers
const TREE_BINDINGS = BINDINGS.concat(['uniform', 'read', 'read', 'read']);

/**
 * The bindings of a kernel of a plan (see device.js getPipeline())
 */
function bindingsOf(kernel) {
  return kernel.tree ? TREE_BINDINGS : BINDINGS;
}

// Where the parts of L start (see plan.js): u32 expressions
const L_OTHER = 'P.n + 1u';
const L_ROLE = 'P.n + 1u + 2u * P.links';
const L_FROM_ENTRY = 'P.n + 1u + 4u * P.links';
const L_FROM = 'P.n + 1u + 5u * P.links';
const L_TO = 'P.n + 1u + 6u * P.links';
// where the chunks of links start, then where each group column's block starts
const L_HEADER = 'P.n + 1u + 7u * P.links';

function u32(value) {
  return value + 'u';
}

/**
 * Where row `row` of body column `column` lives: an expression for each of its numbers
 */
function columnRef(plan, column, row, afterIntegrate) {
  const c = plan.columns[column];
  const out = [];
  for (let k = 0; k < c.width; k++) {
    const at = c.width === 1 ? `${u32(c.offset)} + ${row}` : `${u32(c.offset)} + ${row} * ${u32(c.width)} + ${u32(k)}`;
    const buffer = c.buffer === 'X' ? (afterIntegrate ? 'Y' : 'X') : c.buffer;
    out.push(`${buffer}[${at}]`);
  }
  return out;
}

/**
 * Where link column `name` of link `s` lives: the host's columns are in CSR order (entry `e`),
 * the stages' in link order
 */
function linkRef(plan, name, s, e) {
  const c = plan.linkColumns[name];
  return c.order === 'csr' ? `H[${u32(c.offset)} + ${e}]` : `S[${u32(c.offset)} + ${s}]`;
}

function local(column, k, width) {
  return width === 1 ? `c_${column}` : `c_${column}_${k}`;
}

function locals(plan, column) {
  const width = plan.columns[column].width;
  const out = [];
  for (let k = 0; k < width; k++) out.push(local(column, k, width));
  return out;
}

function settingsLines(plan) {
  return plan.slot.entries.filter(e => e.kind === 'setting').map(e => `  let s_${e.stage} = ${slotValue(e.index)};`).join('\n');
}

/**
 * The number of a sum per group for the group `index` (a WGSL f32 expression): 0 outside
 * 0 ... count - 1, as on the CPU
 */
function groupRead(sum, index, k) {
  if (!sum.count) return '0.0';
  const at = `${u32(sum.offset)} + min(u32(max(floor(${index}), 0.0)), ${u32(sum.count - 1)}) * ${u32(sum.width)} + ${u32(k)}`;
  return `select(0.0, S[${at}], ${index} >= 0.0 && ${index} < ${sum.count}.0)`;
}

/**
 * What names mean in the formula of `section` on the GPU. `where.space`:
 *  - 'node': the thread's own row (locals c_*);
 *  - 'gather': one link of the thread's row, in a node kernel: `isFrom` says which end the thread
 *    is, the other body's row is `j` (its columns read at the link's ends are in o_* locals), the
 *    link's values in lk_* locals, `lr` the distance and `lpull` the pull;
 *  - 'link': a thread per link (rows `li` and `lj`), its values in lk_* locals; link columns it
 *    writes go into lw_* and lk_*, written back at the end.
 * `where.written` collects the link columns a 'link' formula writes.
 */
function scopeOf(plan, section, where = { space: 'node' }) {
  const D = plan.D;
  const space = where.space;
  const vector = codes => (codes.length === 1 ? { type: 'num', code: codes[0] } : { type: 'vec', codes });
  return {
    D,
    name(key) {
      if (space !== 'node') {
        const named = linkName(key);
        if (named) return named;
      }
      const column = plan.columns[key];
      if (space === 'node' && key === 'pos') {
        // positions are relative to the origin on the device; a formula sees where bodies are
        return { type: 'vec', codes: locals(plan, 'pos').map((name, k) => `(${name} + s_origin_${k})`), write: null };
      }
      if (space === 'node' && column) {
        const names = locals(plan, key);
        const write = (op, value) => {
          const codes = value.codes || [value.code];
          return names.map((name, k) => `${name} ${op} ${codes[k]};`);
        };
        return column.width === 1 ? { type: 'num', code: names[0], write } : { type: 'vec', codes: names, write };
      }
      if (section.params && section.params[key] !== undefined) return { type: 'num', code: slotValue(section.params[key]) };
      if (section.tables && section.tables[key] !== undefined) return { call: args => `table_${section.tables[key]}(${args[0]})` };
      const sum = plan.sums[key];
      if (sum && sum.grouped) {
        return { index: code => vector(Array.from({ length: sum.width }, (_, k) => groupRead(sum, code, k))) };
      }
      if (sum) return vector(Array.from({ length: sum.width }, (_, k) => `g_${key}_${k}`));
      if (section.builtIns && section.builtIns[key] !== undefined) return { type: 'num', code: slotValue(section.builtIns[key]) };
      return undefined;
    },
  };

  // Names of link formulas: r, pull, the link's values, and body columns at either end
  function linkName(key) {
    if (key === 'r') return { type: 'num', code: 'lr' };
    if (key === 'pull' && space === 'gather') {
      return { type: 'num', code: 'lpull', write: (op, value) => [`lpull ${op} ${value.code};`] };
    }
    if (key === 'length' || key === 'coefficient') {
      const fallback = key === 'length' ? `select(lw_length, s_springLength, lw_length < 0.0)` : `select(lw_coefficient, s_springCoefficient, lw_coefficient <= 0.0)`;
      const write = space === 'link' ? (op, value) => {
        where.written.add(key);
        return [`lw_${key} = ${value.code};`, `lk_${key} = ${fallback};`];
      } : null;
      return { type: 'num', code: 'lk_' + key, write };
    }
    if (plan.linkColumns[key]) {
      const write = space === 'link' ? (op, value) => { where.written.add(key); return [`lk_${key} ${op} ${value.code};`]; } : null;
      return { type: 'num', code: 'lk_' + key, write };
    }
    const end = /^(.+)_([ij])$/.exec(key);
    if (!end) return undefined;
    const column = plan.columns[end[1]];
    if (!column) return undefined;
    const isI = end[2] === 'i';
    if (space === 'link') {
      const row = isI ? 'li' : 'lj';
      const codes = end[1] === 'pos'
        ? Array.from({ length: D }, (_, k) => `(X[${row} * ${u32(D)} + ${u32(k)}] + s_origin_${k})`)
        : columnRef(plan, end[1], row, false);
      return vector(codes);
    }
    // gather: one end is the thread's own row (locals), the other row j (o_* locals)
    const own = end[1] === 'pos' ? locals(plan, 'pos') : locals(plan, end[1]);
    const other = own.map(name => 'o' + name.slice(1));
    const mine = isI ? 'isFrom' : '!isFrom';
    let codes = own.map((name, k) => `select(${other[k]}, ${name}, ${mine})`);
    if (end[1] === 'pos') codes = codes.map((code, k) => `(${code} + s_origin_${k})`);
    const write = (op, value) => {
      const values = value.codes || [value.code];
      return [`if (${mine}) { ${own.map((name, k) => `${name} ${op} ${values[k]};`).join(' ')} }`];
    };
    return codes.length === 1 ? { type: 'num', code: codes[0], write } : { type: 'vec', codes, write };
  }
}

/**
 * A direction for two bodies on the same spot, from their indices: axis k of a unit vector of
 * about 0.01, the same for (a, b) and (b, a) but for the sign, so the two are pushed apart
 */
function NUDGE(D) {
  return `fn nudgeAxis(a: u32, b: u32, k: u32) -> f32 {
  var h = min(a, b) * 747796405u + max(a, b) * 2891336453u + k * 1013904223u + 1u;
  h = ((h >> 16u) ^ h) * 0x45d9f3bu; h = ((h >> 16u) ^ h) * 0x45d9f3bu; h = (h >> 16u) ^ h;
  return f32(h) * (2.0 / 4294967296.0) - 1.0;
}
fn nudge(a: u32, b: u32, k: u32) -> f32 {
  var norm = 0.0;
  for (var axis = 0u; axis < ${u32(D)}; axis++) { let x = nudgeAxis(a, b, axis); norm += x * x; }
  let x = select(nudgeAxis(a, b, k), select(0.0, 1.0, k == 0u), norm == 0.0);
  return select(-0.01, 0.01, a < b) * x / select(sqrt(norm), 1.0, norm == 0.0);
}`;
}

// WGSL of links, pair formulas and sums per group (design sections 6.3 to 6.5), for emit.js:
//  - the stock springs and link formulas that pull or add into body columns, as a gather in a node
//    kernel: the thread goes through its row's links; both ends evaluate a link with its true
//    roles (i is the from end), so they get the same pull, and each keeps its own end's share;
//  - link formulas that only write link columns: a kernel with a thread per link;
//  - pair formulas: up to N*, a node section that looks at every other body (the pair track's
//    printer gives the formula with the CPU's roles); above it, the section that adds the totals
//    of the pair track's gather;
//  - GROUP_RUNS and GROUP_SUM for sums per group.

// Bodies per tile of the all-pairs loop of a pair formula, whose totals are added up per tile
const PAIR_TILE = 256;
// Chunks of a row added up per block before the blocks are (a power of 2)
const CHUNK_BLOCK = 16;

/**
 * The stock springs, or a link formula that pulls or adds into body columns: lines of a node
 * kernel section. `pos` and `force` are the thread's locals. Up to N* the section goes through
 * the row's links itself; above it, it adds the row's chunks (LINK_CHUNKS) in order.
 */
function gatherCode(plan, section, printer) {
  const out = [];
  // a pass's own sums start at zero (the CPU zeroes the column; each row here is its thread's)
  const zero = section.kind === 'springs' ? [] : section.stage.args.startAtZero || [];
  zero.forEach(column => locals(plan, column).forEach(name => out.push(`${name} = 0.0;`)));
  out.push('if (live) {');
  if (section.chunks) {
    // the row's chunks add up in blocks of CHUNK_BLOCK, then the blocks, then the total joins the
    // locals: a hub's hundreds of partials added one by one into a large running force drift
    // (rounding of small terms of one sign onto a large number)
    const { offset, width, parts } = section.chunks;
    const names = [];
    parts.forEach(part => locals(plan, part.column).forEach(name => names.push(name)));
    out.push(`  let cb = L[${L_HEADER}];`);
    out.push('  let cFirst = L[cb + 1u + row];');
    out.push('  ' + names.map((name, at) => `var ct${at} = 0.0; var cs${at} = 0.0;`).join(' '));
    out.push('  for (var c = cFirst; c < L[cb + 2u + row]; c++) {');
    out.push('    ' + names.map((name, at) => `cs${at} += S[${u32(offset)} + c * ${u32(width)} + ${u32(at)}];`).join(' '));
    out.push(`    if (((c - cFirst) & ${u32(CHUNK_BLOCK - 1)}) == ${u32(CHUNK_BLOCK - 1)}) { ${names.map((name, at) => `ct${at} += cs${at}; cs${at} = 0.0;`).join(' ')} }`);
    out.push('  }');
    out.push('  ' + names.map((name, at) => `${name} += ct${at} + cs${at};`).join(' '));
  } else {
    out.push('  for (var e = L[row]; e < L[row + 1u]; e++) {');
    entryBody(plan, section, printer).forEach(line => out.push('    ' + line));
    out.push('  }');
  }
  out.push('}');
  return out;
}

/**
 * LINK_CHUNKS: a thread per chunk of up to 8 links of one row (the chunks of a row in a row) goes
 * through them as the row's gather would, and writes what they add (the force, and into each
 * column) to the chunk's place
 */
function chunkKernel(plan, kernel, printer) {
  const section = kernel.section;
  const { offset, width, parts } = section.chunks;
  const out = [header(plan), NUDGE(plan.D)];
  out.push('@compute @workgroup_size(256)');
  out.push('fn main(@builtin(global_invocation_id) gid: vec3u) {');
  out.push(`  let cb = L[${L_HEADER}];`);
  out.push('  let chunks = L[cb];');
  out.push('  let c = gid.x;');
  out.push('  if (c >= chunks) { return; }');
  out.push('  let row = L[cb + 2u + P.n + c];');
  out.push('  let first = L[cb + 2u + P.n + chunks + c];');
  out.push(`  let last = min(first + ${u32(LINK_CHUNK)}, L[row + 1u]);`);
  out.push(settingsLines(plan));
  if (section.gate !== undefined) out.push(`  if (${slotValue(section.gate)} == 0.0) { return; }`);
  // the row's own values the links read; what they add starts at 0
  const added = new Set(parts.map(part => part.column));
  const reads = new Set(['pos']);
  if (section.kind === 'gather') section.stage.reads.forEach(read => { if (read.space === 'nodes' && plan.columns[read.column]) reads.add(read.column); });
  reads.forEach(column => {
    if (added.has(column)) return;
    const refs = columnRef(plan, column, 'row', false);
    locals(plan, column).forEach((name, k) => out.push(`  let ${name} = ${refs[k]};`));
  });
  added.forEach(column => locals(plan, column).forEach(name => out.push(`  var ${name} = 0.0;`)));
  out.push('  for (var e = first; e < last; e++) {');
  entryBody(plan, section, printer).forEach(line => out.push('    ' + line));
  out.push('  }');
  let at = 0;
  parts.forEach(part => {
    locals(plan, part.column).forEach(name => { out.push(`  S[${u32(offset)} + c * ${u32(width)} + ${u32(at)}] = ${name};`); at++; });
  });
  out.push('}');
  return out.join('\n') + '\n';
}

// One link of the row (entry e), as the row's end sees it: what the link adds to the row's force
// and columns
function entryBody(plan, section, printer) {
  const D = plan.D;
  const pos = locals(plan, 'pos'), force = locals(plan, 'force');
  const axes = Array.from({ length: D }, (_, k) => k);
  const stock = section.kind === 'springs';
  const stage = section.stage;
  const pulls = stock || section.pulls;
  const body = [`let j = L[${L_OTHER} + e];`];
  const needsLink = !stock || section.own;
  if (needsLink) {
    body.push(`let lrole = L[${L_ROLE} + e];`);
    body.push('let s = lrole & 0x7fffffffu;');
    body.push('let isFrom = (lrole >> 31u) == 0u;');
  }
  // from this body to the other one (the CPU's d is to - from: the from end sees this d)
  body.push(axes.map(k => `var dm${k} = X[j * ${u32(D)} + ${u32(k)}] - ${pos[k]};`).join(' '));
  body.push(`var lr = sqrt(${axes.map(k => `dm${k} * dm${k}`).join(' + ')});`);
  // ends on one spot: a link that pulls goes along a small direction both ends agree on (the CPU
  // draws a random one); one that does not sees r = 0, as on the CPU. A link from a body to itself
  // sits twice in its row: the role gives the two entries opposite directions, so their pulls
  // cancel as on the CPU (the stock springs, which do not read the role, drop its pull)
  const sign = needsLink ? 'select(1.0, select(-1.0, 1.0, isFrom), j == row) * ' : '';
  if (pulls) body.push(`if (lr == 0.0) { ${axes.map(k => `dm${k} = ${sign}nudge(row, j, ${u32(k)});`).join(' ')} lr = sqrt(${axes.map(k => `dm${k} * dm${k}`).join(' + ')}); }`);
  body.push(...linkValues(plan, stage, stock, 's', 'e'));
  if (stock) {
    body.push('let lpull = lk_coefficient * (lr - lk_length);');
  } else {
    // the other end's columns the formula reads
    stage.reads.forEach(read => {
      if (read.space !== 'nodes' || !read.end || read.column === 'pos' || !plan.columns[read.column]) return;
      const refs = columnRef(plan, read.column, 'j', false);
      locals(plan, read.column).forEach((name, k) => {
        const line = `let o${name.slice(1)} = ${refs[k]};`;
        if (body.indexOf(line) < 0) body.push(line);
      });
    });
    body.push(axes.map(k => `let o_pos_${k} = X[j * ${u32(D)} + ${u32(k)}];`).join(' '));
    if (pulls) body.push('var lpull = 0.0;');
    const compiled = formula.compile(stage.formula, scopeOf(plan, section, { space: 'gather' }), printer);
    body.push(...compiled.lines);
  }
  // from: force_i += k d; to: force_j -= k d; with d = to - from, both are k times dm
  if (pulls) {
    body.push(needsLink ? 'let kp = lpull / lr;' : 'let kp = select(lpull / lr, 0.0, j == row);');
    body.push(axes.map(k => `${force[k]} += kp * dm${k};`).join(' '));
  }
  return body;
}

// The link's length, stiffness and columns as lk_* locals: the settings while every link has
// the defaults, else the link's own with the settings for a negative length or a stiffness of 0
function linkValues(plan, stage, stock, s, e) {
  const out = [];
  ['length', 'coefficient'].forEach(name => {
    const setting = name === 'length' ? 's_springLength' : 's_springCoefficient';
    if (!plan.linkColumns[name]) {
      out.push(`var lk_${name} = ${setting};`);
      return;
    }
    out.push(`var lw_${name} = ${linkRef(plan, name, s, e)};`);
    out.push(`var lk_${name} = select(lw_${name}, ${setting}, lw_${name} ${name === 'length' ? '< 0.0' : '<= 0.0'});`);
  });
  if (!stock) {
    stage.reads.forEach(read => {
      if (read.space !== 'links' || read.column === 'length' || read.column === 'coefficient' || !plan.linkColumns[read.column]) return;
      const line = `var lk_${read.column} = ${linkRef(plan, read.column, s, e)};`;
      if (out.indexOf(line) < 0) out.push(line);
    });
  }
  return out;
}

/**
 * A pair formula's node section: above N* the pair track's (it adds what its gather wrote), up to
 * it every other body, the formula evaluated with the CPU's roles (`i` the lower row) and only this
 * body's own share kept. `force` is the thread's force locals.
 */
function pairCode(plan, section, printer) {
  const D = plan.D;
  const stage = section.stage;
  const force = locals(plan, 'force');
  const localOf = (column, k) => locals(plan, column)[k];
  if (section.sort) return plan.pairs.section(stage.name).code({ force, local: localOf, row: 'row' });
  const columns = Object.create(null);
  Object.values(plan.columns).forEach(c => { columns[c.name] = { width: c.width > 1 ? 'D' : 1 }; });
  // force_i += in the formula adds into the tile's force sums, as the push does
  const printed = printPairFormula(stage, {
    D, printer, columns, force: k => `pairForce${k}`,
    read(column, who, k) {
      if (column === 'pos') return who === 'me' ? `(${localOf('pos', k)} + s_origin_${k})` : `(X[j * ${u32(D)} + ${u32(k)}] + s_origin_${k})`;
      return who === 'me' ? localOf(column, k) : columnRef(plan, column, 'j', false)[k];
    },
    param: name => slotValue(section.params[name]),
    builtIn: name => slotValue(section.builtIns[name]),
    sumWidth: name => (plan.sums[name] && !plan.sums[name].grouped ? plan.sums[name].width : 0),
    sum: (name, k) => `g_${name}_${k}`,
  });
  const out = [];
  const axes = Array.from({ length: D }, (_, k) => k);
  // a pass's own sums start at zero, even when the radius skips it, as on the CPU
  printed.accumulators.forEach(a => { if (a.startAtZero) locals(plan, a.column).forEach(name => out.push(`${name} = 0.0;`)); });
  // a block of its own: another pair stage in the same kernel declares the same names
  out.push(`{ let pairRadius = ${slotValue(section.radius)};`);
  out.push('if (live && pairRadius > 0.0) {');
  // totals per tile of bodies, added up after each tile: one running sum over a crowd of
  // thousands of neighbours misses 1e-5 (as the tile loop's repulsion)
  const accumulators = [];
  printed.accumulators.forEach(a => { for (let k = 0; k < a.width; k++) accumulators.push({ name: accumulatorName(a.column, k, a.width), local: localOf(a.column, k) }); });
  accumulators.forEach(a => out.push(`  var ${a.name}_total = 0.0;`));
  out.push(`  for (var tile = 0u; tile < P.n; tile += ${u32(PAIR_TILE)}) {`);
  out.push('    ' + axes.map(k => `var pairForce${k} = 0.0;`).concat(accumulators.map(a => `var ${a.name} = 0.0;`)).join(' '));
  out.push(`    let tileEnd = min(tile + ${u32(PAIR_TILE)}, P.n);`);
  out.push('    for (var j = tile; j < tileEnd; j++) {');
  out.push('      ' + axes.map(k => `let d${k} = ${localOf('pos', k)} - X[j * ${u32(D)} + ${u32(k)}];`).join(' '));
  out.push(`      let pairR2 = ${axes.map(k => `d${k} * d${k}`).join(' + ')};`);
  pairCandidate(printed, { D, me: 'row', other: 'j', r2: 'pairR2', radius: 'pairRadius', force: k => `pairForce${k}` }).forEach(line => out.push('      ' + line));
  out.push('    }');
  out.push('    ' + axes.map(k => `${force[k]} += pairForce${k};`).concat(accumulators.map(a => `${a.name}_total += ${a.name};`)).join(' '));
  out.push('  }');
  accumulators.forEach(a => out.push(`  ${a.local} += ${a.name}_total;`));
  out.push('} }');
  return out;
}

/**
 * A kernel with a thread per link, for link formulas that only write link columns (their own
 * length and stiffness, or columns of their own)
 */
function linkKernel(plan, kernel, printer) {
  const D = plan.D;
  const axes = Array.from({ length: D }, (_, k) => k);
  const out = [header(plan)];
  out.push('@compute @workgroup_size(256)');
  out.push('fn main(@builtin(global_invocation_id) gid: vec3u) {');
  out.push('  let s = gid.x;');
  out.push('  let live = s < P.links;');
  out.push('  let sl = select(0u, s, live);');
  out.push(`  let li = L[${L_FROM} + sl];`);
  out.push(`  let lj = L[${L_TO} + sl];`);
  out.push(`  let e = L[${L_FROM_ENTRY} + sl];`);
  out.push(settingsLines(plan));
  kernel.sections.forEach(section => {
    const stage = section.stage;
    const written = new Set();
    const body = [];
    if (stage.reads.some(read => read.space === 'nodes' && read.column === 'pos')) {
      // no nudge: ends on one spot see r = 0, as on the CPU
      body.push(axes.map(k => `let d${k} = X[lj * ${u32(D)} + ${u32(k)}] - X[li * ${u32(D)} + ${u32(k)}];`).join(' '));
      body.push(`let lr = sqrt(${axes.map(k => `d${k} * d${k}`).join(' + ')});`);
    }
    body.push(...linkValues(plan, stage, false, 'sl', 'e'));
    // columns it writes start as the link's values
    stage.writes.forEach(write => {
      if (write.space !== 'links' || write.column === 'length' || write.column === 'coefficient') return;
      const line = `var lk_${write.column} = ${linkRef(plan, write.column, 'sl', 'e')};`;
      if (body.indexOf(line) < 0) body.push(line);
    });
    const compiled = formula.compile(stage.formula, scopeOf(plan, section, { space: 'link', written }), printer);
    body.push(...compiled.lines);
    const writes = [...written].map(name => `S[${u32(plan.linkColumns[name].offset)} + s] = ${name === 'length' || name === 'coefficient' ? 'lw_' : 'lk_'}${name};`);
    if (writes.length) body.push(`if (live) { ${writes.join(' ')} }`);
    out.push(`  // ${stage.name}`);
    const gate = section.gate !== undefined ? slotValue(section.gate) + ' != 0.0' : 'true';
    out.push(`  if (${gate}) {`);
    body.forEach(line => out.push('    ' + line));
    out.push('  }');
  });
  out.push('}');
  return out.join('\n') + '\n';
}

/**
 * The value of each row for a sum per group, into its rows (a node kernel section)
 */
function groupValueCode(plan, kernel, section, printer) {
  const stage = section.stage;
  const sum = plan.sums[stage.name];
  const compiled = formula.compile(stage.formula, scopeOf(plan, section), printer);
  const value = compiled.result;
  const codes = value.codes || [value.code];
  const lines = compiled.lines.slice();
  lines.push(`if (live) { ${codes.map((code, k) => `S[${u32(sum.rows)} + row * ${u32(sum.width)} + ${u32(k)}] = ${code};`).join(' ')} }`);
  return ['{'].concat(lines.map(line => '  ' + line), ['}']);
}

// The block of a group column in L: [runs, groups, rows, the rows in group order, the first row
// of each run (runs + 1), the first run of each group (groups + 1)]
function groupBlock$1(kernel) {
  const block = kernel.sums[0].block;
  return [
    `  let base = L[${L_HEADER} + ${u32(block + 1)}];`,
    '  let runs = L[base];',
    '  let count = L[base + 1u];',
    '  let rows = L[base + 2u];',
  ];
}

/**
 * GROUP_RUNS: a thread per run of rows of one group (at most 256, in group order) adds up their
 * values, in row order
 */
function groupRunsKernel(plan, kernel) {
  const out = [header(plan), '@compute @workgroup_size(256)', 'fn main(@builtin(global_invocation_id) gid: vec3u) {'];
  out.push(...groupBlock$1(kernel));
  out.push('  let run = gid.x;');
  out.push('  if (run >= runs) { return; }');
  out.push('  let first = L[base + 3u + rows + run];');
  out.push('  let last = L[base + 3u + rows + run + 1u];');
  kernel.sums.forEach((sum, q) => { for (let k = 0; k < sum.width; k++) out.push(`  var a${q}_${k} = 0.0;`); });
  out.push('  for (var t = first; t < last; t++) {');
  out.push('    let row = L[base + 3u + t];');
  kernel.sums.forEach((sum, q) => { for (let k = 0; k < sum.width; k++) out.push(`    a${q}_${k} += S[${u32(sum.rows)} + row * ${u32(sum.width)} + ${u32(k)}];`); });
  out.push('  }');
  kernel.sums.forEach((sum, q) => { for (let k = 0; k < sum.width; k++) out.push(`  S[${u32(sum.runs)} + run * ${u32(sum.width)} + ${u32(k)}] = a${q}_${k};`); });
  out.push('}');
  return out.join('\n') + '\n';
}

/**
 * GROUP_SUM: a thread per group adds up its runs in order, into the sum's result (kept as it was
 * on steps where the sum's `when` does not hold)
 */
function groupSumKernel(plan, kernel) {
  const out = [header(plan), '@compute @workgroup_size(256)', 'fn main(@builtin(global_invocation_id) gid: vec3u) {'];
  out.push(...groupBlock$1(kernel));
  out.push('  let g = gid.x;');
  out.push('  if (g >= count) { return; }');
  out.push('  let first = L[base + 4u + rows + runs + g];');
  out.push('  let last = L[base + 4u + rows + runs + g + 1u];');
  kernel.sums.forEach((sum, q) => {
    const gate = kernel.gates[q];
    out.push(`  if (${gate !== undefined ? slotValue(gate) + ' != 0.0' : 'true'}) {`);
    for (let k = 0; k < sum.width; k++) out.push(`    var a${k} = 0.0;`);
    out.push('    for (var run = first; run < last; run++) {');
    for (let k = 0; k < sum.width; k++) out.push(`      a${k} += S[${u32(sum.runs)} + run * ${u32(sum.width)} + ${u32(k)}];`);
    out.push('    }');
    for (let k = 0; k < sum.width; k++) out.push(`    S[${u32(sum.offset)} + g * ${u32(sum.width)} + ${u32(k)}] = a${k};`);
    out.push('  }');
  });
  out.push('}');
  return out.join('\n') + '\n';
}

// WGSL of a generic plan (plan.js). A node kernel runs one thread per body: it loads the columns
// its sections touch into locals, runs the sections in CPU stage order, and writes back what
// they changed. Formulas print through the module's WGSL printer, so user names never meet a
// WGSL word, and vectors are unrolled to D numbers (D is in the text).
//
// A thread past n works on row 0 and writes nothing; it stays to the end, because tile loops and
// reductions have workgroup barriers (WGSL uniformity). The kernel that holds the pyramid's section
// runs its threads in the pyramid's order: thread t works on row tree_row(t).

/**
 * The WGSL of every kernel of `plan`, by kernel name. `printer` is a WGSL printer (its warnings
 * go where the caller wants them).
 */
function kernelCode(plan, printer = WGSL) {
  const out = {};
  plan.kernelList.forEach(kernel => {
    if (kernel.kind === 'node') out[kernel.name] = nodeKernel(plan, kernel, printer);
    else if (kernel.kind === 'link') out[kernel.name] = linkKernel(plan, kernel, printer);
    else if (kernel.kind === 'chunks') out[kernel.name] = chunkKernel(plan, kernel, printer);
    else if (kernel.kind === 'groupRuns') out[kernel.name] = groupRunsKernel(plan, kernel);
    else if (kernel.kind === 'groupSum') out[kernel.name] = groupSumKernel(plan, kernel);
    else if (kernel.kind === 'reduce') out[kernel.name] = reduceKernel(plan, kernel);
    else if (kernel.kind === 'fireReduce') out[kernel.name] = fireReduceKernel(plan);
    else if (kernel.kind === 'fireState') out[kernel.name] = fireStateKernel(plan);
    // a host step is no kernel
  });
  return out;
}

// ---------------------------------------------------------------------------------------------
// Node kernels
// ---------------------------------------------------------------------------------------------

function nodeKernel(plan, kernel, printer) {
  const D = plan.D;
  const touched = new Set(), modified = new Set();
  let integrates = false;
  kernel.sections.forEach(section => {
    readsOf(section).forEach(column => { if (plan.columns[column]) touched.add(column); });
    writesOf(section).forEach(column => { if (plan.columns[column]) { touched.add(column); modified.add(column); } });
    if (section.kind === 'euler' || section.kind === 'fire') integrates = true;
  });
  const hasTiles = kernel.sections.some(s => s.kind === 'pairs');
  const lines = [];
  const decls = [header(plan)];
  if (hasTiles) {
    for (let a = 0; a < Math.ceil(plan.tileFloats / 4); a++) decls.push(`var<workgroup> tile${a}: array<vec4f, ${THREADS$1}>;`);
  }
  if (kernel.sums.length) decls.push(`var<workgroup> red: array<vec4f, ${THREADS$1}>;`);
  decls.push(NUDGE(D));
  if (kernel.tree) {
    const tree = kernel.tree.pyramid.section;
    decls.push(tree.uniform.struct, tree.uniform.decl(BINDINGS.length));
    tree.bindings.forEach((b, k) => decls.push(`@group(0) @binding(${BINDINGS.length + 1 + k}) var<storage, ${b.access}> ${b.name}: ${b.type};`));
    decls.push(tree.declarations);
  }

  lines.push(`@compute @workgroup_size(${THREADS$1})`);
  lines.push('fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_index) li: u32, @builtin(workgroup_id) wid: vec3u) {');
  if (kernel.tree) {
    lines.push('  let t = gid.x;');
    lines.push('  let live = t < P.n;');
    lines.push('  var i = 0u;');
    lines.push(`  if (live) { i = ${kernel.tree.pyramid.section.row('t')}; }`);
    lines.push('  let row = i;');
  } else {
    lines.push('  let i = gid.x;');
    lines.push('  let live = i < P.n;');
    lines.push('  let row = select(0u, i, live);');
  }
  lines.push(settingsLines(plan));
  // own columns, once
  touched.forEach(column => {
    const refs = columnRef(plan, column, 'row', kernel.afterIntegrate);
    const keep = modified.has(column) || column === 'pos' ? 'var' : 'let';
    locals(plan, column).forEach((name, k) => lines.push(`  ${keep} ${name} = ${refs[k]};`));
  });
  // sums the sections read
  const sumsRead = new Set();
  kernel.sections.forEach(section => { if (section.stage && section.stage.sums) section.stage.sums.forEach(name => sumsRead.add(name)); });
  sumsRead.forEach(name => {
    const sum = plan.sums[name];
    // a sum per group is read by index where the formula reads it
    if (sum.grouped) return;
    for (let k = 0; k < sum.width; k++) lines.push(`  let g_${name}_${k} = S[${u32(sum.offset + k)}];`);
  });
  // what this kernel's sums add up, per row
  kernel.sums.forEach((sum, s) => { for (let k = 0; k < sum.width; k++) lines.push(`  var sv${s}_${k} = 0.0;`); });

  kernel.sections.forEach((section, index) => {
    lines.push(`  // ${section.kind}${section.stage ? ': ' + section.stage.name : ''}`);
    lines.push(sectionCode(plan, kernel, section, index, printer).map(line => '  ' + line).join('\n'));
  });

  if (kernel.sums.length) lines.push(sumEpilogue(plan, kernel));

  lines.push('  if (live) {');
  modified.forEach(column => {
    const c = plan.columns[column];
    if (c.buffer === 'H') return;
    const refs = columnRef(plan, column, 'i', true);
    locals(plan, column).forEach((name, k) => lines.push(`    ${c.buffer === 'X' ? refs[k] : refs[k]} = ${name};`));
  });
  if (integrates && !modified.has('pos')) {
    const refs = columnRef(plan, 'pos', 'i', true);
    locals(plan, 'pos').forEach((name, k) => lines.push(`    ${refs[k]} = ${name};`));
  }
  lines.push('  }');
  lines.push('}');
  return decls.join('\n') + '\n' + lines.join('\n') + '\n';
}

function sectionCode(plan, kernel, section, index, printer) {
  const code = sectionBody(plan, kernel, section, index, printer);
  // tree passes gate their channels, the pair track's section its stage
  if (section.gate === undefined || section.kind === 'pairs' || section.kind === 'tree' || (section.kind === 'pairformula' && section.sort)) return code;
  // a stage's `when`: the same branch for every thread
  return [`if (${slotValue(section.gate)} != 0.0) {`].concat(code.map(line => '  ' + line), ['}']);
}

function sectionBody(plan, kernel, section, index, printer) {
  const D = plan.D;
  const each = fn => { const out = []; for (let k = 0; k < D; k++) out.push(fn(k)); return out; };
  const pos = locals(plan, 'pos'), velocity = locals(plan, 'velocity'), force = locals(plan, 'force');
  switch (section.kind) {
    case 'clear':
      return [`if (c_pinned == 0.0) { ${force.map(f => f + ' = 0.0;').join(' ')} }`];
    case 'drag':
      return [`if (c_pinned == 0.0) { ${force.map((f, k) => `${f} -= s_dragCoefficient * ${velocity[k]};`).join(' ')} }`];
    case 'springs':
    case 'gather':
      return gatherCode(plan, section, printer);
    case 'groupsum':
      return groupValueCode(plan, kernel, section, printer);
    case 'pairformula':
      return pairCode(plan, section, printer);
    case 'pairs':
      return pairsCode(plan, section, index, pos, force, printer);
    case 'tree':
      return treeCode(section, force);
    case 'formula':
      return ['{'].concat(formulaLines(plan, section, index, printer).map(line => '  ' + line), ['}']);
    case 'sum':
      return sumCode(plan, kernel, section, index, printer);
    case 'euler':
    case 'fire': {
      const inertia = plan.columns[section.stage.args.inertia] ? local(section.stage.args.inertia, 0, 1) : 'c_mass';
      const out = ['if (c_pinned == 0.0) {'];
      if (section.kind === 'fire') {
        out.push(`  let fireCv = S[${u32(plan.S.fire + 2)}]; let fireCf = S[${u32(plan.S.fire + 3)}];`);
        out.push('  ' + each(k => `${velocity[k]} = fireCv * ${velocity[k]} + fireCf * ${force[k]};`).join(' '));
      }
      out.push(`  let coeff = s_timeStep / ${inertia};`);
      out.push('  ' + each(k => `${velocity[k]} += coeff * ${force[k]};`).join(' '));
      out.push(`  let speed = sqrt(${velocity.map(v => v + ' * ' + v).join(' + ')});`);
      out.push(`  if (speed > s_maxVelocity) { ${each(k => `${velocity[k]} = s_maxVelocity * ${velocity[k]} / speed;`).join(' ')} }`);
      out.push('  ' + each(k => `${pos[k]} += s_timeStep * ${velocity[k]};`).join(' '));
      out.push('}');
      return out;
    }
  }
  throw new Error('unknown section ' + section.kind);
}

// Exact repulsion over all pairs: tiles of 256 bodies (their positions and charges) in workgroup
// memory, a channel per tree stage of the walk. A body past n has charge 0. The loop has no
// branch: a pair on the same spot (the body itself, or a body at exactly its position) gets a
// harmless r and adds 0, because its d is 0. Bodies that met another one on their spot then push
// it along nudge(i, j) in a second, rare loop, as today's kernels do.
function pairsCode(plan, section, index, pos, force, printer) {
  const D = plan.D;
  const charges = [];
  section.channels.forEach(c => { if (charges.indexOf(c.charge) < 0) charges.push(c.charge); });
  const slot = f => ({ array: f >> 2, axis: AXES[f & 3] });
  const tileValue = f => `b${f >> 2}.${AXES[f & 3]}`;
  const arrays = Math.ceil((D + charges.length) / 4);
  const axes = Array.from({ length: D }, (_, k) => k);
  const out = ['{'];
  // the laws' numbers, named per channel so that laws with the same parameter names coexist
  section.channels.forEach((c, ch) => {
    if (c.law) out.push('  ' + renameLaw(lawPrologue(c.law, k => slotValue(c.values + k)), ch));
    axes.forEach(k => out.push(`  var w${ch}_${k} = 0.0;`));
  });
  out.push('  var same = 0u;');
  out.push(`  for (var t = 0u; t < P.n; t += ${u32(THREADS$1)}) {`);
  out.push('    let j = t + li;');
  for (let a = 0; a < arrays; a++) out.push(`    var e${a} = vec4f(0.0);`);
  out.push('    if (j < P.n) {');
  axes.forEach(k => { const s = slot(k); out.push(`      e${s.array}.${s.axis} = X[j * ${u32(D)} + ${u32(k)}];`); });
  charges.forEach((charge, q) => { const s = slot(D + q); out.push(`      e${s.array}.${s.axis} = ${columnRef(plan, charge, 'j', false)[0]};`); });
  out.push('    }');
  for (let a = 0; a < arrays; a++) out.push(`    tile${a}[li] = e${a};`);
  out.push('    workgroupBarrier();');
  // each tile adds up on its own first: f32 error then grows with 256 + n / 256 terms, not n
  section.channels.forEach((c, ch) => axes.forEach(k => out.push(`    var u${ch}_${k} = 0.0;`)));
  // A fixed bound: a body past n has charge 0. A bound from P.n here ran 2.3x slower (harness)
  out.push(`    for (var k = 0u; k < ${u32(THREADS$1)}; k++) {`);
  for (let a = 0; a < arrays; a++) out.push(`      let b${a} = tile${a}[k];`);
  axes.forEach(k => out.push(`      let d${k} = ${tileValue(k)} - ${pos[k]};`));
  out.push(`      let r2 = ${axes.map(k => `d${k} * d${k}`).join(' + ')};`);
  out.push('      let near = r2 == 0.0;');
  out.push('      same += select(0u, 1u, near);');
  channelTerms(plan, section, charges, tileValue, 'select(r2, 1.0, near)', printer, 'u').forEach(line => out.push('      ' + line));
  out.push('    }');
  section.channels.forEach((c, ch) => out.push('    ' + axes.map(k => `w${ch}_${k} += u${ch}_${k};`).join(' ')));
  out.push('    workgroupBarrier();');
  out.push('  }');
  // bodies on this body's spot (the body itself counts once): the nudge, from the buffers
  out.push('  if (live && same > 1u) {');
  out.push('    for (var j = 0u; j < P.n; j++) {');
  out.push(`      if (j == i || ${axes.map(k => `X[j * ${u32(D)} + ${u32(k)}] != ${pos[k]}`).join(' || ')}) { continue; }`);
  axes.forEach(k => out.push(`      let d${k} = nudge(row, j, ${u32(k)});`));
  out.push(`      let r2 = ${axes.map(k => `d${k} * d${k}`).join(' + ')};`);
  const fromBuffers = charges.map(charge => columnRef(plan, charge, 'j', false)[0]);
  channelTerms(plan, section, charges, q => fromBuffers[q - D], 'r2', printer, 'w').forEach(line => out.push('      ' + line));
  out.push('    }');
  out.push('  }');
  // the stock repulsion and every pass skip pinned bodies
  out.push('  if (c_pinned == 0.0) {');
  section.channels.forEach((c, ch) => {
    const sensitivity = local(c.sensitivity, 0, 1);
    out.push(`    let g${ch} = s_gravity * ${sensitivity};`);
    out.push('    ' + axes.map(k => `${force[k]} += g${ch} * w${ch}_${k};`).join(' '));
  });
  out.push('  }');
  out.push('}');
  return out;
}

// Repulsion from the pyramid (its section's code, see ../pyramid/wgsl.js), on bodies that are
// not pinned. A channel's sensitivity is the body's column, or its sorted charge when that is the
// same column; a gated channel's is 0 on steps where its `when` does not hold.
function treeCode(section, force) {
  const code = section.pyramid.section.code({
    t: 't', i: 'row', force,
    sensitivity: c => {
      const channel = section.channels[c];
      const same = channel.sensitivity === channel.charge;
      const value = same ? `tree_charge(tk, ${u32(c)})` : local(channel.sensitivity, 0, 1);
      if (channel.gate !== undefined) return `select(0.0, ${value}, ${slotValue(channel.gate)} != 0.0)`;
      return same ? null : value;
    },
  });
  return [`if (live && c_pinned == 0.0) ${code}`];
}

// What one other body adds to every channel's sum (`into`: u or w), from d0.. and `r2` (an
// expression); `charge(f)` reads the charge in tile slot f
function channelTerms(plan, section, charges, charge, r2, printer, into) {
  const D = plan.D;
  const out = [`let rr = ${r2};`];
  if (section.channels.some(c => c.law)) out.push('let r = sqrt(rr);');
  if (section.channels.some(c => !c.law)) out.push('let inverseCube = 1.0 / (rr * sqrt(rr));');
  section.channels.forEach((c, ch) => {
    const q = charge(D + charges.indexOf(c.charge));
    const add = k1 => Array.from({ length: D }, (_, k) => `${into}${ch}_${k} += (${q} * ${k1}) * d${k};`).join(' ');
    let line;
    if (!c.law) line = add('inverseCube');
    else {
      const code = withTables(renameLaw(emitLaw(c.law, D, 'r', 'k' + ch, undefined, printer), ch), c.tables);
      line = c.law.hasRange ? `if (rr <= law${ch}Range2) { ${code} ${add('k' + ch)} }` : `{ ${code} ${add('k' + ch)} }`;
    }
    // a gated pass adds nothing on the steps where its `when` does not hold
    out.push(c.gate !== undefined ? `if (${slotValue(c.gate)} != 0.0) { ${line} }` : line);
  });
  return out;
}

// The names a law's code reads (law_<param>, lawH<n>, lawRange2), made the channel's own
function renameLaw(code, channel) {
  return code.replace(/\blaw_(\w+)/g, `law${channel}_$1`).replace(/\blawH(\d+)\b/g, `law${channel}H$1`).replace(/\blawRange2\b/g, `law${channel}Range2`);
}

// A formula of a node stage on the thread's own row
function formulaLines(plan, section, index, printer) {
  const stage = section.stage;
  const compiled = formula.compile(stage.formula, scopeOf(plan, section), printer);
  return compiled.lines;
}

function sumCode(plan, kernel, section, index, printer) {
  const stage = section.stage;
  const compiled = formula.compile(stage.formula, scopeOf(plan, section), printer);
  const value = compiled.result;
  const codes = value.codes || [value.code];
  const s = kernel.sums.indexOf(plan.sums[stage.name]);
  const lines = compiled.lines.slice();
  codes.forEach((code, k) => lines.push(`sv${s}_${k} = select(0.0, ${code}, live);`));
  return ['{'].concat(lines.map(line => '  ' + line), ['}']);
}

// Adds up the kernel's sums over its workgroup with a fixed tree, and writes one partial per
// workgroup (four numbers at a time)
function sumEpilogue(plan, kernel) {
  const values = [];
  kernel.sums.forEach((sum, s) => { for (let k = 0; k < sum.width; k++) values.push(`sv${s}_${k}`); });
  const width = values.length;
  const out = [];
  for (let at = 0; at < width; at += 4) {
    const part = values.slice(at, at + 4);
    while (part.length < 4) part.push('0.0');
    out.push(`  red[li] = vec4f(${part.join(', ')});`);
    out.push('  workgroupBarrier();');
    out.push(`  for (var s = ${u32(THREADS$1 / 2)}; s > 0u; s >>= 1u) {`);
    out.push('    if (li < s) { red[li] += red[li + s]; }');
    out.push('    workgroupBarrier();');
    out.push('  }');
    const writes = [];
    for (let c = 0; c < Math.min(4, width - at); c++) writes.push(`S[${u32(plan.S.partials)} + wid.x * ${u32(width)} + ${u32(at + c)}] = red[0].${AXES[c]};`);
    out.push(`  if (li == 0u) { ${writes.join(' ')} }`);
    out.push('  workgroupBarrier();');
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------
// Reductions and FIRE
// ---------------------------------------------------------------------------------------------

// One workgroup adds up the partials of every workgroup of the kernel before, in a fixed order,
// into the sums' results. A sum whose `when` does not hold keeps its last result.
function reduceKernel(plan, kernel) {
  const targets = [];
  kernel.sums.forEach((sum, s) => { for (let k = 0; k < sum.width; k++) targets.push({ at: sum.offset + k, gate: kernel.gates[s] }); });
  const width = targets.length;
  const out = [header(plan), `var<workgroup> red: array<vec4f, ${THREADS$1}>;`];
  out.push(`@compute @workgroup_size(${THREADS$1})`);
  out.push('fn main(@builtin(local_invocation_index) li: u32) {');
  for (let at = 0; at < width; at += 4) {
    const count = Math.min(4, width - at);
    out.push('  {');
    out.push('    var acc = vec4f(0.0);');
    out.push(`    for (var w = li; w < P.groups; w += ${u32(THREADS$1)}) {`);
    for (let c = 0; c < count; c++) out.push(`      acc.${AXES[c]} += S[${u32(plan.S.partials)} + w * ${u32(width)} + ${u32(at + c)}];`);
    out.push('    }');
    out.push('    red[li] = acc;');
    out.push('    workgroupBarrier();');
    out.push(`    for (var s = ${u32(THREADS$1 / 2)}; s > 0u; s >>= 1u) {`);
    out.push('      if (li < s) { red[li] += red[li + s]; }');
    out.push('      workgroupBarrier();');
    out.push('    }');
    const writes = [];
    for (let c = 0; c < count; c++) {
      const target = targets[at + c];
      const write = `S[${u32(target.at)}] = red[0].${AXES[c]};`;
      writes.push(target.gate !== undefined ? `if (${slotValue(target.gate)} != 0.0) { ${write} }` : write);
    }
    out.push(`    if (li == 0u) { ${writes.join(' ')} }`);
    out.push('    workgroupBarrier();');
    out.push('  }');
  }
  out.push('}');
  return out.join('\n') + '\n';
}

// FIRE, part 1: per workgroup, (F.v, |v|^2, |F|^2) over bodies that are not pinned
function fireReduceKernel(plan) {
  const D = plan.D;
  const force = columnRef(plan, 'force', 'r', false), velocity = columnRef(plan, 'velocity', 'r', false);
  const pinned = columnRef(plan, 'pinned', 'r', false)[0];
  const out = [header(plan), `var<workgroup> red: array<vec4f, ${THREADS$1}>;`];
  out.push(`@compute @workgroup_size(${THREADS$1})`);
  out.push('fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_index) li: u32, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {');
  out.push('  var acc = vec4f(0.0);');
  out.push(`  for (var r = gid.x; r < P.n; r += nwg.x * ${u32(THREADS$1)}) {`);
  out.push(`    if (${pinned} != 0.0) { continue; }`);
  for (let k = 0; k < D; k++) out.push(`    let f${k} = ${force[k]}; let v${k} = ${velocity[k]};`);
  const sum = fn => Array.from({ length: D }, (_, k) => fn(k)).join(' + ');
  out.push(`    acc += vec4f(${sum(k => `f${k} * v${k}`)}, ${sum(k => `v${k} * v${k}`)}, ${sum(k => `f${k} * f${k}`)}, 0.0);`);
  out.push('  }');
  out.push('  red[li] = acc;');
  out.push('  workgroupBarrier();');
  out.push(`  for (var s = ${u32(THREADS$1 / 2)}; s > 0u; s >>= 1u) {`);
  out.push('    if (li < s) { red[li] += red[li + s]; }');
  out.push('    workgroupBarrier();');
  out.push('  }');
  out.push(`  if (li == 0u) { ${[0, 1, 2, 3].map(c => `S[${u32(plan.S.firePartials)} + wid.x * 4u + ${u32(c)}] = red[0].${AXES[c]};`).join(' ')} }`);
  out.push('}');
  return out.join('\n') + '\n';
}

// FIRE, part 2 (one workgroup): the total power, then FIRE's state (alpha, steps downhill, and
// this step's mix cv, cf), as the CPU's FIRE integrator does it
function fireStateKernel(plan) {
  const f = plan.S.fire;
  const out = [header(plan), `var<workgroup> red: array<vec4f, ${THREADS$1}>;`];
  out.push(`@compute @workgroup_size(${THREADS$1})`);
  out.push('fn main(@builtin(local_invocation_index) li: u32) {');
  out.push('  var acc = vec4f(0.0);');
  out.push(`  for (var w = li; w < P.fireGroups; w += ${u32(THREADS$1)}) { acc += vec4f(${[0, 1, 2, 3].map(c => `S[${u32(plan.S.firePartials)} + w * 4u + ${u32(c)}]`).join(', ')}); }`);
  out.push('  red[li] = acc;');
  out.push('  workgroupBarrier();');
  out.push(`  for (var s = ${u32(THREADS$1 / 2)}; s > 0u; s >>= 1u) {`);
  out.push('    if (li < s) { red[li] += red[li + s]; }');
  out.push('    workgroupBarrier();');
  out.push('  }');
  out.push('  if (li == 0u) {');
  out.push('    let sum = red[0];');
  out.push(`    let a = S[${u32(f)}];`);
  out.push('    if (sum.x > 0.0) {');
  out.push('      var cf = 0.0;');
  out.push('      if (sum.z > 0.0) { cf = a * sqrt(sum.y) / sqrt(sum.z); }');
  out.push(`      let steps = S[${u32(f + 1)}] + 1.0;`);
  out.push(`      S[${u32(f)}] = select(a, a * 0.99, steps > 5.0); S[${u32(f + 1)}] = steps; S[${u32(f + 2)}] = 1.0 - a; S[${u32(f + 3)}] = cf;`);
  out.push('    } else {');
  out.push(`      S[${u32(f)}] = 0.1; S[${u32(f + 1)}] = 0.0; S[${u32(f + 2)}] = 0.0; S[${u32(f + 3)}] = 0.0;`);
  out.push('    }');
  out.push('  }');
  out.push('}');
  return out.join('\n') + '\n';
}

// From a step that check.js accepts to what the runner builds: which kernels run, in which order,
// and which stages each one computes.
//
//  - The exact stock step (clear, repulsion, drag, springs, integrate, with the mass as charge,
//    sensitivity and inertia) in 2D above the small-graph size N* runs today's grid engine, the
//    stock template, byte for byte (templates/grid.js).
//  - Everything else is a generic plan (generic/plan.js): node kernels in CPU stage order. Up to
//    N* the whole step is one kernel with exact pairs; above it, in 2D and 3D, tree passes walk
//    the generic grid pyramid (pyramid/).

/**
 * The plan for `program`, or {refusal}. `laws` maps every tree stage to its compiled law (null for
 * 1/r^2); `limits` a device's or a capability profile's; `options.generic` keeps the stock step
 * off its template (for tests that compare the two), `options.smallGraph` overrides N* (for
 * measurements). A plan has {template, nodes, buffers,
 * kernels(), kernelStages, how, reads}:
 *  - buffers: bytes per buffer; kernels(): the WGSL of every kernel by name;
 *  - kernelStages: the stages each kernel computes; how: per stage, for plan();
 *  - reads: the body columns the GPU reads, which a 'step' listener must not change.
 */
function schedule(program, laws, limits, options = {}) {
  const nodes = program.spaces.nodes;
  const data = options.data || { linksDefault: true, groups: {} };
  if (!options.generic && nodes > (options.smallGraph || SMALL_GRAPH) && isStockStep(program, laws, data)) {
    return Object.assign(stockPlan(program, laws.repulsion || null), { dataKey: JSON.stringify(data) });
  }
  const plan = genericPlan(program, laws, { limits, warn: options.warn, smallGraph: options.smallGraph, renumber: options.renumber, data });
  if (plan.refusal) return plan;
  const grids = plan.kernelList.filter(kernel => kernel.kind === 'grid');
  plan.buffers = Object.assign({
    S: plan.S.size * 4, H: plan.H.size * 4, X: plan.cap * plan.D * 4, Y: plan.cap * plan.D * 4,
    L: lBytes(plan), V: plan.slot.bytes,
  }, plan.pyramid ? plan.pyramid.buffers : {});
  // grid fields: their buffers and kernels under their kernel's name
  grids.forEach(kernel => {
    const grid = kernel.section.grid;
    Object.keys(grid.buffers).forEach(name => { plan.buffers[`${kernel.name} ${name}`] = grid.buffers[name]; });
  });
  plan.kernels = printer => {
    const out = Object.assign(kernelCode(plan, printer), plan.pyramid ? plan.pyramid.kernels : {});
    grids.forEach(kernel => Object.entries(kernel.section.grid.kernels).forEach(([name, k]) => { out[name] = k.code; }));
    return out;
  };
  plan.how = genericHow(plan);
  plan.reads = Object.keys(plan.columns);
  return plan;
}

// Bytes of L: rows, links at both ends, and a block per group column (see generic/plan.js)
function lBytes(plan) {
  const n = plan.nodes, m = plan.links;
  let words = n + 1 + 7 * m + 1 + plan.groupColumns.length;
  if (plan.chunked) words += 2 + n + 2 * (Math.ceil(2 * m / 8) + n);
  plan.groupColumns.forEach(column => {
    const count = (Object.values(plan.sums).find(sum => sum.column === column) || {}).count || 0;
    const runs = Math.ceil(n / 256) + count;
    words += 3 + n + runs + 1 + count + 1;
  });
  return words * 4;
}

/**
 * True for the exact stock step: the built in stages in their order and nothing else, the mass
 * as charge, sensitivity and inertia, a law that fits the template's 16 numbers, in 2D, while
 * every link has the default length and stiffness (`data.linksDefault`).
 */
function isStockStep(program, laws, data = { linksDefault: true }) {
  if (program.dims !== 2 || !data.linksDefault) return false;
  const stages = physicsStages(program);
  if (stages.map(stage => stage.builtIn).join() !== STOCK_STAGES.join()) return false;
  // the template has no gates
  if (stages.some(stage => stage.when)) return false;
  const repulsion = stages[1].args.channels[0];
  if (repulsion.charge !== 'mass' || repulsion.sensitivity !== 'mass') return false;
  if (stages[4].args.inertia !== 'mass') return false;
  const law = laws.repulsion;
  // the template's law has no lookup tables
  return !law || (lawValueCount(law) <= LAW_VALUES && !law.describe().tables.length);
}

function stockPlan(program, law) {
  const fire = program.settings.integrator === 'fire';
  return {
    template: 'grid',
    law,
    perStep: !!law && readsPerStep(law.describe()),
    nodes: program.spaces.nodes,
    links: program.spaces.links,
    buffers: gridBuffers(program.spaces.nodes, program.spaces.links),
    kernels: () => shaderCode(law),
    kernelStages: KERNEL_STAGES,
    reads: ['pos', 'velocity', 'mass', 'pinned'],
    how: {
      clear: 'part of FORCE',
      repulsion: 'grid pyramid with exact pairs in the 3x3 near cells (theta and nbody do not apply)',
      drag: fire ? 'skipped under FIRE' : 'part of FORCE',
      springs: 'chunks of 8 links per thread (SPRINGS), added in FORCE',
      integrate: fire ? 'FIRE: FIRE_REDUCE, FIRE_STATE, FIRE_INTEGRATE' : 'Euler, part of FORCE',
    },
  };
}

// How each stage runs in a generic plan, for plan()
function genericHow(plan) {
  const how = Object.create(null);
  plan.skipped.forEach(name => { how[name] = 'skipped under FIRE'; });
  const nodeKernels = plan.kernelList.filter(k => k.kind === 'node').length;
  plan.kernelList.forEach((kernel, index) => {
    if (kernel.kind === 'link') kernel.sections.forEach(section => { how[section.stage.name] = `a thread per link, in ${kernel.name}`; });
    if (kernel.kind === 'grid') {
      const grid = kernel.section.grid, args = kernel.section.stage.args;
      how[kernel.section.stage.name] = `a ${args.anchor} grid of up to ${args.maxCells.toLocaleString('en-US')} cells per axis, ${args.weights} weights` +
        `${grid.smooth ? ', smoothed' : ''}: ${grid.dispatches} dispatches (${kernel.name})${kernel.hoisted ? ', at the start of the step' : ''}` +
        `${grid.pending ? `; ${GRID_PENDING}` : ''}`;
    }
    if (kernel.kind !== 'node') return;
    const where = nodeKernels === 1 && plan.kernelList.length === 1 ? 'the step kernel (one dispatch)' : kernel.name;
    const reduce = plan.kernelList.slice(index + 1).find(k => k.kind === 'reduce');
    kernel.sections.forEach(section => {
      if (section.kind === 'pairs') {
        section.channels.forEach(c => { how[c.stage.name] = `exact pairs over tiles of 256 bodies, in ${where}`; });
        return;
      }
      if (section.kind === 'gather') {
        how[section.stage.name] = `both ends of every link, at each body, in ${where}`;
        return;
      }
      if (section.kind === 'tree') {
        const count = section.channels.length;
        const walk = count > 1 ? ` (${count} charges in one walk)` : '';
        section.channels.forEach(c => { how[c.stage.name] = `grid pyramid${walk}: ${section.pyramid.dispatches} structure dispatches, then exact pairs in the near cells and the far field in ${where}`; });
        return;
      }
      const name = section.stage.name;
      if (section.kind === 'sum') how[name] = kernel.hoisted ? 'added up at the start of the step (SUMS, SUMS_REDUCE)' : `per body in ${where}, added up in ${reduce ? reduce.name : 'a reduction'}`;
      else if (section.kind === 'fire') how[name] = `FIRE: FIRE_REDUCE, FIRE_STATE, then ${where}`;
      else if (section.kind === 'groupsum') {
        const runs = plan.kernelList.slice(index + 1).find(k => k.kind === 'groupRuns' && k.sums.some(sum => sum.name === name));
        how[name] = `per body in ${where}, then by group in ${runs ? runs.name : 'GROUP_RUNS'} and GROUP_SUM`;
      }
      else how[name] = (section.kind === 'formula' ? 'in ' : 'part of ') + where;
    });
  });
  return how;
}

// A law described as data (law.describe()) whose numbers can change from one step to the next
function readsPerStep(described) {
  return described.params.some(param => param.kind === 'host') ||
    !!(described.range && described.range.kind === 'host') ||
    described.builtIns.indexOf('step') >= 0;
}

// What this module can run, for the library's `simulator.plan(backend)`, decided without a device:
// from the step as data (simulator.program()), the store's columns, and a capability profile
// (the device's limits).
//
//   const plan = layout.simulator.plan(gpuCapabilities());    // WebGPU's default limits
//   plan.runs; plan.reasons;   // ['personalSpace: WebGPU does not run pair formulas yet', ...]
//
// One lowering decides both what plan() says and what runOnGpu() builds (lower() below), so a
// "runs" verdict is the plan the runner compiles. It runs, in any number of dimensions:
//  - node formulas, sums over bodies (global, or per group of a column the host sets), and link
//    formulas (that pull, add into body columns, or set their own link's columns), in CPU stage
//    order;
//  - the stock repulsion and extra passes (addRepulsion), with any law the printer accepts and
//    any charge and sensitivity columns: exact pairs up to 1,024 bodies, the generic grid pyramid
//    above in 2D and 3D (exact pairs up to 16,384 bodies in 4 or more dimensions); the exact
//    stock step in 2D above 1,024 bodies keeps today's grid kernels (the stock template);
//  - drag, the stock springs with the links' own lengths and stiffness, Euler or FIRE with any
//    inertia column;
//  - `when` on any of these.
// Everything else gets a refusal that says what does not run.

// Limits the module asks a device for, and plans against
const LIMIT_NAMES = [
  'maxStorageBuffersPerShaderStage', 'maxStorageBufferBindingSize', 'maxBufferSize',
  'maxComputeInvocationsPerWorkgroup', 'maxComputeWorkgroupSizeX', 'maxComputeWorkgroupStorageSize',
  'maxComputeWorkgroupsPerDimension', 'maxUniformBufferBindingSize', 'minUniformBufferOffsetAlignment',
  'maxDynamicUniformBuffersPerPipelineLayout',
];

// What plan() says once the backend's device is gone (a lost device never comes back)
const DEVICE_LOST = 'the WebGPU device was lost; create a new backend';

// Kernels run 256 threads per workgroup, one body per thread
const THREADS = 256;
const PHYSICS_SETTINGS$1 = ['timeStep', 'springLength', 'springCoefficient', 'dragCoefficient', 'gravity', 'maxVelocity'];
const FLOATS = { f64: true, f32: true };

/**
 * The backend object for `limits`: {name, limits, check, checkProgram, lower}. `options.lost()`
 * tells when the device of the backend is lost: nothing runs on it then.
 */
function createCapabilities(limits, options = {}) {
  // plan() asks checkProgram() and then check() for every stage of the same program object; a
  // lowering made while the grid's check of the device was pending is made again once it is done
  const lowered = new WeakMap();
  const lowerFor = (program, simulator) => {
    let entry = lowered.get(program);
    if (!entry || entry.gridArithmetic !== limits.gridArithmetic) {
      entry = { lowering: lower(program, simulator, limits, options), gridArithmetic: limits.gridArithmetic };
      lowered.set(program, entry);
    }
    const lowering = entry.lowering;
    if (options.lost && options.lost()) {
      return Object.assign({}, lowering, { runs: false, reasons: [DEVICE_LOST].concat(lowering.reasons), plan: null });
    }
    return lowering;
  };
  return {
    name: 'webgpu',
    limits,
    options,
    checkProgram(program, simulator) {
      const lowering = lowerFor(program, simulator);
      return { reasons: lowering.reasons, warnings: lowering.warnings };
    },
    check(stage, program, simulator) {
      return lowerFor(program, simulator).stages[stage.name];
    },
    lower: lowerFor,
  };
}

/**
 * The verdicts for `program` on a device with `limits`: {runs, reasons, warnings, stages, plan}.
 * `reasons` and `warnings` are about the step as a whole (plan() adds the stages' own);
 * `stages` maps a stage name to {runs, how} or {runs: false, reason}; `plan` is what
 * schedule() makes of it, or null when it does not run.
 */
function lower(program, simulator, limits, options = {}) {
  const reasons = [], warnings = [], stages = {};
  const warn = message => { if (warnings.indexOf(message) < 0) warnings.push(message); };
  const printer = createPrinter(warn);
  const laws = Object.create(null);
  const facts = programFacts(program);
  const data = storeFacts(program, simulator);
  program.stages.forEach(stage => {
    const verdict = checkStage(stage, program, simulator, printer, laws, facts, limits);
    stages[stage.name] = verdict.runs ? { runs: true, how: verdict.how } : { runs: false, reason: verdict.reason };
    if (verdict.warnings && verdict.warnings.length) stages[stage.name].warnings = verdict.warnings;
  });
  PHYSICS_SETTINGS$1.forEach(key => {
    const problem = f32Problem(program.settings[key]);
    if (problem) reasons.push(`the setting ${key}: ${problem}`);
  });
  if (program.listeners.step) warnings.push("'step' listeners run once per readback from the GPU, not after every step");

  const stagesRun = Object.keys(stages).every(name => stages[name].runs);
  let plan = null;
  if (stagesRun && reasons.length === 0) {
    plan = schedule(program, laws, limits, Object.assign({}, options, { warn, data }));
    if (plan.refusal) {
      reasons.push(plan.refusal);
      plan = null;
    } else {
      budgets(plan, limits, reasons, printer);
      physicsStages(program).forEach(stage => { if (plan.how[stage.name]) stages[stage.name].how = plan.how[stage.name]; });
      if (reasons.length) plan = null;
    }
  }
  return { runs: stagesRun && reasons.length === 0, reasons, warnings, stages, plan };
}

// What the stages need to know about the program as a whole
function programFacts(program) {
  const columns = Object.create(null), sums = Object.create(null), links = Object.create(null);
  program.columns.nodes.forEach(column => { columns[column.name] = column; });
  (program.columns.links || []).forEach(column => { links[column.name] = column; });
  program.sums.forEach(sum => { sums[sum.name] = sum; });
  return { columns, links, sums, D: program.dims };
}

// What a plan needs to know of the store's numbers: whether any link has its own length or
// stiffness (the stock template runs only while none has), the most links of one body, how
// many groups each column that sums are grouped by has (the largest id + 1, as on the CPU), and
// the peak of some node columns (the largest sum of their |values| over its mean: the pyramid
// plans hubs only where the charges have one)
function storeFacts(program, simulator) {
  const springs = simulator.springStore;
  let linksDefault = true;
  for (let i = 0; i < springs.n && linksDefault; i++) {
    if (springs.length[i] >= 0 || springs.coefficient[i] > 0) linksDefault = false;
  }
  // the most links one body has: hubs make gathers go through chunks of links
  const degree = new Uint32Array(simulator.store.n);
  let maxDegree = 0;
  for (let s = 0; s < springs.n; s++) {
    const a = ++degree[springs.from[s]], b = ++degree[springs.to[s]];
    if (a > maxDegree) maxDegree = a;
    if (b > maxDegree) maxDegree = b;
  }
  const groups = {};
  program.sums.forEach(sum => {
    if (!sum.group || groups[sum.group] !== undefined || sum.over !== 'nodes') return;
    const column = simulator.store[sum.group];
    let largest = -1;
    for (let i = 0; column && i < simulator.store.n; i++) {
      const g = column[i];
      if (g >= 0 && Math.floor(g) > largest) largest = Math.floor(g);
    }
    groups[sum.group] = largest + 1;
  });
  const peak = names => {
    const n = simulator.store.n, values = names.map(name => simulator.store[name]);
    if (values.some(column => !column)) return undefined;
    let total = 0, most = 0;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let c = 0; c < values.length; c++) sum += Math.abs(values[c][i]);
      total += sum;
      if (sum > most) most = sum;
    }
    return total > 0 && Number.isFinite(total) ? most * n / total : undefined;
  };
  return { linksDefault, maxDegree, groups, peak };
}

// The lowering table: what each kind of stage needs to run here
function checkStage(stage, program, simulator, printer, laws, facts, limits) {
  if (isGuard(stage)) return runs('stops layout.step() while the GPU runs the layout');
  const columnProblem = columnsProblem(stage, facts);
  switch (stage.builtIn || stage.shape) {
    case 'clear':
    case 'drag':
      return runs('part of the step');
    case 'springs':
      return stage.args.counters ? refuse('WebGPU has no adaptive time step') : runs('part of the step');
    case 'repulsion':
    case 'tree':
      return columnProblem ? refuse(columnProblem) : checkTree(stage, simulator, printer, laws);
    case 'integrate':
      return checkIntegrate(stage, facts);
    case 'node':
      return columnProblem ? refuse(columnProblem) : checkFormula(stage, facts, printer);
    case 'sum':
      if (stage.args.over !== 'nodes') return refuse('WebGPU does not run sums over links yet');
      if (stage.args.reduce !== 'sum') return refuse(`WebGPU does not run ${stage.args.reduce} over bodies yet`);
      if (stage.args.group) {
        const group = facts.columns[stage.args.group];
        if (!group || group.writer !== 'host') return refuse('WebGPU runs sums per group only with group ids set by the host');
      }
      return columnProblem ? refuse(columnProblem) : checkFormula(stage, facts, printer);
    case 'link':
      return columnProblem ? refuse(columnProblem) : checkLink(stage, facts, printer);
    case 'pair':
      return columnProblem ? refuse(columnProblem) : checkPair(stage, facts, printer);
    case 'grid':
      return columnProblem ? refuse(columnProblem) : checkGrid(stage, program.dims, program.spaces.nodes, limits, printer);
    case 'host':
      return runs(`on the host, on the steps where its \`when\` holds: the step stops there and reads back ${(stage.reads || []).map(r => r.column).join(', ') || 'nothing'}`);
    case 'js':
      return refuse('JavaScript stages run on the CPU only (formula stages and host steps run on other engines too)');
    case 'pair rules':
      return refuse('pair rules are JavaScript and run on the CPU only (pair formulas do the same on every engine)');
  }
  return refuse(`WebGPU does not know stages of shape ${stage.shape}`);
}

// Columns a stage reads or writes must hold one number or D numbers per body, and a formula
// writes 32-bit floats: an integer column it writes would keep fractions it drops on the CPU
function columnsProblem(stage, facts) {
  for (const entry of stage.reads.concat(stage.writes)) {
    if (entry.space !== 'nodes') continue;
    const column = facts.columns[entry.column];
    if (!column || column.hidden) continue;
    if (column.width !== 1 && column.width !== 'D') return `WebGPU reads columns of 1 or D numbers per body; ${entry.column} has ${column.width}`;
  }
  for (const entry of stage.writes) {
    const column = entry.space === 'nodes' && facts.columns[entry.column];
    if (column && !FLOATS[column.type]) return `WebGPU does not run formulas that write the ${column.type} column ${entry.column} yet`;
  }
  return null;
}

function checkTree(stage, simulator, printer, laws) {
  const described = stage.args.channels[0].law;
  if (described.functions.length) return refuse('laws with JavaScript functions run on the CPU only');
  const badTable = tableProblem(described.tables);
  if (badTable) return refuse("the law's " + badTable);
  if (described.isDefault) {
    laws[stage.name] = null;
    return runs('part of the step');
  }
  // The law the CPU runs, compiled; its numbers as of this step
  const { law, lawValues } = simulator.stageValues(stage.name);
  try {
    emitLaw(law, 2, 'r', 'k1', 'k2', printer);
  } catch (e) {
    return refuse('the law: ' + e.message);
  }
  const values = lawValues || law.values;
  const problem = lawValueProblem(law, values);
  if (problem) return refuse(`the law's ${problem.name} is ${problem.problem}`);
  laws[stage.name] = law;
  return Object.assign(runs('part of the step'), { warnings: lawValueWarnings(law, values) });
}

function checkIntegrate(stage, facts) {
  const args = stage.args;
  if (args.integrator !== 'euler' && args.integrator !== 'fire') return refuse(`WebGPU does not know the integrator ${args.integrator}`);
  if (args.adaptiveTimeStepWeight) return refuse('WebGPU has no adaptive time step');
  const inertia = facts.columns[args.inertia];
  if (inertia && inertia.width !== 1) return refuse(`the inertia column ${args.inertia} should hold one number per body`);
  return runs('part of the step');
}

// A node formula or a sum: what it reads must run here, and its WGSL must print
function checkFormula(stage, facts, printer) {
  const badTable = tableProblem(stage.tables);
  if (badTable) return refuse(badTable);
  try {
    printFormula(stage, facts, printer);
  } catch (e) {
    return refuse(e.message);
  }
  return runs('part of the step');
}

// A link formula: one that moves bodies (pull, or adds into body columns) is evaluated at both
// ends of every link, one that only writes link columns by a thread per link; one kernel cannot
// do both yet
function checkLink(stage, facts, printer) {
  if (stage.args.counters) return refuse('WebGPU has no adaptive time step');
  const badTable = tableProblem(stage.tables);
  if (badTable) return refuse(badTable);
  const moves = stage.writes.some(write => write.via === 'pull' || (write.space === 'nodes' && write.end));
  const linkWrites = stage.writes.filter(write => write.space === 'links');
  if (moves && linkWrites.length) return refuse('WebGPU does not run link formulas that both move bodies and write link columns yet');
  for (const write of linkWrites) {
    const column = facts.links[write.column];
    if (column && !FLOATS[column.type]) return refuse(`WebGPU does not run formulas that write the ${column.type} link column ${write.column} yet`);
  }
  try {
    printFormula(stage, facts, printer, true);
  } catch (e) {
    return refuse(e.message);
  }
  return runs('part of the step');
}

// A pair formula: its WGSL must print (the pair track's printer; tables are not taken yet)
function checkPair(stage, facts, printer) {
  if (typeof stage.args.radius === 'object' && stage.args.radius.kind === 'number') {
    const problem = f32Problem(stage.args.radius.value);
    if (problem) return refuse('the radius: ' + problem);
  }
  try {
    printPairFormula(stage, {
      D: facts.D, printer, columns: facts.columns,
      read: (column, who, k) => `${who}_${column}_${k}`,
      param: name => 'p_' + name, builtIn: name => 'b_' + name,
      sumWidth: name => (facts.sums[name] && !facts.sums[name].group ? (facts.sums[name].width === 'D' ? facts.D : facts.sums[name].width) : 0),
      sum: (name, k) => `g_${name}_${k}`,
    });
  } catch (e) {
    return refuse(e.message);
  }
  return runs('part of the step');
}

// Prints a formula with a scope that knows every name the stage can read, to find literals and
// builtins the GPU cannot take. A link formula (`link`) knows r, pull, the link's values and
// columns, and body columns at either end (name_i, name_j).
function printFormula(stage, facts, printer, link) {
  const value = (codes, write) => (codes.length === 1 ? { type: 'num', code: codes[0], write } : { type: 'vec', codes, write });
  const columnValue = (name, key) => {
    const column = facts.columns[name];
    if (!column || column.hidden) return undefined;
    const width = column.width === 'D' ? facts.D : column.width;
    const codes = Array.from({ length: width }, (_, k) => `c_${key}_${k}`);
    return value(codes, (op, v) => codes.map((code, k) => `${code} ${op} ${(v.codes || [v.code])[k]};`));
  };
  const write = code => (op, v) => [`${code} ${op} ${v.code};`];
  const scope = {
    D: facts.D,
    name(key) {
      if (link) {
        if (key === 'r' || key === 'length' || key === 'coefficient' || key === 'pull' || facts.links[key]) return { type: 'num', code: 'l_' + key, write: write('l_' + key) };
        const end = /^(.+)_([ij])$/.exec(key);
        if (end) return columnValue(end[1], key);
      } else {
        const column = columnValue(key, key);
        if (column) return column;
      }
      if (stage.params.some(p => p.name === key)) return { type: 'num', code: 'p_' + key };
      if (stage.tables.some(t => t.name === key)) return { call: args => `t_${key}(${args[0]})` };
      const sum = facts.sums[key];
      if (sum) {
        const width = sum.width === 'D' ? facts.D : sum.width;
        const codes = Array.from({ length: width }, (_, k) => `g_${key}_${k}`);
        return sum.group ? { index: () => value(codes) } : value(codes);
      }
      if (stage.builtIns.indexOf(key) >= 0) return { type: 'num', code: 'b_' + key };
      return undefined;
    },
  };
  return formula.compile(stage.formula, scope, printer);
}

// Storage bindings per kernel, workgroup memory, uniform slots, buffer sizes and dispatch sizes
// against the device's limits
function budgets(plan, limits, reasons, printer) {
  const kernels = plan.kernels(printer);
  Object.keys(kernels).forEach(name => {
    const bindings = (kernels[name].match(/var<storage\b/g) || []).length;
    if (bindings > limits.maxStorageBuffersPerShaderStage) {
      reasons.push(`kernel ${name} needs ${bindings} storage buffers; this device allows ${limits.maxStorageBuffersPerShaderStage}`);
    }
  });
  if (plan.template === 'generic') {
    const tile = Math.ceil(plan.tileFloats / 4) * 16 * THREADS + (plan.sumWidth ? 16 * THREADS : 0);
    if (tile > limits.maxComputeWorkgroupStorageSize) {
      reasons.push(`the repulsion tiles need ${tile} bytes of workgroup memory (${plan.tileFloats} numbers per body); this device allows ${limits.maxComputeWorkgroupStorageSize}`);
    }
    if (plan.slot.bytes > limits.maxUniformBufferBindingSize) reasons.push(`a step needs ${plan.slot.bytes} bytes of numbers; this device allows ${limits.maxUniformBufferBindingSize} per uniform`);
  }
  const largest = Math.min(limits.maxStorageBufferBindingSize, limits.maxBufferSize);
  Object.keys(plan.buffers).forEach(name => {
    const size = plan.buffers[name];
    if (size > largest) reasons.push(`the buffer ${name} needs ${megabytes(size)}; this device allows ${megabytes(largest)} per buffer`);
  });
  const most = limits.maxComputeWorkgroupsPerDimension * THREADS;
  if (plan.nodes > most) reasons.push(`WebGPU runs up to ${most.toLocaleString('en-US')} bodies (one thread each); this layout has ${plan.nodes.toLocaleString('en-US')}`);
  // GROUP_SUM: a thread per group
  Object.values(plan.sums || {}).forEach(sum => {
    if (sum.grouped && sum.count > most) reasons.push(`${sum.name}: WebGPU sums up to ${most.toLocaleString('en-US')} groups (one thread each); the largest group id is ${(sum.count - 1).toLocaleString('en-US')}`);
  });
}

// Why lookup tables do not fit 32-bit floats, or null (values beyond f32; tiny ones may become 0,
// which a table can afford)
function tableProblem(tables) {
  for (const table of tables || []) {
    for (const value of [table.from, table.to].concat(Array.from(table.values))) {
      if (!Number.isFinite(value) || Math.abs(value) > F32_MAX) return `table ${table.name}: ${f32Problem(value)}`;
    }
  }
  return null;
}

function megabytes(bytes) {
  return (bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0) + ' MiB';
}

function runs(how) {
  return { runs: true, how };
}

function refuse(reason) {
  return { runs: false, reason };
}

// Does this device keep the grid's exact arithmetic? The grid field's numbers stay within 1e-6 of
// the CPU's because of two barriers that the compiler must not see through (wgsl.js):
//  - grid_opq (XOR with a uniform zero): two-sums, and grid coordinates exact however far from
//    the origin. Without it, grids 1,024 cells wide were off by 1e-4.
//  - grid_hold (XOR with a zero from a buffer): the refinement's residual. Without it, refinement
//    made the field far worse, up to 0.5 relative error in 3D.
// Metal keeps both today; another compiler (Dawn on Vulkan or D3D, a later Metal, a driver that
// specializes on values) might not, and the field would be wrong without a word. So once per
// device, on known numbers, the kernels below must give the exact answers:
//
//   const exact = await gridArithmetic(device);   // {sums, residual, reason}
//
// planGrid() refuses what needs the arithmetic a device does not keep (see plan.js). The backend
// starts the check when it is made and does not wait for it (GRID_CHECK_PENDING until it is done);
// runOnGpu waits for it when the layout has a grid stage.

const checked = new WeakMap();

// What plan() sees before a device's check is done: grid stages run, with a warning
const GRID_CHECK_PENDING = Object.freeze({ pending: true, sums: true, residual: true, reason: null });

/**
 * {sums, residual, reason, numbers, ms} for `device`, checked once (later calls get the same
 * promise). `sums`: two-sums and grid coordinates are exact; `residual`: the refinement's residual
 * is. `reason` says what failed, in plain words; `numbers` are the errors measured; `ms` the time
 * to compile the kernels and to run them (one submit, one wait).
 * `opaque: false` checks kernels without their barriers (tests: both must then fail); it is not
 * cached.
 */
function gridArithmetic(device, { opaque = true } = {}) {
  if (!opaque) return run(device, opaque);
  if (!checked.has(device)) checked.set(device, run(device, opaque));
  return checked.get(device);
}

async function run(device, opaque) {
  const owned = [];
  const started = performance.now();
  try {
    const kernels = gridCanaryKernels({ opaque });
    const pipes = {};
    await Promise.all(Object.entries(kernels).map(async ([name, kernel]) => {
      pipes[name] = await getPipeline(device, { code: kernel.code, label: name, bindings: kernel.bindings.map(b => b.kind) });
    }));
    const buffer = (data, usage) => {
      const b = device.createBuffer({ size: Math.max(16, Math.ceil(data.byteLength / 16) * 16), usage: usage | GPUBufferUsage.COPY_DST });
      owned.push(b);
      device.queue.writeBuffer(b, 0, data);
      return b;
    };
    const compiled = performance.now();
    // the three checks in one submit, read back together
    const checks = [sumsCheck(buffer), residualCheck(2, buffer), residualCheck(3, buffer)];
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    for (const check of checks) {
      pass.setPipeline(pipes[check.name]);
      pass.setBindGroup(0, device.createBindGroup({ layout: pipes[check.name].getBindGroupLayout(0), entries: check.entries.map((b, binding) => ({ binding, resource: { buffer: b } })) }));
      pass.dispatchWorkgroups(1);
    }
    pass.end();
    const reads = checks.map(check => {
      const dst = device.createBuffer({ size: check.out.size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
      owned.push(dst);
      enc.copyBufferToBuffer(check.out, 0, dst, 0, check.out.size);
      return dst;
    });
    device.queue.submit([enc.finish()]);
    await Promise.all(reads.map(dst => dst.mapAsync(GPUMapMode.READ)));
    const [sums, ...residuals] = checks.map((check, c) => check.judge(new Float32Array(reads[c].getMappedRange())));
    const ms = { compile: +(compiled - started).toFixed(1), run: +(performance.now() - compiled).toFixed(1) };
    const residual = residuals.every(r => r.ok);
    const reasons = [];
    if (!sums.ok) reasons.push('its two-sums or grid coordinates are not exact');
    if (!residual) reasons.push('the smoothing\'s residual is not exact');
    return {
      sums: sums.ok, residual,
      reason: reasons.length ? `this GPU's compiler sees through the grid's exact arithmetic: ${reasons.join(', and ')}` : null,
      numbers: { sumError: sums.sumError, quotientError: sums.quotientError, offsetError: sums.offsetError, residualError: residuals.map(r => r.error) },
      ms,
    };
  } catch (e) {
    return { sums: false, residual: false, reason: 'the check of the grid\'s exact arithmetic could not run on this GPU: ' + e.message, numbers: null };
  } finally {
    owned.forEach(b => b.destroy());
  }
}

const f32 = Math.fround;
const bits = x => new Uint32Array(new Float32Array([x]).buffer)[0];

// Two-sums, a quotient in hi + lo, and the offsets of bodies 18,000 cells from the origin, against
// f64: {name, entries (buffers by binding), out (the buffer to read), judge(words)}
function sumsCheck(buffer) {
  // a + b with b below half an ulp of a: the sum is a, its error term b exactly (0 when folded)
  const C = new Float32Array(16 + 4 * 16);
  C[0] = 1; C[1] = f32(1.5 * Math.pow(2, -26));
  const x = 1000.3, k = 1024;
  C[4] = f32(x); C[5] = f32(x - C[4]); C[6] = k;
  // a 2D box: the cell 0.7 as hi + lo, its corner far from the origin as MA cell + RA
  const hi = f32(0.7), lo = f32(0.7 - hi), cell = hi + lo;
  const corner = [12345.678, -9876.54];
  const meta = new Uint32Array(META.TABLE);
  meta[META.CELL] = bits(hi); meta[META.CELL_LOW] = bits(lo);
  const MA = [], RA = [];
  for (let a = 0; a < 2; a++) {
    MA.push(Math.floor(corner[a] / cell));
    RA.push(f32(corner[a] - MA[a] * cell));
    meta[META.MA + a] = bits(MA[a]); meta[META.RA + a] = bits(RA[a]);
    meta[META.SIZE + a] = 4096;
  }
  // bodies at whole cells plus a fraction from the corner, up to 2,047 cells out
  const whole = [0, 3, 40, 500, 1000, 2047, 7, 1500, 250, 64, 1999, 12, 777, 1234, 333, 1800];
  const parts = [0.25, 0.5, 0.71, 0.13, 0.9, 0.37, 0.61, 0.07, 0.83, 0.44, 0.19, 0.66, 0.31, 0.58, 0.12, 0.95];
  const n = whole.length;
  const X = new Float32Array(2 * n);
  for (let i = 0; i < n; i++) {
    X[2 * i] = f32(corner[0] + (whole[i] + parts[i]) * cell);
    X[2 * i + 1] = f32(corner[1] + (whole[n - 1 - i] + parts[(i + 5) % n]) * cell);
  }
  const U = new Uint32Array([n, 0, 0, 0, 0, 0, 0, 0]);
  const out = buffer(C, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
  const judge = got => {
    const sumError = Math.abs(got[3] - C[1]) / C[1] + (got[2] === C[0] ? 0 : 1);
    const quotient = (C[4] + C[5]) / k;
    const quotientError = Math.abs(got[7] + got[8] - quotient) / quotient;
    // each body's grid coordinate in f64, from the same corner and cell
    let offsetError = 0;
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < 2; a++) {
        const g = (X[2 * i + a] - (MA[a] * cell + RA[a])) / cell;
        const b = Math.floor(g);
        const at = 16 + 4 * i + 2 * a;
        offsetError = Math.max(offsetError, got[at] === b ? Math.abs(got[at + 1] - (g - b)) : 1);
      }
    }
    // measured on Metal with the barriers: 0, 0 and 6.8e-8; without them the error term is 0 (sumError
    // 1), the quotient off by 1.2e-8, the offsets still 6.8e-8
    return { ok: sumError === 0 && quotientError < 1e-12 && offsetError < 1e-5, sumError, quotientError, offsetError };
  };
  return { name: 'SUMS', entries: [buffer(U, GPUBufferUsage.UNIFORM), buffer(meta, GPUBufferUsage.STORAGE), buffer(X, GPUBufferUsage.STORAGE), out], out, judge };
}

// The residual R = u - (A_x A_y [A_z]) X at gamma 64, on a smooth field with f32's rounding in
// it, against f64, at the points whose neighbours are all inside the grid (at the faces the terms
// are large, and so is their rounding). R is about 1e-5 of the field. Measured on Metal: exact
// with the barriers; without them off by 163 times its size in 2D and 38,000 in 3D
// (grid-work/canary-tune.json).
function residualCheck(D, buffer) {
  const sizes = D === 2 ? [8, 8, 1] : [5, 5, 5];
  const total = sizes[0] * sizes[1] * sizes[2];
  const gamma = 64;
  const at = (j0, j1, j2) => j0 + sizes[0] * (j1 + sizes[1] * j2);
  const X = new Float32Array(total);
  for (let j2 = 0; j2 < sizes[2]; j2++) for (let j1 = 0; j1 < sizes[1]; j1++) for (let j0 = 0; j0 < sizes[0]; j0++) {
    X[at(j0, j1, j2)] = f32(1 + 1e-3 * Math.sin(0.05 * (j0 + 1.3 * j1 + 0.7 * j2)));
  }
  // A X in f64, one axis at a time: (1 + gamma L) with L f = (f - left) + (f - right), 0 outside
  let Y = Float64Array.from(X);
  for (let k = 0; k < D; k++) {
    const next = new Float64Array(total);
    for (let j2 = 0; j2 < sizes[2]; j2++) for (let j1 = 0; j1 < sizes[1]; j1++) for (let j0 = 0; j0 < sizes[0]; j0++) {
      const j = [j0, j1, j2];
      const side = d => { const o = j.slice(); o[k] += d; return o[k] < 0 || o[k] >= sizes[k] ? 0 : Y[at(o[0], o[1], o[2])]; };
      const y = Y[at(j0, j1, j2)];
      next[at(j0, j1, j2)] = y + gamma * ((y - side(-1)) + (y - side(1)));
    }
    Y = next;
  }
  const u = new Float32Array(total);
  for (let j = 0; j < total; j++) u[j] = f32(Y[j] + 1e-5 * (1 + 0.5 * Math.sin(j)));
  const meta = new Uint32Array(META.TABLE);
  for (let k = 0; k < D; k++) meta[META.SIZE + k] = sizes[k];
  meta[META.TOTAL] = total;
  meta[META.TAB_GAMMA] = bits(gamma);
  const out = buffer(u, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
  const judge = R => {
    let worst = 0, size = 0;
    for (let j2 = 0; j2 < sizes[2]; j2++) for (let j1 = 0; j1 < sizes[1]; j1++) for (let j0 = 0; j0 < sizes[0]; j0++) {
      const inside = [j0, j1, j2].every((v, k) => k >= D || (v > 0 && v < sizes[k] - 1));
      if (!inside) continue;
      const j = at(j0, j1, j2);
      const exact = u[j] - Y[j];
      size = Math.max(size, Math.abs(exact));
      worst = Math.max(worst, Math.abs(R[j] - exact));
    }
    const error = worst / size;
    return { ok: error < 0.1, error };
  };
  return { name: `RESIDUAL${D}`, entries: [buffer(meta, GPUBufferUsage.STORAGE), buffer(X, GPUBufferUsage.STORAGE), out], out, judge };
}

// Rows the host wrote between syncs go up to the device row by row: the device is ahead of the
// store then, so writing a whole column would put every other body back by the steps in flight.
// A few rows take one writeBuffer() each; many take one dispatch that scatters them.

// Up to this many rows go up one writeBuffer() each
const FEW_ROWS = 64;

// rows: [count, base, width, 0, row...]; row r's numbers are values[r * width + k]
const SCATTER = `@group(0) @binding(0) var<storage, read> rows: array<u32>;
@group(0) @binding(1) var<storage, read> values: array<f32>;
@group(0) @binding(2) var<storage, read_write> into: array<f32>;
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let r = gid.x;
  if (r >= rows[0]) { return; }
  let width = rows[2];
  let at = rows[1] + rows[4u + r] * width;
  for (var k = 0u; k < width; k++) { into[at + k] = values[r * width + k]; }
}`;

/**
 * Resolves to write(target, base, width, rows, values): row `rows[r]` of `target` (`width`
 * floats per row from float `base`) gets values[r * width ... r * width + width - 1].
 */
async function createRowWriter(device) {
  const pipeline = await getPipeline(device, { code: SCATTER, label: 'SCATTER' });
  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
  return function write(target, base, width, rows, values) {
    if (!rows.length) return;
    if (rows.length <= FEW_ROWS) {
      for (let r = 0; r < rows.length; r++) {
        device.queue.writeBuffer(target, (base + rows[r] * width) * 4, values, r * width, width);
      }
      return;
    }
    const head = new Uint32Array(4 + rows.length);
    head[0] = rows.length; head[1] = base; head[2] = width;
    head.set(rows, 4);
    const rowBuffer = device.createBuffer({ size: head.byteLength, usage, label: 'scatter rows' });
    const valueBuffer = device.createBuffer({ size: rows.length * width * 4, usage, label: 'scatter values' });
    device.queue.writeBuffer(rowBuffer, 0, head);
    device.queue.writeBuffer(valueBuffer, 0, values, 0, rows.length * width);
    const group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [rowBuffer, valueBuffer, target].map((buffer, binding) => ({ binding, resource: { buffer } })),
    });
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(Math.ceil(rows.length / 256));
    pass.end();
    device.queue.submit([enc.finish()]);
    // freed once the submitted work is done
    rowBuffer.destroy();
    valueBuffer.destroy();
  };
}

/**
 * Positions the host wrote, found against `mirror`: what the module last put on the device or
 * into the store, as f32 relative to `origin`, in the store's order. A row that went up is held
 * until a readback whose steps include the upload: readbacks encoded before it would put the old
 * position back (a dragged node would jump back for a frame).
 */
function trackHostPositions(store, n, D, origin, mirror) {
  const held = new Map(); // row -> {steps, values}: the steps queued when it went up, its numbers
  return {
    mirror,

    // Rows whose positions in the store differ from the mirror
    written() {
      const pos = store.pos, rows = [];
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < D; k++) {
          if (Math.fround(pos[i * D + k] - origin[k]) !== mirror[i * D + k]) { rows.push(i); break; }
        }
      }
      return rows;
    },

    // `rows` go up from the store after `steps` queued steps; returns their numbers (f32, relative)
    uploaded(rows, steps) {
      const values = new Float32Array(rows.length * D), pos = store.pos;
      rows.forEach((i, r) => {
        for (let k = 0; k < D; k++) values[r * D + k] = mirror[i * D + k] = pos[i * D + k] - origin[k];
        held.set(i, { steps, values: values.subarray(r * D, r * D + D) });
      });
      return values;
    },

    // The whole store went up (the host owned it): nothing older comes back
    reset(relative) {
      held.clear();
      mirror.set(relative);
    },

    /**
     * A readback of positions after `through` steps goes into the store through `write()` (which
     * also sets the mirror). Rows the host wrote since the last upload (`hostWrote`: the column's
     * version moved) and rows held for later readbacks keep the store's numbers.
     */
    readBack(through, hostWrote, write) {
      const keep = hostWrote ? this.written() : [];
      held.forEach((entry, i) => { if (entry.steps >= through) keep.push(i); else held.delete(i); });
      if (!keep.length) return write();
      const pos = store.pos;
      const saved = keep.map(i => pos.slice(i * D, i * D + D));
      const move = write();
      keep.forEach((i, j) => pos.set(saved[j], i * D));
      held.forEach((entry, i) => mirror.set(entry.values, i * D));
      return move;
    },
  };
}

// The stock grid template as an engine the runner drives (see runner.js): the exact stock step
// in 2D above the small-graph size. It keeps today's kernels byte for byte (grid.js); this file
// moves data between them and the store: settings into the uniforms, the law's numbers (per step
// when they can change within a call), uploads by column version, and readbacks in the store's
// order (a small kernel undoes the Hilbert order on the GPU).

// Calls with at least this many steps undo the Hilbert order on the GPU for their readback (its
// cost is spread over the steps); shorter ones read the template's order and undo it on the CPU,
// so a step at a time costs the GPU nothing more
const ORDER_ON_GPU$1 = 16;
// Settings the template reads from its uniforms
const SETTINGS$1 = ['gravity', 'springLength', 'springCoefficient', 'dragCoefficient', 'timeStep', 'maxVelocity', 'integrator'];
// The stock step's repulsion stage, whose law the template compiles
const REPULSION = 'repulsion';

// Positions back in the store's order: out[row] = pos[toInternal[row]]
const UNPERMUTE$1 = `@group(0) @binding(0) var<uniform> count: vec4u;
@group(0) @binding(1) var<storage, read> pos: array<vec2f>;
@group(0) @binding(2) var<storage, read> toInternal: array<u32>;
@group(0) @binding(3) var<storage, read_write> out: array<vec2f>;
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let row = gid.x;
  if (row >= count.x) { return; }
  out[row] = pos[toInternal[row]];
}`;

/**
 * The engine of a stock plan (schedule.js), built from the store of `simulator`.
 */
async function createStockEngine(device, { simulator, plan, fireState, warn }) {
  const store = simulator.store;
  const law = plan.law;
  const lawCount = law ? lawValueCount(law) : 0;
  let lawValues = law ? new Float32Array(lawCount) : null;
  const data = readLayout(simulator, true);
  const n = data.n;
  const [engine, unpermute, writeRows] = await Promise.all([
    createGridEngine(device, { n, edges: data.edges, init: data.init, mass: data.mass, law, variants: plan.perStep }),
    data.permuted ? getPipeline(device, { code: UNPERMUTE$1, label: 'UNPERMUTE' }) : null,
    createRowWriter(device),
  ]);
  device.queue.writeBuffer(engine.vel, 0, data.velocity);
  if (fireState) engine.setFire(fireState);

  // the store's order on the GPU, for readbacks
  let ordered = null, unpermuteGroup = null;
  const extra = [];
  if (unpermute) {
    const countBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const indexBuffer = device.createBuffer({ size: n * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    ordered = device.createBuffer({ size: n * 8, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    device.queue.writeBuffer(countBuffer, 0, new Uint32Array([n, 0, 0, 0]));
    device.queue.writeBuffer(indexBuffer, 0, data.toInternal);
    unpermuteGroup = device.createBindGroup({
      layout: unpermute.getBindGroupLayout(0),
      entries: [countBuffer, engine.pos, indexBuffer, ordered].map((buffer, binding) => ({ binding, resource: { buffer } })),
    });
    extra.push(countBuffer, indexBuffer, ordered);
  }

  let written = {};
  writeSettings();
  // What the module last put on the device or into the store, to find rows the host wrote
  const host = trackHostPositions(store, n, 2, data.origin, relativePositions(store.pos, n, 2, data.origin));
  let deviceVelocities = Float64Array.from(store.velocity.subarray(0, 2 * n));
  let devicePinned = Uint8Array.from(store.pinned.subarray(0, n), value => (value ? 1 : 0));
  let uploaded = versions();

  return {
    kind: 'grid',
    n,
    D: 2,
    get fence() { return [engine.pos]; },
    positionBytes: n * 8,
    kernelStages: KERNEL_STAGES,

    // `steps`: the steps queued so far, which the uploads follow
    prepare(hostOwns, steps) {
      writeSettings();
      const now = versions();
      if (hostOwns) {
        // the store is the truth: what sync() read and what the host wrote since
        const positions = relativePositions(store.pos, n, 2, data.origin);
        host.reset(positions);
        device.queue.writeBuffer(engine.pos, 0, permuted(positions, 2));
        device.queue.writeBuffer(engine.vel, 0, writeVelocities(store, data.toInternal, new Float32Array(4 * n)));
        deviceVelocities = Float64Array.from(store.velocity.subarray(0, 2 * n));
        devicePinned = Uint8Array.from(store.pinned.subarray(0, n), value => (value ? 1 : 0));
      } else {
        // between syncs the device is ahead of the store: only rows the host wrote go up
        if (now.pos !== uploaded.pos) {
          const rows = host.written();
          const values = host.uploaded(rows, steps);
          writeRows(engine.pos, 0, 2, rows.map(i => data.toInternal[i]), values);
        }
        if (now.velocity !== uploaded.velocity || now.pinned !== uploaded.pinned) uploadVelocityRows(velocityRows());
      }
      if (now.mass !== uploaded.mass) device.queue.writeBuffer(engine.mass, 0, writeMasses(store, data.toInternal, new Float32Array(n)));
      uploaded = now;
      return 'ok';
    },

    run(count, firstStep, options) {
      let lawSteps = null, halt;
      if (law) {
        const values = plan.perStep ? stepValues(count, firstStep) : staticValues(firstStep);
        halt = values.halt;
        count = Math.min(count, values.count);
        if (count === 0) return { ran: 0, halt };
        if (values.perStep) lawSteps = (s, out, offset) => out.set(values.numbers.subarray(s * lawCount, (s + 1) * lawCount), offset);
      }
      engine.run(count, Object.assign({}, options, { lawSteps }));
      return { ran: count, halt };
    },

    // Encodes the copy of positions after every step so far into `dst`; true when they are in the
    // store's order (else in the template's)
    copyPositions(enc, dst, offset, count = ORDER_ON_GPU$1) {
      if (unpermute && count >= ORDER_ON_GPU$1) {
        const pass = enc.beginComputePass();
        pass.setPipeline(unpermute);
        pass.setBindGroup(0, unpermuteGroup);
        pass.dispatchWorkgroups(Math.ceil(n / 256));
        pass.end();
        enc.copyBufferToBuffer(ordered, 0, dst, offset, n * 8);
        return true;
      }
      enc.copyBufferToBuffer(engine.pos, 0, dst, offset, n * 8);
      return !data.permuted;
    },

    /**
     * Positions after `through` steps (`steps` of them since the last readback) into the store;
     * rows the host wrote keep its numbers (see rows.js). Returns the movement per step, or null
     * when graph edits moved the rows since.
     */
    readPositions(positions, steps, inStoreOrder, through) {
      if (rowsMoved(simulator, data.bodies)) {
        return inStoreOrder
          ? writePositionsBack(simulator, data.bodies, positions, 2, data.origin, steps)
          : writePermutedBack(simulator, data.bodies, positions, data.toInternal, data.origin, steps);
      }
      return host.readBack(through, store.versions.pos !== uploaded.pos, () => {
        if (!inStoreOrder) return writePermutedBack(simulator, data.bodies, positions, data.toInternal, data.origin, steps, host.mirror);
        const move = writePositionsBack(simulator, data.bodies, positions, 2, data.origin, steps);
        host.mirror.set(positions.subarray(0, 2 * n));
        return move;
      });
    },

    async readDevice() {
      const read = device.createBuffer({ size: n * 24 + 16, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
      const enc = device.createCommandEncoder();
      this.copyPositions(enc, read, 0, ORDER_ON_GPU$1);
      enc.copyBufferToBuffer(engine.vel, 0, read, n * 8, n * 16);
      enc.copyBufferToBuffer(engine.fire, 0, read, n * 24, 16);
      device.queue.submit([enc.finish()]);
      try {
        await read.mapAsync(GPUMapMode.READ);
      } catch (e) {
        read.destroy();
        return null;
      }
      const positions = new Float32Array(read.getMappedRange(0, n * 8)).slice();
      const velocities = new Float32Array(read.getMappedRange(n * 8, n * 16)).slice();
      const fire = Array.from(new Float32Array(read.getMappedRange(n * 24, 16)));
      read.unmap();
      read.destroy();
      return {
        positions,
        fireState: fire,
        apply() {
          if (rowsMoved(simulator, data.bodies)) return;
          const keep = store.versions.velocity !== uploaded.velocity ? velocityRows() : [];
          const saved = keep.map(i => [store.velocity[2 * i], store.velocity[2 * i + 1]]);
          for (let i = 0; i < n; i++) {
            const k = 4 * data.toInternal[i];
            store.velocity[2 * i] = velocities[k]; store.velocity[2 * i + 1] = velocities[k + 1];
          }
          keep.forEach((i, j) => { store.velocity[2 * i] = saved[j][0]; store.velocity[2 * i + 1] = saved[j][1]; });
          deviceVelocities = Float64Array.from(store.velocity.subarray(0, 2 * n));
        },
      };
    },

    destroy() {
      engine.destroy();
      extra.forEach(b => b.destroy());
    },
  };

  function writeSettings() {
    const settings = simulator.settings;
    if (SETTINGS$1.every(key => written[key] === settings[key])) return;
    const first = written.integrator === undefined, wasFire = written.integrator === 'fire';
    written = {};
    SETTINGS$1.forEach(key => { written[key] = settings[key]; });
    // as the CPU's integrator: a speed limit that is not positive is 1
    engine.setParams(Object.assign({}, settings, { maxVelocity: settings.maxVelocity > 0 ? settings.maxVelocity : 1 }));
    if (!first && !wasFire && settings.integrator === 'fire') engine.resetFire();
  }

  // The law's numbers when they cannot change within a call: once per call, written when they
  // changed
  function staticValues(at) {
    const numbers = lawValuesAt(at);
    const problem = checkValues(numbers, at);
    if (problem) return { count: 0, halt: problem };
    const fresh = new Float32Array(lawCount);
    writeLawValues(law, fresh, 0, numbers);
    if (!sameValues(fresh, lawValues)) {
      lawValues = fresh;
      engine.setLawValues(lawValues);
    }
    return { count: Infinity };
  }

  // The law's numbers for each of the next `count` steps. When every step has the numbers in the
  // uniforms, the steps run the usual pipelines; otherwise the law-variant ones, each step with
  // its own copy. Fewer steps run when a step's numbers do not fit f32.
  function stepValues(count, firstStep) {
    const numbers = new Float32Array(count * lawCount);
    let same = true;
    for (let s = 0; s < count; s++) {
      const at = firstStep + s;
      const values = lawValuesAt(at);
      const problem = checkValues(values, at);
      if (problem) return { count: s, numbers, perStep: true, halt: problem };
      writeLawValues(law, numbers, s * lawCount, values);
      if (same && !sameValues(numbers.subarray(s * lawCount, (s + 1) * lawCount), lawValues)) same = false;
    }
    if (same) return { count, perStep: false };
    // the uniforms get the last step's numbers, so a call that follows with the same numbers
    // runs the usual pipelines
    lawValues = numbers.slice((count - 1) * lawCount, count * lawCount);
    engine.setLawValues(lawValues);
    return { count, numbers, perStep: true };
  }

  function lawValuesAt(at) {
    const out = simulator.stageValues(REPULSION, simulator.stepContext(at));
    return out.lawValues || Object.assign({}, out.law.values);
  }

  function checkValues(values, at) {
    const problem = lawValueProblem(law, values);
    if (problem) return { message: `the law's ${problem.name} is ${problem.problem} at step ${at}`, stages: [REPULSION] };
    lawValueWarnings(law, values).forEach(warn);
    return null;
  }

  function versions() {
    return { pos: store.versions.pos, velocity: store.versions.velocity, mass: store.versions.mass, pinned: store.versions.pinned };
  }

  // Store-order numbers in the template's order
  function permuted(values, width) {
    if (!data.permuted) return values;
    const out = new Float32Array(values.length);
    for (let i = 0; i < n; i++) for (let k = 0; k < width; k++) out[data.toInternal[i] * width + k] = values[i * width + k];
    return out;
  }

  function velocityRows() {
    const v = store.velocity, pinned = store.pinned, rows = [];
    for (let i = 0; i < n; i++) {
      if (v[2 * i] !== deviceVelocities[2 * i] || v[2 * i + 1] !== deviceVelocities[2 * i + 1] || (pinned[i] ? 1 : 0) !== devicePinned[i]) rows.push(i);
    }
    return rows;
  }

  // Velocities with the pinned flag, which the template keeps next to them
  function uploadVelocityRows(rows) {
    const values = new Float32Array(4 * rows.length), v = store.velocity, pinned = store.pinned;
    rows.forEach((i, r) => {
      values[4 * r] = deviceVelocities[2 * i] = v[2 * i];
      values[4 * r + 1] = deviceVelocities[2 * i + 1] = v[2 * i + 1];
      values[4 * r + 3] = devicePinned[i] = pinned[i] ? 1 : 0;
    });
    writeRows(engine.vel, 0, 4, rows.map(i => data.toInternal[i]), values);
  }
}

function sameValues(a, b) {
  if (!b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
}

// The generic pyramid on a device: its buffers, pipelines and the structure dispatches of a step.
// The node kernel that adds the push is the caller's (plan.section), so this encodes everything
// up to it.
//
//   const tree = await buildPyramid(device, plan, { buffers: { S: positions, H: columns } });
//   tree.setValues({ gravity }, laws);   // laws: one compiled law per channel (or null)
//   tree.encode(pass);                   // HIST ... LOCAL, into the caller's compute pass
//   // then the caller's node kernel, with tree.buffers bound as plan.section.bindings says

const PARAM_WORDS = 20;
// Pair evaluations (weighted by the charges, see chargeWeight) a step may spend on crowded cells
// (cells past the near cap) before the step is refused: about 30 ms of an M4 Max
const WORK_CAP = 2e9;
// The crowded work an M4 Max does a millisecond at the slowest measured (gpu-critic-2's pyrcap.js:
// two blobs of 25k, 1.2e9 evaluations a step: an exp law at 17.7 ms, the stock law at 16.8, five
// charges at 31.7 ms), in weighted evaluations. The device's rate is taken from the runner's
// timings (observeTime()), never above this.
const RATE_MAX$1 = 6.5e7;
// The rate is measured on steps whose crowded work is at least this much (about 3 ms here): then
// it dominates the step, whose whole time counts as crowded work (the safe side)
const MEASURE_WORK = 2e8;
// A capped step takes about this long at the measured rate
const CAPPED_MS$1 = 30;

/**
 * Buffers, pipelines and bind groups for `plan` (planPyramid()). `buffers` are the caller's, by
 * the names its colRefs use; a pair [a, b] is a buffer that alternates between steps (positions
 * that ping-pong), a at even steps and b at odd ones (encode()'s `parity`). `step`, when the
 * caller's step values hold the law numbers:
 * {buffer, size, dynamic} (dynamic: bound at an offset per step, see encode()).
 * Resolves once the pipelines are compiled; rejects naming the kernel when one fails, or when the
 * buffers cannot be created.
 */
async function buildPyramid(device, plan, { buffers: external = {}, step = null, groupLimit = 0, workCap = WORK_CAP, slowdown = 1 } = {}) {
  if (plan.refusal) throw new Error(plan.refusal);
  const { D, sizes, kernels, columns } = plan;
  const missing = [].concat(...Object.values(columns)).filter(name => !external[name]);
  if (missing.length) throw new Error('buildPyramid: no buffer for ' + missing.join(', '));

  const jobs = Object.keys(kernels).map(name => {
    const options = { code: kernels[name], label: name };
    const stepBinding = step ? [step.dynamic ? 'dynamic' : 'uniform'] : [];
    if (name === 'TREE_LOCAL' && step) options.bindings = ['uniform', 'storage', plan.hubs ? 'storage' : 'read', 'storage', 'read'].concat(stepBinding);
    if (name === 'TREE_HEAVY' && step) options.bindings = ['uniform', 'read', 'read', 'storage', 'read'].concat(stepBinding);
    return getPipeline(device, options).then(pipeline => [name, pipeline]);
  });
  const pipes = Object.fromEntries(await Promise.all(jobs));

  const S = GPUBufferUsage.STORAGE, CD = GPUBufferUsage.COPY_DST, CS = GPUBufferUsage.COPY_SRC, U = GPUBufferUsage.UNIFORM;
  const owned = [];
  device.pushErrorScope('validation');
  device.pushErrorScope('out-of-memory');
  const buf = (size, usage = S) => {
    const b = device.createBuffer({ size, usage });
    owned.push(b);
    return b;
  };
  const sizesOf = plan.buffers;
  const treeBox = buf(sizesOf.treeBox, S | CD | CS);
  const treeCount = buf(sizesOf.treeCount, S | CD);
  const treeBlocks = buf(sizesOf.treeBlocks);
  const treeWork = buf(sizesOf.treeWork);
  const treeMeta = buf(sizesOf.treeMeta, S | CS);
  const treeSp = buf(sizesOf.treeSp, S | CS);
  const treeCells = buf(sizesOf.treeCells, S | CD | CS);
  const treeLists = buf(sizesOf.treeLists, S | CS);
  const paramBytes = (PARAM_WORDS + plan.lawWords) * 4;
  const TP = buf(Math.max(64, Math.ceil(paramBytes / 16) * 16), U | CD);
  const nbU = buf(16, U | CD);
  device.queue.writeBuffer(nbU, 0, new Uint32Array([sizes.nCells / 1024, 0, 0, 0]));

  // Box state: an empty bounding box, histogram centre at the origin; the first step's HIST and
  // BOX find the box before anything is binned
  const BL = boxLayout(D);
  const boxInit = new Uint32Array(BL.size);
  for (let k = 0; k < D; k++) boxInit[BL.BB_MIN + k] = 0xffffffff;
  device.queue.writeBuffer(treeBox, 0, boxInit);
  writeTables(device, treeCells, plan);

  const params = new ArrayBuffer(Math.max(64, Math.ceil(paramBytes / 16) * 16));
  const pu = new Uint32Array(params), pf = new Float32Array(params);
  pu[0] = sizes.n; pu[1] = sizes.G; pu[2] = sizes.levels; pu[3] = sizes.nCells;
  pu[4] = sizes.locOff; pu[5] = sizes.metaTag; pu[6] = sizes.metaRow; pu[7] = sizes.metaCount;
  pu[8] = NEAR_CAP; pu[9] = Math.max(1, Math.floor(sizes.n / 1000)); pf[10] = -1; pu[11] = sizes.pyrSize - 1;
  // LOCAL's own workgroups, then CROWD_GROUPS more for the crowded cells
  const localThreads = plan.heads ? sizes.n + sizes.localCells - sizes.nCells : sizes.localCells;
  const localGroups = Math.ceil(localThreads / WG$1);
  pu[12] = localGroups; pu[13] = sizes.crowdOff; pf[14] = workCap; pu[15] = sizes.crowdList; pu[16] = sizes.occList;
  pu[17] = sizes.hubOff; pu[18] = sizes.hubList;

  const bind = (name, list, pipeline = pipes[name]) => device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: list.map((resource, binding) => ({ binding, resource: resource.buffer ? resource : { buffer: resource } })),
  });
  // The caller's buffers of kernel `name` at step parity p
  const cols = (name, p) => columns[name].map(column => (Array.isArray(external[column]) ? external[column][p] : external[column]));
  const alternates = name => columns[name].some(column => Array.isArray(external[column]));
  // A kernel that reads alternating buffers gets a bind group per parity
  const both = (name, list) => (alternates(name) ? [0, 1].map(p => bind(name, list(p))) : bind(name, list(0)));
  const stepEntry = step ? [{ buffer: step.buffer, size: step.size }] : [];
  const groups = {
    TREE_HIST: both('TREE_HIST', p => [TP].concat(cols('TREE_HIST', p), [treeBox])),
    TREE_BOX: bind('TREE_BOX', [TP, treeBox, treeLists]),
    TREE_BIN: both('TREE_BIN', p => [TP].concat(cols('TREE_BIN', p), [treeBox, treeCount, treeWork])),
    TREE_SCAN_BLOCKS: bind('TREE_SCAN_BLOCKS', [treeCount, treeMeta, treeBlocks, TP, treeLists]),
    TREE_SCAN_TOP: bind('TREE_SCAN_TOP', [treeBlocks, nbU]),
    TREE_SCAN_ADD: bind('TREE_SCAN_ADD', [TP, treeMeta, treeBlocks]),
    TREE_PLACE: bind('TREE_PLACE', [TP, treeMeta, treeWork]),
    TREE_ORDER: both('TREE_ORDER', p => [TP].concat(cols('TREE_ORDER', p), [treeWork, treeMeta, treeSp, treeLists])),
    TREE_AGG0: bind('TREE_AGG0', [TP, treeSp, treeMeta, treeCells, treeLists].concat(plan.hubs ? [treeBox] : [])),
    TREE_LOCAL: bind('TREE_LOCAL', [TP, treeCells, treeMeta, treeLists, treeSp].concat(stepEntry)),
  };
  if (plan.heavyCells) groups.TREE_HEAVY = bind('TREE_HEAVY', [TP, treeSp, treeMeta, treeCells, treeLists].concat(stepEntry));
  // TREE_PYR's dispatches: a block of levels each (blockSteps), else a level each
  const levels = pyrLevels(sizes.levels, plan.blockSteps).map(({ from, steps }) => {
    const u = buf(16, U | CD);
    const count = plan.blockSteps ? (sizes.G >> from) ** D : (sizes.G >> (from + 1)) ** D;
    device.queue.writeBuffer(u, 0, new Uint32Array(plan.blockSteps ? [count, sizes.levelOff[from], steps, sizes.metaCount] :
      [count, sizes.levelOff[from], sizes.levelOff[from + 1], sizes.metaCount]));
    return { count, group: bind('TREE_PYR', [u, treeCells].concat(plan.layout.CNT < 0 ? [treeMeta] : [], plan.hubs ? [treeBox] : [])) };
  });
  const errors = await Promise.all([device.popErrorScope(), device.popErrorScope()]);
  const setupError = errors.find(Boolean);
  if (setupError) {
    owned.forEach(b => b.destroy());
    throw new Error('could not create the tree buffers: ' + setupError.message);
  }

  // The crowded-work cap: the caller's (a device slower than an M4 Max gets a smaller one), lowered
  // when the measured rate is slow (observeTime()), though never below 1.5 times the work of a step
  // that was just measured: the step's whole time counts as crowded work, and a pile's sort and
  // sums (ORDER, AGG0) take time too, so a measurement can come out several times low
  let cap = workCap, rate = RATE_MAX$1 / Math.max(1, slowdown), lastWork = 0;
  function updateCap() {
    const next = Math.min(workCap, Math.max(rate * CAPPED_MS$1, 1.5 * lastWork));
    if (next === cap) return;
    cap = next;
    pf[14] = cap;
    device.queue.writeBuffer(TP, 14 * 4, new Float32Array([cap]));
  }

  // (`groupLimit` lowers it, so tests can see 2D grids at small sizes)
  const limit = groupLimit || device.limits.maxComputeWorkgroupsPerDimension;
  // Workgroups for `threads`, as a 2D grid past the per-dimension limit (kernels read the linear id)
  function grid(threads) {
    const w = Math.max(1, Math.ceil(threads / WG$1));
    if (w <= limit) return [w, 1];
    const x = limit;
    return [x, Math.ceil(w / x)];
  }
  const nodes = grid(sizes.n), cells = grid(sizes.nCells);
  // LOCAL's own workgroups, the crowded cells' and the hubs'
  const locals = grid((localGroups + CROWD_GROUPS + (plan.hubs ? HUB_GROUPS : 0)) * WG$1);
  const histGroups = Math.min(nodes[0] * nodes[1], HIST_GROUPS);
  let parity = 0;
  function dispatch(pass, name, size) {
    pass.setPipeline(pipes[name]);
    pass.setBindGroup(0, Array.isArray(groups[name]) ? groups[name][parity] : groups[name]);
    pass.dispatchWorkgroups(size[0], size[1]);
  }

  return {
    plan,
    buffers: { treeSp, treeMeta, treeCells, TP },
    // For the caller's node kernel: dispatch size over the bodies, in the tree's cell order
    nodeGrid: nodes,
    // Settings and the law numbers of every channel (compiled laws, after update(); null for
    // 1/r^2). The law numbers are skipped when the caller's step values hold them.
    setValues(settings, laws) {
      pf[10] = settings.gravity;
      if (laws && plan.lawWords) {
        plan.groups.forEach(group => {
          if (group.law) writeLawValues(laws[group.first] || group.law, pf, PARAM_WORDS + group.base);
        });
      }
      device.queue.writeBuffer(TP, 0, params);
    },
    // The structure dispatches of one step. `stepOffset`: the dynamic offset of the caller's
    // step values for this step; `parity`: which buffer of an alternating pair holds this step's
    // positions (0 or 1).
    encode(pass, { stepOffset, parity: p = 0 } = {}) {
      parity = p;
      dispatch(pass, 'TREE_HIST', [histGroups, 1]);
      dispatch(pass, 'TREE_BOX', [1, 1]);
      dispatch(pass, 'TREE_BIN', nodes);
      dispatch(pass, 'TREE_SCAN_BLOCKS', [sizes.nCells / 1024, 1]);
      dispatch(pass, 'TREE_SCAN_TOP', [1, 1]);
      dispatch(pass, 'TREE_SCAN_ADD', cells);
      dispatch(pass, 'TREE_PLACE', nodes);
      dispatch(pass, 'TREE_ORDER', nodes);
      dispatch(pass, 'TREE_AGG0', cells);
      pass.setPipeline(pipes.TREE_PYR);
      for (const { count, group } of levels) {
        pass.setBindGroup(0, group);
        const size = grid(count);
        pass.dispatchWorkgroups(size[0], size[1]);
      }
      const offsets = step && step.dynamic ? [stepOffset || 0] : [];
      pass.setPipeline(pipes.TREE_LOCAL);
      pass.setBindGroup(0, groups.TREE_LOCAL, offsets);
      pass.dispatchWorkgroups(locals[0], locals[1]);
      if (plan.heavyCells) {
        pass.setPipeline(pipes.TREE_HEAVY);
        pass.setBindGroup(0, groups.TREE_HEAVY, offsets);
        pass.dispatchWorkgroups(plan.heavyGroups);
      }
    },
    boxBuffer: treeBox,
    // Copy these 16 bytes into a readback and give the 4 words to pyramidStatus(): non-null means
    // a step since the buffers were made had its crowded cells refused (the words keep the first
    // such step's numbers), and the runner should halt with that message
    status: { buffer: treeLists, offset: 0, size: 32 },
    // pyramidStatus() with this pyramid's cap
    statusMessage: words => pyramidStatus(words, cap, plan.K),
    /**
     * The status words of a readback (call it on every one): the last step's crowded work, for
     * observeTime()
     */
    observe(words) {
      lastWork = words[7] * 1e6;
    },
    /**
     * The runner's measured GPU ms a step: when the last measured step's crowded work dominated it,
     * the device's rate (never above RATE_MAX), and the cap follows, so that a capped step takes
     * about CAPPED_MS. The whole step counts as crowded work, so the rate can only come out low.
     */
    observeTime(msPerStep) {
      if (!(msPerStep > 0) || lastWork < MEASURE_WORK) return;
      rate = Math.min(RATE_MAX$1, lastWork / msPerStep);
      updateCap();
    },
    // GPU ms of a step at the cap, at the measured rate (before one: RATE_MAX / slowdown)
    cappedMs: () => cap / rate,
    destroy() {
      for (const b of owned) b.destroy();
    },
  };
}

// The laws' lookup tables, as f32 at the start of treeCells
function writeTables(device, treeCells, plan) {
  const words = plan.layout.TAB4 * 4;
  if (!words) return;
  const data = new Float32Array(words);
  plan.groups.forEach(group => {
    (group.tables || []).forEach(table => { data.set(table.values, table.base); });
  });
  device.queue.writeBuffer(treeCells, 0, data);
}

/**
 * The message to halt with for the status words of a step (tree.status), or null. Cells of more
 * than NEAR_CAP bodies are summed exactly in workgroups; past `workCap` pair evaluations (weighted
 * by the `charges`, see chargeWeight) a step (a layout piled into a few cells; tree.statusMessage()
 * passes its own), they are refused rather than sampled.
 */
function pyramidStatus(words, workCap = WORK_CAP, charges = 1) {
  const biggest = words[2];
  if (!biggest) return null;
  const billions = x => (x >= 10 ? x.toFixed(0) : x >= 1 ? x.toFixed(1) : x.toFixed(2));
  const work = words[3] / 1000, weight = chargeWeight(charges);
  return `the tree pass: a grid cell holds ${biggest.toLocaleString('en-US')} bodies, and the crowded cells need about ` +
    `${billions(work)} billion pair evaluations a step` +
    (charges > 1 ? ` with ${charges} charges (the work of ${billions(work * weight)} billion with one)` : '') +
    `, more than the GPU takes (${billions(workCap / 1e9)} billion); the layout is piled too densely in one place for the grid`;
}

// A step's pair work counted on the host from positions, the way the device's guard counts it:
// chunks of 256 candidates over the 3^D cells around each body, and the rank chunks of buckets
// over 1,024 bodies. It visits a bucket two neighbour cells share twice (the device once), so it
// can only count more. build.js plans a step's slices from it before the device has measured
// anything (the first step, or a stage whose radius just turned positive).

const CELL_LIMIT = 1073741823;

/**
 * {chunks, ranks} for `n` bodies at `pos` (D numbers each) and `radius`, with a table of `size`
 * buckets (a power of two).
 */
function estimateWork(pos, n, D, radius, size) {
  const mask = size - 1;
  const inv = 1 / (radius * CELL_GROWTH);
  const cells = new Int32Array(n * D);
  const counts = new Uint32Array(size);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < D; k++) {
      cells[i * D + k] = Math.max(-CELL_LIMIT, Math.min(CELL_LIMIT, Math.floor(pos[i * D + k] * inv)));
    }
    counts[hash(cells, i * D, D, null) & mask] += 1;
  }
  const cellsAround = 3 ** D;
  const offset = new Int32Array(D);
  let chunks = 0;
  for (let i = 0; i < n; i++) {
    let candidates = 0;
    for (let o = 0; o < cellsAround; o++) {
      let rest = o;
      for (let k = 0; k < D; k++) { offset[k] = (rest % 3) - 1; rest = (rest / 3) | 0; }
      candidates += counts[hash(cells, i * D, D, offset) & mask];
    }
    chunks += Math.ceil(candidates / CHUNK);
  }
  let ranks = 0;
  for (let b = 0; b < size; b++) if (counts[b] > RANK_DIRECT) ranks += counts[b] * Math.ceil(counts[b] / CHUNK);
  return { chunks, ranks };
}

// The CPU's and the device's hash of a cell (lib/createNeighborGrid.js), shifted by `offset`
function hash(cells, at, D, offset) {
  let h = 0x165667b1;
  for (let k = 0; k < D; k++) {
    h = Math.imul(h ^ (cells[at + k] + (offset ? offset[k] : 0)), 0x27d4eb2d);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

// The pair formulas' lowering on a device: buffers, pipelines, bind groups and the dispatches of a
// step. The node kernel that adds the totals is the caller's (plan.section()).
//
//   const pairs = await buildPairs(device, plan, { buffers: { X: [x, y], S, H }, step });
//   pass = pairs.encode(pass, { stepOffset, parity, values, split });   // before the node kernel
//   pass = pairs.encode(pass, { ..., stages: ['crowd'] });  // only these stages, and their sorts
//   // after a readback that copied pairs.status.buffer:
//   pairs.observe(words);                                  // the work the device measured
//   const message = pairs.statusMessage(words);            // non-null: halt the runner with it
//
// A step whose pair work is expected past the cap (from the device's last measurement, or at
// first from the host's count of the store's positions) runs sliced: its rank work and pair work
// in slices of at most the cap, each slice in a submit of its own, through `split()`, which the
// caller gives (it ends the pass, submits, and returns a new pass). Every submit then stays far
// from the GPU watchdog, however crowded the layout. Results are the same, bit for bit. Without
// `split`, or when the device needs more than the slices planned, the guard stops the step and the
// status says so.

// A step runs sliced when its expected work times this passes the cap: the work may grow between
// the measurement and the step (a readback comes once per call)
const MARGIN = 1.5;
// Chunks a millisecond at the slowest rate measured on an M4 Max (43 billion pair tests a second,
// full chunks: v1-5 on a piled-up 100k layout). The device's rate is taken from the runner's
// timings (observeTime()), never above this, so slower GPUs get a smaller cap and smaller submits
const RATE_MAX = 43e6 / 256;
// The rate is measured on dense steps only: at least this many chunks a body, so that most chunks
// are full. A relaxed layout's chunks hold a few candidates each, and run up to 2x faster
const DENSE = 2;
// Targets at the measured rate: a capped slice of one stage takes about CAPPED_MS, and the pair
// work of one submit about SUBMIT_MS, far from the GPU watchdog (2 s on macOS). Before a dense
// step was timed, the rate is RATE_MAX: on a GPU slower than an M4 Max the first crowded slices
// take longer, until their timing comes in
const CAPPED_MS = 25;
const SUBMIT_MS = 100;
// Bytes between two entries of the slices' uniform (the dynamic offset alignment)
const SLICE_STRIDE = 256;

/**
 * Buffers, pipelines and bind groups for `plan` (planPairs()). `buffers` are the caller's, by the
 * names its colRefs use (`X` the positions: a pair [a, b] alternates by step parity). `step`:
 * {buffer, size} of the caller's step values, bound at a dynamic offset per step. `positions`:
 * the store's positions (D numbers per body), for the host's count of a step's work before the
 * device has measured it; `estimateScale` multiplies every expected work (tests force it low).
 * Resolves once the pipelines are compiled; rejects naming the kernel when one fails, or when the
 * buffers cannot be created.
 */
async function buildPairs(device, plan, { buffers: external, step, positions = null, estimateScale = 1 }) {
  if (plan.refusal) throw new Error(plan.refusal);
  const pipes = Object.fromEntries(await Promise.all(Object.keys(plan.kernels).map(name =>
    getPipeline(device, { code: plan.kernels[name], label: name, bindings: plan.bindings[name] }).then(pipeline => [name, pipeline]))));

  const SB = GPUBufferUsage.STORAGE, CD = GPUBufferUsage.COPY_DST, CS = GPUBufferUsage.COPY_SRC;
  const owned = [];
  device.pushErrorScope('validation');
  device.pushErrorScope('out-of-memory');
  const buffer = (name, usage = SB) => {
    const b = device.createBuffer({ size: plan.buffers[name], usage, label: name });
    owned.push(b);
    return b;
  };
  const status = buffer('pairStatus', SB | CS | CD);
  const sorts = plan.sorts.map(sort => {
    const s = sort.index;
    const params = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | CD, label: 'PP' + s });
    owned.push(params);
    device.queue.writeBuffer(params, 0, new Uint32Array([plan.n, plan.size - 1, plan.size, plan.blocks, plan.capChunks, s, plan.n + plan.capChunks, plan.n + 2 * plan.capChunks]));
    return {
      sort, params,
      count: buffer('pairCount' + s), start: buffer('pairStart' + s), body: buffer('pairBody' + s),
      list: buffer('pairList' + s), args: buffer('pairArgs' + s, SB | GPUBufferUsage.INDIRECT | CS), snap: buffer('pairSnap' + s),
    };
  });
  const partials = plan.stages.map(stage => buffer('pairPartial' + stage.index));
  // The slices' numbers: at 0 the step's slice count, at SLICE_STRIDE * (s + 1) slice s
  const slices = device.createBuffer({ size: SLICE_STRIDE * (MAX_SLICES + 1), usage: GPUBufferUsage.UNIFORM | CD, label: 'pairSlices' });
  owned.push(slices);
  const sliceInit = new Uint32Array(SLICE_STRIDE / 4 * (MAX_SLICES + 1));
  for (let s = 0; s < MAX_SLICES; s++) sliceInit[SLICE_STRIDE / 4 * (s + 1) + 1] = s;
  device.queue.writeBuffer(slices, 0, sliceInit);
  const errors = await Promise.all([device.popErrorScope(), device.popErrorScope()]);
  const setupError = errors.find(Boolean);
  if (setupError) {
    owned.forEach(b => b.destroy());
    throw new Error('could not create the pair buffers: ' + setupError.message);
  }

  const stepEntry = { buffer: step.buffer, size: step.size };
  const slice = { buffer: slices, size: 16 };
  const resource = r => (r.buffer ? r : { buffer: r });
  const bind = (name, list) => device.createBindGroup({
    layout: pipes[name].getBindGroupLayout(0),
    entries: list.map((r, binding) => ({ binding, resource: resource(r) })),
  });
  const columnsOf = (names, p) => names.map(name => (Array.isArray(external[name]) ? external[name][p] : external[name]));
  const X = p => (Array.isArray(external.X) ? external.X[p] : external.X);
  sorts.forEach(b => {
    const k = b.sort.kernels;
    b.groups = {
      BIN: [0, 1].map(p => bind(k.BIN, [b.params, stepEntry, X(p), b.count, b.body])),
      SCAN_BLOCKS: bind(k.SCAN_BLOCKS, [b.params, b.count, b.start]),
      SCAN_TOP: bind(k.SCAN_TOP, [b.params, b.start]),
      PLACE: bind(k.PLACE, [b.params, b.start, b.body, b.list, b.args]),
      ARGS_RANK: bind(k.ARGS_RANK, [b.params, b.args, status]),
      RANK: bind(k.RANK, [b.params, b.args, b.start, b.body, b.list]),
      ARGS: bind(k.ARGS, [b.params, b.args, status]),
      ORDER: [0, 1].map(p => bind(k.ORDER, [b.params, b.args, b.start, b.body, b.list, b.snap, X(p)].concat(columnsOf(b.sort.columns, p)))),
      PLACE_S: bind(k.PLACE_S, [b.params, b.start, b.body, b.list, b.args]),
      ARGS_RANK_S: bind(k.ARGS_RANK_S, [b.params, b.args, status, slice]),
      RANK_OWNERS_S: bind(k.RANK_OWNERS_S, [b.params, b.args, b.start, b.body, b.list, slice]),
      RANK_S: bind(k.RANK_S, [b.params, b.args, b.start, b.body, b.list, slice]),
      ORDER_S: [0, 1].map(p => bind(k.ORDER_S, [b.params, b.args, b.start, b.body, b.list, b.snap, X(p)].concat(columnsOf(b.sort.columns, p), [slice]))),
      ARGS_S: bind(k.ARGS_S, [b.params, b.args, status, slice]),
      EVAL_OWNERS_S: bind(k.EVAL_OWNERS_S, [b.params, b.args, b.body, b.list, slice]),
    };
    // what the host knows of this sort's work: {chunks, radius} measured or counted, and the
    // radius of the step encoded last
    b.known = null;
    b.lastRadius = 0;
    b.lastSlices = 0;
    b.lastStages = 0;
  });
  const stages = plan.stages.map(stage => {
    const b = sorts[stage.sort];
    return {
      stage, sort: b,
      EVAL: bind(stage.kernels.EVAL, [b.params, stepEntry, b.args, b.start, b.list, b.snap, partials[stage.index]]
        .concat(stage.sumBuffer ? columnsOf([stage.sumBuffer], 0) : [])),
      GATHER: bind(stage.kernels.GATHER, [b.params, b.args, b.body, partials[stage.index]].concat(columnsOf(stage.gatherColumns, 0))),
      EVAL_S: bind(stage.kernels.EVAL_S, [b.params, stepEntry, b.args, b.start, b.list, b.snap, partials[stage.index]]
        .concat(stage.sumBuffer ? columnsOf([stage.sumBuffer], 0) : [], [slice])),
      GATHER_S: bind(stage.kernels.GATHER_S, [b.params, b.args, b.body, partials[stage.index]].concat(columnsOf(stage.gatherColumns, 0), [slice])),
    };
  });
  // the cap in chunks: the plan's (it sized the buffers), lowered by setCap() and by a slow rate
  let cap = plan.capChunks, capLimit = plan.capChunks;
  // chunks a millisecond this device runs, as measured (see observeTime())
  let rate = RATE_MAX;
  // pair work (expected chunks) encoded into the current submit, and its pass
  let submitPass = null, submitChunks = 0;
  function updateCap() {
    const next = Math.max(1, Math.min(capLimit, Math.floor(rate * CAPPED_MS)));
    if (next === cap) return;
    cap = next;
    sorts.forEach(b => device.queue.writeBuffer(b.params, 16, new Uint32Array([cap])));
  }

  const limit = device.limits.maxComputeWorkgroupsPerDimension;
  // Workgroups for `threads`, as a 2D grid past the per-dimension limit (kernels read the linear id)
  const grid = threads => {
    const w = Math.max(1, Math.ceil(threads / WG));
    return w <= limit ? [w, 1] : [limit, Math.ceil(w / limit)];
  };
  const bodies = grid(plan.n);
  const dispatch = (pass, name, group, size, offsets) => {
    pass.setPipeline(pipes[name]);
    // an explicit undefined for the offsets threw now and then in Chrome 146 ("cannot be converted to a
    // sequence"), after thousands of good calls
    if (offsets) pass.setBindGroup(0, group, offsets); else pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(size[0], size[1]);
  };
  const indirect = (pass, name, group, args, word, offsets) => {
    pass.setPipeline(pipes[name]);
    // an explicit undefined for the offsets threw now and then in Chrome 146 ("cannot be converted to a
    // sequence"), after thousands of good calls
    if (offsets) pass.setBindGroup(0, group, offsets); else pass.setBindGroup(0, group);
    pass.dispatchWorkgroupsIndirect(args, word * 4);
  };
  const on = (stage, values) => stage.gate === undefined || values[stage.gate] !== 0;
  const sliceAt = s => SLICE_STRIDE * (s + 1);

  // The chunks a step of sort `b` is expected to need at `radius`: the device's last measurement,
  // or at first the host's count; the work grows about as radius^D (more bodies per cell)
  function expectedChunks(b, radius) {
    if (!b.known && positions) {
      const work = estimateWork(positions, plan.n, plan.D, radius, plan.size);
      b.known = { chunks: Math.max(work.chunks, work.ranks) * estimateScale, radius };
    }
    if (!b.known) return 0;
    let chunks = b.known.chunks;
    if (radius > b.known.radius) chunks *= (radius / b.known.radius) ** plan.D;
    return chunks;
  }

  // Slices a step of sort `b` needs: 0 when its expected work fits one submit
  function slicesFor(chunks) {
    const need = chunks * MARGIN;
    return need <= cap ? 0 : Math.min(MAX_SLICES, Math.ceil(need / cap));
  }

  // A sliced step of sort `b`: the sort, then its rank work slice by slice, then ORDER, then each
  // stage's chunks and gather slice by slice, every slice in a submit of its own. Returns the pass
  // to go on with
  function encodeSliced(pass, b, active, count, split, offsets, parity) {
    const k = b.sort.kernels, g = b.groups;
    // what came before goes first, so that this step's slice count reaches only its own kernels
    pass = split();
    device.queue.writeBuffer(slices, 0, new Uint32Array([count, 0, 0, 0]));
    dispatch(pass, k.BIN, g.BIN[parity], bodies, offsets);
    dispatch(pass, k.SCAN_BLOCKS, g.SCAN_BLOCKS, [plan.blocks, 1]);
    dispatch(pass, k.SCAN_TOP, g.SCAN_TOP, [1, 1]);
    dispatch(pass, k.PLACE_S, g.PLACE_S, bodies);
    dispatch(pass, k.ARGS_RANK_S, g.ARGS_RANK_S, [1, 1], [0]);
    for (let s = 0; s < count; s++) {
      pass = split();
      dispatch(pass, k.RANK_OWNERS_S, g.RANK_OWNERS_S, bodies, [sliceAt(s)]);
      indirect(pass, k.RANK_S, g.RANK_S, b.args, ARGS.SLICE_RANK + 3 * s, [sliceAt(s)]);
    }
    pass = split();
    dispatch(pass, k.ORDER_S, g.ORDER_S[parity], bodies, [0]);
    dispatch(pass, k.ARGS_S, g.ARGS_S, [1, 1], [0]);
    for (let s = 0; s < count; s++) {
      active.forEach((st, j) => {
        pass = split();
        if (j === 0) dispatch(pass, k.EVAL_OWNERS_S, g.EVAL_OWNERS_S, bodies, [sliceAt(s)]);
        indirect(pass, st.stage.kernels.EVAL_S, st.EVAL_S, b.args, ARGS.SLICE_EVAL + 3 * s, [offsets[0], sliceAt(s)]);
        dispatch(pass, st.stage.kernels.GATHER_S, st.GATHER_S, bodies, [sliceAt(s)]);
      });
    }
    // what comes after goes in a submit of its own too
    return split();
  }

  return {
    plan,
    status: { buffer: status, bytes: plan.buffers.pairStatus },
    /**
     * The pair work of one step, into the caller's compute pass; returns the pass to go on with
     * (another one after a sliced step). `values`: the step's numbers as the slot holds them (for
     * the radius and the gates: a sort whose stages are all off, or whose radius is not positive,
     * encodes nothing); `parity`: the buffer of X holding the positions the stages read.
     * `stages`: names of the stages to run (all by default), with the sorts they need, for stages
     * that sit before different node kernels. A sort shared by stages in two kernels then runs
     * twice, each time with the columns as they are at that point. `split()`: ends the pass,
     * submits what was encoded, and returns a new pass; without it no step is sliced.
     */
    encode(pass, { stepOffset = 0, parity = 0, values, stages: names = null, split = null }) {
      const offsets = [stepOffset];
      for (const b of sorts) {
        const active = stages.filter(s => s.sort === b && on(s.stage, values) && (!names || names.indexOf(s.stage.name) >= 0));
        const radius = values[b.sort.radius];
        if (!active.length || !(radius > 0)) continue;
        const expected = split ? expectedChunks(b, radius) : 0;
        const count = split ? slicesFor(expected) : 0;
        b.lastRadius = radius;
        b.lastSlices = count;
        b.lastStages = active.length;
        if (count) {
          pass = encodeSliced(pass, b, active, count, split, offsets, parity);
          submitPass = pass;
          submitChunks = 0;
          continue;
        }
        // steps that each fit go many to a submit; once the pair work in this one would pass
        // SUBMIT_MS at the device's rate, the next goes in a new submit
        if (pass !== submitPass) { submitPass = pass; submitChunks = 0; }
        const work = expected * active.length;
        if (split && submitChunks > 0 && submitChunks + work > rate * SUBMIT_MS) {
          pass = split();
          submitPass = pass;
          submitChunks = 0;
        }
        submitChunks += work;
        const k = b.sort.kernels, g = b.groups;
        dispatch(pass, k.BIN, g.BIN[parity], bodies, offsets);
        dispatch(pass, k.SCAN_BLOCKS, g.SCAN_BLOCKS, [plan.blocks, 1]);
        dispatch(pass, k.SCAN_TOP, g.SCAN_TOP, [1, 1]);
        dispatch(pass, k.PLACE, g.PLACE, bodies);
        dispatch(pass, k.ARGS_RANK, g.ARGS_RANK, [1, 1]);
        indirect(pass, k.RANK, g.RANK, b.args, ARGS.RANK_X);
        dispatch(pass, k.ORDER, g.ORDER[parity], bodies);
        dispatch(pass, k.ARGS, g.ARGS, [1, 1]);
        for (const s of active) {
          indirect(pass, s.stage.kernels.EVAL, s.EVAL, b.args, ARGS.EVAL_X, offsets);
          dispatch(pass, s.stage.kernels.GATHER, s.GATHER, bodies);
        }
      }
      return pass;
    },
    /**
     * The device's measured work, from status words read back from `status.buffer` (call it on
     * every readback): the next steps' slices are planned from it.
     */
    observe(words) {
      sorts.forEach(b => {
        const chunks = words[4 + b.sort.index];
        if (chunks > 0 && b.lastRadius > 0) b.known = { chunks: chunks * estimateScale, radius: b.lastRadius };
      });
    },
    /**
     * The runner's measured GPU ms a step (a timed readback's average): with the pair work of the
     * last measured step, when it was dense, the device's rate. The whole step counts as pair
     * work, so the rate can only come out low (the safe side); it never passes RATE_MAX. The cap
     * follows, so that a capped slice takes about CAPPED_MS.
     */
    observeTime(msPerStep) {
      let chunks = 0, passes = 0;
      sorts.forEach(b => {
        if (!b.known || !(b.lastRadius > 0)) return;
        chunks += b.known.chunks / estimateScale * (b.lastStages || 1);
        passes += b.lastStages || 1;
      });
      if (!(chunks > 0 && msPerStep > 0) || chunks < DENSE * plan.n * passes) return;
      rate = Math.min(RATE_MAX, chunks / msPerStep);
      updateCap();
    },
    /**
     * GPU ms a capped slice of one stage takes at the rate measured on dense steps (RATE_MAX
     * before one was timed).
     */
    cappedMs() {
      return cap / rate;
    },
    /**
     * Slices each sort's last encoded step ran in (0: one submit).
     */
    slices() {
      return sorts.map(b => b.lastSlices);
    },
    /**
     * Lowers the cap on a step's pair tests (a device slower than the one the default was sized
     * for); it cannot rise above the plan's, which sized the buffers.
     */
    setCap(tests) {
      capLimit = Math.max(1, Math.min(plan.capChunks, Math.floor(tests / CHUNK)));
      updateCap();
    },
    /**
     * The runner's message for status words read back from `status.buffer`, or null.
     */
    statusMessage(words) {
      return statusMessage(plan, words);
    },
    /**
     * Chunks of 256 pair tests the last encoded step of each sort needed, from status words.
     */
    lastChunks(words) {
      return plan.sorts.map(sort => words[4 + sort.index]);
    },
    // For tests: the device buffers by name
    buffers: { status, sorts, partials },
    destroy() {
      owned.forEach(b => b.destroy());
    },
  };
}

// The grid field on a device: its buffers, pipelines and the dispatches of a step, the gather of
// the two columns included.
//
//   const grid = await buildGrid(device, plan, { buffers: { X: [a, b], S } });
//   grid.setValues(gridSlotValues(...));   // only when the grid holds its own numbers
//   grid.encode(pass, { stepOffset, parity });
//   // copy grid.status into a readback: gridStatus(words, plan, name) says when to halt, and
//   // grid.observe(words) takes the step's size; grid.observeTime(ms) the runner's GPU ms a step;
//   // grid.cappedMs() is the GPU ms of a step at its worst on this device

// MINMAX loops over the bodies with at most this many workgroups
const MINMAX_GROUPS = 1024;
// The most times slower than an M4 Max a device is taken to be (the speed probe's bound too)
const MOST_SLOWDOWN = 100;
// Timed readbacks the factor remembers: it is the largest of these (and the probe's), so one slow
// step (another stage's crowded start, a pause) ages out, and a device that stays slow keeps it
const TIMED_WINDOW = 4;

/**
 * Buffers, pipelines and bind groups for `plan` (planGrid()). `buffers` are the caller's, by the
 * names its colRefs use; a pair [a, b] is a buffer that alternates between steps (positions that
 * ping-pong), a at even steps and b at odd ones (encode()'s `parity`). `step`, when the caller's
 * step slot holds the grid's numbers: {buffer, size, dynamic}. `slowdown`: how many times slower
 * than an M4 Max the device is, from the speed probe (device.js), until timed steps say more
 * (observeTime()). Resolves once the pipelines are compiled; rejects naming the kernel when one
 * fails, or when the buffers cannot be created.
 */
async function buildGrid(device, plan, { buffers: external = {}, step = null, slowdown = 1 } = {}) {
  if (plan.refusal) throw new Error(plan.refusal);
  if (!step && !plan.own) throw new Error('buildGrid: the plan reads the caller\'s step values; pass `step`');
  const stepKind = step && step.dynamic ? 'dynamic' : 'uniform';
  const names = Object.keys(plan.kernels);
  const pipes = Object.fromEntries(await Promise.all(names.map(name => {
    const kernel = plan.kernels[name];
    const bindings = kernel.bindings.map(b => (b.kind === 'step' ? stepKind : b.kind === 'uniform' ? 'uniform' : b.kind));
    return getPipeline(device, { code: kernel.code, label: name, bindings }).then(pipeline => [name, pipeline]);
  })));

  const SB = GPUBufferUsage.STORAGE, CD = GPUBufferUsage.COPY_DST, CS = GPUBufferUsage.COPY_SRC;
  const owned = [];
  device.pushErrorScope('validation');
  device.pushErrorScope('out-of-memory');
  const buffer = (bytes, usage) => {
    const b = device.createBuffer({ size: bytes, usage });
    owned.push(b);
    return b;
  };
  const sizes = plan.buffers;
  const own = {
    GU: buffer(32, GPUBufferUsage.UNIFORM | CD),
    gridMeta: buffer(sizes.gridMeta, SB | CD | CS | GPUBufferUsage.INDIRECT),
    gridCount: buffer(sizes.gridCount, SB),
    gridStart: buffer(sizes.gridStart, SB | CS),
    gridKey: buffer(sizes.gridKey, SB | CS),
    gridSp: buffer(sizes.gridSp, SB | CS),
    gridChunk: buffer(sizes.gridChunk, SB | CS | GPUBufferUsage.INDIRECT),
    gridAcc: buffer(sizes.gridAcc, SB | CS),
    gridField: buffer(sizes.gridField, SB | CS),
    gridLo: sizes.gridLo ? buffer(sizes.gridLo, SB | CS) : null,
  };
  own.V = plan.own ? buffer(plan.own.floats * 4, GPUBufferUsage.UNIFORM | CD) : null;
  // the last words: `zero` (see grid_opq in wgsl.js) and padding
  device.queue.writeBuffer(own.GU, 0, new Uint32Array([plan.n, plan.maxCells, plan.capacity, plan.tableSize, 0, 0, 0, 0]));
  // An empty box, so the first MINMAX finds the bodies' one
  const meta = new Uint32Array(META.IND);
  for (let k = 0; k < plan.D; k++) meta[META.MIN + k] = 0xffffffff;
  device.queue.writeBuffer(own.gridMeta, 0, meta);
  const errors = await Promise.all([device.popErrorScope(), device.popErrorScope()]);
  const setupError = errors.find(Boolean);
  if (setupError) {
    owned.forEach(b => b.destroy());
    throw new Error('could not create the grid field\'s buffers: ' + setupError.message);
  }

  // Bind groups: two (by parity) for kernels that read a buffer that alternates
  // `low`: the smoothing's second pass, on the field's low word (the refinement step)
  const resource = (name, parity, low) => {
    if (name === 'V') return own.V ? { buffer: own.V } : { buffer: step.buffer, size: step.size };
    if (low && name === 'gridField') return { buffer: own.gridLo };
    const b = own[name] || external[name];
    if (!b) throw new Error('buildGrid: no buffer for ' + name);
    return { buffer: Array.isArray(b) ? b[parity] : b };
  };
  const kernels = names.map(name => {
    const { bindings } = plan.kernels[name];
    const alternates = bindings.some(b => Array.isArray(external[b.name]));
    const group = (parity, low) => device.createBindGroup({
      layout: pipes[name].getBindGroupLayout(0),
      entries: bindings.map((b, binding) => ({ binding, resource: resource(b.name, parity, low) })),
    });
    const groups = alternates ? [group(0), group(1)] : [group(0)];
    const lowGroup = /_SMOOTH\d$/.test(name) ? group(0, true) : null;
    return { name, pipeline: pipes[name], groups, lowGroup, dynamic: stepKind === 'dynamic' && bindings.some(b => b.kind === 'step') };
  });
  const byName = Object.fromEntries(kernels.map(k => [k.name, k]));
  // the device's speed for this work (see observeTime()), and the last step's grid points
  const probe = Math.max(1, slowdown), timed = [];
  let factor = probe, points = 0;
  const nodes = Math.ceil(plan.n / WG$2);
  const L = plan.label;
  // [kernel, workgroups or the word of its indirect arguments in gridMeta]
  const steps = [
    [`${L}_MINMAX`, [Math.min(nodes, MINMAX_GROUPS)]],
    [`${L}_PARAMS`, [1]],
    [`${L}_BIN`, [nodes]],
    [`${L}_SCAN_BLOCKS`, IND_SCAN],
    [`${L}_SCAN_TOP`, [1]],
    [`${L}_ORDER`, [nodes]],
    // its arguments are in gridChunk (ORDER's chunks of crowded cells)
    [`${L}_CROWD`, 'chunks'],
    [`${L}_DEPOSIT`, IND_DEPOSIT],
  ];
  if (plan.smooth) {
    for (let k = 0; k < plan.D; k++) steps.push([`${L}_SMOOTH${k}`, IND_SMOOTH + 3 * k]);
    // the refinement step: the residual, smoothed again in gridLo (no workgroups when the step's
    // gamma does not need it)
    steps.push([`${L}_RESIDUAL`, IND_RESIDUAL]);
    for (let k = 0; k < plan.D; k++) steps.push([`${L}_SMOOTH${k}`, IND_SMOOTH_LOW + 3 * k, 'low']);
  }
  steps.push([`${L}_GATHER`, [nodes]]);

  function dispatch(pass, name, size, { stepOffset = 0, parity = 0 } = {}, low = null) {
    const k = byName[name];
    pass.setPipeline(k.pipeline);
    pass.setBindGroup(0, low ? k.lowGroup : k.groups[k.groups.length > 1 ? parity : 0], k.dynamic ? [stepOffset] : []);
    if (size === 'chunks') pass.dispatchWorkgroupsIndirect(own.gridChunk, 0);
    else if (typeof size === 'number') pass.dispatchWorkgroupsIndirect(own.gridMeta, size * 4);
    else pass.dispatchWorkgroups(size[0]);
  }

  return {
    buffers: own,
    // Copy these bytes into a readback and give the words to gridStatus() and observe()
    status: { buffer: own.gridMeta, offset: META.STATUS * 4, size: STATUS_WORDS * 4 },

    /** The status words of a readback: the grid points of its last step */
    observe(words) {
      points = words[4];
    },

    /**
     * The runner's GPU ms a step (a timed readback's average). The speed probe times arithmetic in
     * cache; the grid's work is atomics and memory, which a device may do relatively slower, or a
     * device may slow down as it heats. So the step, divided by what it takes an M4 Max at most
     * (gridRelaxedMs()), gives a factor, and cappedMs() takes the largest of the last
     * TIMED_WINDOW of them and the probe's. The whole step counts, other stages too, so a factor
     * can only come out high (the safe side); steps whose pair stages ran in slices (`sliced`)
     * are mostly pair work and are left out.
     */
    observeTime(msPerStep, { sliced = false } = {}) {
      if (!(msPerStep > 0) || !(points > 0) || sliced) return;
      timed.push(msPerStep / gridRelaxedMs(plan, points));
      if (timed.length > TIMED_WINDOW) timed.shift();
      factor = Math.min(MOST_SLOWDOWN, Math.max(probe, ...timed));
    },

    /** GPU ms of the grid's step at its worst (gridCappedMs()) on this device, as measured */
    cappedMs() {
      return gridCappedMs(plan) * factor;
    },

    /** The grid's own numbers (when the caller's step slot does not hold them), by slot name */
    setValues(numbers) {
      if (!own.V) throw new Error('the grid reads its numbers from the caller\'s step slot');
      const data = new Float32Array(plan.own.floats);
      plan.own.names.forEach((name, index) => {
        const value = numbers[name];
        if (value === undefined) throw new Error('setValues: no number for ' + name);
        data[index] = value;
      });
      device.queue.writeBuffer(own.V, 0, data);
    },

    // The dispatches of one step, into the caller's compute pass. `stepOffset`: the dynamic
    // offset of the caller's step slot for this step; `parity`: which buffer of an alternating
    // pair holds this step's positions.
    encode(pass, options) {
      if (plan.n === 0) return;
      for (const [name, size, low] of steps) dispatch(pass, name, size, options, low);
    },

    // The same, kernel by kernel (to time each in its own pass)
    phases: steps.map(([name, size, low]) => ({ name: low ? name + '_LOW' : name, encode: (pass, options) => dispatch(pass, name, size, options, low) })),

    destroy() {
      owned.forEach(b => b.destroy());
    },
  };
}

// The numbers of each queued step, in its slot of the ring (design section 5.4): settings, every
// stage's params and built in values as its formula sees them, gate bits, and laws' numbers, all
// from simulator.stageValues() with that step's context. A stage whose numbers cannot change
// within a call (number params, no `when`, no `step`, no function) is read once per call; when no
// stage can change, one slot serves every step of the call.

const SETTINGS = { gravity: 'gravity', timeStep: 'timeStep', dragCoefficient: 'dragCoefficient', springLength: 'springLength', springCoefficient: 'springCoefficient' };

/**
 * `fill(count, firstStep)` gives {count, data, perStep, halt?}: `data` holds one slot per step
 * (`perStep`), or one for all of them. `count` is smaller than asked when a number of a step does
 * not fit f32; `halt` then says which and where.
 */
function slotFiller(simulator, plan, warn, origin) {
  const floats = plan.slot.floats;
  const settingAt = Object.create(null);
  const stages = Object.create(null);
  const stageOf = name => stages[name] || (stages[name] = { name, params: [], builtIns: [], grid: [], gate: undefined, radius: undefined, law: null, lawAt: 0, dynamic: false });
  plan.slot.entries.forEach(entry => {
    if (entry.kind === 'setting') settingAt[entry.stage] = entry.index;
    else if (entry.kind === 'gate') { const s = stageOf(entry.stage); s.gate = entry.index; s.dynamic = true; }
    else if (entry.kind === 'radius') stageOf(entry.stage).radius = entry.index;
    else if (entry.kind === 'param') stageOf(entry.stage).params.push(entry);
    else if (entry.kind === 'grid') stageOf(entry.stage).grid.push(entry);
    else if (entry.kind === 'builtIn') {
      const s = stageOf(entry.stage);
      s.builtIns.push(entry);
      if (entry.name === 'step') s.dynamic = true;
    }
  });
  plan.sections.forEach(section => {
    const program = section.kind === 'pairs' || section.kind === 'tree' ? section.channels : [section];
    program.forEach(part => {
      const stage = part.stage;
      if (!stages[stage.name] && !part.law) return;
      const s = stageOf(stage.name);
      if (stage.params.some(p => p.kind === 'host')) s.dynamic = true;
      // a pair stage's radius: a function of the step context, or an expression of its params
      const radius = stage.args && stage.args.radius;
      if (s.radius !== undefined && radius && radius.kind !== 'number') s.dynamic = true;
      if (part.kind === 'grid') {
        s.anchor = stage.args.anchor;
        if (gridIsDynamic(stage)) s.dynamic = true;
      }
      if (part.law) {
        s.law = part.law;
        s.lawAt = part.values;
        const described = part.law.describe();
        if (described.params.some(p => p.kind === 'host') || (described.range && described.range.kind === 'host') || described.builtIns.indexOf('step') >= 0) s.dynamic = true;
      }
    });
  });
  const list = Object.values(stages);
  const anyDynamic = list.some(s => s.dynamic);
  let data = new Float32Array(floats * 64);

  return {
    perStep: anyDynamic,
    fill(count, firstStep) {
      const slotsNeeded = anyDynamic ? count : 1;
      if (data.length < slotsNeeded * floats) data = new Float32Array(slotsNeeded * floats);
      for (let s = 0; s < slotsNeeded; s++) {
        const at = firstStep + s;
        const context = simulator.stepContext(at);
        const slot = data.subarray(s * floats, (s + 1) * floats);
        if (s === 0) {
          writeSettings(slot, context);
        } else {
          // what does not change within a call is copied from the step before
          slot.set(data.subarray(0, floats));
        }
        for (const stage of list) {
          if (s > 0 && !stage.dynamic) continue;
          const problem = writeStage(slot, stage, context);
          if (problem) {
            return { count: s, data, perStep: anyDynamic, halt: { message: `${problem} at step ${at}`, stages: [stage.name] } };
          }
        }
      }
      return { count, data, perStep: anyDynamic };
    },
  };

  function writeSettings(slot, context) {
    const settings = context.settings;
    Object.keys(SETTINGS).forEach(key => { if (settingAt[key] !== undefined) slot[settingAt[key]] = settings[SETTINGS[key]]; });
    if (settingAt.n !== undefined) slot[settingAt.n] = context.store.n;
    for (let k = 0; k < plan.D; k++) slot[settingAt['origin_' + k]] = origin[k];
    // as the CPU's integrators: a speed limit that is not positive is 1
    if (settingAt.maxVelocity !== undefined) slot[settingAt.maxVelocity] = settings.maxVelocity > 0 ? settings.maxVelocity : 1;
  }

  // A stage's numbers for the step of `context`; returns a problem when one does not fit f32
  function writeStage(slot, stage, context) {
    const values = simulator.stageValues(stage.name, context);
    if (stage.gate !== undefined) slot[stage.gate] = values.when ? 1 : 0;
    if (stage.radius !== undefined) {
      const problem = valueProblem(values.radius);
      if (problem) return `the radius of ${stage.name} is ${problem}`;
      slot[stage.radius] = values.radius;
    }
    for (const entry of stage.params) {
      const value = values.params[entry.name];
      const problem = valueProblem(value);
      if (problem) return `the parameter ${entry.name} of ${stage.name} is ${problem}`;
      if (f32Tiny(value) || (value !== 0 && Math.fround(value) === 0)) warn(`the parameter ${entry.name} of ${stage.name} is ${value}, which a 32-bit float may hold as 0`);
      slot[entry.index] = value;
    }
    for (const entry of stage.builtIns) slot[entry.index] = values.builtIns[entry.name];
    // a grid field's numbers, each within f32 (the device would make NaN of them, or no grid)
    if (stage.grid.length) {
      const problem = gridNumberProblem(values);
      if (problem) return `the ${problem.name} of ${stage.name} is ${valueProblem(problem.value)}`;
      const numbers = gridSlotValues(values, origin, plan.D, stage.anchor);
      for (const entry of stage.grid) slot[entry.index] = numbers[entry.name];
    }
    if (stage.law) {
      const numbers = values.lawValues || values.law.values;
      const problem = lawValueProblem(stage.law, numbers);
      if (problem) return `the law's ${problem.name} of ${stage.name} is ${problem.problem}`;
      lawValueWarnings(stage.law, numbers).forEach(warn);
      writeLawValues(stage.law, slot, stage.lawAt, numbers);
    }
    return null;
  }
}

function valueProblem(value) {
  if (!Number.isFinite(value) || Math.abs(value) > F32_MAX) return `${value}, which does not fit a 32-bit float`;
  return null;
}

// The device side of a generic plan (plan.js, emit.js): buffers from the store, the pipelines, a
// ring of per-step slots, the pyramid when the plan has one, and the encoding of steps. Positions
// are f32 relative to an f64 origin near the middle of the drawing, and swap between X and Y every
// step. Rows keep the store's order, except in large layouts (plan.permuted): there they follow a
// space-filling curve through the positions (buffers.js bodyOrder), so bodies close in space are
// close in memory, and every upload, readback and row list goes through that order.


// Integers above this are not exact in f32
const F32_INTEGER = 16777216;
// Slots of the ring when numbers change from step to step: a submit holds at most this many steps
const RING_SLOTS = 1024;
// Calls with at least this many steps put positions back in the store's order on the GPU for their
// readback (its cost is spread over the steps); shorter ones do it on the CPU
const ORDER_ON_GPU = 16;

// Positions back in the store's order: out[row] = pos[toDevice[row]], `count.y` numbers a row
const UNPERMUTE = `@group(0) @binding(0) var<uniform> count: vec4u;
@group(0) @binding(1) var<storage, read> pos: array<f32>;
@group(0) @binding(2) var<storage, read> toDevice: array<u32>;
@group(0) @binding(3) var<storage, read_write> out: array<f32>;
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let row = gid.x;
  if (row >= count.x) { return; }
  let D = count.y;
  let src = toDevice[row] * D;
  for (var k = 0u; k < D; k++) { out[row * D + k] = pos[src + k]; }
}`;

/**
 * Builds a generic plan's buffers and pipelines from the store of `simulator`. Resolves to the
 * engine the runner drives (see runner.js), or rejects naming the kernel that failed.
 */
async function createGenericEngine(device, { simulator, plan, fireState, warn, slowdown = 1, pairEstimate = 1 }) {
  const store = simulator.store, springs = simulator.springStore;
  const D = plan.D, n = store.n, cap = plan.cap;
  const code = kernelCode(plan);
  const pipelineOf = {};
  const dispatched = plan.kernelList.filter(kernel => kernel.kind !== 'host');
  // grid fields build their own pipelines (buildGrid below)
  const [writeRows, unpermute] = await Promise.all([createRowWriter(device), plan.permuted ? getPipeline(device, { code: UNPERMUTE, label: 'UNPERMUTE' }) : null]
    .concat(dispatched.filter(kernel => kernel.kind !== 'grid').map(kernel =>
      getPipeline(device, { code: code[kernel.name], label: kernel.name, bindings: bindingsOf(kernel) })
        .then(pipeline => { pipelineOf[kernel.name] = pipeline; }))));

  // --- data from the store ------------------------------------------------------------------------
  const origin = chooseOrigin(store.pos, n, D);
  // the device's row of each store row in a large layout, else null (the store's order)
  const toDevice = plan.permuted ? bodyOrder(store.pos, n, D) : null;
  const deviceRow = toDevice ? i => toDevice[i] : i => i;
  const SB = GPUBufferUsage.STORAGE, CD = GPUBufferUsage.COPY_DST, CS = GPUBufferUsage.COPY_SRC;
  const owned = [];
  device.pushErrorScope('validation');
  device.pushErrorScope('out-of-memory');
  const buffer = (bytes, usage, label) => {
    const b = device.createBuffer({ size: Math.max(16, Math.ceil(bytes / 16) * 16), usage, label });
    owned.push(b);
    return b;
  };
  const params = buffer(16, GPUBufferUsage.UNIFORM | CD, 'P');
  const S = buffer(plan.S.size * 4, SB | CD | CS, 'S');
  const H = buffer(plan.H.size * 4, SB | CD, 'H');
  const positions = [buffer(cap * D * 4, SB | CD | CS, 'X'), buffer(cap * D * 4, SB | CD | CS, 'Y')];
  const links = linkTable(springs, n, toDevice);
  const groupData = plan.groupColumns.map(name => groupBlock(store[name], n, toDevice));
  const groupProblem = plan.groupColumns.find((name, k) => groupData[k].count !== countOf(plan, name));
  if (groupProblem) throw new Error(`the groups of ${groupProblem} changed while the plan was made`);
  const chunkData = plan.chunked ? chunkBlock(links, n) : null;
  const lWords = linkWords(links, chunkData, groupData, n, springs.n);
  const L = buffer(lWords.byteLength, SB | CD, 'L');
  device.queue.writeBuffer(L, 0, lWords);
  const groups = Math.max(1, Math.ceil(n / THREADS$1));
  device.queue.writeBuffer(params, 0, new Uint32Array([n, groups, Math.min(THREADS$1, groups), springs.n]));

  // Every column at its place; S also gets the sums' last results and FIRE's state
  const sData = new Float32Array(plan.S.size), hData = new Float32Array(plan.H.size);
  let integerProblem = null;
  Object.values(plan.columns).forEach(column => {
    if (column.buffer === 'X') return;
    const target = column.buffer === 'S' ? sData : hData;
    const source = store[column.name];
    const count = n * column.width;
    placeRows(target, column.offset, source, n, column.width, toDevice);
    if (column.type !== 'f64' && column.type !== 'f32') {
      for (let k = 0; k < count; k++) if (Math.abs(source[k]) > F32_INTEGER) { integerProblem = column.name; break; }
    }
  });
  Object.values(plan.linkColumns).forEach(column => {
    const problem = writeLinkColumn(column, springs[column.name], column.order === 'csr' ? hData : sData, links);
    if (problem) integerProblem = column.name;
  });
  if (integerProblem) throw new Error(`the column ${integerProblem} holds integers above 2^24, which 32-bit floats cannot hold exactly`);
  plan.tables.forEach(table => hData.set(table.values, table.offset));
  // the store's row of each device row, where pair formulas take their roles from it
  if (plan.rowColumn) for (let i = 0; i < n; i++) hData[plan.rowColumn.offset + deviceRow(i)] = i;
  const results = simulator.sums();
  // the sums' last results: a gated sum is read with them until it runs again
  Object.values(plan.sums).forEach(sum => {
    const result = results[sum.name];
    if (!result) return;
    if (sum.grouped) {
      const count = Math.min(sum.count, result.count || 0) * sum.width;
      for (let k = 0; k < count; k++) sData[sum.offset + k] = result.groups[k];
    } else if (result.value) for (let k = 0; k < sum.width; k++) sData[sum.offset + k] = result.value[k];
  });
  sData.set(fireState || [0.1, 0, 0, 0], plan.S.fire);
  device.queue.writeBuffer(S, 0, sData);
  device.queue.writeBuffer(H, 0, hData);
  const startPositions = relativePositions(store.pos, n, D, origin);
  device.queue.writeBuffer(positions[0], 0, toDevice ? permuteRows(startPositions, n, D, toDevice) : startPositions);
  // readbacks in the store's order, put back on the GPU (see copyPositions)
  let ordered = null, unpermuteGroups = null;
  if (toDevice) {
    const countBuffer = buffer(16, GPUBufferUsage.UNIFORM | CD, 'unpermute count');
    const indexBuffer = buffer(n * 4, SB | CD, 'toDevice');
    ordered = buffer(n * D * 4, SB | CS, 'ordered positions');
    device.queue.writeBuffer(countBuffer, 0, new Uint32Array([n, D, 0, 0]));
    device.queue.writeBuffer(indexBuffer, 0, toDevice);
    unpermuteGroups = [0, 1].map(p => device.createBindGroup({
      layout: unpermute.getBindGroupLayout(0),
      entries: [countBuffer, positions[p], indexBuffer, ordered].map((b, binding) => ({ binding, resource: { buffer: b } })),
    }));
  }

  // The ring of per-step slots, read at a dynamic offset
  const slots = slotFiller(simulator, plan, warn, origin);
  const ringSlots = slots.perStep ? RING_SLOTS : 1;
  const ring = buffer(ringSlots * plan.slot.bytes, GPUBufferUsage.UNIFORM | CD, 'V');
  const errors = await Promise.all([device.popErrorScope(), device.popErrorScope()]);
  const setupError = errors.find(Boolean);
  if (setupError) {
    owned.forEach(b => b.destroy());
    throw new Error('could not create the GPU buffers: ' + setupError.message);
  }
  // The pyramid reads positions (X or Y, by the step's parity), charge columns and the slot
  let tree = null;
  if (plan.pyramid) {
    try {
      tree = await buildPyramid(device, plan.pyramid, {
        buffers: { X: positions, S, H }, step: { buffer: ring, size: plan.slot.bytes, dynamic: true }, workCap: WORK_CAP / slowdown, slowdown,
      });
    } catch (e) {
      owned.forEach(b => b.destroy());
      throw e;
    }
    tree.setValues({ gravity: 0 }, null);
  }
  // Structures with status words on the device (work caps passed, ...): {buffer, offset, size,
  // message(words), stages}
  // The pair track's sorts and gathers, above N*
  let pairs = null;
  if (plan.pairs) {
    try {
      // the store's positions let it count the first step's work on the host (slices, see run())
      pairs = await buildPairs(device, plan.pairs, { buffers: { X: positions, S, H }, step: { buffer: ring, size: plan.slot.bytes }, positions: store.pos, estimateScale: pairEstimate });
    } catch (e) {
      owned.forEach(b => b.destroy());
      if (tree) tree.destroy();
      throw e;
    }
    // a slower device than the one the cap was sized on gets a smaller cap from the start; the
    // pairs lower it further once they have timed a dense step
    if (slowdown > 1) pairs.setCap(plan.pairs.cap / slowdown);
  }
  // a capped pair pass's GPU ms before the pairs have timed one is the speed probe's guess
  const pairsUnmeasured = pairs ? pairs.cappedMs() : 0;
  const pairStageMs = () => (pairs.cappedMs() === pairsUnmeasured ? pairsUnmeasured * slowdown : pairs.cappedMs());
  const statuses = [];
  if (pairs) {
    statuses.push({
      buffer: pairs.status.buffer, offset: 0, size: pairs.status.bytes, message: words => pairs.statusMessage(words),
      observe: words => pairs.observe(words), stages: plan.pairs.stages.map(s => s.name),
    });
  }
  if (tree && tree.status) {
    statuses.push(Object.assign({ message: tree.statusMessage, observe: words => tree.observe(words), stages: plan.pyramid.channels.map(c => c.stage) }, tree.status));
  }
  // Grid fields: positions (by parity), their columns in S and H, their numbers in the slot
  const grids = new Map();
  try {
    for (const kernel of dispatched) {
      if (kernel.kind !== 'grid') continue;
      const grid = await buildGrid(device, kernel.section.grid, { buffers: { X: positions, S, H }, step: { buffer: ring, size: plan.slot.bytes, dynamic: true }, slowdown });
      grids.set(kernel, grid);
      const name = kernel.section.stage.name;
      statuses.push(Object.assign({ message: words => gridStatus(words, kernel.section.grid, name), observe: grid.observe ? words => grid.observe(words) : null, stages: [name] }, grid.status));
    }
  } catch (e) {
    owned.forEach(b => b.destroy());
    grids.forEach(grid => grid.destroy());
    if (tree) tree.destroy();
    if (pairs) pairs.destroy();
    throw e;
  }
  const statusBytes = statuses.reduce((total, status) => total + status.size, 0);
  // Bind groups per layout and parity
  const bindGroups = kernel => [0, 1].map(p => device.createBindGroup({
    layout: pipelineOf[kernel.name].getBindGroupLayout(0),
    entries: [params, { buffer: ring, size: plan.slot.bytes }, S, H, L, positions[p], positions[1 - p]]
      .concat(kernel.tree ? [tree.buffers.TP, tree.buffers.treeSp, tree.buffers.treeMeta, tree.buffers.treeCells] : [])
      .map((resource, binding) => ({ binding, resource: resource.buffer ? resource : { buffer: resource } })),
  }));

  let parity = 0;   // positions of the next step are read from positions[parity]
  // What the module last put on the device or into the store, to find rows the host wrote
  const host = trackHostPositions(store, n, D, origin, startPositions);
  // Columns stages write (velocity, and the formulas' own) live in S, and between syncs the device
  // is ahead of the store: what the host writes into them then goes up row by row, found against
  // the numbers the store last gave the device or had from it, so other rows keep the device's
  const deviceColumns = Object.values(plan.columns).filter(column => column.buffer === 'S' && column.name !== 'force' && store[column.name]);
  let hostCopies = copiesOf();
  let uploaded = versions();
  const bodies = simulator.bodies.slice();
  const kernels = dispatched.map(kernel => (kernel.kind === 'grid'
    ? { kernel, grid: grids.get(kernel), gates: kernel.gates.every(g => g !== undefined) ? kernel.gates : null }
    : { kernel, pipeline: pipelineOf[kernel.name], bind: bindGroups(kernel), groups: workgroups(kernel), gates: kernelGates(kernel) }));
  // the kernels between host steps: a step where a host step runs is encoded a part at a time
  const segments = [[]];
  plan.kernelList.forEach(kernel => {
    if (kernel.kind === 'host') segments.push([]);
    else segments[segments.length - 1].push(kernels.find(k => k.kernel === kernel));
  });
  let lastSlot = null;

  // The gates of a kernel whose every part is gated (it is left out on steps where none holds),
  // or null
  function kernelGates(kernel) {
    if (kernel.kind === 'reduce' || kernel.kind === 'groupRuns' || kernel.kind === 'groupSum' || kernel.kind === 'chunks') return kernel.gates.every(g => g !== undefined) ? kernel.gates : null;
    if (kernel.kind !== 'node' && kernel.kind !== 'link') return null;
    const gates = [];
    for (const section of kernel.sections) {
      if (section.kind === 'pairs' || section.kind === 'tree') {
        if (section.channels.some(c => c.gate === undefined)) return null;
        section.channels.forEach(c => gates.push(c.gate));
      } else if (section.gate === undefined) return null;
      else gates.push(section.gate);
    }
    return gates.length ? gates : null;
  }

  function workgroups(kernel) {
    if (kernel.kind === 'reduce' || kernel.kind === 'fireState') return 1;
    if (kernel.kind === 'fireReduce') return Math.min(THREADS$1, groups);
    if (kernel.kind === 'link') return Math.max(1, Math.ceil(springs.n / THREADS$1));
    if (kernel.kind === 'chunks') return Math.max(1, Math.ceil(chunkData.chunks / THREADS$1));
    const block = kernel.column !== undefined ? groupData[plan.groupColumns.indexOf(kernel.column)] : null;
    if (kernel.kind === 'groupRuns') return Math.max(1, Math.ceil(block.runs / THREADS$1));
    if (kernel.kind === 'groupSum') return Math.max(1, Math.ceil(block.count / THREADS$1));
    return groups;
  }

  return {
    kind: plan.regime,
    n,
    D,
    get fence() { return positions.slice(); },
    positionBytes: n * D * 4,
    kernelStages: plan.kernelStages,

    /**
     * What changed on the host goes up: everything after sync() (`hostOwns`), else the rows
     * the host wrote and the columns it marked. 'sync' when a sync point is needed instead.
     */
    prepare(hostOwns, steps) {
      const now = versions();
      // new group ids: the runs and counts are made again with the plan
      if (plan.groupColumns.some(name => now.groups[name] !== uploaded.groups[name])) return 'sync';
      if (hostOwns) {
        const relativePositions$1 = relativePositions(store.pos, n, D, origin);
        host.reset(relativePositions$1);
        device.queue.writeBuffer(positions[parity], 0, toDevice ? permuteRows(relativePositions$1, n, D, toDevice) : relativePositions$1);
        uploadColumns(name => plan.columns[name].buffer !== 'X');
        hostCopies = copiesOf();
      } else {
        if (now.pos !== uploaded.pos) {
          const rows = host.written();
          const values = host.uploaded(rows, steps);
          writeRows(positions[parity], 0, D, toDevice ? rows.map(deviceRow) : rows, values);
        }
        if (now.velocity !== uploaded.velocity) uploadRows(plan.columns.velocity, changedRows(plan.columns.velocity));
        deviceColumns.forEach(column => {
          if (column.name !== 'velocity' && now.columns[column.name] !== uploaded.columns[column.name]) uploadRows(column, changedRows(column));
        });
        uploadColumns(name => plan.columns[name].buffer === 'H' && now.columns[name] !== uploaded.columns[name]);
      }
      Object.keys(plan.linkColumns).forEach(name => { if (hostOwns || now.links[name] !== uploaded.links[name]) uploadLinkColumn(name); });
      uploaded = now;
      return integerProblem ? { halt: integerProblem } : 'ok';
    },

    // parts of a step between host steps (see run()'s `segment`)
    segments: segments.length,

    // The status words of the structures that have them, for every readback: copyStatus() puts
    // them at `offset` of a readback, statusMessage() says why to halt, or null; it also shows the
    // structures what the device measured (the pair work that plans the next steps' slices)
    statusBytes,
    copyStatus,
    statusMessage,

    /**
     * Encodes `count` steps from simulator step `firstStep`. Returns {ran, halt?}: fewer steps
     * run when a step's numbers do not fit f32 (that step halts the runner). With `segment`, one
     * step's kernels between two host steps only (the numbers are read for it at this moment):
     * the step ends with its last part.
     */
    run(count, firstStep, { timestampWrites = null, beforeFinish = null, perSubmit = 64, segment } = {}) {
      const list = segment === undefined ? kernels : segments[segment];
      const ends = segment === undefined || segment === segments.length - 1;
      const filled = slots.fill(count, firstStep);
      const ran = filled.count;
      if (ran === 0) return { ran, halt: filled.halt };
      const floats = plan.slot.floats;
      // without numbers that change within the call, one slot serves every step, written only
      // when it changed
      const same = !filled.perStep && sameSlot(filled.data, lastSlot, floats);
      if (!filled.perStep && !same) {
        lastSlot = filled.data.slice(0, floats);
        device.queue.writeBuffer(ring, 0, lastSlot);
      }
      if (filled.perStep) lastSlot = null;
      for (let done = 0; done < ran;) {
        const c = Math.min(perSubmit, ran - done, filled.perStep ? ringSlots : Infinity);
        if (filled.perStep) device.queue.writeBuffer(ring, 0, filled.data, done * floats, c * floats);
        let enc = device.createCommandEncoder();
        const first = done === 0, last = done + c === ran;
        let tw;
        if (timestampWrites && (first || last)) {
          tw = { querySet: timestampWrites.querySet };
          if (first) tw.beginningOfPassWriteIndex = 0;
          if (last) tw.endOfPassWriteIndex = 1;
        }
        let cp = enc.beginComputePass(tw ? { timestampWrites: tw } : undefined);
        // A pair step past its work cap runs in slices, each in a submit of its own: split() ends
        // the pass, submits, and starts the next; the last pass of the call still writes the end
        // timestamp
        const end = tw && tw.endOfPassWriteIndex !== undefined ? { timestampWrites: { querySet: tw.querySet, endOfPassWriteIndex: 1 } } : undefined;
        const split = () => {
          cp.end();
          device.queue.submit([enc.finish()]);
          enc = device.createCommandEncoder();
          cp = enc.beginComputePass(end);
          return cp;
        };
        for (let s = 0; s < c; s++) {
          const slot = filled.perStep ? s : 0;
          const offset = [slot * plan.slot.bytes];
          const values = filled.data.subarray((filled.perStep ? done + s : 0) * floats);
          for (const { kernel, pipeline, bind, groups: g, gates, grid } of list) {
            // a kernel of gated stages only, none of which runs this step
            if (gates && gates.every(index => values[index] === 0)) continue;
            // a grid field: its dispatches, the gather of its columns included
            if (grid) { grid.encode(cp, { stepOffset: offset[0], parity }); continue; }
            // the pyramid's structure, from this step's positions; it also orders the threads of
            // its kernel, so it is built even on steps where its passes are gated off
            if (kernel.tree) tree.encode(cp, { stepOffset: offset[0], parity });
            // the pair formulas' sort, chunks and gathers, from this step's positions and numbers
            if (kernel.pairStages) cp = pairs.encode(cp, { stepOffset: offset[0], parity, values, stages: kernel.pairStages, split });
            cp.setPipeline(pipeline);
            cp.setBindGroup(0, bind[parity], offset);
            cp.dispatchWorkgroups(g);
          }
          if (ends) parity ^= 1;
        }
        cp.end();
        if (last && beforeFinish) beforeFinish(enc);
        device.queue.submit([enc.finish()]);
        done += c;
      }
      return { ran, halt: filled.halt };
    },

    // Encodes the copy of positions after every step so far into `dst`; true when they are in the
    // store's order (else in the device's)
    copyPositions(enc, dst, offset, count = ORDER_ON_GPU) {
      if (toDevice && count >= ORDER_ON_GPU) {
        const pass = enc.beginComputePass();
        pass.setPipeline(unpermute);
        pass.setBindGroup(0, unpermuteGroups[parity]);
        pass.dispatchWorkgroups(Math.ceil(n / 256));
        pass.end();
        enc.copyBufferToBuffer(ordered, 0, dst, offset, n * D * 4);
        return true;
      }
      enc.copyBufferToBuffer(positions[parity], 0, dst, offset, n * D * 4);
      return !toDevice;
    },

    /**
     * Positions read from the device (f32, relative) after `through` steps (`steps` of them since
     * the last readback) into the store as f64; rows the host wrote keep its numbers (see
     * rows.js). Returns the CPU's measure of movement per step, or null when graph edits moved
     * the rows since.
     */
    readPositions(data, steps, inStoreOrder, through) {
      if (!inStoreOrder) {
        if (rowsMoved(simulator, bodies)) return writePermutedBack(simulator, bodies, data, toDevice, origin, steps, null, D);
        return host.readBack(through, store.versions.pos !== uploaded.pos, () => writePermutedBack(simulator, bodies, data, toDevice, origin, steps, host.mirror, D));
      }
      const write = () => writePositionsBack(simulator, bodies, data, D, origin, steps);
      if (rowsMoved(simulator, bodies)) return write();
      return host.readBack(through, store.versions.pos !== uploaded.pos, () => {
        const move = write();
        host.mirror.set(data.subarray(0, n * D));
        return move;
      });
    },

    /**
     * Reads the device's state after every submitted step: positions, velocities, the columns
     * stages write, the sums and FIRE's state. Resolves to {positions, status, apply()}: apply()
     * writes all but the positions into the store and the sums; status is statusMessage()'s.
     */
    async readDevice() {
      const stageColumns = Object.values(plan.columns).filter(c => c.buffer === 'S');
      // getMappedRange() takes offsets that are multiples of 8
      const posBytes = n * D * 4, sAt = Math.ceil(posBytes / 8) * 8;
      const statusAt = Math.ceil((sAt + plan.S.size * 4) / 8) * 8;
      const read = device.createBuffer({ size: Math.max(16, statusAt + statusBytes), usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
      const enc = device.createCommandEncoder();
      this.copyPositions(enc, read, 0, ORDER_ON_GPU);
      enc.copyBufferToBuffer(S, 0, read, sAt, plan.S.size * 4);
      if (statusBytes) copyStatus(enc, read, statusAt);
      device.queue.submit([enc.finish()]);
      try {
        await read.mapAsync(GPUMapMode.READ);
      } catch (e) {
        read.destroy();
        return null;
      }
      const positionsRead = new Float32Array(read.getMappedRange(0, posBytes)).slice();
      const s = new Float32Array(read.getMappedRange(sAt, plan.S.size * 4)).slice();
      const status = statusBytes ? statusMessage(new Uint32Array(read.getMappedRange(statusAt, statusBytes))) : null;
      read.unmap();
      read.destroy();
      return {
        positions: positionsRead,
        // a structure's status: these numbers include steps computed without its work
        status,
        fireState: Array.from(s.subarray(plan.S.fire, plan.S.fire + 4)),
        apply() {
          // rows the host wrote since the last upload keep its numbers (the next step uploads them)
          const kept = deviceColumns.map(column => {
            const version = column.name === 'velocity' ? store.versions.velocity : store.versions[column.name];
            const was = column.name === 'velocity' ? uploaded.velocity : uploaded.columns[column.name];
            const rows = version !== was ? changedRows(column) : [];
            const w = column.width;
            return { column, rows, values: rows.map(i => Array.from(store[column.name].subarray(i * w, i * w + w))) };
          });
          stageColumns.forEach(column => {
            if (column.name === 'force') return;
            const target = store[column.name];
            if (!target) return;
            unplaceRows(target, s, column.offset, n, column.width, toDevice);
          });
          hostCopies = copiesOf();
          kept.forEach(({ column, rows, values }) => {
            const w = column.width, target = store[column.name];
            rows.forEach((i, j) => { for (let k = 0; k < w; k++) target[i * w + k] = values[j][k]; });
          });
          // link columns stages write (their versions do not move: these are the device's numbers)
          Object.values(plan.linkColumns).forEach(column => {
            const target = springs[column.name];
            if (column.order !== 'link' || !target) return;
            for (let k = 0; k < springs.n; k++) target[k] = s[column.offset + k];
          });
          const sumResults = simulator.sums();
          Object.values(plan.sums).forEach(sum => {
            const result = sumResults[sum.name];
            if (!result) return;
            if (sum.grouped) {
              const groupsOut = result.resize(sum.count);
              for (let k = 0; k < sum.count * sum.width; k++) groupsOut[k] = s[sum.offset + k];
            } else if (result.value) for (let k = 0; k < sum.width; k++) result.value[k] = s[sum.offset + k];
          });
        },
      };
    },

    // a pair formula's work cap is near: the first submits are short
    pairs: !!pairs,
    // GPU time of a step whose structures all work at their caps: a step can get there within a
    // submit (a gate opens, a radius grows, the layout piles up), so the runner keeps submits
    // below the watchdog with it rather than with the steps it timed
    // (the pairs and the pyramid measure theirs on the device; a grid's is its estimate for an M4
    // Max times the device's slowdown, unless it measures its own)
    get cappedMs() {
      const gridMs = [...grids].reduce((total, [kernel, grid]) => total + (grid.cappedMs ? grid.cappedMs() : gridCappedMs(kernel.section.grid) * slowdown), 0);
      return (pairs ? plan.pairs.stages.length * pairStageMs() : 0) + (tree ? tree.cappedMs() : 0) + gridMs;
    },
    // slices each pair sort's last encoded step ran in (0: one submit), for tests
    pairSlices: () => (pairs ? pairs.slices() : []),
    // the runner's measured GPU ms a step: the structures that measure themselves take the
    // device's rate from it, for their caps and capped times
    observeTiming(msPerStep) {
      if (pairs) pairs.observeTime(msPerStep);
      if (tree) tree.observeTime(msPerStep);
      // a step whose pair stages ran in slices is mostly pair work: the grids leave it out
      const sliced = !!pairs && pairs.slices().some(slices => slices > 0);
      grids.forEach(grid => { if (grid.observeTime) grid.observeTime(msPerStep, { sliced }); });
    },

    destroy() {
      owned.forEach(b => b.destroy());
      if (tree) tree.destroy();
      if (pairs) pairs.destroy();
      grids.forEach(grid => grid.destroy());
    },
  };

  function copyStatus(enc, dst, offset) {
    let at = offset;
    statuses.forEach(status => { enc.copyBufferToBuffer(status.buffer, status.offset, dst, at, status.size); at += status.size; });
  }

  function statusMessage(words) {
    let at = 0;
    for (const status of statuses) {
      if (status.observe) status.observe(words.subarray(at, at + status.size / 4));
      const message = status.message(words.subarray(at, at + status.size / 4));
      if (message) return { message, stages: status.stages };
      at += status.size / 4;
    }
    return null;
  }

  function versions() {
    const out = { pos: store.versions.pos, velocity: store.versions.velocity, columns: Object.create(null), links: Object.create(null), groups: Object.create(null) };
    Object.keys(plan.columns).forEach(name => { out.columns[name] = store.versions[name]; });
    Object.keys(plan.linkColumns).forEach(name => { out.links[name] = springs.versions[name]; });
    plan.groupColumns.forEach(name => { out.groups[name] = store.versions[name]; });
    return out;
  }

  function uploadLinkColumn(name) {
    const column = plan.linkColumns[name];
    const data = new Float32Array(column.order === 'csr' ? 2 * springs.n : springs.n);
    writeLinkColumn(Object.assign({}, column, { offset: 0 }), springs[name], data, links);
    device.queue.writeBuffer(column.order === 'csr' ? H : S, column.offset * 4, data);
  }

  function uploadColumn(name) {
    const column = plan.columns[name];
    const data = new Float32Array(n * column.width);
    placeRows(data, 0, store[name], n, column.width, toDevice);
    device.queue.writeBuffer(column.buffer === 'S' ? S : H, column.offset * 4, data);
  }

  function uploadColumns(which) {
    Object.keys(plan.columns).forEach(name => { if (which(name)) uploadColumn(name); });
  }

  function copiesOf() {
    const out = Object.create(null);
    deviceColumns.forEach(column => { out[column.name] = Float64Array.from(store[column.name].subarray(0, n * column.width)); });
    return out;
  }

  // rows of a column the host wrote: where the store differs from its copy
  function changedRows(column) {
    const now = store[column.name], was = hostCopies[column.name], w = column.width, rows = [];
    for (let i = 0; i < n * w; i++) {
      const row = Math.floor(i / w);
      if (!Object.is(now[i], was[i]) && rows[rows.length - 1] !== row) rows.push(row);
    }
    return rows;
  }

  function uploadRows(column, rows) {
    const w = column.width, values = new Float32Array(rows.length * w), now = store[column.name], was = hostCopies[column.name];
    rows.forEach((i, r) => {
      for (let k = 0; k < w; k++) values[r * w + k] = was[i * w + k] = now[i * w + k];
    });
    writeRows(S, column.offset, w, toDevice ? rows.map(deviceRow) : rows, values);
  }
}

// Rows of `source` (`width` numbers each, the store's order) into `target` from `offset`, each at
// its device row
function placeRows(target, offset, source, n, width, toDevice) {
  if (!toDevice) {
    for (let k = 0, count = n * width; k < count; k++) target[offset + k] = source[k];
    return;
  }
  for (let i = 0; i < n; i++) {
    const at = offset + toDevice[i] * width;
    for (let k = 0; k < width; k++) target[at + k] = source[i * width + k];
  }
}

// The reverse: rows read from the device (from `offset` of `data`) into `target` in the store's order
function unplaceRows(target, data, offset, n, width, toDevice) {
  if (!toDevice) {
    for (let k = 0, count = n * width; k < count; k++) target[k] = data[offset + k];
    return;
  }
  for (let i = 0; i < n; i++) {
    const at = offset + toDevice[i] * width;
    for (let k = 0; k < width; k++) target[i * width + k] = data[at + k];
  }
}

// f32 rows in the device's order
function permuteRows(values, n, width, toDevice) {
  const out = new Float32Array(values.length);
  placeRows(out, 0, values, n, width, toDevice);
  return out;
}

function sameSlot(data, last, floats) {
  if (!last) return false;
  for (let k = 0; k < floats; k++) if (!Object.is(data[k], last[k])) return false;
  return true;
}

// Links as rows of entries: every link at both of its bodies (a link from a body to itself twice),
// in link order within a row, with its index and the body's role (bit 31: the to end). Rows are the
// device's: links keep their order, their ends move with the bodies.
function linkTable(springs, n, toDevice) {
  const m = springs.n;
  let from = springs.from, to = springs.to;
  if (toDevice) {
    from = Uint32Array.from(from.subarray(0, m), i => toDevice[i]);
    to = Uint32Array.from(to.subarray(0, m), i => toDevice[i]);
  }
  const starts = new Uint32Array(n + 1);
  for (let s = 0; s < m; s++) { starts[from[s] + 1]++; starts[to[s] + 1]++; }
  for (let i = 0; i < n; i++) starts[i + 1] += starts[i];
  const fill = starts.slice(0, n);
  const other = new Uint32Array(2 * m), linkRole = new Uint32Array(2 * m), fromEntry = new Uint32Array(m);
  for (let s = 0; s < m; s++) {
    const a = from[s], b = to[s];
    const ea = fill[a]++;
    other[ea] = b; linkRole[ea] = s; fromEntry[s] = ea;
    const eb = fill[b]++;
    other[eb] = a; linkRole[eb] = (s | 0x80000000) >>> 0;
  }
  return { starts, other, linkRole, fromEntry, from, to, m };
}

// L: [starts | other | link and role | entry of each link's from end | from | to | where the
// chunks and each group block start | the chunks | the group blocks]
function linkWords(links, chunkData, groupData, n, m) {
  const header = n + 1 + 7 * m;
  let size = header + 1 + groupData.length + (chunkData ? chunkData.words.length : 0);
  groupData.forEach(block => { size += block.words.length; });
  const out = new Uint32Array(Math.max(4, size));
  out.set(links.starts, 0);
  out.set(links.other, n + 1);
  out.set(links.linkRole, n + 1 + 2 * m);
  out.set(links.fromEntry, n + 1 + 4 * m);
  for (let s = 0; s < m; s++) { out[n + 1 + 5 * m + s] = links.from[s]; out[n + 1 + 6 * m + s] = links.to[s]; }
  let at = header + 1 + groupData.length;
  if (chunkData) {
    out[header] = at;
    out.set(chunkData.words, at);
    at += chunkData.words.length;
  }
  groupData.forEach((block, k) => {
    out[header + 1 + k] = at;
    out.set(block.words, at);
    at += block.words.length;
  });
  return out;
}

// Chunks of up to LINK_CHUNK entries of one row, the chunks of a row in a row: [chunks, first chunk
// of each row (n + 1), row of each chunk, first entry of each chunk]
function chunkBlock(links, n) {
  const starts = links.starts;
  let chunks = 0;
  for (let i = 0; i < n; i++) chunks += Math.ceil((starts[i + 1] - starts[i]) / LINK_CHUNK);
  const words = new Uint32Array(2 + n + 2 * chunks);
  words[0] = chunks;
  let c = 0;
  for (let i = 0; i < n; i++) {
    words[1 + i] = c;
    for (let e = starts[i]; e < starts[i + 1]; e += LINK_CHUNK, c++) {
      words[2 + n + c] = i;
      words[2 + n + chunks + c] = e;
    }
  }
  words[1 + n] = c;
  return { words, chunks };
}

// A link column into its place in `target` (at column.offset): in CSR order (each link at both of
// its entries) or in link order. Returns true when it holds integers f32 cannot hold exactly.
function writeLinkColumn(column, source, target, links) {
  const m = links.m;
  let problem = false;
  const integers = column.type !== 'f64' && column.type !== 'f32';
  if (column.order === 'csr') {
    for (let e = 0; e < 2 * m; e++) target[column.offset + e] = source[links.linkRole[e] & 0x7fffffff];
  } else {
    for (let s = 0; s < m; s++) target[column.offset + s] = source[s];
  }
  if (integers) for (let s = 0; s < m; s++) if (Math.abs(source[s]) > F32_INTEGER) { problem = true; break; }
  return problem;
}

// The rows of a group column in group order (rows of a negative or missing group left out), cut
// into runs of at most GROUP_RUN rows of one group: [runs, groups, rows, the rows, the first row of
// each run (runs + 1), the first run of each group (groups + 1)]. The rows are the device's, in the
// store's order within a group, so groups add up in the CPU's order.
function groupBlock(column, n, toDevice) {
  const rows = [];
  for (let i = 0; i < n; i++) if (column[i] >= 0) rows.push(i);
  // by group, then by row: the order the CPU adds them up in, within a group
  rows.sort((a, b) => Math.floor(column[a]) - Math.floor(column[b]) || a - b);
  const count = rows.length ? Math.floor(column[rows[rows.length - 1]]) + 1 : 0;
  const runStarts = [], groupRuns = new Array(count + 1).fill(-1);
  let group = -1, length = 0;
  rows.forEach((row, t) => {
    const g = Math.floor(column[row]);
    if (g !== group || length === GROUP_RUN) {
      if (g !== group) { for (let q = group + 1; q <= g; q++) groupRuns[q] = runStarts.length; group = g; }
      runStarts.push(t);
      length = 0;
    }
    length++;
  });
  const runs = runStarts.length;
  runStarts.push(rows.length);
  for (let q = group + 1; q <= count; q++) groupRuns[q] = runs;
  const words = new Uint32Array(3 + rows.length + runs + 1 + count + 1);
  words[0] = runs; words[1] = count; words[2] = rows.length;
  words.set(toDevice ? rows.map(i => toDevice[i]) : rows, 3);
  words.set(runStarts, 3 + rows.length);
  words.set(groupRuns, 3 + rows.length + runs + 1);
  return { words, runs, count };
}

function countOf(plan, column) {
  const sum = Object.values(plan.sums).find(s => s.column === column);
  return sum ? sum.count : 0;
}

// runOnGpu(): the GPU runs a layout's own simulator. The layout stays the CPU view of it:
// positions come back into its store after every batch, its 'step' event fires once per readback
// and its 'stable' event from the movement between readbacks. While wrapped, layout.step() throws.
//
//   const gpu = await runOnGpu(layout, backend);   // after plan(backend) says it runs
//   gpu.step(20);           // queues 20 steps and returns; the work is submitted
//   await gpu.sync();       // the store holds positions and velocities; the host owns it until
//                           // the next gpu.step(), which uploads what changed
//   await gpu.stop();       // syncs, hands the step count back to the simulator, unwraps
//
// What changes reaches the device through the store's column versions (store.changed(name), the
// setters of bodies and springs, graph edits), settings through the simulator's setters. A graph
// edit, or a change of the step's structure, is a sync point: the device's numbers come back,
// the data is rebuilt from the store and the pipelines are fetched again (cached by their text).
// Errors halt the runner and fire 'error'; nothing falls back to the CPU on its own.
//
// The runner drives an engine (the stock grid template, templates/stock.js, or a generic plan,
// generic/engine.js) through one interface: prepare(hostOwns, steps) uploads, run(count,
// firstStep, …) encodes steps, copyPositions()/readPositions() read back, readDevice() syncs.

const READBACK_BUFFERS = 3;
const STATS_WINDOW = 30;
// Steps per submit before a step has been timed (today's module always used 64)
const DEFAULT_BATCH = 64;
// The same with pair formulas above N*, whose steps can each come near the work cap
const FIRST_PAIR_BATCH = 8;
const MAX_BATCH = 1024;
// A submit holds at most this much GPU work, far below the 2-second watchdog
const MAX_SUBMIT_MS = 100;
// ... and, should every step reach its structures' work caps, at most this much (engine.cappedMs)
const CAPPED_SUBMIT_MS = 1000;
// A readback followed this soon by a newer one (calls in one burst, as a frame that steps several
// times) is not written into the store: the newer one is a batch away and replaces it. Writing a
// large graph's positions costs milliseconds of the main thread.
const BURST_MS = 4;
// Settings that change the physics: a 'step' listener must not change them
const PHYSICS_SETTINGS = ['gravity', 'springLength', 'springCoefficient', 'dragCoefficient', 'timeStep', 'maxVelocity', 'integrator', 'theta', 'nbody', 'adaptiveTimeStepWeight'];
// Settings that shape the plan. Written straight into simulator.settings rather than through a
// setter, they fire no 'settings' event and leave programVersion() as it is, yet the CPU follows
// them: the runner compares them on every call (numbers the engines read on every call anyway)
const PLAN_SETTINGS = ['integrator', 'nbody', 'inertia', 'repulsionCharge', 'repulsionSensitivity'];
const LINK_COLUMNS = ['from', 'to', 'length', 'coefficient'];

/**
 * Runs `layout` (from ngraph.forcelayout) on the GPU of `backend` (see createWebGPUBackend()).
 * Resolves once the pipelines are compiled and the data is on the device. Rejects with the plan's
 * reasons (`error.reasons`) when the backend cannot run the layout's step.
 */
async function runOnGpu(layout, backend) {
  if (!layout || !layout.simulator) throw new Error('runOnGpu() needs a layout made by ngraph.forcelayout');
  if (!backend || !backend.device) throw new Error('runOnGpu() needs a backend from createWebGPUBackend()');
  const simulator = layout.simulator;
  if (simulator.getStage(GUARD)) throw new Error('this layout already runs on the GPU');
  if (watchDevice(backend.device).lost) throw refusal([DEVICE_LOST]);
  const plan = simulator.plan(backend);
  if (!plan.runs) throw refusal(plan.reasons);
  const runner = createRunner(layout, backend);
  await runner.start();
  return runner.api;
}

// Reasons of a lowering (check.js), as plan() words them
function reasonsOf(lowering) {
  return lowering.reasons.concat(Object.keys(lowering.stages)
    .filter(name => !lowering.stages[name].runs).map(name => name + ': ' + lowering.stages[name].reason));
}

function refusal(reasons) {
  const error = new Error('WebGPU cannot run this layout: ' + reasons.join('; '));
  error.reasons = reasons;
  return error;
}

function createRunner(layout, backend) {
  const simulator = layout.simulator;
  const store = simulator.store, springStore = simulator.springStore;
  const device = backend.device;
  const deviceState = watchDevice(device);
  const timestamps = device.features.has('timestamp-query');
  const listeners = { readback: [], error: [] };

  let lowering = null;     // check.js lower(): the plan the engine runs
  let engine = null;
  let firstStep = simulator.iteration(); // the simulator's step count when the GPU took over
  let queued = 0;          // steps submitted to the device
  let pending = 0;         // steps asked for while the runner was busy
  let busy = null;         // a build or a sync point in progress
  let halted = null, stopped = false, released = false;
  // after a structure's status (a work cap passed): the device's numbers hold steps computed
  // without that work, and the store keeps the last readback from before
  let untrusted = false;
  let hostOwns = false;    // after sync(): the store is the truth until the next step()
  let topologyChanged = false, settingsChanged = false;
  let structure = null;    // the stages the plan was made from, to notice changes cheaply
  let linkVersions = null; // link columns as built
  let fireState = null;    // FIRE's (alpha, steps downhill, ...) from the last sync
  let submitMs = 0;
  let slowdown = 1;        // how much slower than the Mac the work caps were sized on (device.js)
  let marks = null;        // what a 'step' listener must not change

  // Readbacks: positions after a batch, and (with timestamp queries) its GPU time
  const free = [], all = [];
  let querySet = null, resolveBuffer = null;
  let readSerial = 0, appliedSerial = 0, appliedSteps = 0, lastReadSteps = 0;
  const issuedAt = new Map(); // serial of a readback in flight -> when it was issued
  const samples = [];
  let lastResolve = null;
  let lastMove = 0, wasStable = false;

  const onSettings = () => { settingsChanged = true; };
  const onTopology = () => { topologyChanged = true; };
  const onDisposed = () => {
    stopped = true;
    release();
    simulator.iteration(firstStep + appliedSteps);
  };
  const onDeviceError = error => {
    if (released) return;
    // a submit that failed did not run: later readbacks would bring stale numbers
    untrusted = true;
    if (error.lost) halt({ lost: true, message: error.message, kernel: null, stages: [] });
    else halt(attribute(error.message));
  };

  const api = {
    step,
    sync,
    stop,
    on(event, callback) {
      if (!listeners[event]) throw new Error(`gpu.on(): unknown event ${event}; use 'readback' or 'error'`);
      listeners[event].push(callback);
      return api;
    },
    off(event, callback) {
      if (listeners[event]) listeners[event] = listeners[event].filter(other => other !== callback);
      return api;
    },
    stats,
    get lastMove() { return lastMove; },
    get halted() { return halted; },
    // For the test harness: the buffers the last kernel of every step writes
    _debug: { get fence() { return engine ? engine.fence : []; }, get engine() { return engine; } },
  };

  return { start, api };

  async function start() {
    // From here on, the store's positions are the GPU's: layout.step() would step a stale copy
    simulator.addStage(GUARD, guard, {
      before: simulator.stages()[0],
      describe: { shape: 'guard', how: 'stops layout.step() while the GPU runs the layout' },
    });
    simulator.on('settings', onSettings);
    simulator.on('topology', onTopology);
    layout.on('disposed', onDisposed);
    deviceState.listeners.add(onDeviceError);
    if (timestamps) {
      querySet = device.createQuerySet({ type: 'timestamp', count: 2 });
      resolveBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
    }
    try {
      submitMs = await submitCost(device);
      slowdown = backend.slowdown || await deviceSlowdown(device);
      await build();
    } catch (e) {
      release();
      throw e;
    }
  }

  function guard() {
    throw new Error('this layout runs on the GPU; call gpu.step(), or await gpu.stop() first');
  }

  // Data, pipelines and uploads from the store, as the plan of the current program says
  async function build() {
    simulator.applyEdits();
    topologyChanged = false;
    const program = simulator.program();
    // a grid field waits for the device's check of its exact arithmetic (grid/canary.js), started
    // with the backend; on a failed check the lowering refuses what needs it
    if (backend.gridCheck && program.stages.some(stage => stage.shape === 'grid')) await backend.gridCheck;
    lowering = backend.lower(program, simulator);
    if (!lowering.runs) throw refusal(reasonsOf(lowering));
    const plan = lowering.plan;
    structure = stageSnapshot(program.version);
    linkVersions = LINK_COLUMNS.map(name => springStore.versions[name]);
    marks = markList(plan);
    const create = plan.template === 'grid' ? createStockEngine : createGenericEngine;
    const next = store.n > 0 ? await create(device, { simulator, plan, fireState, warn: warnOnce, slowdown, pairEstimate: backend.pairEstimate }) : null;
    if (released) { if (next) next.destroy(); return; }
    engine = next;
    hostOwns = false;
    settingsChanged = false;
    lastReadSteps = queued;
    makeReadbacks();
  }

  /**
   * Queues `count` steps (1 by default) and returns; their work is submitted unless the runner is
   * waiting for a sync point, which runs them once it is done.
   */
  function step(count = 1) {
    count = Math.floor(count);
    if (!(count > 0) || stopped || halted) return;
    if (busy) { pending += count; return; }
    if (!prepare()) { pending += count; return; }
    run(count);
  }

  // Everything that changed on the host since the last batch reaches the device. Returns false
  // when it started a sync point instead (the steps then wait for it), or halted.
  function prepare() {
    simulator.applyEdits();
    if (topologyChanged || structureChanged()) {
      syncPoint();
      return false;
    }
    settingsChanged = false;
    if (!engine) return true;
    if (springStore.versions.from !== linkVersions[0] || springStore.versions.to !== linkVersions[1]) {
      syncPoint();
      return false;
    }
    if (springStore.versions.length !== linkVersions[2] || springStore.versions.coefficient !== linkVersions[3]) {
      // a change mark re-plans: links may now have their own lengths (no more stock template,
      // the springs read the columns), or all have the defaults again
      const verdict = backend.lower(simulator.program(), simulator);
      if (!verdict.runs) {
        halt({ message: refusal(reasonsOf(verdict)).message, kernel: null, stages: ['springs'] });
        return false;
      }
      linkVersions = LINK_COLUMNS.map(name => springStore.versions[name]);
      if (verdict.plan.dataKey !== lowering.plan.dataKey) {
        syncPoint();
        return false;
      }
    }
    const prepared = engine.prepare(hostOwns, queued);
    hostOwns = false;
    if (prepared === 'sync') { syncPoint(); return false; }
    if (prepared && prepared.halt) { halt({ message: prepared.halt, kernel: null, stages: [] }); return false; }
    return true;
  }

  // Encodes `count` steps in as few submits as the batching allows, and reads positions back. A
  // host step splits the batch at the steps where its `when` holds (asked one step at a time, so
  // the steps after it see what it did): the steps before it run, then that step stops at the
  // host step, which runs on the host while later steps wait (as at a sync point).
  function run(count) {
    if (!engine) { queued += count; return; }
    const hostSteps = (lowering.plan && lowering.plan.hostSteps) || [];
    for (let s = 0; hostSteps.length && s < count; s++) {
      const at = firstStep + queued + s;
      // a step where no host step holds at its start runs no host step: none runs to change that
      if (!hostSteps.some(name => simulator.stageValues(name, simulator.stepContext(at)).when)) continue;
      if (s > 0) runSteps(s);
      if (halted) return;
      pending += count - s - 1;
      busy = hostStep(firstStep + queued).then(() => {
        busy = null;
        if (pending && !halted && !stopped) {
          const rest = pending;
          pending = 0;
          step(rest);
        }
      }, error => {
        busy = null;
        halt({ message: error.message, kernel: null, stages: [] });
      });
      return;
    }
    runSteps(count);
  }

  // One step at a host step: its kernels up to each host step, whose `when` is asked at its turn
  // (after the host steps before it ran, as on the CPU); where it holds, the device's numbers back
  // into the store, the host step on the host, what it wrote back up, then the rest of the step
  // (whose numbers are read after the host step ran)
  async function hostStep(at) {
    const names = lowering.plan.hostSteps;
    const from = engine;
    for (let part = 0; part < engine.segments; part++) {
      engine.run(1, at, { segment: part });
      if (part === names.length || !simulator.stageValues(names[part], simulator.stepContext(at)).when) continue;
      await readDevice();
      if (released || halted || from !== engine) return;
      simulator.iteration(at);
      try {
        simulator.getStage(names[part])(simulator.store, simulator);
      } catch (e) {
        throw new Error(`the host step ${names[part]} failed: ${e.message}`);
      }
      const prepared = engine.prepare(false, queued);
      if (prepared && prepared.halt) throw new Error(prepared.halt);
    }
    queued += 1;
  }

  function runSteps(count) {
    const rb = free.pop();
    const withTs = !!rb && timestamps;
    const at = timestampsAt(engine.positionBytes);
    const result = engine.run(count, firstStep + queued, {
      timestampWrites: withTs ? { querySet } : null,
      perSubmit: stepsPerSubmit(),
      beforeFinish: rb ? enc => {
        rb.ordered = engine.copyPositions(enc, rb.buffer, 0, count);
        if (withTs) {
          enc.resolveQuerySet(querySet, 0, 2, resolveBuffer, 0);
          enc.copyBufferToBuffer(resolveBuffer, 0, rb.buffer, at, 16);
        }
        // the structures' status words (a work cap passed, a lattice too wide) come back too
        if (engine.statusBytes) engine.copyStatus(enc, rb.buffer, at + 16);
      } : null,
    });
    queued += result.ran;
    if (result.ran && rb) readBack(rb, result.ran, withTs);
    else if (rb) free.push(rb);
    if (result.halt) halt({ message: result.halt.message, kernel: null, stages: result.halt.stages || [] });
  }

  // Steps per submit: as many as fit in MAX_SUBMIT_MS of GPU time, and enough that the submit's
  // own cost stays under 10% of the work. Steps timed fast can still reach their structures' work
  // caps within a submit (a gate opens, a radius grows), so no more than fit CAPPED_SUBMIT_MS then.
  function stepsPerSubmit() {
    const ms = gpuMsPerStep();
    const capped = engine && engine.cappedMs ? Math.max(1, Math.floor(CAPPED_SUBMIT_MS / engine.cappedMs)) : MAX_BATCH;
    // before a step is timed: pair formulas near their work cap could make 64 steps long
    if (!(ms > 0)) return Math.min(capped, engine && engine.pairs ? FIRST_PAIR_BATCH : DEFAULT_BATCH);
    const most = Math.floor(MAX_SUBMIT_MS / ms);
    const least = Math.ceil(submitMs / (0.1 * ms));
    return Math.max(1, Math.min(MAX_BATCH, capped, Math.max(most, least)));
  }

  function readBack(rb, count, withTs) {
    rb.serial = ++readSerial;
    issuedAt.set(rb.serial, performance.now());
    rb.steps = queued;
    rb.count = count;
    const from = engine;
    rb.buffer.mapAsync(GPUMapMode.READ).then(() => {
      if (released) { rb.buffer.destroy(); return; }
      const bytes = rb.engine.positionBytes;
      const next = issuedAt.get(rb.serial + 1);
      const replaced = next !== undefined && next - issuedAt.get(rb.serial) < BURST_MS;
      issuedAt.delete(rb.serial);
      // the status first: with one, these positions hold steps computed without a structure's work
      const status = from === engine && engine.statusBytes ? engine.statusMessage(new Uint32Array(rb.buffer.getMappedRange(timestampsAt(bytes) + 16, engine.statusBytes))) : null;
      if (status) untrusted = true;
      if (rb.serial > appliedSerial && from === engine && !replaced && !untrusted) {
        apply(rb.serial, rb.steps, new Float32Array(rb.buffer.getMappedRange(0, bytes)), rb.ordered);
      }
      if (withTs) {
        const t = new BigUint64Array(rb.buffer.getMappedRange(timestampsAt(bytes), 16));
        const ns = Number(t[1] - t[0]);
        if (t[1] > t[0] && ns < 60e9) addSample(ns / 1e6, count);
      } else {
        const now = performance.now();
        if (lastResolve && rb.steps > lastResolve.steps) addSample(now - lastResolve.time, rb.steps - lastResolve.steps);
        lastResolve = { time: now, steps: rb.steps };
      }
      rb.buffer.unmap();
      if (rb.engine === engine) free.push(rb); else rb.buffer.destroy();
      if (status) {
        halt({ message: `${status.message} (by step ${firstStep + rb.steps})`, kernel: null, stages: status.stages || [], status: true });
        return;
      }
      afterReadback();
    }, () => { issuedAt.delete(rb.serial); /* destroyed, or the device was lost */ }).catch(error => {
      // a bug here, or a listener that threw: say so, rather than stop reading back in silence
      if (rb.buffer.mapState === 'mapped') rb.buffer.unmap();
      if (rb.engine === engine && free.indexOf(rb) < 0) free.push(rb);
      halt({ message: 'reading positions back failed: ' + error.message, kernel: null, stages: [] });
    });
  }

  // Positions after `steps` into the store. The movement is unknown (null) across graph edits:
  // lastMove then stays as it was, rather than read as a layout at rest
  function apply(serial, steps, positions, inStoreOrder) {
    appliedSerial = serial;
    const done = steps - appliedSteps;
    const move = engine.readPositions(positions, Math.max(1, done), inStoreOrder, steps);
    if (done > 0 && move !== null) lastMove = move;
    appliedSteps = steps;
    simulator.iteration(firstStep + steps);
  }

  // The layout's 'step' fires once per readback, then 'stable' when that changed, then the
  // runner's 'readback'. A 'step' listener that changes what the GPU reads halts the runner: on
  // the CPU it would run after every step, here only once per batch.
  function afterReadback() {
    if (appliedSteps === lastReadSteps || halted || released) return;
    lastReadSteps = appliedSteps;
    const before = marks.map(mark => mark.read());
    layout.lastMove = lastMove;
    try {
      layout.fire('step');
    } catch (e) {
      halt({ message: "a 'step' listener failed: " + e.message, kernel: null, stages: [] });
      return;
    }
    const changed = marks.findIndex((mark, i) => mark.read() !== before[i]);
    if (changed >= 0) {
      halt({
        message: `a 'step' listener changed ${marks[changed].name}. On the GPU, 'step' fires once per readback, not after ` +
          'every step, so listeners must not change the physics: use a formula, a sum, a host step, or a \'settings\' listener',
        kernel: null, stages: [],
      });
      return;
    }
    if (layout.checkStable) {
      // the layout's own check, from the positions this readback brought (it counts the steps
      // by the simulator's iteration, set in apply())
      layout.checkStable();
    } else {
      const isStable = store.n === 0 || lastMove / store.n <= 0.01;
      if (isStable !== wasStable) {
        wasStable = isStable;
        layout.fire('stable', isStable);
      }
    }
    try {
      emit('readback', { steps: firstStep + appliedSteps, lastMove });
    } catch (e) {
      halt({ message: "a 'readback' listener failed: " + e.message, kernel: null, stages: [] });
    }
  }

  /**
   * Resolves when every step asked for so far has run and the store holds the positions and
   * velocities they made. The host then owns the store: the next step() uploads it.
   */
  async function sync() {
    while (busy) await busy;
    if (released) return;
    if (pending && !halted) {
      const count = pending;
      pending = 0;
      step(count);
      while (busy) await busy;
    }
    if (released || !engine || untrusted) { hostOwns = true; return; }
    await readDevice();
    hostOwns = true;
    afterReadback();
  }

  // Positions, velocities, device columns, sums and FIRE's state after every submitted step,
  // into the store
  async function readDevice() {
    const serial = ++readSerial, steps = queued, from = engine;
    issuedAt.set(serial, performance.now());
    const state = await engine.readDevice();
    issuedAt.delete(serial);
    if (!state || released || from !== engine || untrusted) return;
    if (state.status) {
      untrusted = true;
      halt({ message: `${state.status.message} (by step ${firstStep + steps})`, kernel: null, stages: state.status.stages || [], status: true });
      return;
    }
    if (serial > appliedSerial) apply(serial, steps, state.positions, true);
    state.apply();
    fireState = state.fireState;
  }

  // Graph edits and new structure: the device's numbers come back, then everything is built
  // again from the store
  function syncPoint() {
    busy = (async () => {
      if (engine && !untrusted) await readDevice();
      dropEngine();
      await build();
    })().then(() => {
      busy = null;
      if (pending && !halted && !stopped) {
        const count = pending;
        pending = 0;
        step(count);
      }
    }, error => {
      busy = null;
      halt({ message: error.message, kernel: error.kernel || null, stages: error.kernel ? stagesOf(error.kernel) : [] });
    });
  }

  /**
   * Syncs, gives the simulator the step count, and unwraps the layout: layout.step() works again.
   * Resolves to the step count.
   */
  async function stop() {
    if (stopped) return simulator.iteration();
    try {
      await sync();
    } catch (e) { /* the store keeps the last readback */ }
    stopped = true;
    release();
    simulator.iteration(firstStep + appliedSteps);
    return simulator.iteration();
  }

  function release() {
    if (released) return;
    released = true;
    pending = 0;
    simulator.removeStage(GUARD);
    simulator.off('settings', onSettings);
    simulator.off('topology', onTopology);
    layout.off('disposed', onDisposed);
    deviceState.listeners.delete(onDeviceError);
    dropEngine();
    if (querySet) querySet.destroy();
    if (resolveBuffer) resolveBuffer.destroy();
  }

  function dropEngine() {
    if (engine) engine.destroy();
    engine = null;
    for (const rb of all) {
      // a buffer still mapping is destroyed when its readback returns
      if (free.indexOf(rb) >= 0) rb.buffer.destroy();
    }
    all.length = 0;
    free.length = 0;
  }

  function makeReadbacks() {
    if (!engine) return;
    // positions | timestamps (16 bytes) | the structures' status words
    const size = Math.max(16, timestampsAt(engine.positionBytes) + 16 + (engine.statusBytes || 0));
    for (let r = 0; r < READBACK_BUFFERS; r++) {
      const rb = { buffer: device.createBuffer({ size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST }), engine };
      all.push(rb);
      free.push(rb);
    }
  }

  function halt(error) {
    if (halted || released) return;
    halted = error;
    pending = 0;
    emit('error', error);
  }

  // Which kernel an error message names, and the stages it computes
  function attribute(message) {
    const kernels = engine ? Object.keys(engine.kernelStages) : [];
    const kernel = kernels.find(name => message.indexOf('"' + name + '"') >= 0) || null;
    return { message, kernel, stages: kernel ? stagesOf(kernel) : [] };
  }

  function stagesOf(kernel) {
    const stages = engine && engine.kernelStages[kernel];
    return stages ? stages.slice() : [];
  }

  // The step's structure, to notice a change cheaply on every call: the stages and their
  // functions (a stage added, removed or replaced), columns defined or removed, and, after a
  // 'settings' event, program().version (the law, the inertia, the integrator, charge columns,
  // the adaptive time step); and settings written without a setter (planSettings())
  function stageSnapshot(version) {
    const names = simulator.stages();
    return { names, runs: names.map(name => simulator.getStage(name)), columns: store.columnsVersion + springStore.columnsVersion, version, settings: planSettings() };
  }

  function planSettings() {
    const settings = simulator.settings;
    return PLAN_SETTINGS.map(key => settings[key]).concat(settings.adaptiveTimeStepWeight > 0);
  }

  function structureChanged() {
    const settings = planSettings();
    if (settings.some((value, i) => !Object.is(value, structure.settings[i]))) return true;
    if (simulator.programVersion) return simulator.programVersion() !== structure.version;
    const names = simulator.stages();
    if (names.length !== structure.names.length) return true;
    for (let i = 0; i < names.length; i++) {
      if (names[i] !== structure.names[i] || simulator.getStage(names[i]) !== structure.runs[i]) return true;
    }
    if (store.columnsVersion + springStore.columnsVersion !== structure.columns) return true;
    return settingsChanged && simulator.program().version !== structure.version;
  }

  // What a 'step' listener must not change: the columns the plan reads, the link columns, the
  // physics settings, the law and the inertia
  function markList(plan) {
    const columns = plan.reads || ['pos', 'velocity', 'mass', 'pinned'];
    const out = columns.map(name => ({ name: 'the column ' + name, read: () => store.versions[name] }));
    const links = LINK_COLUMNS.concat(Object.keys(plan.linkColumns || {}).filter(name => LINK_COLUMNS.indexOf(name) < 0));
    links.forEach(name => out.push({ name: 'the link column ' + name, read: () => springStore.versions[name] }));
    PHYSICS_SETTINGS.forEach(key => out.push({ name: 'the setting ' + key, read: () => simulator.settings[key] }));
    out.push({ name: 'the repulsion law', read: () => simulator.repulsionLaw() });
    out.push({ name: 'the inertia', read: () => simulator.settings.inertia });
    return out;
  }

  function gpuMsPerStep() {
    let ms = 0, steps = 0;
    for (const s of samples) { ms += s.ms; steps += s.steps; }
    return steps ? ms / steps : 0;
  }

  function addSample(ms, steps) {
    if (engine && engine.observeTiming) engine.observeTiming(ms / steps);
    samples.push({ ms, steps });
    if (samples.length > STATS_WINDOW) samples.shift();
  }

  /**
   * {msPerStep, source, steps, engine, nodes, stepsPerSubmit, slowdown, halted}: msPerStep is GPU
   * time per step from timestamp queries when the device has them, else wall clock between
   * readbacks; slowdown is how many times slower than the Mac the work caps were sized on the
   * device measured.
   */
  function stats() {
    return {
      msPerStep: gpuMsPerStep(),
      source: timestamps ? 'gpu-timestamps' : 'wall-clock',
      steps: firstStep + queued,
      engine: engine ? engine.kind : 'none',
      nodes: engine ? engine.n : 0,
      stepsPerSubmit: stepsPerSubmit(),
      slowdown,
      halted: halted ? halted.message : null,
    };
  }

  function emit(event, payload) {
    listeners[event].slice().forEach(callback => callback(payload));
  }
}

// Timestamps follow the positions in a readback, at an offset getMappedRange() takes
function timestampsAt(positionBytes) {
  return Math.ceil(positionBytes / 8) * 8;
}

const warned = new Set();
function warnOnce(message) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn('ngraph.forcelayout.gpu: ' + message);
}

// ngraph.forcelayout.gpu: runs a layout of ngraph.forcelayout on WebGPU. The layout keeps its API;
// the GPU runs its own simulator, from the step as data (simulator.program()), and positions come
// back into its store.
//
//   const backend = await createWebGPUBackend();      // null without WebGPU
//   const plan = layout.simulator.plan(backend);      // {runs, reasons, warnings, stages}
//   const gpu = await runOnGpu(layout, backend);      // rejects with plan.reasons
//   gpu.step(20);                                     // queues 20 steps, returns at once
//   layout.getNodePosition(id);                       // the store, updated by every readback
//   await gpu.stop();                                 // back to layout.step() on the CPU
//
// See README.md for the parts of the module.

/**
 * A backend for `simulator.plan(backend)` and `runOnGpu(layout, backend)`, or null when WebGPU is
 * not available. Pass `{device}` to use a device you already have; otherwise one is requested
 * with the adapter's limits for storage buffers, workgroups and buffer sizes, and with timestamp
 * queries when the adapter has them. The backend plans against the device's limits, and against
 * what its compiler keeps of the grid field's exact arithmetic: a check (grid/canary.js) that
 * starts here and is not waited for; `backend.gridCheck` settles when it is done, and runOnGpu
 * waits for it when the layout has a grid stage.
 */
async function createWebGPUBackend(options = {}) {
  const device = options.device || await requestDevice(LIMIT_NAMES);
  if (!device) return null;
  const state = watchDevice(device);
  const limits = {};
  for (const name of LIMIT_NAMES) limits[name] = device.limits[name];
  const forced = options.gridArithmetic;
  limits.gridArithmetic = forced && !forced.then ? forced : GRID_CHECK_PENDING;
  const gridCheck = Promise.resolve(forced || gridArithmetic(device)).then(result => { limits.gridArithmetic = result; return result; });
  // For tests and measurements: `gridArithmetic` stands for the grid's check of the device
  // ({sums, residual, reason}, or a promise of it), `generic: true` runs the stock step with the
  // generic engine too, `smallGraph` moves N* (one kernel and exact pairs up to it),
  // `pairEstimate` scales the pair formulas' expected work (below 1 their guard halts steps it did
  // not plan for), `slowdown` stands for the speed probe's factor (device.js), `renumber: false`
  // keeps large layouts in the store's row order on the device
  return Object.assign(createCapabilities(limits, { generic: !!options.generic, smallGraph: options.smallGraph, renumber: options.renumber, lost: () => !!state.lost }),
    { device, pairEstimate: options.pairEstimate || 1, slowdown: options.slowdown || 0, gridCheck });
}

export { createWebGPUBackend, runOnGpu };
