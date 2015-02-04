var test = require('tap').test;
var Viva = require('../dist/vivagraph.js');

test('twoNodeGraphDensity', function(t) {
  var graph = Viva.Graph.graph(),
    operations = Viva.Graph.operations();

  graph.addLink(1, 2);

  var density = operations.density(graph);

  t.equals(density, 1, 'Density of two node graph should be 1');
  t.end();
});

test('completeGraphDensity', function(t) {
  var operations = Viva.Graph.operations();

  for (var i = 2; i < 10; ++i) {
    var graph = Viva.Graph.generator().complete(i);
    var density = operations.density(graph);
    t.equals(density, 1, 'Density of complete graph should be 1');
  }
  t.end();
});

test('noEdgesGraphDensity', function(t) {
  var graph = Viva.Graph.graph(),
    operations = Viva.Graph.operations();

  for (var i = 0; i < 10; ++i) {
    graph.addNode(i);
  }

  var density = operations.density(graph);

  t.equals(density, 0, 'Density of graph with no edges should be 0');
  t.end();
});

test('degreeCentralityOneEdge', function(t) {
  var graph = Viva.Graph.graph();
  graph.addLink(0, 1);
  var cd = Viva.Graph.centrality().degreeCentrality(graph);

  t.equals(cd[0].value, 1, 'First node has 1 degree');
  t.end();
});

test('degreeCentralityCompleteGraph', function(t) {
  var graph = Viva.Graph.generator().complete(6);
  var cd = Viva.Graph.centrality().degreeCentrality(graph);

  t.equals(cd[0].value, 5, 'Node has 5 degree');
  t.end();
});
