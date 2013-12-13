var test_forceBasedLayout = function(test) {
    var assertGraphHasPositions = function(graph, layout) {
        graph.forEachNode(function(node) {
            var position = layout.getNodePosition(node.id);
            test.assert(position, 'All nodes expected to have some position');
            test.assert(typeof position.x === 'number', 'Node position does not have a valid x position');
            test.assert(typeof position.y === 'number', 'Node position does not have a valid y position');
        });
    };
    return {
        forceAttributesInitialized : function () {
            var graph = Viva.Graph.generator().path(2);

            var layout = Viva.Graph.Layout.forceDirected(graph);
            assertGraphHasPositions(graph, layout);
        },
        graphIsMonitored : function () {
            var graph = Viva.Graph.graph();

            var layout = Viva.Graph.Layout.forceDirected(graph);
            graph.addNode(1);
            assertGraphHasPositions(graph, layout);
            graph.addNode(2);
            assertGraphHasPositions(graph, layout);
            graph.addLink(1, 2);
            assertGraphHasPositions(graph, layout);
            graph.removeNode(1);
            assertGraphHasPositions(graph, layout);
        }
    };
};
