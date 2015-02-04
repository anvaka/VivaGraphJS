/**
 * This module provides compatibility layer with 0.6.x library. It will be
 * removed in the next version
 */

var events = require('ngraph.events');

module.exports = backwardCompatibleEvents;

function backwardCompatibleEvents(g) {
  console.log("This method is deprecated. Please use Viva.events() instead");

  if (!g) {
    return g;
  }

  var eventsDefined = (g.on !== undefined) ||
    (g.off !== undefined) ||
    (g.fire !== undefined);

  if (eventsDefined) {
    // events already defined, ignore
    return {
      extend: function() {
        return g;
      },
      on: g.on,
      stop: g.off
    };
  }

  return {
    extend: extend,
    on: g.on,
    stop: g.off
  };

  function extend() {
    var backwardCompatible = events(g);
    backwardCompatible.addEventListener = backwardCompatible.on;
    return backwardCompatible;
  }
}
