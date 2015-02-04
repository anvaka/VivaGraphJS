var test = require('tap').test;
var Viva = require('../dist/vivagraph.js');

test('jsonStoreLoadProduceSameResult', function(t) {
  var s = Viva.Graph.serializer(),
    generator = Viva.Graph.generator(),
    testGraphs = [
      generator.path(10),
      generator.complete(10),
      generator.grid(10, 10),
      generator.completeBipartite(10, 10),
      generator.circularLadder(10),
      generator.noLinks(10)
    ];


  for (var i = 0; i < testGraphs.length; ++i) {
    var testGraph = testGraphs[i],
      storedGraph = s.storeToJSON(testGraph),
      loadedGraph = s.loadFromJSON(storedGraph);

    assertGraphsAreSame(testGraph, loadedGraph, t);
  }
  t.end();
});

test('jsonStoreWithCustomTransformer', function(t) {
  var s = Viva.Graph.serializer(),
    g = Viva.Graph.graph();

  g.addNode(1, 'Custom data');
  g.addLink(1, 2, 'Custom link data');

  var json = s.storeToJSON(g,
    function(node) {
      return [node.id, node.data];
    }, // custom node serializer. transofrm it to array
    function(link) {
      return [link.fromId, link.toId, link.data];
    }),
    parsedGraph;

  parsedGraph = JSON.parse(json);

  t.equals(parsedGraph.nodes[0][0], 1, 'First node id should be stored in array');
  t.equals(parsedGraph.nodes[0][1], 'Custom data', 'First node id should be stored in array');
  t.equals(parsedGraph.links[0][1], 2, 'To link id should be stored in array');
  t.end();
});

test('jsonLoadWithCustomTransform', function(t) {
  var s = Viva.Graph.serializer(),
    g = Viva.Graph.graph();

  g.addNode(1, 'Custom data');
  g.addLink(1, 2, 'Custom link data');

  var json = s.storeToJSON(g,
    function(node) {
      return [node.id, node.data];
    }, // custom node serializer. transofrm it to array
    function(link) {
      return [link.fromId, link.toId, link.data];
    });

  var parsed = s.loadFromJSON(json,
    function(node) {
      return {
        id: node[0],
        data: node[1]
      };
    },
    function(link) {
      return {
        fromId: link[0],
        toId: link[1],
        data: link[2]
      };
    });

  assertGraphsAreSame(g, parsed, t);
  t.end();
});

function assertGraphsAreSame(expected, actual,t) {
  t.equals(expected.getNodesCount(), actual.getNodesCount(), 'Number of nodes does not match for graph: ' + expected.Name);
  t.equals(expected.getLinksCount(), actual.getLinksCount(), 'Number of links does not match for graph: ' + expected.Name);

  expected.forEachNode(function(node) {
    t.ok(actual.getNode(node.id), 'Actual graph is missing node with id: ' + node.id);
  });

  expected.forEachLink(function(link) {
    t.ok(actual.hasLink(link.fromId, link.toId), 'Actual graph is missing link from ' + link.fromId + ' to ' + link.toId);
  });
}
