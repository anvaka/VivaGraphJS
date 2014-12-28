var test = require('tap').test;
var Viva = require('../dist/vivagraph.js');

test('forceAttributesInitialized', function(t) {
  var graph = Viva.Graph.generator().path(2);

  var layout = Viva.Graph.Layout.forceDirected(graph);
  assertGraphHasPositions(graph, layout, t);
  t.end();
});

test('graphIsMonitored', function(t) {
  var graph = Viva.Graph.graph();

  var layout = Viva.Graph.Layout.forceDirected(graph);
  graph.addNode(1);
  assertGraphHasPositions(graph, layout, t);
  graph.addNode(2);
  assertGraphHasPositions(graph, layout, t);
  graph.addLink(1, 2);
  assertGraphHasPositions(graph, layout, t);
  graph.removeNode(1);
  assertGraphHasPositions(graph, layout, t);
  t.end();
});

function assertGraphHasPositions(graph, layout, test) {
  graph.forEachNode(function(node) {
    var position = layout.getNodePosition(node.id);
    test.ok(position, 'All nodes expected to have some position');
    test.ok(typeof position.x === 'number', 'Node position does not have a valid x position');
    test.ok(typeof position.y === 'number', 'Node position does not have a valid y position');
  });
}
