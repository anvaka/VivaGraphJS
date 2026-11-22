// render(graph): a graph on screen in one call.
//
// It puts together what ngraph.forcelayout and its add-on modules offer, with the choices their
// demo makes: a force layout that starts from pivot positions, drawn with WebGL, running on
// WebGPU when the graph is big and the device has a real GPU, stepping as much as a frame can
// carry, and stopping by itself once the drawing has settled.
//
//   const viva = render(graph);                       // fills the page
//   const viva = render(graph, element, {layout: {springLength: 20}});
//   viva.on('settled', e => console.log('done in', e.step, 'steps'));
//   viva.view.on('tap', e => e.node && console.log(e.node.id));
//
// Everything it builds stays reachable (viva.layout, viva.view, viva.scene), so nothing here has
// to be configured through render() alone.
import createEvents from 'ngraph.events';
import {
  createLayout, createScene, createView, placeNodes,
  styleNodes, fitLayout, labelNodes, hoverNodes, dragNodes, selectNodes, inspectNodes,
  navigateNodes, searchNodes, pulseNodes
} from './deps.js';
import {frameBudgetOf, hasHardwareWebGPU, stepsForFrame} from './device.js';
import {hasNames} from './names.js';

// With `gpu: 'auto'`, graphs below this many nodes stay on the CPU. Up to about this size a CPU
// step takes 0.4 ms or less (M4 Max; Barabasi-Albert graphs), so a frame already runs the most
// steps it may (10), and the GPU has nothing to add. At 5,000 nodes the CPU is down to 7 steps
// a frame, at 20,000 to one.
export const GPU_MIN_NODES = 2000;

const DEFAULTS = {
  // Settings for ngraph.forcelayout (see its README), or `graph => layout` to build your own
  layout: null,
  // 'pivot': nodes start where graph distances put them, so the layout only polishes.
  // 'random': the layout's own start.
  start: 'pivot',
  // 'auto': WebGPU for graphs of GPU_MIN_NODES nodes and more, on a hardware adapter.
  // true: WebGPU whenever there is a hardware adapter. false: always the CPU.
  gpu: 'auto',
  // Layout steps per frame; 0 fits as many as `frameBudget` ms allow (1 to 10)
  stepsPerFrame: 0,
  // ms of layout work per frame for stepsPerFrame 0. Default: 8, or 4 on phones and tablets.
  frameBudget: 0,
  // Stop stepping once the layout has settled; it runs again when something wakes it
  autoStop: true,
  // Start running at once
  run: true,
  // Canvas color
  background: '#0e1624',
  // Options of the view's style module (colorBy, palette, color, ...); false: don't attach it
  style: {},
  // 'auto': labels when the nodes have names. true: always (ids when there is nothing else).
  // false: never. An object: options of the view's labels module.
  labels: 'auto',
  // Hover, drag, select, tooltips, keyboard navigation and search
  interactive: true,
  // Keep the whole drawing in view until the user moves the camera. An object: fit options.
  fit: true,
  // More options for the view itself (nodeColor, linkColor, reach, ...)
  view: null
};

export default function render(graph, target, options) {
  if (!graph || typeof graph.forEachNode !== 'function') {
    throw new Error('render() needs a graph (see createGraph())');
  }
  if (target && !isElement(target)) {
    options = target;
    target = options.container;
  }
  const settings = Object.assign({}, DEFAULTS, options);
  const frameBudget = settings.frameBudget > 0 ? settings.frameBudget : frameBudgetOf();
  let stepsPerFrame = Math.max(0, Math.round(settings.stepsPerFrame) || 0);

  const events = createEvents({});
  const stage = createCanvas(target);
  const canvas = stage.canvas;
  // No multisampling: the view smooths its own edges, and multisampled blending is slow
  const scene = createScene(canvas, {wglContextOptions: {antialias: false}});
  // Until the camera fits the drawing: about the size a small layout has
  scene.setViewBox({left: -100, top: -100, right: 100, bottom: 100});

  let layout = startLayout();
  let view, fitter = null;
  try {
    view = createView(scene, Object.assign({graph, layout}, settings.view));
    attachModules();
  } catch (e) {
    // e.g. WebGL lacks what the view needs: leave nothing behind
    if (view) view.dispose();
    layout.dispose();
    scene.dispose();
    stage.dispose();
    throw e;
  }

  let disposed = false;
  let isRunning = false;
  // The layout settled and the loop stopped by itself (not paused by the caller)
  let autoStopped = false;
  // {step, reason} of the last settling, while the layout stays settled
  let settled = null;
  let rafHandle = 0;
  let steps = 0, lastFrameSteps = 0;
  let stepTimes = [];

  // The GPU runs the layout's own simulator when its plan says it can (`gpu`); otherwise the
  // layout steps on the CPU and `gpuReason` says why.
  let gpuModule = null, gpuBackend = null, gpu = null, gpuReason = '';
  // Starting and stopping the GPU runs one change at a time; frames don't step meanwhile
  let changes = Promise.resolve(), changing = false;

  const stopWatchingRatio = watchPixelRatio(ratio => scene.setPixelRatio(ratio));
  const stopWatchingSize = watchSize(canvas, () => scene.setPixelRatio(scene.getPixelRatio()));

  watchStability(layout);
  const ready = chooseBackend();
  if (settings.run) resume();

  const api = {
    graph,
    scene,
    view,
    canvas,
    /** The layout that runs now (restart() makes a new one) */
    get layout() { return layout; },
    /** Resolves with 'webgpu' or 'cpu', once it is known where the layout runs */
    ready,
    resume,
    pause,
    isRunning: () => isRunning,
    restart,
    fit,
    stats,
    setStepsPerFrame(n) { stepsPerFrame = Math.max(0, Math.round(n) || 0); },
    on(name, fn) { events.on(name, fn); return api; },
    off(name, fn) { events.off(name, fn); return api; },
    dispose
  };
  return api;

  function startLayout() {
    let made = typeof settings.layout === 'function'
      ? settings.layout(graph)
      // Dual tree repulsion: the same forces as the library's default quad tree, several times
      // faster on big graphs
      : createLayout(graph, Object.assign({nbody: 'dualtree'}, settings.layout));
    if (!made || typeof made.step !== 'function') throw new Error('The `layout` function has to return a layout');
    if (settings.start === 'pivot' && graph.getNodesCount() > 2) {
      let simulator = made.simulator;
      placeNodes(graph, made, {dimensions: simulator.store.D, unit: simulator.springLength()});
    } else if (settings.start !== 'pivot' && settings.start !== 'random') {
      throw new Error('Unknown start: ' + settings.start + '. Expected `pivot` or `random`');
    }
    return made;
  }

  function attachModules() {
    let named = hasNames(graph);
    if (settings.style !== false) {
      let springLength = layout.simulator.springLength();
      let style = {background: settings.background};
      // Node sizes follow the length of links
      if (springLength > 0 && springLength !== 10) style.unit = springLength / 10;
      view.use(styleNodes, Object.assign(style, settings.style));
    }
    if (settings.fit) {
      // No room for labels at the sides when there are none
      let labelled = settings.labels === true || (settings.labels && settings.labels !== 'auto') || named;
      fitter = view.use(fitLayout, Object.assign(labelled ? {} : {labelRoom: null}, settings.fit === true ? null : settings.fit));
    }
    if (settings.interactive) {
      view.use(hoverNodes);
      view.use(dragNodes);
      view.use(selectNodes);
      view.use(inspectNodes);
      view.use(navigateNodes);
      view.use(searchNodes);
      // A node that search goes to comes close and sends out two fading rings: on a big graph it
      // is a dot among thousands. Fit (the 0 key) goes back to the whole drawing.
      view.use(pulseNodes, {color: 0x7fe7efff});
      view.on('search', e => { if (e.node && fitter) fitter.zoomTo(e.node); });
    }
    if (settings.labels === true) view.use(labelNodes);
    else if (settings.labels === 'auto') { if (named) view.use(labelNodes); }
    else if (settings.labels) view.use(labelNodes, settings.labels);
  }

  // When the layout settles (the drawing stopped changing, or only jitter is left), the frame
  // loop stops: no more steps, no more GPU work. When it wakes (a node is moved by hand, the
  // graph or a setting changes), the loop runs again until it settles again.
  function watchStability(target) {
    settled = null;
    target.on('stable', isStable => {
      if (target !== layout || disposed) return;
      if (isStable) {
        settled = {step: steps, reason: target.getStability().reason};
        if (isRunning && settings.autoStop) {
          autoStopped = true;
          setRunning(false);
        }
        events.fire('settled', settled);
      } else {
        settled = null;
        events.fire('wake');
        resumeIfSettled();
      }
    });
  }

  function resumeIfSettled() {
    if (!autoStopped) return;
    autoStopped = false;
    setRunning(true);
  }

  /** Runs the layout; on a settled layout, keeps it going until it settles again */
  function resume() {
    if (disposed) return;
    autoStopped = false;
    settled = null;
    setRunning(true);
  }

  /** Stops stepping; the drawing still follows the camera, and nodes can still be dragged */
  function pause() {
    autoStopped = false;
    setRunning(false);
  }

  function setRunning(newIsRunning) {
    isRunning = newIsRunning;
    if (isRunning && !rafHandle) rafHandle = requestAnimationFrame(frame);
  }

  function frame() {
    rafHandle = 0;
    if (!isRunning) return;
    rafHandle = requestAnimationFrame(frame);
    if (changing) return;

    let count = stepsForFrame(stepsPerFrame, msPerStep(), frameBudget);
    lastFrameSteps = count;
    let start = performance.now();
    if (gpu) {
      gpu.step(count);
    } else {
      // Each step fires the layout's 'step' event, on which the view asks for a frame
      for (let i = 0; i < count; ++i) layout.step();
    }
    steps += count;
    stepTimes.push((performance.now() - start) / count);
    if (stepTimes.length > 30) stepTimes.shift();
  }

  function msPerStep() {
    if (gpu) return gpu.stats().msPerStep;
    if (stepTimes.length === 0) return 0;
    return stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length;
  }

  /** A fresh layout of the same graph with the same settings: new positions, no velocities */
  function restart() {
    if (disposed) return ready;
    return changeLayout(() => {
      layout.dispose();
      layout = startLayout();
      watchStability(layout);
      view.setLayout(layout);
      steps = 0;
      stepTimes = [];
      resumeIfSettled();
      fit();
    });
  }

  /** Back to the whole drawing, following it again */
  function fit() {
    if (fitter) fitter.fit();
  }

  function stats() {
    return {
      // where the layout runs now
      backend: gpu ? 'webgpu' : 'cpu',
      // why it runs on the CPU although WebGPU was asked for ('' when it wasn't, or it runs there)
      gpuReason,
      running: isRunning,
      settled,
      steps,
      msPerStep: msPerStep(),
      stepsPerFrame: lastFrameSteps,
      nodes: graph.getNodesCount(),
      links: graph.getLinksCount()
    };
  }

  // Decides once where the layout runs, and starts the GPU if that is where
  async function chooseBackend() {
    let wanted = settings.gpu === true || (settings.gpu === 'auto' && graph.getNodesCount() >= GPU_MIN_NODES);
    if (!wanted) return 'cpu';
    try {
      if (!(await hasHardwareWebGPU())) {
        gpuReason = 'no hardware WebGPU adapter';
        return 'cpu';
      }
      gpuModule = await import('./gpu.js');
      gpuBackend = await gpuModule.createWebGPUBackend();
      if (!gpuBackend) {
        gpuReason = 'no WebGPU device';
        return 'cpu';
      }
    } catch (e) {
      gpuReason = e.message;
      return 'cpu';
    }
    if (disposed) return 'cpu';
    await changeLayout(null);
    return gpu ? 'webgpu' : 'cpu';
  }

  // Runs `change` (which may replace the layout) with the GPU stopped, then starts the GPU again
  // when it is in use and the layout's plan runs there. Changes run one at a time.
  function changeLayout(change) {
    changes = changes.then(async () => {
      if (disposed) return;
      changing = true;
      try {
        if (gpu) {
          let running = gpu;
          gpu = null;
          await running.stop();
        }
        if (change) change();
        if (gpuBackend && !disposed) await startGpu();
      } catch (e) {
        console.error('VivaGraph: switching the layout failed', e);
      } finally {
        changing = false;
        // Stopping the GPU brought its last positions into the layout
        if (!disposed) view.invalidate();
      }
    });
    return changes;
  }

  async function startGpu() {
    let target = layout;
    let plan = target.simulator.plan(gpuBackend);
    if (!plan.runs) {
      gpuReason = plan.reasons.join('; ');
      return;
    }
    gpuReason = '';
    try {
      let running = await gpuModule.runOnGpu(target, gpuBackend);
      if (target !== layout || disposed) {
        await running.stop();
        return;
      }
      gpu = running;
      gpu.on('error', e => {
        // Stepping stopped on the GPU: carry on with the CPU from the last positions
        gpuReason = e.lost ? 'the WebGPU device was lost' : e.message;
        gpuBackend = null;
        changeLayout(null);
      });
    } catch (e) {
      gpuReason = e.reasons ? e.reasons.join('; ') : e.message;
    }
  }

  /** Stops everything and frees the GPU resources; removes the canvas if render() made it */
  function dispose() {
    if (disposed) return;
    disposed = true;
    isRunning = false;
    cancelAnimationFrame(rafHandle);
    rafHandle = 0;
    stopWatchingRatio();
    stopWatchingSize();
    let running = gpu;
    gpu = null;
    // The GPU hands the layout back before the layout goes
    Promise.resolve(running && running.stop()).catch(() => {}).then(() => layout.dispose());
    view.dispose();
    scene.dispose();
    stage.dispose();
  }
}

function isElement(value) {
  return !!value && typeof value === 'object' && value.nodeType === 1;
}

// The canvas to draw on: `target` itself when it is a canvas, else a new canvas that fills
// `target` (the whole window when there is no target)
function createCanvas(target) {
  if (target && target.tagName === 'CANVAS') return {canvas: target, dispose() {}};
  let container = target || document.body;
  let canvas = document.createElement('canvas');
  canvas.style.cssText = target
    ? 'display:block;width:100%;height:100%'
    : 'position:fixed;inset:0;width:100%;height:100%';
  // First in its container: what the page already has there (a legend, a toolbar) stays on top
  container.insertBefore(canvas, container.firstChild);
  if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
    console.warn('VivaGraph: the container has no size, so nothing will show. Give it a width and a height.');
  }
  return {canvas, dispose() { canvas.remove(); }};
}

// Calls `onChange(ratio)` whenever window.devicePixelRatio changes: browser zoom, or a move to a
// screen of another density. Returns a function that stops.
function watchPixelRatio(onChange) {
  if (typeof matchMedia !== 'function') return () => {};
  let query = null;
  let listen = () => {
    // Matches only the current ratio: it stops matching once the ratio changes
    query = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener('change', changed, {once: true});
  };
  let changed = () => {
    listen();
    onChange(window.devicePixelRatio);
  };
  listen();
  return () => query.removeEventListener('change', changed);
}

// Calls `onChange()` when the canvas box changes size without the window doing so (a panel
// opens, a splitter moves): the scene itself listens to the window only
function watchSize(canvas, onChange) {
  if (typeof ResizeObserver !== 'function') return () => {};
  let width = canvas.offsetWidth, height = canvas.offsetHeight;
  let observer = new ResizeObserver(() => {
    if (canvas.offsetWidth === width && canvas.offsetHeight === height) return;
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    onChange();
  });
  observer.observe(canvas);
  return () => observer.disconnect();
}
