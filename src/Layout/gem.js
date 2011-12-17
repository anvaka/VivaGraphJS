/**
 * @fileOverview Implements GEM graph drawing algorithm.
 *
 * @see The <a href='http://www.springerlink.com/index/Y4H746K55233W685.pdf'>
 * A fast adaptive layout algorithm for undirected graphs (abstract)</a> and
 * <a href='http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.113.9565&rep=rep1&type=pdf'>
 * [PDF] from psu.edu</a>
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 * 
 * TODO: According to GEM hypothesis random node processing order during one iteration
 * leads to faster GEM convergence. Current implementation does not employ this techinque.
 * 
 */
/*global Viva*/

Viva.Graph.Layout = Viva.Graph.Layout || {};

/**
 * Implements GEM graph drawing algorithm.
 *
 * @example
 *
 *   var graphGenerator = Viva.Graph.generator();
 *   var graph = graphGenerator.complete(5); // Create complete graph K5
 *
 *   var gemLayout = Viva.Graph.Layout.gem(graph);
 *   gemLayout.run();
 *   // Now every node of the graph has position.x and position.y
 *   // pointing to 'nice' locations.
 */
Viva.Graph.Layout.gem = function(graph, customSettings) {
    if(!graph) {
        throw {
            message : "Graph structure cannot be undefined"
        };
    }

    var settings = (function buildAlgorithmSettings(userSettings) {
        var finalSettings = {
            /**
             * Start temperature of every node.
             */
            initialTemperature : userSettings.initialTemperature || 0.3,

            /**
             * Temperature of the system that we are trying to reach.
             */
            stopTemperature : userSettings.stopTemperature || 0.02,
            maxIterations : userSettings.MaxIterations || 5,

            /**
             * Desired edge length.
             */
            edgeLength : userSettings.springLength || 80,

            /**
             * Gravitational constant that is used to calculate attraction to center of gravity.
             * Used during node impulse calculation.
             */
            gravitationalConstant : userSettings.gravitationalConstant || 0.05,

            /**
             * Maximum percentage of @EdgeLength that is allowed for random nodes movement.
             * Used during node impulse calculation.
             */
            shakeDisturbance : userSettings.shakeDisturbance || 0.2,

            /**
             * Sensitivity towards oscillation.
             */
            oscilationSensitivity : userSettings.oscilationSensitivity || 0.4,

            /**
             * Sensitivity towards rotation.
             */
            rotationSensitivity : userSettings.rotationSensitivity || 0.9,
            minimalRotationTemperature : userSettings.minimalRotationTemperature || 2
        };

        // Max local temperature.
        finalSettings.maximalTemperature = userSettings.maximalTemperature || 1.5 * finalSettings.edgeLength;
        finalSettings.edgeLengthSquared = finalSettings.edgeLength * finalSettings.edgeLength;

        finalSettings.maxShakeOffset = finalSettings.shakeDisturbance * finalSettings.edgeLength;

        return finalSettings;
    })(customSettings || {}),

        // Sum of all nodes coordinates. Used to simplify barycenter computation.
        systemCenterX, systemCenterY,

        // Current temperature of the system.
        systemTemperature,

        graphRect = {x1: 0, y1 : 0, x2 : 0, y2 : 0},
        
        initializationRequired = true,

        /**
         * Helper function to get random positive integer numbers.
         *
         * @param maxValue the biggest integer number
         */
        rndNext = function (maxValue) {
            return Math.floor(Math.random() * (maxValue || 0xffffffff));
        },
        
        getBestNodePosition = function(node) {
            // TODO: Initial position could be picked better, like take into 
            // account all neighbouring nodes/links, not only one.
            // TODO: this is the same as in force based layout. consider refactoring.
            var baseX = (graphRect.x1 + graphRect.x2) / 2,
                baseY = (graphRect.y1 + graphRect.y2) / 2,
                springLength = settings.edgeLength;
                
            if (node.links && node.links.length > 0){
                var firstLink= node.links[0],
                    otherNode = firstLink.fromId != node.id ? graph.getNode(firstLink.fromId) : graph.getNode(firstLink.toId);
                if (otherNode.position){
                    baseX = otherNode.position.x;
                    baseY = otherNode.position.y;
                }
            }
            
            return {
                x : baseX + rndNext(springLength) - springLength/2,
                y : baseY + rndNext(springLength) - springLength/2
            };  
        },
        
        initGemNode = function(node) {
            node.position = node.position || getBestNodePosition(node);

            node.gemData = {
                // Current temperature of this node
                heat : settings.initialTemperature * settings.edgeLength,

                // Impulse X
                iX : 0,

                // Impulse Y
                iY : 0,
                skewGauge : 0,
                mass : 1 + graph.getLinks(node.id).length / 3.0
            };
            
            systemTemperature += node.gemData.heat * node.gemData.heat;
            systemCenterX += node.position.x;
            systemCenterY += node.position.y;
        },
        
        releaseGemNode = function(node) {
            if (node.gemData) { 
                delete node.gemData;
            }
        },

       initSimulator = function () {
           systemTemperature = 0;
           systemCenterX = 0;
           systemCenterY = 0;
    
           graph.forEachNode(initGemNode);
       },

    /**
     * Computes impulse of the given node. Runtime: O(N + m), N - number of graph nodes, m - number of linked nodes.
     *
     * @returns object {iX, iY}, with corresponding impulse values.
     */
       computeImpulse = function(node) {
            var position = node.position;
            if(!position) {
                return ; // This is a new node. Wait untill renderer requests us to initialize it.
            }
    
            var edgeLengthSquared = settings.edgeLengthSquared;
            var nodeX = position.x;
            var nodeY = position.y;
    
            var gemNode = node.gemData;
            var nodesCount = graph.getNodesCount();
    
            // Attraction to center of gravity:
            var impulseX = (systemCenterX / nodesCount - nodeX) * gemNode.mass * settings.gravitationalConstant;
            var impulseY = (systemCenterY / nodesCount - nodeY) * gemNode.mass * settings.gravitationalConstant;
    
            // Random disturbance:
            impulseX += rndNext() % (2 * settings.maxShakeOffset + 1) - settings.maxShakeOffset;
            impulseY += rndNext() % (2 * settings.maxShakeOffset + 1) - settings.maxShakeOffset;
            // +1 to exclude zero.
    
            // Repulsive forces
            graph.forEachNode(function(otherNode) {
                if(otherNode.id !== node.id) {
                    var dx = nodeX - otherNode.position.x;
                    var dy = nodeY - otherNode.position.y;
                    var lenSqr = dx * dx + dy * dy;
                    if(lenSqr > 0) {
                        impulseX += dx * edgeLengthSquared / lenSqr;
                        impulseY += dy * edgeLengthSquared / lenSqr;
                    }
                }
            });
            // Attractive forces
            graph.forEachLinkedNode(node.id, function(adjacentNode) {
                var dx = nodeX - adjacentNode.position.x;
                var dy = nodeY - adjacentNode.position.y;
                var lenSqr = dx * dx + dy * dy;
                impulseX -= dx * lenSqr / (edgeLengthSquared * node.gemData.mass);
                impulseY -= dy * lenSqr / (edgeLengthSquared * node.gemData.mass);
            });
          
            return {
                iX : impulseX,
                iY : impulseY
            };
        },
        
       /**
        * Updates node's position, temperature and impulse.
        * Also detects possible rotations oscillations. Runtime is O(1).
        */
        updatePositionAndTemperature = function(node, impulse) {
            var impulseX = impulse.iX,
                impulseY = impulse.iY,
                nodesCount = graph.getNodesCount();
    
            if(impulseX === 0 && impulseY === 0) {
                return;
                // Impulse is negligible.
            }
            
            var scale = Math.max(Math.abs(impulseX), Math.abs(impulseY)) / settings.edgeLengthSquared;
    
            // Don't let impulse vector be longer than edge:
            if(scale > 1) {
                impulseX /= scale;
                impulseY /= scale;
            }
    
            var gemNode = node.gemData;
    
            // scale with current temperature:
            var impulseLength = Math.sqrt(impulseX * impulseX + impulseY * impulseY);
            var currentTemperature = gemNode.heat;
            impulseX = currentTemperature * impulseX / impulseLength;
            impulseY = currentTemperature * impulseY / impulseLength;
            node.position.x += impulseX;
            node.position.y += impulseY;
    
            // save the division at this point
            systemCenterX += impulseX;
            systemCenterY += impulseY;
    
            var nodeImpulse = currentTemperature * Math.sqrt(gemNode.iX * gemNode.iX + gemNode.iY * gemNode.iY);
            if(nodeImpulse > 0) {
                systemTemperature -= currentTemperature * currentTemperature;
                // Oscillation:
                currentTemperature += currentTemperature * settings.oscilationSensitivity * (impulseX * gemNode.iX + impulseY * gemNode.iY) / nodeImpulse;
                currentTemperature = Math.min(currentTemperature, settings.maximalTemperature);
                // Rotation:
                gemNode.skewGauge += settings.rotationSensitivity * (impulseX * gemNode.iY - impulseY * gemNode.iX) / nodeImpulse;
                currentTemperature -= currentTemperature * Math.abs(gemNode.skewGauge) / nodesCount;
                currentTemperature = Math.max(currentTemperature, settings.minimalRotationTemperature);
                systemTemperature += currentTemperature * currentTemperature;
                gemNode.heat = currentTemperature;
            }
    
            gemNode.iX = impulseX;
            gemNode.iY = impulseY;
        };

    return {
        /**
         * Attempts to layout graph within given number of iterations.
         *
         * @param {integer} [iterationsCount] number of algorithm's iterations.
         */
        run : function(iterationsCount) {
            iterationsCount = iterationsCount || 50;
            for(var i = 0; i < iterationsCount; ++i) {
                this.step();
            }
        },
        /**
         * Performs one iteration of the layout algorithm. Could be used to visualize the algorithm.
         *
         * Note: Gem is not well-suited for animation. It's fast but visualization of the process
         * is not very appealing.
         */
        step : function() {
            if (initializationRequired){
                initSimulator();
                initializationRequired = false;
            }
            
            var nodesCount = graph.getNodesCount(),
                stopTemperature = settings.stopTemperature * settings.stopTemperature * settings.edgeLengthSquared * nodesCount,
                maxIteration = settings.maxIterations * nodesCount * nodesCount,
                x1 = Number.MAX_VALUE,
                y1 = Number.MAX_VALUE,
                x2 = Number.MIN_VALUE,
                y2 = Number.MIN_VALUE,
                that = this;
            
            if(systemTemperature < stopTemperature || nodesCount === 0) {
                return;
            }
            
            graph.forEachNode(function (node) {
               if(that.isNodePinned(node) || !node.gemData) {
                    return;
                }

                var impulse = computeImpulse(node);
                updatePositionAndTemperature(node, impulse);
                
                if (node.position.x < x1) { x1 = node.position.x; }
                if (node.position.x > x2) { x2 = node.position.x; }
                if (node.position.y < y1) { y1 = node.position.y; }
                if (node.position.y > y2) { y2 = node.position.y; }
            });
            
            graphRect.x1 = x1;
            graphRect.x2 = x2;
            graphRect.y1 = y1;
            graphRect.y2 = y2;
        },
        
        /**
         * Determines whether or not given node should be considered by layout algorithm.
         * If node is "pinned" layout algorithm does not move it.
         *
         * @param node under question. Note: It is NOT an identifier of the node, but actual
         *  object returned from graph.addNode() or graph.getNode() methods.
         */
        isNodePinned : function(node) {
            if(!node) {
                return true;
            }

            return node.isPinned || (node.data && node.data.isPinned);
        },
        
         /**
         * Returns rectangle structure {x1, y1, x2, y2}, which represents
         * current space occupied by graph.
         */
        getGraphRect : function() {
            return graphRect;
        },
        
        
        addNode : function(node) {
            initGemNode(node);
        },
        
        removeNode : function(node) {
            releaseGemNode(node);
        },
        
        addLink : function(link) {
            // NOP. Just for compliance with renderer; 
        },
        
        removeLink : function(link) {
            // NOP. Just for compliance with renderer; 
        }
    };
};
