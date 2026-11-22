// Runs the built library in headless Chrome: `npm run build && npm run test:browser`.
// Chrome comes from CHROME_PATH, or from where it is usually installed.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const TYPES = {'.html': 'text/html', '.js': 'text/javascript'};

const chrome = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium'
].find(file => file && existsSync(file));
if (!chrome) {
  console.error('No Chrome found; set CHROME_PATH');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    let body = await readFile(file);
    res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream'}).end(body);
  } catch (e) {
    res.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  // WebGL without a GPU (CI machines), and WebGPU where the machine has one
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu', '--window-size=1000,700']
});

const tests = [];
const test = (name, fn) => tests.push({name, fn});

// Each test gets a fresh page with `Viva` (the script-tag build) loaded
async function openPage(file = 'test/browser/page.html') {
  let page = await browser.newPage();
  let errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(`${base}/${file}`);
  page.errors = errors;
  return page;
}

test('a script tag and one call draw a named graph and stop when it settles', async () => {
  let page = await openPage();
  let result = await page.evaluate(async () => {
    let graph = Viva.createGraph();
    let names = ['Alice', 'Bob', 'Carol', 'Dave', 'Erin', 'Frank', 'Grace', 'Heidi'];
    names.forEach((name, i) => {
      graph.addLink(name, names[(i + 1) % names.length]);
      if (i % 2 === 0) graph.addLink(name, names[(i + 3) % names.length]);
    });
    // What the page already shows stays on top of the canvas
    let note = document.body.appendChild(document.createElement('div'));
    note.style.cssText = 'position:fixed;left:10px;top:10px;width:100px;height:20px';
    let viva = window.viva = Viva.render(graph);
    let backend = await viva.ready;
    let settled = await new Promise(resolve => viva.on('settled', resolve));
    // let the loop notice that it stopped
    await new Promise(resolve => setTimeout(resolve, 100));
    let positions = [];
    graph.forEachNode(node => { let p = viva.layout.getNodePosition(node.id); positions.push(p.x, p.y); });
    return {
      backend, settled, positions,
      running: viva.isRunning(),
      stats: viva.stats(),
      modules: ['style', 'fit', 'hover', 'drag', 'select', 'inspect', 'navigate', 'search', 'labels'].filter(name => viva.view.getModule(name)),
      canvas: {fixed: getComputedStyle(viva.canvas).position, width: viva.canvas.offsetWidth, height: viva.canvas.offsetHeight},
      ink: countInk(viva),
      noteOnTop: document.elementFromPoint(20, 20) === note,
      version: Viva.version
    };

    // pixels that differ from the corner (the background), read right after a draw
    function countInk(viva) {
      viva.scene.renderFrame(true);
      let gl = viva.scene.getGL();
      let w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      let pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (Math.abs(pixels[i] - pixels[0]) + Math.abs(pixels[i + 1] - pixels[1]) + Math.abs(pixels[i + 2] - pixels[2]) > 24) count += 1;
      }
      return {count, background: [pixels[0], pixels[1], pixels[2]]};
    }
  });
  assert.deepEqual(page.errors, []);
  assert.equal(result.backend, 'cpu', 'a small graph stays on the CPU');
  assert.ok(result.settled.step > 0, 'it settled after some steps');
  assert.equal(result.running, false, 'the loop stopped by itself');
  assert.equal(result.stats.settled.step, result.settled.step);
  assert.ok(result.positions.every(Number.isFinite), 'positions are numbers');
  assert.ok(new Set(result.positions.map(x => x.toFixed(3))).size > 8, 'nodes are apart');
  assert.deepEqual(result.modules, ['style', 'fit', 'hover', 'drag', 'select', 'inspect', 'navigate', 'search', 'labels']);
  assert.equal(result.canvas.fixed, 'fixed');
  assert.ok(result.canvas.width > 500 && result.canvas.height > 300, 'the canvas fills the window');
  assert.deepEqual(result.ink.background, [14, 22, 36], 'the canvas has the default background');
  assert.ok(result.ink.count > 500, `the graph is drawn (${result.ink.count} pixels)`);
  assert.equal(result.noteOnTop, true, 'the page\'s own elements stay on top of the canvas');
  assert.match(result.version, /^\d+\.\d+\.\d+/);
  await page.close();
});

test('a container, layout settings, no labels for numbered nodes, pause, restart and dispose', async () => {
  let page = await openPage();
  let result = await page.evaluate(async () => {
    let graph = Viva.createGraph();
    for (let i = 0; i < 60; i++) graph.addLink(i, (i + 1) % 60);
    let box = document.getElementById('box');
    let viva = Viva.render(graph, box, {layout: {springLength: 30, dimensions: 3}, interactive: false, autoStop: false});
    let out = {};
    out.inBox = viva.canvas.parentNode === box;
    out.size = [viva.canvas.offsetWidth, viva.canvas.offsetHeight];
    out.dimensions = viva.layout.simulator.store.D;
    out.springLength = viva.layout.simulator.springLength();
    out.labels = !!viva.view.getModule('labels');
    out.hover = !!viva.view.getModule('hover');
    await wait(300);
    out.stepsWhileRunning = viva.stats().steps;
    viva.pause();
    await wait(50);
    let paused = viva.stats().steps;
    await wait(200);
    out.stepsWhilePaused = viva.stats().steps - paused;
    viva.resume();
    await wait(200);
    out.stepsAfterResume = viva.stats().steps - paused;
    let before = viva.layout;
    await viva.restart();
    out.newLayout = viva.layout !== before;
    out.stepsAfterRestart = viva.stats().steps;
    await wait(200);
    out.runsAfterRestart = viva.stats().steps > out.stepsAfterRestart;
    // the box changes size without the window doing so
    box.style.width = '300px';
    await wait(200);
    out.resized = [viva.canvas.offsetWidth, viva.canvas.width / viva.scene.getPixelRatio()];
    viva.dispose();
    out.canvasLeft = box.querySelectorAll('canvas').length;
    let after = viva.stats().steps;
    await wait(200);
    out.stepsAfterDispose = viva.stats().steps - after;
    return out;

    function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  });
  assert.deepEqual(page.errors, []);
  assert.equal(result.inBox, true);
  assert.deepEqual(result.size, [600, 400]);
  assert.equal(result.dimensions, 3);
  assert.equal(result.springLength, 30);
  assert.equal(result.labels, false, 'numbered nodes get no labels');
  assert.equal(result.hover, false, 'interactive: false attaches no input modules');
  assert.ok(result.stepsWhileRunning > 0, 'it steps');
  assert.equal(result.stepsWhilePaused, 0);
  assert.ok(result.stepsAfterResume > 0);
  assert.equal(result.newLayout, true);
  assert.equal(result.runsAfterRestart, true);
  assert.deepEqual(result.resized, [300, 300], 'the canvas follows its container');
  assert.equal(result.canvasLeft, 0, 'dispose removes the canvas it made');
  assert.equal(result.stepsAfterDispose, 0);
  await page.close();
});

test('a settled layout wakes when the graph grows, and settles again', async () => {
  let page = await openPage();
  let result = await page.evaluate(async () => {
    let graph = Viva.createGraph();
    for (let i = 0; i < 12; i++) graph.addLink('n' + i, 'n' + ((i + 1) % 12));
    let viva = Viva.render(graph);
    let events = [];
    viva.on('settled', () => events.push('settled'));
    viva.on('wake', () => events.push('wake'));
    await until(() => events.includes('settled'));
    let stepsAtRest = viva.stats().steps;
    for (let i = 0; i < 6; i++) graph.addLink('n0', 'leaf' + i);
    await until(() => events.filter(name => name === 'settled').length === 2);
    let p = viva.layout.getNodePosition('leaf3');
    return {events, moreSteps: viva.stats().steps - stepsAtRest, leaf: [p.x, p.y], nodes: viva.stats().nodes};

    function until(done) {
      return new Promise((resolve, reject) => {
        let started = Date.now();
        (function check() {
          if (done()) resolve();
          else if (Date.now() - started > 20000) reject(new Error('timed out; events: ' + events.join(',')));
          else setTimeout(check, 20);
        })();
      });
    }
  });
  assert.deepEqual(page.errors, []);
  assert.deepEqual(result.events, ['settled', 'wake', 'settled']);
  assert.ok(result.moreSteps > 0);
  assert.equal(result.nodes, 18);
  assert.ok(result.leaf.every(Number.isFinite));
  await page.close();
});

test('the recipes of the README run', async () => {
  let page = await openPage();
  let result = await page.evaluate(async () => {
    let out = {};
    let graph = Viva.createGraph();
    ['Research', 'Design'].forEach(team => {
      for (let i = 0; i < 6; i++) graph.addNode(team + i, {team});
      for (let i = 0; i < 6; i++) graph.addLink(team + i, team + ((i + 1) % 6));
    });
    graph.addLink('Research0', 'Design0');

    // Colors from the data
    let viva = Viva.render(graph, {style: {colorBy: 'team'}, layout: {springLength: 30, gravity: -20}});
    let legend = viva.view.getModule('style').legend();
    out.legend = legend.items.map(item => `${item.label} ${item.count}`);
    out.title = legend.title;

    // Reacting to the user: a tap on a node reaches view.on('tap')
    let events = [];
    viva.on('settled', () => events.push('settled'));
    viva.on('wake', () => events.push('wake'));
    await until(() => events.includes('settled'));
    let taps = [];
    viva.view.on('tap', e => taps.push(e.node && e.node.id));
    let p = viva.layout.getNodePosition('Research3');
    let at = viva.view.toScreen(p.x, p.y, 0);
    let rect = viva.canvas.getBoundingClientRect();
    let pointer = type => viva.canvas.dispatchEvent(new PointerEvent(type, {
      clientX: rect.left + at.x, clientY: rect.top + at.y, pointerType: 'mouse', pointerId: 7, button: 0,
      buttons: type === 'pointerdown' ? 1 : 0, bubbles: true, isPrimary: true
    }));
    pointer('pointermove'); pointer('pointerdown'); pointer('pointerup');
    await new Promise(resolve => setTimeout(resolve, 50));
    out.taps = taps;

    // Tuning the physics: a setting wakes the settled layout
    await until(() => events[events.length - 1] === 'settled');
    events.length = 0;
    let before = distance('Research0', 'Research1');
    viva.layout.simulator.springLength(60);
    await until(() => events.includes('wake') && events[events.length - 1] === 'settled');
    out.longer = distance('Research0', 'Research1') / before;

    // Pinning a node
    events.length = 0;
    viva.layout.pinNode(graph.getNode('Design3'), true);
    viva.layout.setNodePosition('Design3', 0, 0);
    viva.view.invalidate();
    await until(() => events[events.length - 1] === 'settled');
    let pinned = viva.layout.getNodePosition('Design3');
    out.pinned = [pinned.x, pinned.y];
    viva.dispose();

    // Your own layout
    let own = Viva.render(graph, {layout: graph => Viva.createLayout(graph, {repulsionLaw: 'exp(-r / 50) / r^2'})});
    await new Promise(resolve => setTimeout(resolve, 300));
    out.ownSteps = own.stats().steps;
    let q = own.layout.getNodePosition('Design1');
    out.ownPosition = [q.x, q.y];
    own.dispose();
    return out;

    function distance(a, b) {
      let p = viva.layout.getNodePosition(a), q = viva.layout.getNodePosition(b);
      return Math.hypot(p.x - q.x, p.y - q.y);
    }
    function until(done) {
      return new Promise((resolve, reject) => {
        let started = Date.now();
        (function check() {
          if (done()) resolve();
          else if (Date.now() - started > 20000) reject(new Error('timed out; events: ' + events.join(',')));
          else setTimeout(check, 20);
        })();
      });
    }
  });
  assert.deepEqual(page.errors, []);
  assert.deepEqual(result.legend.sort(), ['Design 6', 'Research 6']);
  assert.equal(result.title, 'team');
  assert.deepEqual(result.taps, ['Research3'], 'a tap on a node');
  assert.ok(result.longer > 1.5, `links got longer: x${result.longer.toFixed(2)}`);
  assert.deepEqual(result.pinned, [0, 0], 'a pinned node stays where it was put');
  assert.ok(result.ownSteps > 0 && result.ownPosition.every(Number.isFinite), 'a layout of your own runs');
  await page.close();
});

test('gpu: true runs on WebGPU where there is a hardware adapter, and on the CPU elsewhere', async () => {
  let page = await openPage();
  let result = await page.evaluate(async () => {
    let graph = Viva.createGraph();
    for (let i = 1; i < 3000; i++) graph.addLink(i, Math.floor(i / 3));
    let hardware = await Viva.hasHardwareWebGPU();
    let viva = Viva.render(graph, {gpu: true, autoStop: false});
    let backend = await viva.ready;
    await new Promise(resolve => setTimeout(resolve, 500));
    let stats = viva.stats();
    let p = viva.layout.getNodePosition(1500);
    viva.dispose();
    return {hardware, backend, stats, position: [p.x, p.y]};
  });
  console.log(`    (hardware WebGPU: ${result.hardware}; ran on ${result.backend}${result.stats.gpuReason ? ', ' + result.stats.gpuReason : ''}; ${result.stats.msPerStep.toFixed(3)} ms/step)`);
  assert.deepEqual(page.errors, []);
  assert.equal(result.backend, result.hardware ? 'webgpu' : 'cpu');
  assert.equal(result.stats.backend, result.backend);
  if (!result.hardware) assert.ok(result.stats.gpuReason, 'it says why it is on the CPU');
  assert.ok(result.stats.steps > 0, 'it steps');
  assert.ok(result.position.every(Number.isFinite));
  await page.close();
});

test('an empty graph draws nothing and fills in as nodes arrive', async () => {
  let page = await openPage();
  let result = await page.evaluate(async () => {
    let graph = Viva.createGraph();
    let viva = Viva.render(graph);
    await new Promise(resolve => setTimeout(resolve, 200));
    let empty = viva.stats();
    graph.addNode('only');
    await new Promise(resolve => setTimeout(resolve, 200));
    graph.addLink('only', 'second');
    graph.addLink('second', 'third');
    await new Promise(resolve => setTimeout(resolve, 500));
    let p = viva.layout.getNodePosition('third');
    return {empty, nodes: viva.stats().nodes, steps: viva.stats().steps, third: [p.x, p.y]};
  });
  assert.deepEqual(page.errors, []);
  assert.equal(result.empty.nodes, 0);
  assert.equal(result.nodes, 3);
  assert.ok(result.steps > 0);
  assert.ok(result.third.every(Number.isFinite));
  await page.close();
});

test('restart and dispose work while the layout runs on WebGPU', async () => {
  let page = await openPage();
  let result = await page.evaluate(async () => {
    if (!(await Viva.hasHardwareWebGPU())) return {skipped: true};
    let graph = Viva.createGraph();
    for (let i = 1; i < 3000; i++) graph.addLink(i, Math.floor(i / 3));
    let viva = Viva.render(graph, {autoStop: false});
    let first = await viva.ready;
    await new Promise(resolve => setTimeout(resolve, 300));
    let before = viva.layout;
    await viva.restart();
    let afterRestart = viva.stats();
    await new Promise(resolve => setTimeout(resolve, 300));
    let later = viva.stats();
    let p = viva.layout.getNodePosition(2000);
    viva.dispose();
    await new Promise(resolve => setTimeout(resolve, 200));
    return {first, newLayout: viva.layout !== before, afterRestart, later, position: [p.x, p.y]};
  });
  assert.deepEqual(page.errors, []);
  if (result.skipped) {
    console.log('    (no hardware WebGPU here: skipped)');
  } else {
    assert.equal(result.first, 'webgpu', 'a graph of 3,000 nodes goes to the GPU by itself');
    assert.equal(result.newLayout, true);
    assert.equal(result.afterRestart.backend, 'webgpu', 'the new layout runs on the GPU too');
    assert.ok(result.later.steps > result.afterRestart.steps, 'and it steps');
    assert.ok(result.position.every(Number.isFinite));
  }
  await page.close();
});

test('the module build loads from <script type="module">', async () => {
  let page = await openPage('test/browser/module.html');
  let result = await page.evaluate(async () => {
    let viva = await window.started;
    await viva.ready;
    await new Promise(resolve => setTimeout(resolve, 200));
    return {steps: viva.stats().steps, exports: window.exported};
  });
  assert.deepEqual(page.errors, []);
  assert.ok(result.steps > 0);
  assert.ok(result.exports.includes('render') && result.exports.includes('createGraph') && result.exports.includes('labelNodes'));
  await page.close();
});

test('a script in <head> is told that the page has no body yet', async () => {
  let page = await openPage('test/browser/head.html');
  let early = await page.evaluate(() => window.early);
  assert.match(early, /no <body> yet/);
  // The same call works once the page has loaded
  let steps = await page.evaluate(async () => {
    let viva = Viva.render(graph, {gpu: false});
    await viva.ready;
    await new Promise(resolve => setTimeout(resolve, 200));
    let steps = viva.stats().steps;
    viva.dispose();
    return steps;
  });
  assert.ok(steps > 0);
  assert.deepEqual(page.errors, []);
  await page.close();
});

let failed = 0;
for (let {name, fn} of tests) {
  try {
    await fn();
    console.log('ok   ' + name);
  } catch (e) {
    failed += 1;
    console.log('FAIL ' + name + '\n' + (e.stack || e));
  }
}
await browser.close();
server.close();
console.log(failed ? `\n${failed} of ${tests.length} failed` : `\nall ${tests.length} passed`);
process.exit(failed ? 1 : 0);
