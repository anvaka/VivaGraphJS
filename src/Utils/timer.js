/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

module.exports = createTimer();

function createTimer() {
  var lastTime = 0,
    vendors = ['ms', 'moz', 'webkit', 'o'],
    i,
    scope;

  if (typeof window !== 'undefined') {
    scope = window;
  } else if (typeof global !== 'undefined') {
    scope = global;
  } else {
    scope = {
      setTimeout: noop,
      clearTimeout: noop
    };
  }

  for (i = 0; i < vendors.length && !scope.requestAnimationFrame; ++i) {
    var vendorPrefix = vendors[i];
    scope.requestAnimationFrame = scope[vendorPrefix + 'RequestAnimationFrame'];
    scope.cancelAnimationFrame =
      scope[vendorPrefix + 'CancelAnimationFrame'] || scope[vendorPrefix + 'CancelRequestAnimationFrame'];
  }

  if (!scope.requestAnimationFrame) {
    scope.requestAnimationFrame = rafPolyfill;
  }

  if (!scope.cancelAnimationFrame) {
    scope.cancelAnimationFrame = cancelRafPolyfill;
  }

  return timer;

  /**
   * Timer that fires callback with given interval (in ms) until
   * callback returns true;
   */
  function timer(callback) {
    var intervalId;
    startTimer(); // start it right away.

    return {
      /**
       * Stops execution of the callback
       */
      stop: stopTimer,

      restart: restart
    };

    function startTimer() {
      intervalId = scope.requestAnimationFrame(startTimer);
      if (!callback()) {
        stopTimer();
      }
    }

    function stopTimer() {
      scope.cancelAnimationFrame(intervalId);
      intervalId = 0;
    }

    function restart() {
      if (!intervalId) {
        startTimer();
      }
    }
  }

  function rafPolyfill(callback) {
    var currTime = new Date().getTime();
    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
    var id = scope.setTimeout(function() {
      callback(currTime + timeToCall);
    }, timeToCall);
    lastTime = currTime + timeToCall;
    return id;
  }

  function cancelRafPolyfill(id) {
    scope.clearTimeout(id);
  }
}

function noop() {}
