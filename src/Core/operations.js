/**
 * @fileOverview Contains collection of primitve operations under graph.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/

Viva.Graph.operations = function() {

    return {
        /**
         * Gets graph density, which is a ratio of actual number of edges to maximum
         * number of edges. I.e. graph density 1 means all nodes are connected with each other with an edge.
         * Density 0 - graph has no edges. Runtime: O(1)
         * 
         * @param graph represents oriented graph structure.
         * 
         * @returns density of the graph if graph has nodes. NaN otherwise 
         */
        density : function(graph) {
            var nodes = graph.getNodesCount();
            if (nodes === 0) {
                return NaN;
            }
            
            return 2 * graph.getLinksCount() / (nodes * (nodes - 1));
        }
    };
};
