// I don't like to suppress this, but I'm afraid 'force_directed_body'
// could already be used by someone. Don't want to break it now.
/* jshint camelcase:false */

Viva.Graph.Layout = Viva.Graph.Layout || {};

Viva.Graph.Layout.forceDirected = function (graph, settings) {
    var STABLE_THRESHOLD = 0.001; // Maximum movement of the system which can be considered as stabilized

    if (!graph) {
        throw {
            message : "Graph structure cannot be undefined"
        };
    }

    settings = Viva.lazyExtend(settings, {
        /**
         * Ideal length for links (springs in physical model).
         */
        springLength : 80,

        /**
         * Hook's law coefficient. 1 - solid spring.
         */
        springCoeff : 0.0002,

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
        theta : 0.8,

        /**
         * Drag force coefficient. Used to slow down system, thus should be less than 1.
         * The closer it is to 0 the less tight system will be.
         */
        dragCoeff : 0.02
    });

    var forceSimulator = Viva.Graph.Physics.forceSimulator(Viva.Graph.Physics.eulerIntegrator()),

        nbodyForce = Viva.Graph.Physics.nbodyForce({gravity : settings.gravity, theta: settings.theta}),

        springForce = Viva.Graph.Physics.springForce({length : settings.springLength, coeff: settings.springCoeff }),

        dragForce = Viva.Graph.Physics.dragForce({coeff: settings.dragCoeff}),

        initializationRequired = true,

        graphRect = new Viva.Graph.Rect(),

        random = Viva.random("ted.com", 103, 114, 101, 97, 116),

        getBestNodePosition = function (node) {
            // TODO: Initial position could be picked better, e.g. take into
            // account all neighbouring nodes/links, not only one.
            // TODO: this is the same as in gem layout. consider refactoring.
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
                x : baseX + random.next(springLength) - springLength / 2,
                y : baseY + random.next(springLength) - springLength / 2
            };
        },

        updateNodeMass = function (node) {
            var body = node.force_directed_body;
            body.mass = 1 + graph.getLinks(node.id).length / 3.0;
        },

        initNode = function (node) {
            var body = node.force_directed_body;
            if (!body) {
                // TODO: rename position to location or location to position to be consistent with
                // other places.
                node.position = node.position || getBestNodePosition(node);

                body = new Viva.Graph.Physics.Body();
                node.force_directed_body = body;
                updateNodeMass(node);

                body.loc(node.position);
                forceSimulator.addBody(body);
            }
        },

        releaseNode = function (node) {
            var body = node.force_directed_body;
            if (body) {
                node.force_directed_body = null;
                delete node.force_directed_body;

                forceSimulator.removeBody(body);
            }
        },

        initLink = function (link) {
            // TODO: what if bodies are not initialized?
            var from = graph.getNode(link.fromId),
                to = graph.getNode(link.toId);

            updateNodeMass(from);
            updateNodeMass(to);
            link.force_directed_spring = forceSimulator.addSpring(from.force_directed_body, to.force_directed_body, -1.0, link.weight);
        },

        releaseLink = function (link) {
            var spring = link.force_directed_spring;
            if (spring) {
                var from = graph.getNode(link.fromId),
                    to = graph.getNode(link.toId);
                if (from) { updateNodeMass(from); }
                if (to) { updateNodeMass(to); }

                link.force_directed_spring = null;
                delete link.force_directed_spring;

                forceSimulator.removeSpring(spring);
            }
        },

        initSimulator = function () {
            graph.forEachNode(initNode);
            graph.forEachLink(initLink);
        },

        isNodePinned = function (node) {
            if (!node) {
                return true;
            }

            return node.isPinned || (node.data && node.data.isPinned);
        },

        updateNodePositions = function () {
            var x1 = Number.MAX_VALUE,
                y1 = Number.MAX_VALUE,
                x2 = Number.MIN_VALUE,
                y2 = Number.MIN_VALUE;
            if (graph.getNodesCount() === 0) { return; }

            graph.forEachNode(function (node) {
                var body = node.force_directed_body;
                if (!body) {
                    return; // TODO: maybe we shall initialize it?
                }

                if (isNodePinned(node)) {
                    body.loc(node.position);
                }

                // TODO: once again: use one name to be consistent (position vs location)
                node.position.x = body.location.x;
                node.position.y = body.location.y;

                if (node.position.x < x1) { x1 = node.position.x; }
                if (node.position.x > x2) { x2 = node.position.x; }
                if (node.position.y < y1) { y1 = node.position.y; }
                if (node.position.y > y2) { y2 = node.position.y; }
            });

            graphRect.x1 = x1;
            graphRect.x2 = x2;
            graphRect.y1 = y1;
            graphRect.y2 = y2;
        };

    forceSimulator.addSpringForce(springForce);
    forceSimulator.addBodyForce(nbodyForce);
    forceSimulator.addBodyForce(dragForce);

    return {
        /**
         * Attempts to layout graph within given number of iterations.
         *
         * @param {integer} [iterationsCount] number of algorithm's iterations.
         */
        run : function (iterationsCount) {
            var i;
            iterationsCount = iterationsCount || 50;

            for (i = 0; i < iterationsCount; ++i) {
                this.step();
            }
        },

        step : function () {
            // we assume graph was not modified between calls. If it was
            // we will have to reinitialize force simulator.
            if (initializationRequired) {
                initSimulator();
                initializationRequired = false;
            }

            var energy = forceSimulator.run(20);
            updateNodePositions();

            return energy < STABLE_THRESHOLD;
        },

        /**
         * Returns rectangle structure {x1, y1, x2, y2}, which represents
         * current space occupied by graph.
         */
        getGraphRect : function () {
            return graphRect;
        },

        addNode : function (node) {
            initNode(node);
        },

        removeNode : function (node) {
            releaseNode(node);
        },

        addLink : function (link) {
            initLink(link);
        },

        removeLink : function (link) {
            releaseLink(link);
        },

        /**
         * Request to release all resources
         */
        dispose : function () {
            // Because I do not have reference to all nodes
            // they should be disposed externally. Probably this will change
            // In future. For now just reset this flag.
            initializationRequired = true;
        },

        // Layout specific methods
        /**
         * Gets or sets current desired length of the edge.
         *
         * @param length new desired length of the springs (aka edge, aka link).
         * if this parameter is empty then old spring length is returned.
         */
        springLength : function (length) {
            if (arguments.length === 1) {
                springForce.options({ length : length });
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
        springCoeff : function (coeff) {
            if (arguments.length === 1) {
                springForce.options({ coeff : coeff });
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
        gravity : function (g) {
            if (arguments.length === 1) {
                nbodyForce.options({ gravity : g });
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
        theta : function (t) {
            if (arguments.length === 1) {
                nbodyForce.options({ theta : t });
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
        drag : function (dragCoeff) {
            if (arguments.length === 1) {
                dragForce.options({ coeff : dragCoeff });
                return this;
            }

            return dragForce.options().coeff;
        }
    };
};