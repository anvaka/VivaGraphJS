/**
 * @fileOverview Contains collection of primitve operations under graph.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

Viva.Graph.operations = function () {

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
         
         /*
          * Extended the function to give density for a directed graph (since the library usually creates directed graphs)
          * If specifically needed the a true value can be passed to the function which will return the value for
          * a undirected graph.
          * 
          * I am planning to implement a direced - undirected character to the graphs and expand this operations sections.
          * --Bala.
         */
        density : function (graph,undirected) {
            var nodes = graph.getNodesCount();
            if (nodes === 0) {
                return NaN;
            }
            if(undirected){
                return 2 * graph.getLinksCount() / (nodes * (nodes - 1));
            } else {
                return graph.getLinksCount() / (nodes * (nodes - 1));
            }
        }
    };
};
