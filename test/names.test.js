import test from 'node:test';
import assert from 'node:assert/strict';
import createGraph from 'ngraph.graph';
import {hasNames} from '../src/names.js';

test('ids that are words are names', () => {
  let graph = createGraph();
  graph.addLink('Alice', 'Bob');
  assert.equal(hasNames(graph), true);
});

test('numbers are not names, as numbers or as text', () => {
  let graph = createGraph();
  graph.addLink(1, 2);
  graph.addLink('3', '4.5');
  assert.equal(hasNames(graph), false);
});

test('a label or a name in the data is a name', () => {
  let graph = createGraph();
  graph.addNode(1, {label: 'Paris'});
  graph.addNode(2, {name: 'Rome'});
  graph.addNode(3);
  assert.equal(hasNames(graph), true, 'two of three');
});

test('fewer than half named, or no nodes: no names', () => {
  let graph = createGraph();
  assert.equal(hasNames(graph), false, 'an empty graph');
  graph.addNode(1, {label: 'Paris'});
  graph.addNode(2);
  graph.addNode(3);
  assert.equal(hasNames(graph), false);
});
