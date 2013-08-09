/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

Viva.Input = Viva.Input || {};
Viva.Input.webglInputManager = function (graph, graphics) {
    var inputEvents = Viva.Graph.webglInputEvents(graphics),
        draggedNode = null,
        internalHandlers = {},
        pos = {x : 0, y : 0};

    inputEvents.mouseDown(function (node, e) {
        draggedNode = node;
        pos.x = e.clientX;
        pos.y = e.clientY;

        inputEvents.mouseCapture(draggedNode);

        var handlers = internalHandlers[node.id];
        if (handlers && handlers.onStart) {
            handlers.onStart(e, pos);
        }

        return true;
    }).mouseUp(function (node) {
        inputEvents.releaseMouseCapture(draggedNode);

        draggedNode = null;
        var handlers = internalHandlers[node.id];
        if (handlers && handlers.onStop) {
            handlers.onStop();
        }
        return true;
    }).mouseMove(function (node, e) {
        if (draggedNode) {
            var handlers = internalHandlers[draggedNode.id];
            if (handlers && handlers.onDrag) {
                handlers.onDrag(e, {x : e.clientX - pos.x, y : e.clientY - pos.y });
            }

            pos.x = e.clientX;
            pos.y = e.clientY;
            return true;
        }
    });

    return {
        /**
         * Called by renderer to listen to drag-n-drop events from node. E.g. for CSS/SVG
         * graphics we may listen to DOM events, whereas for WebGL we graphics
         * should provide custom eventing mechanism.
         *
         * @param node - to be monitored.
         * @param handlers - object with set of three callbacks:
         *   onStart: function(),
         *   onDrag: function(e, offset),
         *   onStop: function()
         */
        bindDragNDrop : function (node, handlers) {
            internalHandlers[node.id] = handlers;
            if (!handlers) {
                delete internalHandlers[node.id];
            }
        }
    };
};
