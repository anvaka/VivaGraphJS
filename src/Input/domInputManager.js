/**
 * @author Andrei Kashcha (aka anvaka) / https://github.com/anvaka
 */

module.exports = domInputManager;

var dragndrop = require('./dragndrop.js');

function domInputManager(graph, graphics) {
  var nodeEvents = {};
  return {
    /**
     * Called by renderer to listen to drag-n-drop events from node. E.g. for SVG
     * graphics we may listen to DOM events, whereas for WebGL the graphics
     * should provide custom eventing mechanism.
     *
     * @param node - to be monitored.
     * @param handlers - object with set of three callbacks:
     *   onStart: function(),
     *   onDrag: function(e, offset),
     *   onStop: function()
     */
    bindDragNDrop: bindDragNDrop
  };

  function bindDragNDrop(node, handlers) {
    var events;
    if (handlers) {
      var nodeUI = graphics.getNodeUI(node.id);
      events = dragndrop(nodeUI);
      if (typeof handlers.onStart === 'function') {
        events.onStart(handlers.onStart);
      }
      if (typeof handlers.onDrag === 'function') {
        events.onDrag(handlers.onDrag);
      }
      if (typeof handlers.onStop === 'function') {
        events.onStop(handlers.onStop);
      }

      nodeEvents[node.id] = events;
    } else if ((events = nodeEvents[node.id])) {
      events.release();
      delete nodeEvents[node.id];
    }
  }
}
