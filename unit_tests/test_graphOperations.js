/*global Viva, console*/

var test_GraphOperations = function(test){

    return {
       twoNodeGraphDensity : function() {
           var graph = Viva.Graph.graph(),
               operations = Viva.Graph.operations();
           
           graph.addLink(1, 2);
           
           var density = operations.density(graph);
           
           test.assertEqual(density, 1, 'Density of two node graph should be 1');
       },
       
       completeGraphDensity : function() {
           var operations = Viva.Graph.operations();
           
           for(var i = 2; i < 10; ++i) {
               var graph = Viva.Graph.generator().complete(i);
               var density = operations.density(graph);
               test.assertEqual(density, 1, 'Density of complete graph should be 1');
           }
       },
       
       noEdgesGraphDensity : function(){
           var graph = Viva.Graph.graph(),
               operations = Viva.Graph.operations();
           
           for (var i = 0; i < 10; ++i) {
               graph.addNode(i);
           }
           
           var density = operations.density(graph);
           
           test.assertEqual(density, 0, 'Density of graph with no edges should be 0');
       },
       
       degreeCentralityOneEdge : function(){
           var graph = Viva.Graph.graph(),
               cd;
           graph.addLink(0, 1);
           cd = Viva.Graph.centrality().degreeCentrality(graph);
           
           test.assertEqual(cd[0].value, 1, 'Unexpected node degree centrality');
       },
       
       degreeCentralityCompleteGraph : function() {
           var graph = Viva.Graph.generator().complete(6),
               cd;

           cd = Viva.Graph.centrality().degreeCentrality(graph);
           
           test.assertEqual(cd[0].value, 5, 'Unexpected complete graph node centrality');
       }
  };             
};