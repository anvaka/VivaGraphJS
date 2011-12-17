/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva, window*/
Viva.Graph.Utils = Viva.Graph.Utils || {};

// TODO: I don't really like the way I implemented events. It looks clumsy and
// hard to understand. Refactor it. 

/**
 * Allows to start/stop listen to element's events. An element can be arbitrary
 * DOM element, or object with eventuality behavior. 
 * 
 * To add eventuality behavior to arbitrary object 'obj' call 
 * Viva.Graph.Utils.event(obj).extend() method.
 * After this call is made the object can use obj.fire(eventName, params) method, and listeners
 * can listen to event by Viva.Graph.Utils.events(obj).on(eventName, callback) method.
 */
Viva.Graph.Utils.events = function(element){
    
    /**
     * Extends arbitrary object with fire method and allows it to be used with on/stop methods.
     * 
     * This behavior is based on Crockford's eventuality example, but with a minor changes:
     *   - fire() method accepts parameters to pass to callbacks (instead of setting them in 'on' method)
     *   - on() method is replaced with addEventListener(), to let objects be used as a DOM objects.
     *   - behavoir contract is simplified to "string as event name"/"function as callback" convention.
     *   - removeEventListener() method added to let unsubscribe from events.
     */
    var eventuality = function(that){
        var registry = {};
        
        /**
         * Fire an event on an object. The event is a string containing the name of the event 
         * Handlers registered by the 'addEventListener' method that match the event name 
         * will be invoked.
         */ 
        that.fire = function (eventName, parameters) {
            var registeredHandlers,
                callback,
                handler;
           
            if (typeof eventName !== 'string') {
                throw 'Only strings can be used as even type';
            }
            
            // If an array of handlers exist for this event, then
            // loop through it and execute the handlers in order.
            if (registry.hasOwnProperty(eventName)) {
                registeredHandlers = registry[eventName];
                for (var i = 0; i < registeredHandlers.length; ++i) {
                    handler = registeredHandlers[i];
                    callback = handler.method;
                    callback(parameters);
                }
            }
            
            return this;
        };
        
        that.addEventListener = function (eventName, callback) {
            if (typeof callback !== 'function'){
                throw 'Only functions allowed to be callbacks';
            }
            
            var handler = {
                method: callback
            };
            if (registry.hasOwnProperty(eventName)) {
                registry[eventName].push(handler);
            } else {
                registry[eventName] = [handler];
            }
            
            return this;
        };
        
        that.removeEventListener = function(eventName, callback){
            if (typeof callback !== 'function'){
                throw 'Only functions allowed to be callbacks';
            }
            
            if (registry.hasOwnProperty(eventName)) {
                var handlers = registry[eventName];
                for (var i = 0; i < handlers.length; ++i) {
                   if (handlers[i].callback === callback) {
                       handlers.splice(i);
                       break;
                   } 
                }
            }
            
            return this;
        };
        
        return that;        
    };
    
    return {
        /**
         * Registes callback to be called when element fires event with given event name.
         */
        on : function(eventName, callback) {
            if (element.addEventListener) {// W3C DOM and eventuality objecets.
                element.addEventListener(eventName, callback, false);
            } else if (element.attachEvent) { // IE DOM
                element.attachEvent("on" + eventName, callback);
            }
            
            return this;
        },
        
        /**
         * Unsubcribes from object's events.
         */
        stop : function(eventName, callback) {
            if (element.removeEventListener) {
                element.removeEventListener(eventName, callback, false);
            } else if (element.detachEvent) {
                element.detachEvent('on' + eventName, callback);
            }
        },
        
        /**
         * Adds eventuality to arbitrary JavaScript object. Eventuality adds
         * fire(), addEventListner() and removeEventListners() to the target object.
         *  
         * This is required if you want to use object with on(), stop() methods.
         */
        extend : function(){
            return eventuality(element);
        }
    };
};