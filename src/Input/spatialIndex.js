/*global Viva */

/**
 * Allows querying graph nodes position at given point. 
 * 
 * @param graph - graph to be queried. 
 * @param toleranceOrCheckCallback - if it's a number then it represents offest 
 *          in pixels from any node position to be considered a part of the node.
 *          if it's a function then it's called for every node to check intersection
 * 
 * TODO: currently it performes linear search. Use real spatial index to improve performance.
 */
Viva.Graph.spatialIndex = function(graph, toleranceOrCheckCallback) {
    var getNodeFunction,
        preciseCheckCallback,
        tolerance = 16;
   
    if (typeof toleranceOrCheckCallback === 'function') {
        preciseCheckCallback = toleranceOrCheckCallback;
        getNodeFunction = function(x, y) {
            var foundNode = null;
            graph.forEachNode(function(node) {
                var pos = node.position;
                if (preciseCheckCallback(node, x, y)) {
                    foundNode = node;
                    return true;
                }
            });
            
            return foundNode;
        };
    } else if (typeof toleranceOrCheckCallback === 'number') {
        tolerance = toleranceOrCheckCallback;
        getNodeFunction = function (x, y) {
            var foundNode = null;

            graph.forEachNode(function (node) {
                var pos = node.position;
                if (pos.x - tolerance < x && x < pos.x + tolerance &&
                    pos.y - tolerance < y && y < pos.y + tolerance) {
                        foundNode = node;
                        return true;
                    }
            });

            return foundNode;
        };        
    }

    
    return {
        getNodeAt : getNodeFunction
    };
};
