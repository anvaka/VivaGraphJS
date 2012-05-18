/**
 * @note: this algorithm is not used in the library due to rounding errors in the 
 * power iteration. Still I think it's wroth to keep it in case someone would want
 * to look into its implementation 
 * 
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

/*global Viva, Float32Array Float64Array*/

Viva.Graph.Layout._ace = {};

Viva.Graph.Layout.ace = function(graph, options) {
    options = options || {};
    if (!options.dimensions) {
        options.dimensions = 2; // default number of dimensions to be calculated.
    }
    if (typeof options.x !== 'number') {
        options.x = 0;
    }
    if (typeof options.y !== 'number') {
        options.y = 1;
    }
    
    var internal = Viva.Graph.Layout._ace,
        random = Viva.random('hello', 'multilevel', 'world'),
        threshold = 13,
        eps = 10e-10,
        calculated = false,

        interpolate = function(laplacian, weights){
            // by default use edge contraction scheme.
            return internal.edgeContractionInterpolator(laplacian, weights, random); 
        },
        
        ace = function(laplacian, weights) {
            var dim = Math.sqrt(laplacian.length),
                coordinates,
                requestedDimensions = options.dimensions,
                initial,
                i;
                
            if (dim <= threshold) {
                initial = new Float64Array(requestedDimensions * dim);
                for (i = 0; i < requestedDimensions; ++i) {
                    for (var j = 0; j < dim; ++j) {
                        var val = random.nextDouble();
                        initial[i * dim + j] = val; 
                    }
                }
debugger;
                coordinates = internal.powerIteration(initial, laplacian, weights, eps);
            } else {
                var interpolator = interpolate(laplacian, weights);
                var u_c = ace(interpolator.coarseLaplacian, interpolator.coarseWeights);
                // (uˆ2, uˆ3) ← (Auc2, Auc3)
                
                initial = interpolator.multiply(u_c, interpolator.coarseWeights.length);
                coordinates = internal.powerIteration(initial, laplacian, weights, eps);
            }
            
            return coordinates;
        };
        
    
    return {
        run : function() {
            console.time('Ace Render');
            var weights = [],
                i = 0,
                laplacian = Viva.Graph.Layout.getLaplacian(graph),
                dim = graph.getNodesCount();
            
            if (dim < options.dimensions) {
                // TODO: probably we could lower it ourselve.
                throw 'Cannot embed graph with ' + dim + ' nodes into ' + options.dimensions +' space. Reduce requested number of dimensions';
            }
            
            graph.forEachNode(function(node) {
                weights[i] = 1;//graph.getLinks(node.id).length;
                i += 1;
            });
            
            var coordinates = ace(laplacian, weights),
                xOffset = options.x * dim,
                yOffset = options.y * dim;
                
            i = 0;
            
            graph.forEachNode(function(node){
                // Just for test.
                node.position = {
                    x : coordinates[i + xOffset] *1024,
                    y : coordinates[i + yOffset] *1024
                };
                ++i;
            });
            calculated = true;
            console.timeEnd('Ace Render');
        },
        
        step : function() {
            if (!calculated) {
                this.run();
                calculated = true;
            }
            return true;
        },
        
        addNode : function() {
            // todo: implement me
        },
        
        removeNode : function() {
            // todo: implement me;
        },
        
        addLink : function() {
            // todo: implement me;
        },
        
        removeLink : function() {
            // todo: implement me;
        },
        
        getGraphRect : function() {
            return {
                x1 : -512,
                y1 : -512,
                x2 : 512,
                y2 : 512
            };
        }
    };
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
            var result = new Float64Array(size);
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
        interimStorage = new Float64Array(count * count), 
    
    /**
     * This function calculates "A con" interpolation matrix;
     * Since this matrix by definition has only one 1 element on each row, we save 
     * a lot of memory by returning array of indices. We represent each column of A as 
     * pair of row numbers with non-zero indices. If column has only one such row it's
     * listed twice.
     */
    contractEdges = function() {
        var indices = new Int32Array(count),
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
            // TODO: Consider Walshaw ([2]). He suggested to use neighbouring vertex with the smallest weight.
            var row = node * count,
                candidate = node; // Contract with itself, if no neighbouring nodes found.
            
            // TODO: this gives us O(n) performance, could be imporved if we
            // use adjacency lists instead of laplacian matrix to find neighbours.
            for (var j = 0; j < count; ++j) {
                if (j !== node && !mixedNodes.hasOwnProperty(j) && laplacian[row + j]) {
                    candidate = j;
                    break;
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
        var i,
            row, column,
            originalMatrixStride = count,
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
        
        return interimStorage.subarray(0, coarsedMatrixStride * coarsedMatrixStride);
    },
    
    contractionIndices = contractEdges(),
    
    multiplyByVector = function(vectors, columnSize) {
        var numberOfVectors = vectors.length / columnSize,
            resultVectorStride = count,
            result = new Float64Array(numberOfVectors * resultVectorStride),
            indices = contractionIndices,
            i, j;
        
        for(i = 0; i < indices.length; i += 2) {
            if (indices[i] !== indices[i + 1]) {
                for(j = 0; j < numberOfVectors; ++j) {
                    result[j * resultVectorStride + indices[i]] = result[j * resultVectorStride + indices[i + 1]] = 
                                vectors[j * columnSize + i/2];
                }
            } else {
                for(j = 0; j < numberOfVectors; ++j) {
                    result[j * resultVectorStride + indices[i]] = vectors[j * columnSize + i/2];
                }
            }
        }
        
        return result;
    },
    
    
    coarsedLaplacian = coarseLaplacian(contractionIndices),
    coarsedWeights = coarseWeights(contractionIndices);
    
    return {
        indices : contractionIndices,
        coarseWeights : coarsedWeights,
        coarseLaplacian : coarsedLaplacian,
        multiply : multiplyByVector,
        coarseLaplacianDebug : coarseLaplacian
    };
};

Viva.Graph.Layout._ace.powerIteration = function(u_prev, laplacian, weights, eps) {
    var dim = weights.length, 
        p = u_prev.length / dim, // number of requested coordinates
        B = new Float64Array(dim * dim), // TODO: extract to global memory.
        u = new Float64Array(p * dim), // final result of eigenvectors 2, 3, .. p
        v = new Float64Array((p + 1) * dim), // matrix of first 'stride' + 1 eigenvectors. 
        v_prev = new Float64Array(dim),
        g = Number.MIN_VALUE, // Gershgorin bound = max(B[i,i] + Sum({Abs(B[i, j]) : i != j})) among all i.
        norm = 0,
        rowOffset,
        i, j, k,
        PRECISION = 1e+10;
      
      // TODO: cache square roots for masses.  
      // TODO: throw errors on disjoint graphs (or make it work)
    
    for (i = 0; i < dim; ++i){
        weights[i] = Math.sqrt(weights[i]);
    }
    
    for(i = 0; i < dim; ++i) {
        var rowGershgorin = 0;
        
        rowOffset = i * dim;
        // write down first (known) eigenvector:
        v[i] = weights[i]; 
        norm += weights[i] * weights[i];

        // calculate B = M-1/2 * L * M-1/2
        for(j = 0; j < dim; ++j) {
            // since we are calculating expression in a form K * M * K, where K - diagonal matrix
            // we can say that final product m[i, j] = k[i, i] * m[i, j] * k [j, j]
            var bi = laplacian[rowOffset + j]/(weights[i] * weights[j]);
            rowGershgorin += Math.abs(bi); // B[i, i] will be always > 0, thus no need to check.
            B[rowOffset + j] =  bi;
        }
        
        if (rowGershgorin > g) { g = rowGershgorin; }
    }
    
    
    norm = Math.sqrt(norm);
    for (i = 0; i < dim; ++i) {
        // normalize the first eigenvector 
        v[i] /= norm;

        // and reverse order of eigenvalues
        rowOffset = i * dim;
        for(j = 0; j < dim; ++j) {
            if (i === j) {
                B[rowOffset + j] = g - B[rowOffset + j];
            } else {
                B[rowOffset + j] = -B[rowOffset + j];
            }
        }
    }
    
    for (i = 1; i <= p; ++i) {
        norm = 0;
        var i_minus_1_ = (i - 1) * dim,
            i_ = i * dim;
            
        for (j = 0; j < dim; ++j) {
            v_prev[j] = Math.floor(weights[j] * u_prev[ i_minus_1_ + j] * PRECISION) / PRECISION;
            norm += v_prev[j] * v_prev[j];
        }
        norm = Math.floor(Math.sqrt(norm) * PRECISION) / PRECISION;
        for (j = 0; j < dim; ++j) {
            v_prev[j] /= norm;
            v_prev[j] = Math.floor(v_prev[j] * PRECISION) / PRECISION;
        }

        var error = 0, prevError = 0, iterationsCount = 0,
            j_ = 0;
        
        do {
            for (j = 0; j < dim; ++j) {
                v[i_ + j] = v_prev[j];
            }
            // orthogonalize against previous eigenvectors
            for(j = 0; j < i; ++j) {
                var projViVj = 0;
                j_ = j * dim;
                for(k = 0; k < dim; ++k) {
                    projViVj += Math.floor(v[ i_ + k] * v[ j_ + k] * PRECISION) / PRECISION;
                }
                
                for (k = 0; k < dim; ++k) {
                    v[ i_ + k] -= Math.floor(projViVj * v[ j_ + k] * PRECISION) / PRECISION;
                }
            }
            
            // power iteration:
            norm = 0;
            for(j = 0; j < dim; ++j) {
                var b_times_v = 0;
                
                rowOffset = j * dim;
                    
                for(k = 0; k < dim; ++k) {
                    b_times_v += Math.floor(B[rowOffset + k] * v[ i_ + k] * PRECISION) / PRECISION; 
                }
                
                v_prev[j] = b_times_v;
                norm += b_times_v * b_times_v; 
            }
            norm = Math.floor(Math.sqrt(norm) * PRECISION) / PRECISION;
            // normalization end error accounting:
            if (error) {
                prevError = error;
            }
            error = 0;
            for(j = 0; j < dim; ++j) {
                v_prev[j] /= norm;
                v_prev[j] = Math.floor(v_prev[j] * PRECISION) / PRECISION; 
                error += v_prev[j] * v[i_ + j];
            }
            iterationsCount+= 1;
        } while (error <= 1 - eps);// && (Math.abs(error - prevError) >= eps));  // halt when direction change is negligible
        
        console.log('PI Iteration: ' + iterationsCount + ' vector ' + i);
        
        for (j = 0; j < dim; ++j) {
            v[i_ + j] = v_prev[j];
            u[i_minus_1_ + j] = v[i_ + j]/weights[j];
        }
    }
    
    return u;
};


/**
 * Debug method to print nxm matrices stored in arrays 
 */
Viva.Graph.Layout._ace.printMatrix = function(n, m, matrix) {
    var matrixStr = '';
    for(var i = 0; i < n; ++i) {
        var line = '',
            rowOffset = i * n;
        for(var j = 0; j < m; ++j) {
            line += matrix[rowOffset + j] + '\t';
        }
        matrixStr += line + '\n';
    }
    
    return matrixStr;
};
