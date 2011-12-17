/**
 * @fileOverview Contains collection of graph generators.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/

Viva.Graph.generator = function() {

    return {
        /**
         * Generates complete graph Kn.
         *
         * @param n represents number of nodes in the complete graph.
         */
        complete : function(n) {
            if(!n || n < 1) {
                throw { message: 'At least two nodes expected for complete graph' };
            }

            var g = Viva.Graph.graph();
            g.Name = "Complete K" + n;

            for(var i = 0; i < n; ++i) {
                for(var j = i + 1; j < n; ++j) {
                    if(i !== j) {
                        g.addLink(i, j);
                    }
                }
            }

            return g;
        },
        
        /**
         * Generates complete bipartite graph K n,m. Each node in the 
         * first partition is connected to all nodes in the second partition.
         * 
         * @param n represents number of nodes in the first graph partition
         * @param m represents number of nodes in the second graph partition
         */
        completeBipartite : function(n, m){
          if(!n || !m || n < 0 || m < 0) {
                throw { message: 'Graph dimensions are invalid. Number of nodes in each partition should be greate than 0' };
            }

            var g = Viva.Graph.graph();
            g.Name = "Complete K " + n + "," + m;
            for(var i = 0; i < n; ++i){
                for(var j = n; j < n + m; ++j){
                    g.addLink(i, j);
                }
            }  
            
            return g;
        },
        /**
         * Generates a graph in a form of a ladder with n steps.
         *
         * @param n number of steps in the ladder.
         */
        ladder : function(n) {
            if(!n || n < 0) {
                throw { message: 'Invalid number of nodes' };
            }

            var g = Viva.Graph.graph();
            g.Name = "Ladder graph " + n;

            for(var i = 0; i < n - 1; ++i) {
                g.addLink(i, i + 1);
                // first row
                g.addLink(n + i, n + i + 1);
                // second row
                g.addLink(i, n + i);
                // ladder's step
            }

            g.addLink(n - 1, 2 * n - 1);
            // last step in the ladder;

            return g;
        },

        /**
         * Generates a graph in a form of a circular ladder with n steps.
         *
         * @param n number of steps in the ladder.
         */
        circularLadder : function(n){
            if(!n || n < 0) {
                throw { message: 'Invalid number of nodes' };
            }
            
            var g = this.ladder(n);
            g.Name = "Circular ladder graph " + n;
            
            g.addLink(0, n - 1);
            g.addLink(n, 2 * n - 1);
            return g;
        },
        /**
         * Generates a graph in a form of a grid with n rows and m columns.
         *
         * @param n number of rows in the graph.
         * @param m number of columns in the graph.
         */
        grid: function(n, m){
            var g = Viva.Graph.graph();
            g.Name = "Grid graph " + n + "x" + m;
            for(var i = 0; i < n; ++i){
                for (var j = 0; j < m; ++j){
                    var node = i + j * n;
                    if (i > 0) { g.addLink(node, i - 1 + j * n); }
                    if (j > 0) { g.addLink(node, i + (j - 1) * n); }
                }
            }
            
            return g;
        },
        
        path: function(n){
            if(!n || n < 0) {
                throw { message: 'Invalid number of nodes' };
            }
            
            var g = Viva.Graph.graph();
            g.Name = "Path graph " + n;
            g.addNode(0);
            for(var i = 1; i < n; ++i){
                g.addLink(i - 1, i);
            }
            
            return g;
        },
        
        lollipop: function(m, n){
            if(!n || n < 0 || !m || m < 0) {
                throw { message: 'Invalid number of nodes' };
            }
            
            var g = this.complete(m);
            g.Name = "Lollipop graph. Head x Path " + m + "x" + n;
            
            for(var i = 0; i < n; ++i){
                g.addLink(m + i - 1, m + i);
            }
            
            return g;
        },
        
        /**
         * Creates balanced binary tree with n levels.
         */
        balancedBinTree: function (n){
            var g = Viva.Graph.graph();
            g.Name = "Balanced bin tree graph " + n;
            var count = Math.pow(2, n);
            for(var level = 1; level < count; ++level){
                var root = level;
                var left = root * 2;
                var right = root * 2 + 1;
                g.addLink(root, left);
                g.addLink(root, right);
            }
            
            return g;
        },
        /**
         * Generates a graph with n nodes and 0 links.
         *
         * @param n number of nodes in the graph.
         */
        randomNoLinks : function(n){
            if(!n || n < 0) {
                throw { message: 'Invalid number of nodes' };
            }

            var g = Viva.Graph.graph();
            g.Name = "Random graph, no Links: " + n;
            for(var i = 0; i < n; ++i){
                g.addNode(i);
            }
            
            return g;
        }
    };
};
