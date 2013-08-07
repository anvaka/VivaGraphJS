// I don't like to suppress this, but I'm afraid 'force_directed_body'
// could already be used by someone. Don't want to break it now.
/* jshint camelcase:false */

Viva.Graph.Layout = Viva.Graph.Layout || {};
Viva.Graph.Layout.forceDirected = function(graph, settings) {
    var STABLE_THRESHOLD = 0.001; // Maximum movement of the system which can be considered as stabilized

    if (!graph) {
        throw {
            message: 'Graph structure cannot be undefined'
        };
    }

    settings = Viva.lazyExtend(settings, {
        /**
         * If true, the layout API will be compatible with
         * old version of the library, where each node had it's own
         * position property. This was a bad API decision...
         */
        compatible: false,
        /**
         * Ideal length for links (springs in physical model).
         */
        springLength: 80,

        /**
         * Hook's law coefficient. 1 - solid spring.
         */
        springCoeff: 0.0002,

        /**
         * Coulomb's law coefficient. It's used to repel nodes thus should be negative
         * if you make it positive nodes start attract each other :).
         */
        gravity: -1.2,

        /**
         * Theta coeffiecient from Barnes Hut simulation. Ranged between (0, 1).
         * The closer it's to 1 the more nodes algorithm will have to go through.
         * Setting it to one makes Barnes Hut simulation no different from
         * brute-force forces calculation (each node is considered).
         */
        theta: 0.8,

        /**
         * Drag force coefficient. Used to slow down system, thus should be less than 1.
         * The closer it is to 0 the less tight system will be.
         */
        dragCoeff: 0.02
    });

    var forceSimulator = Viva.Graph.Physics.forceSimulator(Viva.Graph.Physics.eulerIntegrator()),
        nbodyForce = Viva.Graph.Physics.nbodyForce({
            gravity: settings.gravity,
            theta: settings.theta
        }),
        springForce = Viva.Graph.Physics.springForce({
            length: settings.springLength,
            coeff: settings.springCoeff
        }),
        dragForce = Viva.Graph.Physics.dragForce({
            coeff: settings.dragCoeff
        }),
        graphRect = new Viva.Graph.Rect(),
        random = Viva.random('ted.com', 103, 114, 101, 97, 116),

        getBestBodyPosition = function(node) {
            // TODO: Initial position could be picked better, e.g. take into
            // account all neighbouring nodes/links, not only one.
            // How about center of mass?
            var baseX = (graphRect.x1 + graphRect.x2) / 2,
                baseY = (graphRect.y1 + graphRect.y2) / 2,
                springLength = settings.springLength;

            if (node.links && node.links.length > 0) {
                var firstLink = node.links[0],
                    otherNode = firstLink.fromId !== node.id ? graph.getNode(firstLink.fromId) : graph.getNode(firstLink.toId);
                if (otherNode.position) {
                    baseX = otherNode.position.x;
                    baseY = otherNode.position.y;
                }
            }

            return {
                x: baseX + random.next(springLength) - springLength / 2,
                y: baseY + random.next(springLength) - springLength / 2
            };
        },

        nodeBodies = {},
        getBody = function (nodeId) {
            return nodeBodies[nodeId];
        },

        releaseBody = function (node) {
            nodeBodies[node.id] = null;
            delete nodeBodies[node.id];
        },

        springs = {},

        updateBodyMass = function(node) {
            var body = getBody(node.id);
            body.mass = 1 + graph.getLinks(node.id).length / 3.0;
        },

        initNode = function(node) {
            var body = getBody(node.id);
            if (!body) {
                body = new Viva.Graph.Physics.Body();
                nodeBodies[node.id] = body;
                var position = getBestBodyPosition(body);
                body.loc(position);
                updateBodyMass(node);

                if (settings.compatible) {
                    // This is depricated method. Please never ever use
                    // 'compatible' mode: it has a curse of shared data store
                    // i.e. there is no way two layouters could layout the same
                    // graph, since they both would compete for positions
                    node.position = position;
                    node.force_directed_body = body;
                }

                forceSimulator.addBody(body);
            }
        },

        releaseNode = function(node) {
            var body = getBody(node.id);
            if (body) {
                if (settings.compatible) {
                    node.force_directed_body = null;
                    delete node.force_directed_body;
                }
                releaseBody(node);

                forceSimulator.removeBody(body);
            }
        },

        initLink = function(link) {
            var from = graph.getNode(link.fromId),
                to = graph.getNode(link.toId);

            updateBodyMass(from);
            updateBodyMass(to);

            var fromBody = getBody(link.fromId),
                toBody  = getBody(link.toId),
                spring = forceSimulator.addSpring(fromBody, toBody, -1.0, link.weight);

            // TODO: this has a bug, with multiple springs between same nodes
            springs[link.id] = spring;

            if (settings.compatible) {
                // bad...
                link.force_directed_spring = spring;
            }
        },

        releaseLink = function(link) {
            var spring = springs[link.id];
            if (spring) {
                var from = graph.getNode(link.fromId),
                    to = graph.getNode(link.toId);
                if (from) {
                    updateBodyMass(from);
                }
                if (to) {
                    updateBodyMass(to);
                }
                if (settings.compatible) {
                    link.force_directed_spring = null;
                    delete link.force_directed_spring;
                }
                delete springs[link.id];

                forceSimulator.removeSpring(spring);
            }
        },

        onGraphChanged = function(changes) {
            for (var i = 0; i < changes.length; ++i) {
                var change = changes[i];
                if (change.changeType === 'add') {
                    if (change.node) {
                        initNode(change.node);
                    }
                    if (change.link) {
                        initLink(change.link);
                    }
                } else if (change.changeType === 'remove') {
                    if (change.node) {
                        releaseNode(change.node);
                    }
                    if (change.link) {
                        releaseLink(change.link);
                    }
                }
            }
        },

        initSimulator = function() {
            graph.forEachNode(initNode);
            graph.forEachLink(initLink);
            graph.addEventListener('changed', onGraphChanged);
        },

        isNodePinned = function(node, body) {
            // this potentiall should make it easy to refactor when compatible mode goes away
            if (!node && !body) {
                return true;
            }

            return (node && (node.isPinned || (node.data && node.data.isPinned))) ||
                   (body && body.isPinned);
        },

        updateNodePositions = function() {
            var x1 = Number.MAX_VALUE,
                y1 = Number.MAX_VALUE,
                x2 = Number.MIN_VALUE,
                y2 = Number.MIN_VALUE;

            if (graph.getNodesCount() === 0) {
                return;
            }
            for (var key in nodeBodies) {
                if (nodeBodies.hasOwnProperty(key)) {
                    // how about pinned nodes?
                    var body = nodeBodies[key];
                    if (isNodePinned(null, body)) {
                        body.location.x = body.prevLocation.x;
                        body.location.y = body.prevLocation.y;
                    } else {
                        body.prevLocation.x = body.location.x;
                        body.prevLocation.y = body.location.y;
                    }
                    if (body.location.x < x1) {
                        x1 = body.location.x;
                    }
                    if (body.location.x > x2) {
                        x2 = body.location.x;
                    }
                    if (body.location.y < y1) {
                        y1 = body.location.y;
                    }
                    if (body.location.y > y2) {
                        y2 = body.location.y;
                    }
                }
            }

            if (settings.compatible) {
                graph.forEachNode(function(node) {
                    var body = node.force_directed_body;
                    if (!body) {
                        // This could be a sign someone removed the propery.
                        // Please don't use 'compatible' mode
                        return;
                    }

                    // if (isNodePinned(node)) {
                    //     body.loc(node.position);
                    // }

                    node.position.x = body.location.x;
                    node.position.y = body.location.y;

                });
            }

            graphRect.x1 = x1;
            graphRect.x2 = x2;
            graphRect.y1 = y1;
            graphRect.y2 = y2;
        };

    forceSimulator.addSpringForce(springForce);
    forceSimulator.addBodyForce(nbodyForce);
    forceSimulator.addBodyForce(dragForce);

    initSimulator();

    return {
        /**
         * Attempts to layout graph within given number of iterations.
         *
         * @param {integer} [iterationsCount] number of algorithm's iterations.
         */
        run: function(iterationsCount) {
            var i;
            iterationsCount = iterationsCount || 50;

            for (i = 0; i < iterationsCount; ++i) {
                this.step();
            }
        },

        step: function() {
            var energy = forceSimulator.run(20);
            updateNodePositions();

            return energy < STABLE_THRESHOLD;
        },

        isNodePinned: function (node) {
            var body = getBody(node.id);
            return isNodePinned(node, body);
        },

        pinNode: function (node, isPinned) {
            var body = getBody(node.id);
            body.isPinned = !!isPinned;
        },

        getNodePosition: function (nodeId) {
            var body = getBody(nodeId);
            return body && body.location;
        },

        setNodePosition: function (node, x, y) {
            var body = getBody(node.id);
            if (body) {
                body.prevLocation.x = body.location.x = x;
                body.prevLocation.y = body.location.y = y;
            }
        },

        /**
         * Returns rectangle structure {x1, y1, x2, y2}, which represents
         * current space occupied by graph.
         */
        getGraphRect: function() {
            return graphRect;
        },

        /**
         * Request to release all resources
         */
        dispose: function() {
            graph.removeEventListener('change', onGraphChanged);
        },

        // Layout specific methods
        /**
         * Gets or sets current desired length of the edge.
         *
         * @param length new desired length of the springs (aka edge, aka link).
         * if this parameter is empty then old spring length is returned.
         */
        springLength: function(length) {
            if (arguments.length === 1) {
                springForce.options({
                    length: length
                });
                return this;
            }

            return springForce.options().length;
        },

        /**
         * Gets or sets current spring coeffiсient.
         *
         * @param coeff new spring coeffiсient.
         * if this parameter is empty then its old value returned.
         */
        springCoeff: function(coeff) {
            if (arguments.length === 1) {
                springForce.options({
                    coeff: coeff
                });
                return this;
            }

            return springForce.options().coeff;
        },

        /**
         * Gets or sets current gravity in the nbody simulation.
         *
         * @param g new gravity constant.
         * if this parameter is empty then its old value returned.
         */
        gravity: function(g) {
            if (arguments.length === 1) {
                nbodyForce.options({
                    gravity: g
                });
                return this;
            }

            return nbodyForce.options().gravity;
        },

        /**
         * Gets or sets current theta value in the nbody simulation.
         *
         * @param t new theta coeffiсient.
         * if this parameter is empty then its old value returned.
         */
        theta: function(t) {
            if (arguments.length === 1) {
                nbodyForce.options({
                    theta: t
                });
                return this;
            }

            return nbodyForce.options().theta;
        },

        /**
         * Gets or sets current theta value in the nbody simulation.
         *
         * @param dragCoeff new drag coeffiсient.
         * if this parameter is empty then its old value returned.
         */
        drag: function(dragCoeff) {
            if (arguments.length === 1) {
                dragForce.options({
                    coeff: dragCoeff
                });
                return this;
            }

            return dragForce.options().coeff;
        }
    };
};
