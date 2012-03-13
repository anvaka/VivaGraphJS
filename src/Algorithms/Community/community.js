/**
 * @fileOverview Community structure detection algorithms
 * 
 * @see http://en.wikipedia.org/wiki/Community_structure
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/

Viva.Graph.community = function() {
    return {
        /**
         * Implementation of Speaker-listener Label Propagation Algorithm (SLPA) of
         * Jierui Xie and Boleslaw K. Szymanski. 
         * 
         * @see http://arxiv.org/pdf/1109.5720v3.pdf
         * @see https://sites.google.com/site/communitydetectionslpa/ 
         */
        slpa : function(graph, T, r) {
            var algorithm = Viva.Graph._community.slpaAlgorithm(graph, T, r);
            return algorithm.run();
        }
    };
};