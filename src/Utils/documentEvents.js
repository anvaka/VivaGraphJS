var nullEvents = require('./nullEvents.js');

module.exports = createDocumentEvents();

function createDocumentEvents() {
  if (typeof document === undefined) {
    return nullEvents;
  }

  return {
    on: on,
    off: off
  };
}

function on(eventName, handler) {
  document.addEventListener(eventName, handler);
}

function off(eventName, handler) {
  document.removeEventListener(eventName, handler);
}
