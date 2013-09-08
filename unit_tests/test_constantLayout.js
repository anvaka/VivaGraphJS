/*global Viva*/

/**
 * Testing Viva.Graph.Layout.constant behavior. 
 */
var test_constantLayout = function(test) {
    return {
        nodePositionGeneratedByDefault: function() {
            var graph = Viva.Graph.generator().path(10),
                layout = Viva.Graph.Layout.constant(graph);

            layout.run();

            graph.forEachNode(function(node) {
                var position = layout.getNodePosition(node.id);
                test.assert(position, 'All nodes expected to have some position');
                test.assert(typeof position.x === 'number', 'Node position does not have a valid x position');
                test.assert(typeof position.y === 'number', 'Node position does not have a valid y position');
            });
        },

        nodePositionUsesCustomCallback: function() {
            var graph = Viva.Graph.generator().path(10),
                layout = Viva.Graph.Layout.constant(graph),
                placeNodeCallback = function() {
                    return new Viva.Graph.Point2d(42, 42); // all nodes should be placed at the same position.
                };

            layout.placeNode(placeNodeCallback);
            layout.run();

            graph.forEachNode(function(node) {
                var position = layout.getNodePosition(node.id);
                test.assertEqual(position.x, 42, 'Node position does not have a valid x position');
                test.assertEqual(position.y, 42, 'Node position does not have a valid y position');
            });
        },

        getGraphRectReflectsDefaultSettings: function() {
            var graph = Viva.Graph.generator().path(10),
                layoutSettings = {
                    maxX: 42,
                    maxY: 42
                },
                layout = Viva.Graph.Layout.constant(graph, layoutSettings);

            layout.run();

            graph.forEachNode(function(node) {
                var position = layout.getNodePosition(node.id);
                test.assert(position.x <= layoutSettings.maxX, 'Node position does not have a valid x position');
                test.assert(position.y <= layoutSettings.maxY, 'Node position does not have a valid y position');
            });
        }
    };
};
