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
