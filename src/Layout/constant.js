Viva.Graph.Layout = Viva.Graph.Layout || {};

/**
 * Does not really perform any layouting algorithm but is compliant
 * with renderer interface. Allowing clients to provide specific positioning
 * callback and get static layout of the graph
 *
 * @param {Viva.Graph.graph} graph to layout
 * @param {Object} userSettings
 */
Viva.Graph.Layout.constant = function (graph, userSettings) {
    userSettings = Viva.lazyExtend(userSettings, {
        maxX : 1024,
        maxY : 1024,
        seed : 'Deterministic randomness made me do this'
    });
    // This class simply follows API, it does not use some of the arguments:
    /*jshint unused: false */
    var rand = Viva.random(userSettings.seed),
        graphRect = new Viva.Graph.Rect(Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE),

        placeNodeCallback = function (node) {
            return new Viva.Graph.Point2d(rand.next(userSettings.maxX), rand.next(userSettings.maxY));
        },

        updateGraphRect = function (node, graphRect) {
            if (node.position.x < graphRect.x1) { graphRect.x1 = node.position.x; }
            if (node.position.x > graphRect.x2) { graphRect.x2 = node.position.x; }
            if (node.position.y < graphRect.y1) { graphRect.y1 = node.position.y; }
            if (node.position.y > graphRect.y2) { graphRect.y2 = node.position.y; }
        },

        ensureNodeInitialized = function (node) {
            if (!node.hasOwnProperty('position')) {
                node.position = placeNodeCallback(node);
            }
            updateGraphRect(node, graphRect);
        },

        updateNodePositions = function () {
            if (graph.getNodesCount() === 0) { return; }

            graphRect.x1 = Number.MAX_VALUE;
            graphRect.y1 = Number.MAX_VALUE;
            graphRect.x2 = Number.MIN_VALUE;
            graphRect.y2 = Number.MIN_VALUE;

            graph.forEachNode(ensureNodeInitialized);
        };

    return {
        /**
         * Attempts to layout graph within given number of iterations.
         *
         * @param {integer} [iterationsCount] number of algorithm's iterations.
         *  The constant layout ignores this parameter.
         */
        run : function (iterationsCount) {
            this.step();
        },

        /**
         * One step of layout algorithm.
         */
        step : function () {
            updateNodePositions();

            return false; // no need to continue.
        },

        /**
         * Returns rectangle structure {x1, y1, x2, y2}, which represents
         * current space occupied by graph.
         */
        getGraphRect : function () {
            return graphRect;
        },

        addNode : ensureNodeInitialized,

        removeNode : function (node) { /* nop */ },

        addLink : function (link) { /* nop */ },

        removeLink : function (link) { /* nop */ },

        /**
         * Request to release all resources
         */
        dispose : function () { /* nop */ },

        // Layout specific methods:

        /**
         * Based on argument either update default node placement callback or
         * attempts to place given node using current placement callback.
         * Setting new node callback triggers position update for all nodes.
         *
         * @param {Object} newPlaceNodeCallbackOrNode - if it is a function then
         * default node placement callback is replaced with new one. Node placement
         * callback has a form of function (node) {}, and is expected to return an
         * object with x and y properties set to numbers.
         *
         * Otherwise if it's not a function the argument is treated as graph node
         * and current node placement callback will be used to place it.
         */
        placeNode : function (newPlaceNodeCallbackOrNode) {
            if (typeof newPlaceNodeCallbackOrNode === 'function') {
                placeNodeCallback = newPlaceNodeCallbackOrNode;
                updateNodePositions();
                return this;
            }

            // it is not a request to update placeNodeCallback, trying to place
            // a node using current callback:
            return placeNodeCallback(newPlaceNodeCallbackOrNode);
        }

    };
};