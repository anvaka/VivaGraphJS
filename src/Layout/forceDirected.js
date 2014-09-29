// I don't like to suppress this, but I'm afraid 'force_directed_body'
// could already be used by someone. Don't want to break it now.
/* jshint camelcase:false */

Viva.Graph.Layout = Viva.Graph.Layout || {};
Viva.Graph.Layout.forceDirected = function(graph, settings) {
    if (!graph) {
        throw {
            message: 'Graph structure cannot be undefined'
        };
    }

    settings = Viva.lazyExtend(settings, {
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
        dragCoeff: 0.02,

        /**
         * Allows to transfor physical spring associated with a link. this allows clients
         * to specify custom length for a link.
         *
         * @param {Viva.Graph.Link} link actual link for which transform is performed
         * @param {Viva.Graph.Physics.Spring} spring physical spring which is associated with
         * a link. Most interesting property will be 'length'
         *
         * @example
         * // Let's say your graph represent friendship. Each link has associated
         * // 'strength' of connection, distributed from 0 (not a strong connection) to
         * // 1 (very strong connection)
         * //
         * // You want your graph to have uniformly distributed links, but stronger
         * // connection should pull nodes closer:
         *
         * graph.addLink(user1, user2, { friendshipStrength: 0.9 });
         * var layout = Viva.Graph.Layout.forceDirected(graph, {
         *   springLength: 80, // 80 pixels is our ideal link length
         *   springTransform: function (link, spring) {
         *     // We can set custom desired length of a spring, based on
         *     // link's data:
         *     spring.length = 80 * (1 - link.data.friendshipStrength);
         *   }
         * }
         */
        springTransform: function (link, spring) {
          // By default, it is a no-op
        },

        /**
         * Default time step (dt) for forces integration
         */
        timeStep : 20,

        /**
         * Maximum movement of the system which can be considered as stabilized
         */
        stableThreshold: 0.009
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

        nodeBodies = {},
        getBestNodePosition = function(node) {
            // TODO: Initial position could be picked better, e.g. take into
            // account all neighbouring nodes/links, not only one.
            // How about center of mass?
            if (node.position) {
                return node.position;
            }
            var baseX = (graphRect.x1 + graphRect.x2) / 2,
                baseY = (graphRect.y1 + graphRect.y2) / 2,
                springLength = settings.springLength;

            if (node.links && node.links.length > 0) {
                var firstLink = node.links[0],
                    otherNode = firstLink.fromId !== node.id ? nodeBodies[firstLink.fromId] : nodeBodies[firstLink.toId];
                if (otherNode && otherNode.location) {
                    baseX = otherNode.location.x;
                    baseY = otherNode.location.y;
                }
            }

            return {
                x: baseX + random.next(springLength) - springLength / 2,
                y: baseY + random.next(springLength) - springLength / 2
            };
        },

        getBody = function (nodeId) {
            return nodeBodies[nodeId];
        },

        releaseBody = function (nodeId) {
            nodeBodies[nodeId] = null;
            delete nodeBodies[nodeId];
        },

        springs = {},

        updateBodyMass = function(nodeId) {
            var body = getBody(nodeId);
            body.mass = 1 + graph.getLinks(nodeId).length / 3.0;
        },

        isNodePinned = function(node) {
            return (node && (node.isPinned || (node.data && node.data.isPinned)));
        },

        isBodyPinned = function (body) {
            return body.isPinned;
        },

        initNode = function(nodeId) {
            var body = getBody(nodeId);
            if (!body) {
                var node = graph.getNode(nodeId);
                if (!node) {
                    return; // what are you doing?
                }

                body = new Viva.Graph.Physics.Body();
                nodeBodies[nodeId] = body;
                var position = getBestNodePosition(node);
                body.loc(position);
                updateBodyMass(nodeId);

                if (isNodePinned(node)) {
                    body.isPinned = true;
                }
                forceSimulator.addBody(body);
            }
        },

        initNodeObject = function (node) {
            initNode(node.id);
        },

        releaseNode = function(node) {
            var body = getBody(node.id);
            if (body) {
                releaseBody(node.id);

                forceSimulator.removeBody(body);
                if (graph.getNodesCount() === 0) {
                    graphRect.x1 = graphRect.y1 = 0;
                    graphRect.x2 = graphRect.y2 = 0;
                }
            }
        },

        initLink = function(link) {
            updateBodyMass(link.fromId);
            updateBodyMass(link.toId);

            var fromBody = getBody(link.fromId),
                toBody  = getBody(link.toId),
                spring = forceSimulator.addSpring(fromBody, toBody, -1.0, link.weight);

            settings.springTransform(link, spring);
            springs[link.id] = spring;
        },

        releaseLink = function(link) {
            var spring = springs[link.id];
            if (spring) {
                var from = graph.getNode(link.fromId),
                    to = graph.getNode(link.toId);
                if (from) {
                    updateBodyMass(from.id);
                }
                if (to) {
                    updateBodyMass(to.id);
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
                        initNode(change.node.id);
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
            graph.forEachNode(initNodeObject);
            graph.forEachLink(initLink);
            graph.addEventListener('changed', onGraphChanged);
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
                    if (isBodyPinned(body)) {
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

            graphRect.x1 = x1;
            graphRect.x2 = x2;
            graphRect.y1 = y1;
            graphRect.y2 = y2;
        };

    forceSimulator.setSpringForce(springForce);
    forceSimulator.setNbodyForce(nbodyForce);
    forceSimulator.setDragForce(dragForce);

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

        /**
         * Performs one step of iterative layout algorithm
         */
        step: function() {
            var energy = forceSimulator.run(settings.timeStep);
            updateNodePositions();

            return energy < settings.stableThreshold;
        },

        /*
         * Checks whether given node is pinned;
         */
        isNodePinned: function (node) {
            var body = getBody(node.id);
            if (body) {
                return isBodyPinned(body);
            }
        },

        /*
         * Requests layout algorithm to pin/unpin node to its current position
         * Pinned nodes should not be affected by layout algorithm and always
         * remain at their position
         */
        pinNode: function (node, isPinned) {
            var body = getBody(node.id);
            body.isPinned = !!isPinned;
        },

        /*
         * Gets position of a node by its id. If node was not seen by this
         * layout algorithm undefined value is returned;
         */
        getNodePosition: function (nodeId) {
            var body = getBody(nodeId);
            if (!body) {
                initNode(nodeId);
                body = getBody(nodeId);
            }
            return body && body.location;
        },

        /**
         * Returns {from, to} position of a link.
         */
        getLinkPosition: function (link) {
            var from = this.getNodePosition(link.fromId),
                to = this.getNodePosition(link.toId);

            return {
                from : from,
                to : to
            };
        },

        /**
         * Sets position of a node to a given coordinates
         */
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
