var test = require('tap').test;
var Viva = require('../dist/vivagraph.js');

test('addNode', function(t) {
  var graph = Viva.Graph.graph();
  var customData = '31337';

  var node = graph.addNode(1, customData);

  t.equals(graph.getNodesCount(), 1, 'addNode failed');
  t.equals(graph.getNode(1), node, 'invalid node returned by addNode (or getNode)');
  t.equals(node.data, customData, 'data was not set properly');
  t.equals(node.id, 1, 'node id was not set properly');
  t.end();
});

test('addLink', function(t) {
  var graph = Viva.Graph.graph();

  var link = graph.addLink(1, 2),
    firstNodeLinks = graph.getLinks(1),
    secondNodeLinks = graph.getLinks(2);

  t.equals(graph.getNodesCount(), 2, 'addLink failed');
  t.equals(firstNodeLinks.length, 1, 'number of links of the first node is wrong');
  t.equals(secondNodeLinks.length, 1, 'number of links of the second node is wrong');
  t.equals(link, firstNodeLinks[0], 'invalid link in the first node');
  t.equals(link, secondNodeLinks[0], 'invalid link in the second node');
  t.end();
});

test('addOneNodeFireChanged', function(t) {
  var graph = Viva.Graph.graph();
  var testNodeId = 'hello world';
  graph.on('changed', function(changes) {
    t.ok(changes && changes.length === 1, "Only one change should be recorded");
    t.equals(changes[0].node.id, testNodeId, "Wrong node change notification");
    t.equals(changes[0].changeType, 'add', "Add change type expected.");
  });

  graph.addNode(testNodeId);
  t.end();
});

test('addLinkFireChanged', function(t) {
  var graph = Viva.Graph.graph();
  var fromId = 1, toId = 2;
  graph.on('changed', function(changes) {
    t.ok(changes && changes.length === 3, "Three change should be recorded: node, node and link");
    t.equals(changes[2].link.fromId, fromId, "Wrong link from Id");
    t.equals(changes[2].link.toId, toId, "Wrong link toId");
    t.equals(changes[2].changeType, 'add', "Add change type expected.");
  });

  graph.addLink(fromId, toId);
  t.end();
});

test('removeIsolatedNode', function(t) {
  var graph = Viva.Graph.graph();
  graph.addNode(1);

  graph.removeNode(1);

  t.equals(graph.getNodesCount(), 0, 'Remove operation failed');
  t.end();
});

test('removeLink', function(t) {
  var graph = Viva.Graph.graph();
  var link = graph.addLink(1, 2);

  graph.removeLink(link);

  t.equals(graph.getNodesCount(), 2, 'remove link should not remove nodes');
  t.equals(graph.getLinks(1).length, 0, 'link should be removed from the first node');
  t.equals(graph.getLinks(2).length, 0, 'link should be removed from the second node');
  graph.forEachLink(function() {
    t.fail('No links should be in graph');
  });
  t.end();
});

test('removeIsolatedNodeFireChanged', function(t) {
  var graph = Viva.Graph.graph();
  graph.addNode(1);

  graph.on('changed', function(changes) {
    t.ok(changes && changes.length === 1, "One change should be recorded: node removed");
    t.equals(changes[0].node.id, 1, "Wrong node Id");
    t.equals(changes[0].changeType, 'remove', "'remove' change type expected.");
  });

  graph.removeNode(1);
  t.end();
});

test('removeLinkFireChanged', function(t) {
  var graph = Viva.Graph.graph();
  var link = graph.addLink(1, 2);

  graph.on('changed', function(changes) {
    t.ok(changes && changes.length === 1, "One change should be recorded: link removed");
    t.equals(changes[0].link, link, "Wrong link removed");
    t.equals(changes[0].changeType, 'remove', "'remove' change type expected.");
  });

  graph.removeLink(1);
  t.end();
});

test('removeLinkedNodeFireChanged', function(t) {
  var graph = Viva.Graph.graph(),
    link = graph.addLink(1, 2),
    nodeIdToRemove = 1;

  graph.on('changed', function(changes) {
    t.ok(changes && changes.length === 2, "Two changes should be recorded: link and node removed");
    t.equals(changes[0].link, link, "Wrong link removed");
    t.equals(changes[0].changeType, 'remove', "'remove' change type expected.");
    t.equals(changes[1].node.id, nodeIdToRemove, "Wrong node removed");
    t.equals(changes[1].changeType, 'remove', "'remove' change type expected.");
  });

  graph.removeNode(nodeIdToRemove);
  t.end();
});

test('removeNodeWithManyLinks', function(t) {
    var graph = Viva.Graph.graph();

    graph.addLink(1, 2);
    graph.addLink(1, 3);
    graph.removeNode(1);

    t.equals(graph.getNodesCount(), 2, 'remove link should remove one node only');
    t.equals(graph.getLinks(1), null, 'link should be removed from the first node');
    t.equals(graph.getLinks(2).length, 0, 'link should be removed from the second node');
    t.equals(graph.getLinks(3).length, 0, 'link should be removed from the third node');
    graph.forEachLink(function() {
      t.fail('No links should be in graph');
    });

    t.end();
});
