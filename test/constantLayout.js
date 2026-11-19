/**
 * Testing Viva.Graph.Layout.constant behavior.
 */

var test = require('tap').test;
var Viva = require('../dist/vivagraph.js');

test('nodePositionGeneratedByDefault', function(t) {
  var graph = Viva.Graph.generator().path(10),
    layout = Viva.Graph.Layout.constant(graph);

  layout.run();

  graph.forEachNode(function(node) {
    var position = layout.getNodePosition(node.id);
    t.ok(position, 'All nodes expected to have some position');
    t.ok(typeof position.x === 'number', 'Node position does not have a valid x position');
    t.ok(typeof position.y === 'number', 'Node position does not have a valid y position');
  });
  t.end();
});

test('nodePositionUsesCustomCallback', function(t) {
  var graph = Viva.Graph.generator().path(10),
    layout = Viva.Graph.Layout.constant(graph),
    placeNodeCallback = function() {
      return { x: 42, y: 42 }; // all nodes should be placed at the same position.
    };

  layout.placeNode(placeNodeCallback);
  layout.run();

  graph.forEachNode(function(node) {
    var position = layout.getNodePosition(node.id);
    t.equals(position.x, 42, 'Node position does not have a valid x position');
    t.equals(position.y, 42, 'Node position does not have a valid y position');
  });
  t.end();
});

test('getGraphRectReflectsDefaultSettings', function(t) {
  var graph = Viva.Graph.generator().path(10),
    layoutSettings = {
      maxX: 42,
      maxY: 42
    },
    layout = Viva.Graph.Layout.constant(graph, layoutSettings);

  layout.run();

  graph.forEachNode(function(node) {
    var position = layout.getNodePosition(node.id);
    t.ok(position.x <= layoutSettings.maxX, 'Node position does not have a valid x position');
    t.ok(position.y <= layoutSettings.maxY, 'Node position does not have a valid y position');
  });
  t.end();
});

[
  {name: 'source', create: require('../src/Layout/constant.js')},
  {name: 'distribution', create: Viva.Graph.Layout.constant}
].forEach(function (entry) {
  test('dispose stops graph subscriptions: ' + entry.name, function(t) {
    var graph = Viva.Graph.graph();
    graph.addNode('first');
    var layout = entry.create(graph);
    graph.addNode('before-dispose');
    t.ok(layout.getNodePosition('before-dispose'), 'active layout observes new nodes');
    var oldPosition = layout.getNodePosition('first');
    layout.dispose();
    layout.dispose();
    graph.addNode('after-dispose');
    graph.removeNode('first');
    t.equals(layout.getNodePosition('after-dispose'), undefined, 'disposed layout ignores additions');
    t.equals(layout.getNodePosition('first'), oldPosition, 'disposed layout ignores removals');
    var active = entry.create(graph);
    graph.addNode('another');
    t.ok(active.getNodePosition('another'), 'another active layout still receives changes');
    active.dispose();
    t.end();
  });
});
