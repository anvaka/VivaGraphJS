/*global Viva */

/**
 * Allows querying graph nodes position at given point. 
 * 
 * @param graph - graph to be queried. 
 * @param tolerance offest in pixels from any node position to be considered for precise checking.
 * @param preciseCheckCallback [optional] - callback function(node, x, y). Should return true if point
 *         (x, y) belongs to given node; false otherwise. If callback is not specified tolerance is used
 *         for rough check.
 * 
 * TODO: currently it performes linear search. Use real spatial index to improve performance.
 */
Viva.Graph.spatialIndex = function(graph, tolerance, preciseCheckCallback) {
    var getNodeFunction;
    tolerance = typeof tolerance === 'number' ? tolerance : 16;
    
    
    if (typeof preciseCheckCallback === 'function') {
        getNodeFunction = function(x, y) {
            var foundNode = null;
            graph.forEachNode(function(node) {
                var pos = node.position;
                if (pos.x - tolerance < x && x < pos.x + tolerance &&
                    pos.y - tolerance < y && y < pos.y + tolerance) {
                        if (preciseCheckCallback(node, x, y)){
                            foundNode = node;
                            return true;
                        }
                    }
            });
            return foundNode;
        };
    } else {
        getNodeFunction = function(x, y) {
            var foundNode = null;

            graph.forEachNode(function(node) {
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
