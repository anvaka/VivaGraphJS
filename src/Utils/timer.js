/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva, window*/
Viva.Graph.Utils = Viva.Graph.Utils || {};

/**
 * Timer that fires callback with given interval (in ms) until
 * callback returns true;
 */
Viva.Graph.Utils.timer = function(callback, interval){
 // I wanted to extract this to make further transition to 
 // requestAnimationFrame easier: http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 var intervalId = setInterval(function() {
        if (!callback()) { clearInterval(intervalId); }
    }, interval);
    
    return {
        /**
         * Stops execution of the callback
         */
        stop: function() {
            clearInterval(intervalId);
        }
    };
};
