/*global Viva, console*/

var test_GraphConstructions = function(test){
    return {
       addNode : function() {
           var graph = Viva.Graph.graph();
           var customData = '31337';
           
           var node = graph.addNode(1, customData);
           
           test.assertEqual(graph.getNodesCount(), 1, 'addNode failed');
           test.assertEqual(graph.getNode(1), node, 'invalid node returned by addNode (or getNode)');
           test.assertEqual(node.data, customData, 'data was not set properly');
           test.assertEqual(node.id, 1, 'node id was not set properly');
       },
       
       addLink : function() {
           var graph = Viva.Graph.graph();
          
           var link = graph.addLink(1, 2),
               firstNodeLinks = graph.getLinks(1),
               secondNodeLinks = graph.getLinks(2);
               
           test.assertEqual(graph.getNodesCount(), 2, 'addLink failed');
           test.assertEqual(firstNodeLinks.length, 1, 'number of links of the first node is wrong');
           test.assertEqual(secondNodeLinks.length, 1, 'number of links of the second node is wrong');
           test.assertEqual(link, firstNodeLinks[0], 'invalid link in the first node');
           test.assertEqual(link, secondNodeLinks[0], 'invalid link in the second node');
       },

       addOneNodeFireChanged : function() {
           var graph = Viva.Graph.graph();
           var testNodeId = 'hello world';
           var graphEvents = Viva.Graph.Utils.events(graph);
           graphEvents.on('changed', function(changes) {
               test.assert(changes && changes.length === 1, "Only one change should be recorded");
               test.assertEqual(changes[0].node.id, testNodeId, "Wrong node change notification");
               test.assertEqual(changes[0].changeType, 'add', "Add change type expected.");
           });
           
           graph.addNode(testNodeId);
       },
   
        addLinkFireChanged : function() {
           var graph = Viva.Graph.graph();
           var fromId = 1, toId = 2;
           var graphEvents = Viva.Graph.Utils.events(graph);
           graphEvents.on('changed', function(changes) {
               test.assert(changes && changes.length === 3, "Three change should be recorded: node, node and link");
               test.assertEqual(changes[2].link.fromId, fromId, "Wrong link from Id");
               test.assertEqual(changes[2].link.toId, toId, "Wrong link toId");
               test.assertEqual(changes[2].changeType, 'add', "Add change type expected.");
           });
           
           graph.addLink(fromId, toId);
       },
       
       removeIsolatedNode : function() {
           var graph = Viva.Graph.graph();
           graph.addNode(1);
           
           graph.removeNode(1);
           
           test.assertEqual(graph.getNodesCount(), 0, 'Remove operation failed');
       }, 
       
       removeLink : function() {
           var graph = Viva.Graph.graph();
           var link = graph.addLink(1, 2);

           graph.removeLink(link);

           test.assertEqual(graph.getNodesCount(), 2, 'remove link should not remove nodes');
           test.assertEqual(graph.getLinks(1).length, 0, 'link should be removed from the first node');
           test.assertEqual(graph.getLinks(2).length, 0, 'link should be removed from the second node');
           graph.forEachLink(function(link){
               test.assertFail('No links should be in graph');
           });
       },
       
       removeIsolatedNodeFireChanged : function() {
           var graph = Viva.Graph.graph();
           var graphEvents = Viva.Graph.Utils.events(graph);
           graph.addNode(1);
           
           graphEvents.on('changed', function(changes) {
               test.assert(changes && changes.length === 1, "One change should be recorded: node removed");
               test.assertEqual(changes[0].node.id, 1, "Wrong node Id");
               test.assertEqual(changes[0].changeType, 'remove', "'remove' change type expected.");
           });

           graph.removeNode(1);
       },
       
       removeLinkFireChanged : function() {
           var graph = Viva.Graph.graph();
           var graphEvents = Viva.Graph.Utils.events(graph);
           var link = graph.addLink(1, 2);
           
           graphEvents.on('changed', function(changes) {
               test.assert(changes && changes.length === 1, "One change should be recorded: link removed");
               test.assertEqual(changes[0].link, link, "Wrong link removed");
               test.assertEqual(changes[0].changeType, 'remove', "'remove' change type expected.");
           });

           graph.removeLink(1);
       },
       
       removeLinkedNodeFireChanged : function() {
           var graph = Viva.Graph.graph(),
               graphEvents = Viva.Graph.Utils.events(graph),
               link = graph.addLink(1, 2),
               nodeIdToRemove = 1;
           
           graphEvents.on('changed', function(changes) {
               test.assert(changes && changes.length === 2, "Two changes should be recorded: link and node removed");
               test.assertEqual(changes[0].link, link, "Wrong link removed");
               test.assertEqual(changes[0].changeType, 'remove', "'remove' change type expected.");
               test.assertEqual(changes[1].node.id, nodeIdToRemove, "Wrong node removed");
               test.assertEqual(changes[1].changeType, 'remove', "'remove' change type expected.");
           });

           graph.removeNode(nodeIdToRemove);
       },
       
       removeNodeWithManyLinks : function() {
           var graph = Viva.Graph.graph(),
               graphEvents = Viva.Graph.Utils.events(graph),
               link12 = graph.addLink(1, 2),
               link13 = graph.addLink(1, 3),
               nodeIdToRemove = 1;
               
           graph.removeNode(1);

           test.assertEqual(graph.getNodesCount(), 2, 'remove link should remove one node only');
           test.assertEqual(graph.getLinks(1), null, 'link should be removed from the first node');
           test.assertEqual(graph.getLinks(2).length, 0, 'link should be removed from the second node');
           test.assertEqual(graph.getLinks(3).length, 0, 'link should be removed from the third node');
           graph.forEachLink(function(link) {
               test.assertFail('No links should be in graph');
           });

       }
  };             
};