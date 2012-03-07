/**
 * @fileOverview Centrality calcuation algorithms.
 * 
 * @see http://en.wikipedia.org/wiki/Centrality
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/

Viva.Graph.centrality = function(oriented) {
    //var oriented = false, // centrailityconsiders graph as oriented. TODO: extract to parameters?
        
    var singleSourceShortestPath = function(graph, node) {
        // I'm using the same naming convention used in http://www.inf.uni-konstanz.de/algo/publications/b-fabc-01.pdf
        var P = {}, // predcessors lists. 
            S = [], 
            sigma = {},
            d = {},
            Q = [node.id];

        graph.forEachNode(function(t){
            P[t.id] = [];
            sigma[t.id] = 0;
        });
        
        d[node.id] = 0;
        sigma[node.id] = 1;
        
        
        while(Q.length) { // Using BFS to find shortest paths
            var v = Q.shift(),
                dV = d[v],
                sigmaV = sigma[v];

            S.push(v);
            // TODO: consider extracting function out of the cycle.
            graph.forEachLinkedNode(v, function(w){
                // w found for the first time?
                if (!d.hasOwnProperty(w.id)) {
                    Q.push(w.id);
                    d[w.id] = dV + 1; 
                } 
                // Shortest path to w via v?
                if (d[w.id] === dV + 1) {
                    sigma[w.id] += sigmaV;
                    P[w.id].push(v);
                }
            }, oriented);
        }
        
        return {
            S : S,
            P : P,
            sigma : sigma
        };
    },
     
    accumulate = function(betweenness, shortestPath, s) {
        var delta = {},
            S = shortestPath.S;
        for(var i = 0; i < S.length; ++i){
            delta[S[i]] = 0;
        }
        
        // S returns vertices in order of non-increasing distance from s
        while(S.length) {
            var w = S.pop(),
                coeff = (1 + delta[w])/shortestPath.sigma[w],
                pW = shortestPath.P[w];
            for (i = 0; i < pW.length; ++i){
                var v = pW[i];
                delta[v] += shortestPath.sigma[v] * coeff;
            }
            
            if (w !== s) {
                betweenness[w] += delta[w];
            }
        }
    };

    return {
        
        /**
         * Compute the shortest-path betweenness centrality for all nodes in a graph.
         * 
         * Betweenness centrality of a node `n` is the sum of the fraction of all-pairs 
         * shortest paths that pass through `n`. Runtime O(n * v) for non-weighted graphs.
         *
         * @see http://en.wikipedia.org/wiki/Centrality#Betweenness_centrality
         * 
         * @see A Faster Algorithm for Betweenness Centrality. 
         *      Ulrik Brandes, Journal of Mathematical Sociology 25(2):163-177, 2001.
         *      http://www.inf.uni-konstanz.de/algo/publications/b-fabc-01.pdf
         * 
         * @see Ulrik Brandes: On Variants of Shortest-Path Betweenness 
         *      Centrality and their Generic Computation.
         *      Social Networks 30(2):136-145, 2008.
         *      http://www.inf.uni-konstanz.de/algo/publications/b-vspbc-08.pdf
         * 
         * @see Ulrik Brandes and Christian Pich: Centrality Estimation in Large Networks.
         *      International Journal of Bifurcation and Chaos 17(7):2303-2318, 2007.
         *      http://www.inf.uni-konstanz.de/algo/publications/bp-celn-06.pdf
         * 
         * @param graph oriented and non-weighted.
         */
        betweennessCentrality : function(graph) {
            var betweennes = {};
            graph.forEachNode(function(node) {
                betweennes[node.id] = 0;
            });
            
            graph.forEachNode(function(node) {
               var shortestPath = singleSourceShortestPath(graph, node);
               accumulate(betweennes, shortestPath, node);
            });
            
            return betweennes;
        }
    };
};