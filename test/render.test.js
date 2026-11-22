import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {render, createGraph, createLayout, version} from '../src/index.js';

// Drawing needs a browser (see test/browser); this checks what runs without one.
test('render() says what it needs', () => {
  assert.throws(() => render(), /needs a graph/);
  assert.throws(() => render({nodes: []}), /needs a graph/);
  // Node has no page; a script in <head> gets the same message (see test/browser)
  assert.throws(() => render(createGraph()), /no <body> yet/);
});

test('the package lets its files and its package.json be imported', () => {
  // A package can import itself by name, through its own exports map
  let require = createRequire(import.meta.url);
  let pkg = require('vivagraphjs/package.json');
  assert.equal(pkg.name, 'vivagraphjs');
  assert.equal(pkg.exports['./dist/*'], './dist/*');
});

test('the parts are exported', () => {
  let graph = createGraph();
  graph.addLink(1, 2);
  let layout = createLayout(graph);
  layout.step();
  assert.ok(Number.isFinite(layout.getNodePosition(1).x));
});

test('the version is the package\'s', () => {
  let pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(version, pkg.version);
});
