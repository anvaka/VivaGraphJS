var test_forceBasedLayout = function(test) {
    var assertGraphHasPositions = function(graph) {
        graph.forEachNode(function(node) {
            test.assert(node.hasOwnProperty('position'), 'All nodes expected to have some position');
            test.assert(typeof node.position.x === 'number', 'Node position does not have a valid x position');
            test.assert(typeof node.position.y === 'number', 'Node position does not have a valid y position');
        });
    };
    return {
        forceAttributesInitialized : function () {
            var graph = Viva.Graph.generator().path(2);

            Viva.Graph.Layout.forceDirected(graph);
            assertGraphHasPositions(graph);
        },
        graphIsMonitored : function () {
            var graph = Viva.Graph.graph();

            Viva.Graph.Layout.forceDirected(graph);
            graph.addNode(1);
            assertGraphHasPositions(graph);
            graph.addNode(2);
            assertGraphHasPositions(graph);
            graph.addLink(1, 2);
            assertGraphHasPositions(graph);
            graph.removeNode(1);
            assertGraphHasPositions(graph);
        }
    };
};
