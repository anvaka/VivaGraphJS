/*global Viva, console*/

var test_GraphOperations = function(test){

    return {
       twoNodeGraphDensity : function() {
           var graph = Viva.Graph.graph(),
               operations = Viva.Graph.operations();
           
           graph.addLink(1, 2);
           
           var density = operations.density(graph);
           
           test.assertEqual(density, 1, 'Density of complete graph should be 1');
       }
  };             
};