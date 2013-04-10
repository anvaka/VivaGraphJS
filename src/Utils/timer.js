/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

Viva.Graph.Utils = Viva.Graph.Utils || {};

(function () {
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
            setTimeout: function () {},
            clearTimeout: function () {}
        };
    }
    for (i = 0; i < vendors.length && !scope.requestAnimationFrame; ++i) {
        var vendorPrefix = vendors[i];
        scope.requestAnimationFrame = scope[vendorPrefix + 'RequestAnimationFrame'];
        scope.cancelAnimationFrame =
            scope[vendorPrefix + 'CancelAnimationFrame'] || scope[vendorPrefix + 'CancelRequestAnimationFrame'];
    }

    if (!scope.requestAnimationFrame) {
        scope.requestAnimationFrame = function (callback) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = scope.setTimeout(function () { callback(currTime + timeToCall); }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!scope.cancelAnimationFrame) {
        scope.cancelAnimationFrame = function (id) {
            scope.clearTimeout(id);
        };
    }

    /**
     * Timer that fires callback with given interval (in ms) until
     * callback returns true;
     */
    Viva.Graph.Utils.timer = function (callback) {
        var intervalId,
            stopTimer = function () {
                scope.cancelAnimationFrame(intervalId);
                intervalId = 0;
            },

            startTimer = function () {
                intervalId = scope.requestAnimationFrame(startTimer);
                if (!callback()) {
                    stopTimer();
                }
            };

        startTimer(); // start it right away.

        return {
            /**
             * Stops execution of the callback
             */
            stop: stopTimer,

            restart : function () {
                if (!intervalId) {
                    startTimer();
                }
            }
        };
    };
}());