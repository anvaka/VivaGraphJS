/**
 * @fileOverview Implementation of ACE multiscale graph drawing algorithm.
 * ACE is A Fast Multiscale Eigenvector Computation for Drawing Huge Graphs,
 * developed by Yehuda Koren, Liran Carmel, and David Harel.
 * 
 * References:
 * [1]: http://wortschatz.uni-leipzig.de/~sbordag/semantische/papers/05/ace_journal.pdf 
 * [2]: http://staffweb.cms.gre.ac.uk/~c.walshaw/papers/fulltext/WalshawISGD00.pdf
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/

Viva.Graph.Layout._ace = {};

Viva.Graph.Layout.ace = function(graph) {
    
};


/**
 * Calculates laplacian matrix of the graph.
 * (http://en.wikipedia.org/wiki/Laplacian_matrix )
 */
Viva.Graph.Layout.getLaplacian = function(graph) {
    var nodesCount = graph.getNodesCount(), 
        matrix, // store everything in one array, to reduce number of objects (instead of having array of arrays)
        i = 0,
        linksCount = 0, // global variable to reduce memory pressure.
        nodeIds = {},
        
        linkCounter = function(node, link) {
            matrix[i * nodesCount + nodeIds[node.id]] = -1; // Assume laplacian is not weighted.
            linksCount += 1;
        },
        
        createMatrixArray = function(size) {
            var result = []; // TODO: could be Float32Array?
            for (var i = 0; i < size; i++) {
                result[i] = 0;
            }
            
            return result;
        };
    
    matrix = createMatrixArray(nodesCount * nodesCount);

    // Enumerate and assign number for all nodes in the graph:
    graph.forEachNode(function(node){
        nodeIds[node.id] = i;
        i += 1;
    });
    
    // Second pass reconstructs laplacian:
    i = 0;
    graph.forEachNode(function(node){
        linksCount = 0;  
        graph.forEachLinkedNode(node.id, linkCounter);

        matrix[i * nodesCount + i] = linksCount;
        i += 1;
    });
    
    return matrix;
};

/**
 * This class performs graph coarsening, with 'edge contraction' optimized interpolation
 * matrix. Refer to 3.4.1 paragraph of [1] for details
 * 
 * // TODO: pass random if we need it to be seeded.
 */
Viva.Graph.Layout._ace.edgeContractionInterpolator = function(laplacian, weights, random) {
    var count = Math.sqrt(laplacian.length), // laplacian is always square matrix
    
    /**
     * This function calculates "A con" interpolation matrix;
     * Since this matrix by definition has only one 1 element on each row, we save 
     * a lot of memory by returning array of indices. We represent each column of A as 
     * pair of row numbers with non-zero indices. If column has only one such row it's
     * listed twice.
     */
    contractEdges = function() {
        var indices = [],
            result = [],
            i,
            mixedNodes = {};

        for (i = 0; i < count; ++i) {
            indices[i] = i;
        }
        
        // Shuffle indices:
        Viva.randomIterator(indices, random).shuffle();
        
        for (i = 0; i < count; ++i) {
            var node = indices[i];
            if (mixedNodes.hasOwnProperty(node)) {
                continue; // process only non-mixed nodes
            }
            // Walshaw ([2]) suggested to use neighbouring vertex with the smallest weight. 
            var row = node * count,
                minWeight = Number.MAX_VALUE,
                candidate = node; // Contract with itself, if no neighbouring nodes found.
            
            // find neighbouring node with minimum weight:
            // TODO: this gives us O(n*n) performance, could be imporved if we
            // use adjacency lists instead of laplacian matrix to find neighbours.
            for (var j = 0; j < count; ++j) {
                if (j !== node && !mixedNodes.hasOwnProperty(j) && laplacian[row + j]) {
                    if (weights[j] < minWeight) {
                        candidate = j;
                        minWeight = weights[j];
                    }
                }
            }
            
            // mixedNodes[node] = true;
            if (node !== candidate) {
                mixedNodes[candidate] = true;
            }
            
            mixedNodes[node]  = true;
            
            result.push(node);
            result.push(candidate);
        } 
            
        return result;
    },
    
    /**
     * Calculates coarsened weights matrix AT M A. Refer to 3.2.1 of [1] for details.
     * 
     * Runtime O(m), where m - lower of A's dimension.
     */
    coarseWeights = function(indices) {
        var result = [];
        for (var i = 0; i < indices.length; i += 2) {
            if (indices[i] !== indices[i + 1]) {
                result[i/2] = weights[indices[i]] + weights[indices[i + 1]]; 
            } else {
                result[i/2] = weights[indices[i]];
            }
        }
        
        return result;
    },
    
    coarseLaplacian = function(indices) {
        var interimStorage = [], // TODO: this guy could be global to reduce pressure on GC
            i,
            row, column,
            originalMatrixStride = count,
            originalMatrixSize = count * count,
            coarsedMatrixStride = indices.length / 2;
        
        // contract columns (L' = L*A):
        for (i = 0; i < indices.length; i += 2) {
            column = i / 2;
            if (indices[i] !== indices[i + 1]) {
                // TODO: optimize this. Result could be stored in shared memory.
                // sum of two column vectors, i/2-th column of L' =  L[A[i]] + L[A[i + 1]];
                for(row = 0; row < count; ++row) {
                    interimStorage[column + row * coarsedMatrixStride] = laplacian[indices[i] + row * originalMatrixStride] + 
                                                                 laplacian[indices[i + 1] + row * originalMatrixStride];
                }
            } else {
                for(row = 0; row < count; ++row) {
                    interimStorage[column + row * coarsedMatrixStride] = laplacian[indices[i] + row * originalMatrixStride];
                }
            }
        }
        // contract rows L'' = AT * L'
        for(i = 0; i < indices.length; i += 2) {
            row = i/2;
            var targetRowOffset = row * coarsedMatrixStride,
                row1_offset = indices[i] * coarsedMatrixStride,
                row2_offset = indices[i+1] * coarsedMatrixStride;

            if (indices[i] !== indices[i + 1]) {
                for(column = 0; column < coarsedMatrixStride; ++column) {
                    interimStorage[targetRowOffset + column] = interimStorage[row1_offset + column] + interimStorage[row2_offset + column];
                }
            } else {
                for(column = 0; column < coarsedMatrixStride; ++column) {
                    interimStorage[targetRowOffset + column] = interimStorage[row1_offset + column];
                }
            }
        }
        
        return interimStorage.splice(0, coarsedMatrixStride * coarsedMatrixStride);
    },
    
    contractionIndices = contractEdges(),
    coarsedLaplacian = coarseLaplacian(contractionIndices),
    coarsedWeights = coarseWeights(contractionIndices);
    
    return {
        indices : contractionIndices,
        coarseWeights : coarsedWeights,
        coarseLaplacian : coarsedLaplacian,
        coarseLaplacianDebug : coarseLaplacian
    };
};
