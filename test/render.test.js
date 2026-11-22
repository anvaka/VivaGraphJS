import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {render, createGraph, createLayout, version} from '../src/index.js';

// Drawing needs a browser (see test/browser); this checks what runs without one.
test('render() says what it needs', () => {
  assert.throws(() => render(), /needs a graph/);
  assert.throws(() => render({nodes: []}), /needs a graph/);
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
