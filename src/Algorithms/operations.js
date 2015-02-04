/**
 * @fileOverview Contains collection of primitive operations under graph.
 *
 * @author Andrei Kashcha (aka anvaka) / https://github.com/anvaka
 */
module.exports = operations;

function operations() {

    return {
        /**
         * Gets graph density, which is a ratio of actual number of edges to maximum
         * number of edges. I.e. graph density 1 means all nodes are connected with each other with an edge.
         * Density 0 - graph has no edges. Runtime: O(1)
         * 
         * @param graph represents oriented graph structure.
         * @param directed (optional boolean) represents if the graph should be treated as a directed graph.
         * 
         * @returns density of the graph if graph has nodes. NaN otherwise. Returns density for undirected graph by default but returns density for directed graph if a boolean 'true' is passed along with the graph.
         */
        density : function (graph,directed) {
            var nodes = graph.getNodesCount();
            if (nodes === 0) {
                return NaN;
            }
            if(directed){
                return graph.getLinksCount() / (nodes * (nodes - 1));
            } else {
                return 2 * graph.getLinksCount() / (nodes * (nodes - 1));
            }
        }
    };
};
