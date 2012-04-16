/*global Viva*/

/**
 * Testing ace algorithm internals. 
 * 
 * References:
 * [1] http://wortschatz.uni-leipzig.de/~sbordag/semantische/papers/05/ace_journal.pdf
 */
var test_aceLayout = function(test){
    return {
       getLaplacianTakesItRightForCompleteGraph : function() {
           var graph = Viva.Graph.generator().complete(3),
               nodesCount = graph.getNodesCount();
           
           var laplacian = Viva.Graph.Layout.getLaplacian(graph);
           
           test.assertEqual(laplacian.length, nodesCount * nodesCount, 'Laplacian should be NxN matrix');
           for(var i = 0; i < nodesCount; ++i) {
               for (var j = 0; j < nodesCount; ++j) {
                   if (i === j) {
                       test.assertEqual(laplacian[i * nodesCount + i], nodesCount-1, 'Diagonal element should be equal to node degree');
                   } else {
                       test.assertEqual(laplacian[i * nodesCount + j], -1, 'Complete graph should have -1 for all non-diagonal elements');
                   }
               }
           }
       },
       
       getLaplacianTakesItRightForRandomNoLinksGraph : function() {
           var graph = Viva.Graph.generator().randomNoLinks(5),
               nodesCount = graph.getNodesCount();
           
           var laplacian = Viva.Graph.Layout.getLaplacian(graph);
           
           test.assertEqual(laplacian.length, nodesCount * nodesCount, 'Laplacian should be NxN matrix');
           for(var i = 0; i < nodesCount; ++i) {
               for (var j = 0; j < nodesCount; ++j) {
                   test.assertEqual(laplacian[i * nodesCount + j], 0, 'Graph with no links should be zero matrix');
               }
               
           }
       },
       
       getLaplacianForSmilpeGraph : function() {
           var graph = Viva.Graph.graph();
           graph.addLink(1, 2);
           graph.addLink(1, 3);
           graph.addLink(3, 4);
           
           var expectedLaplacian = [2, -1, -1,  0, 
                                   -1,  1,  0,  0,
                                   -1,  0,  2, -1, 
                                    0,  0, -1,  1],
                                    
               laplacian = Viva.Graph.Layout.getLaplacian(graph),
               
               nodesCount = graph.getNodesCount();

           test.assertEqual(laplacian.length, nodesCount * nodesCount, 'Laplacian should be NxN matrix');
           for(var i = 0; i < nodesCount * nodesCount; ++i) {
               test.assertEqual(laplacian[i], expectedLaplacian[i], 'Unexpected laplacian for this graph');
           }
       },
       
       contractionMatrixReducesGraphSize : function() {
           var aceInternal = Viva.Graph.Layout._ace,
               laplacian = [3, -1,
                           -3, 1],
               weights = [1, 1];
                           
           var indices = aceInternal.edgeContractionInterpolator(laplacian, weights).indices;
           // since graph is really small there is just one contraction possible:
           test.assertEqual(indices.length, 2, 'Only two elements can be contracted');
           test.assert((indices[0] === 0 && indices[1] === 1) ||
                       (indices[0] === 1 && indices[1] === 0), 
                       'Unexpected contraction index');
       },
       
       contractionMatrixForDisjointGraphContractsNodesWithThemselves : function() {
           var graph = Viva.Graph.generator().randomNoLinks(40),
               laplacian = Viva.Graph.Layout.getLaplacian(graph),
               aceInternal = Viva.Graph.Layout._ace,
               weights = [],
               i;
           
           for (i = 0; i < 40; ++i) {
               weights[i] = 1;
           }
           
           var indices = aceInternal.edgeContractionInterpolator(laplacian, weights).indices;
           
           test.assert(indices.length % 2 === 0, "Indices length should be multiplier of 2");
           for(i = 0; i < indices.length; i+= 2) {
               test.assertEqual(indices[i], indices[i + 1], 'Nodes are expected to be contracted with themselves');
           }
       },
       
       contractionMatrixForEifelTowerLaplacianProducesProperContraction : function() {
           // Laplacian is taken from [1], page 8.
           var laplacian = [
                 9, -5,  0, -4,  0,
                -5, 17, -2, -7, -3,
                 0, -2,  4, -2,  0,
                -4, -7, -2, 19, -6,
                 0, -3,  0, -6,  9],
              weights = [1, 1, 1, 1, 1],
              aceInternal = Viva.Graph.Layout._ace;
          
          var indices = aceInternal.edgeContractionInterpolator(laplacian, weights).indices;
          
          test.assert(indices.length === 6, "Indices length should be multiplier of 2");
          var seen = {};
          for(var i = 0; i < indices.length; ++i) {
              seen[indices[i]] = (seen[indices[i]] || 0) + 1;
          }
          // Since it's Eifel Tower graph, all nodes except one should be contracted:
          var doubleIsFine = true;
          for(var key in seen) {
              if (seen.hasOwnProperty(key)) {
                  var seenTimes = seen[key];
                  if (seenTimes !== 1) {
                      if (seenTimes === 2 && doubleIsFine) {
                          doubleIsFine = false;
                      } else {
                          test.assertFail('Row ' + key + ' was contracted more times when allowed');
                      }
                  }
              }
          }
       },
       
       contractionMatrixDoubleWeightsForUniformlyContractedEdges : function() {
           var weights = [1, 1, 1, 1, 1, 1],
               graph = Viva.Graph.generator().complete(6),
               laplacian = Viva.Graph.Layout.getLaplacian(graph),
               aceInternal = Viva.Graph.Layout._ace,
               interpolator = aceInternal.edgeContractionInterpolator(laplacian, weights);
               
           var coarseWeights = interpolator.coarseWeights;
           
           test.assertEqual(coarseWeights.length, 3, "Weights should be shrinked in half");
           for(var i = 0; i < coarseWeights.length; ++i) {
               test.assertEqual(coarseWeights[i], 2, "Weight should be doubled");
           }
       },
       
       contractionMatrixProducesEtalonCoarseLaplacian : function() {
           var laplacian = [
                 9, -5,  0, -4,  0,
                -5, 17, -2, -7, -3,
                 0, -2,  4, -2,  0,
                -4, -7, -2, 19, -6,
                 0, -3,  0, -6,  9],
              weights = [1, 1, 1, 1, 1],
              indices = [0, 1, 2, 2, 3, 4], // this interpolation matrix is taken from the article
              expectedCoarseLaplasian = [16, -2, -14, 
                                         -2,  4, -2,
                                         -14, -2, 16],
                                         
              aceInternal = Viva.Graph.Layout._ace,
              interpolator = aceInternal.edgeContractionInterpolator(laplacian, weights);
           
           var coarcedLaplacian = interpolator.coarseLaplacianDebug(indices);
           test.assertEqual(coarcedLaplacian.length, 9, "Laplacian's length is expected to be 9");
           for(var i = 0 ; i < 9; ++i) {
               test.assertEqual(coarcedLaplacian[i], expectedCoarseLaplasian[i], "Unexpected result for predefined indices");
           }
       }
  };
};