/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva, window*/
Viva.Graph.Utils = Viva.Graph.Utils || {};

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    if (typeof window === 'undefined') {
        window = {}; // let it run in node.js environment. TODO: use something else, not window?
    }
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = 
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame){
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    
    if (!window.cancelAnimationFrame){
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());

/**
 * Timer that fires callback with given interval (in ms) until
 * callback returns true;
 */
Viva.Graph.Utils.timer = function(callback, interval){
 var intervalId,
     stopTimer = function(){
        window.cancelAnimationFrame(intervalId);
        intervalId = 0;  
     },

     startTimer = function(){
         intervalId = window.requestAnimationFrame(startTimer);
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
        
        restart : function(){
            if (!intervalId) {
                startTimer();
            }
        }
    };
};
