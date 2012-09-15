/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva, window*/
Viva.Input = Viva.Input || {};
Viva.Input.domInputManager = function(graph, graphics) {
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
        bindDragNDrop : function(node, handlers) {
            if (handlers) {
                var events = Viva.Graph.Utils.dragndrop(node.ui);
                if (typeof handlers.onStart === 'function') {
                    events.onStart(handlers.onStart);
                }
                if (typeof handlers.onDrag === 'function') {
                    events.onDrag(handlers.onDrag);
                } 
                if (typeof handlers.onStop === 'function') {
                    events.onStop(handlers.onStop);
                }
                
                node.events = events;
            } else if (node.events) {
                // TODO: i'm not sure if this is required in JS world...
                node.events.release();
                node.events = null;
                delete node.events;
            }

        }   
    };
};
