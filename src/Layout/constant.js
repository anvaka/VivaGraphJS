module.exports = constant;

var merge = require('ngraph.merge');
var random = require('ngraph.random').random;
var Rect = require('../Utils/rect.js');

/**
 * Does not really perform any layouting algorithm but is compliant
 * with renderer interface. Allowing clients to provide specific positioning
 * callback and get static layout of the graph
 *
 * @param {Viva.Graph.graph} graph to layout
 * @param {Object} userSettings
 */
function constant(graph, userSettings) {
    userSettings = merge(userSettings, {
        maxX : 1024,
        maxY : 1024,
        seed : 'Deterministic randomness made me do this'
    });
    // This class simply follows API, it does not use some of the arguments:
    /*jshint unused: false */
    var rand = random(userSettings.seed),
        graphRect = new Rect(Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE),
        layoutLinks = {},

        placeNodeCallback = function (node) {
            return {
              x: rand.next(userSettings.maxX),
              y: rand.next(userSettings.maxY)
            };
        },

        updateGraphRect = function (position, graphRect) {
            if (position.x < graphRect.x1) { graphRect.x1 = position.x; }
            if (position.x > graphRect.x2) { graphRect.x2 = position.x; }
            if (position.y < graphRect.y1) { graphRect.y1 = position.y; }
            if (position.y > graphRect.y2) { graphRect.y2 = position.y; }
        },

        layoutNodes = typeof Object.create === 'function' ? Object.create(null) : {},

        ensureNodeInitialized = function (node) {
            layoutNodes[node.id] = placeNodeCallback(node);
            updateGraphRect(layoutNodes[node.id], graphRect);
        },

        updateNodePositions = function () {
            if (graph.getNodesCount() === 0) { return; }

            graphRect.x1 = Number.MAX_VALUE;
            graphRect.y1 = Number.MAX_VALUE;
            graphRect.x2 = Number.MIN_VALUE;
            graphRect.y2 = Number.MIN_VALUE;

            graph.forEachNode(ensureNodeInitialized);
        },

        ensureLinkInitialized = function (link) {
          layoutLinks[link.id] = link;
        },

        onGraphChanged = function(changes) {
            for (var i = 0; i < changes.length; ++i) {
                var change = changes[i];
                if (change.node) {
                    if (change.changeType === 'add') {
                        ensureNodeInitialized(change.node);
                    } else {
                        delete layoutNodes[change.node.id];
                    }
                } if (change.link) {
                    if (change.changeType === 'add') {
                        ensureLinkInitialized(change.link);
                    } else {
                        delete layoutLinks[change.link.id];
                    }
                }
            }
        };

    graph.forEachNode(ensureNodeInitialized);
    graph.forEachLink(ensureLinkInitialized);
    graph.on('changed', onGraphChanged);

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

            return true; // no need to continue.
        },

        /**
         * Returns rectangle structure {x1, y1, x2, y2}, which represents
         * current space occupied by graph.
         */
        getGraphRect : function () {
            return graphRect;
        },

        /**
         * Request to release all resources
         */
        dispose : function () {
            graph.off('change', onGraphChanged);
        },

        /*
         * Checks whether given node is pinned; all nodes in this layout are pinned.
         */
        isNodePinned: function (node) {
            return true;
        },

        /*
         * Requests layout algorithm to pin/unpin node to its current position
         * Pinned nodes should not be affected by layout algorithm and always
         * remain at their position
         */
        pinNode: function (node, isPinned) {
           // noop
        },

        /*
         * Gets position of a node by its id. If node was not seen by this
         * layout algorithm undefined value is returned;
         */
        getNodePosition: getNodePosition,

        /**
         * Returns {from, to} position of a link.
         */
        getLinkPosition: function (linkId) {
          var link = layoutLinks[linkId];
          return {
              from : getNodePosition(link.fromId),
              to : getNodePosition(link.toId)
          };
        },

        /**
         * Sets position of a node to a given coordinates
         */
        setNodePosition: function (nodeId, x, y) {
            var pos = layoutNodes[nodeId];
            if (pos) {
                pos.x = x;
                pos.y = y;
            }
        },

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

    function getNodePosition(nodeId) {
        return layoutNodes[nodeId];
    }
}
