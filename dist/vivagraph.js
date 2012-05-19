/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

// TODO: rename all links to edges. Otherwise it's incositent
var Viva = Viva || {};

Viva.Graph = Viva.Graph || {};
Viva.Graph.version = '1.0.0.42';/*global Viva */

/**
 * Implenetation of seeded pseudo random number generator, based on LFIB4 algorithm.
 * 
 * Usage example: 
 *  var random = Viva.random('random seed', 'can', 'be', 'multiple strings'),
 *      i = random.next(100); // returns random number from [0 .. 100) range.
 */

Viva.random = function() {
    // From http://baagoe.com/en/RandomMusings/javascript/
    function Mash() {
        var n = 0xefc8249d;
     
        var mash = function(data) {
          data = data.toString();
          for (var i = 0; i < data.length; i++) {
            n += data.charCodeAt(i);
            var h = 0.02519603282416938 * n;
            n = h >>> 0;
            h -= n;
            h *= n;
            n = h >>> 0;
            h -= n;
            n += h * 0x100000000; // 2^32
          }
          return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
        };
     
        mash.version = 'Mash 0.9';
        return mash;
    }

    function LFIB4(args) {
      return(function(args) {
        // George Marsaglia's LFIB4,
        //http://groups.google.com/group/sci.crypt/msg/eb4ddde782b17051
        var k0 = 0,
            k1 = 58,
            k2 = 119,
            k3 = 178,
            j;
     
        var s = [];
     
        var mash = Mash();
        if (args.length === 0) {
          args = [+new Date()];
        }
        for (j = 0; j < 256; j++) {
          s[j] = mash(' ');
          s[j] -= mash(' ') * 4.76837158203125e-7; // 2^-21
          if (s[j] < 0) {
            s[j] += 1;
          }
        }
        for (var i = 0; i < args.length; i++) {
          for (j = 0; j < 256; j++) {
            s[j] -= mash(args[i]);
            s[j] -= mash(args[i]) * 4.76837158203125e-7; // 2^-21
            if (s[j] < 0) {
              s[j] += 1;
            }
          }
        }
        mash = null;
     
        var random = function() {
          var x;
     
          k0 = (k0 + 1) & 255;
          k1 = (k1 + 1) & 255;
          k2 = (k2 + 1) & 255;
          k3 = (k3 + 1) & 255;
     
          x = s[k0] - s[k1];
          if (x < 0) {
            x += 1;
          }
          x -= s[k2];
          if (x < 0) {
            x += 1;
          }
          x -= s[k3];
          if (x < 0) {
            x += 1;
          }
          
          s[k0] = x;
          return x;
        };
     
        random.uint32 = function() {
          return random() * 0x100000000 >>> 0; // 2^32
        };
        random.fract53 = random;
        random.version = 'LFIB4 0.9';
        random.args = args;
     
        return random;
      } (args));
    }
    
    var randomFunc = new LFIB4(Array.prototype.slice.call(arguments));
    
    return {
        /**
         * Generates random integer number in the range from 0 (inclusive) to maxValue (exclusive)
         * 
         * @param maxValue is REQUIRED. Ommitit this numbe will result in NaN values from PRNG. 
         */
        next : function (maxValue) {
            return Math.floor(randomFunc() * maxValue);
        },

        /**
         * Generates random double number in the range from 0 (inclusive) to 1 (exclusive)
         * This function is the same as Math.random() (except that it could be seeded)
         */
        nextDouble : function(){
            return randomFunc();
        }
    };
};

/**
 * Iterates over array in arbitrary order. The iterator modifies actual array content. 
 * It's based on modern version of Fisher–Yates shuffle algorithm.  
 * 
 * @see http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
 * 
 * @param array to be shuffled
 * @param random - a [seeded] random number generator to produce same sequences. This parameter
 * is optional. If you don't need determenistic randomness keep it blank.
 */
Viva.randomIterator = function(array, random) {
    random = random || Viva.random();
    
    return {
        forEach : function(callback) {
            for (var i = array.length - 1; i > 0; --i) {
               var j = random.next(i + 1); // i inclusive
               var t = array[j];
               array[j] = array[i];
               array[i] = t;
               
               callback(t);
            }
            
            if (array.length) {
                callback(array[0]);
            }
        },
        
        /**
         * Shuffles array randomly.
         */
        shuffle : function() {
            for (var i = array.length - 1; i > 0; --i) {
               var j = random.next(i + 1); // i inclusive
               var t = array[j];
               array[j] = array[i];
               array[i] = t;
            }
            
            return array;
        }
    };
};
/*global Viva*/

Viva.BrowserInfo = (function(){
    var ua = navigator.userAgent;
    
    // Useragent RegExp
    var rwebkit = /(webkit)[ \/]([\w.]+)/;
    var ropera = /(opera)(?:.*version)?[ \/]([\w.]+)/;
    var rmsie = /(msie) ([\w.]+)/;
    var rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/;
    
    ua = ua.toLowerCase();

    var match = rwebkit.exec( ua ) ||
                ropera.exec( ua ) ||
                rmsie.exec( ua ) ||
                ua.indexOf("compatible") < 0 && rmozilla.exec( ua ) || [];

    return { 
        browser: match[1] || "", 
        version: match[2] || "0" 
    };
})();
/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/
Viva.Graph.Utils = Viva.Graph.Utils || {};

Viva.Graph.Utils.indexOfElementInArray = function(element, array) {
    if (array.indexOf) {
        return array.indexOf(element);
    }

    var len = array.length;
    var i = 0;

    for ( ; i < len; i++ ) {
        if ( i in array && array[i] === element ) {
            return i;
        }
    }
    
    return -1;
};
/*global Viva*/
Viva.Graph.Utils = Viva.Graph.Utils || {};

Viva.Graph.Utils.getDimension = function(container) {
    if (!container){
        throw {
            message : 'Cannot get dimensions of undefined container'
        };
    }
    
    // TODO: Potential cross browser bug.
    var width = container.clientWidth;
    var height = container.clientHeight;
    
    return {
        left : 0,
        top : 0,
        width : width,
        height : height
    };
};
        
/**
 * Finds the absolute position of an element on a page
 */
Viva.Graph.Utils.findElementPosition = function(obj) {
    var curleft = 0,
        curtop = 0;
    if (obj.offsetParent) { 
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;    
        } while ( (obj = obj.offsetParent) ); // This is not a mistake. Should be assignment.
    }
    return [curleft,curtop];
};/**
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
};/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva, window*/
Viva.Graph.Utils = Viva.Graph.Utils || {};
// TODO: Add support for touch events: http://www.sitepen.com/blog/2008/07/10/touching-and-gesturing-on-the-iphone/
Viva.Graph.Utils.dragndrop = function(element) {
    
    var start,
        drag,
        end,
        scroll,
        prevSelectStart, 
        prevDragStart,
        documentEvents = Viva.Graph.Utils.events(window.document),
        elementEvents = Viva.Graph.Utils.events(element),
        findElementPosition = Viva.Graph.Utils.findElementPosition,
        
        startX = 0,
        startY = 0,
        dragObject,
        
        getMousePos = function(e) {
            var posx = 0,
                posy = 0;
                
            e = e || window.event;
            
            if (e.pageX || e.pageY)     {
                posx = e.pageX;
                posy = e.pageY;
            }
            else if (e.clientX || e.clientY) {
                posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }
            
            return [posx, posy];
        },
        
        stopPropagation = function (e)
        {
            if (e.stopPropagation) { e.stopPropagation(); }
            else { 
                e.cancelBubble = true; 
            }
        },
        
        handleDisabledEvent = function(e) {
            stopPropagation(e);
            return false;
        },
        
        handleMouseMove = function(e) {
            e = e || window.event;

            if (drag){
                drag(e, {x : e.clientX - startX, y : e.clientY - startY });
            }
            
            startX = e.clientX;
            startY = e.clientY;
        },
        
        handleMouseDown = function(e) {
            e = e || window.event;

            // for IE, left click == 1
            // for Firefox, left click == 0
            var isLeftButton = (e.button === 1 && window.event !== null || e.button === 0);
            
            if (isLeftButton) {
                startX = e.clientX;
                startY = e.clientY;
                
                // TODO: bump zIndex?
                dragObject = e.target || e.srcElement;

                if (start) { start(e, {x: startX, y : startY}); }
                
                documentEvents.on('mousemove', handleMouseMove);
                documentEvents.on('mouseup', handleMouseUp);
                
                stopPropagation(e);
                // TODO: This is suggested here: http://luke.breuer.com/tutorial/javascript-drag-and-drop-tutorial.aspx
                // do we need it? What if event already there?
                // Not bullet proof:
                prevSelectStart = document.onselectstart;
                prevDragStart = document.ondragstart;
                
                document.onselectstart = handleDisabledEvent;
                dragObject.ondragstart = handleDisabledEvent;

                // prevent text selection (except IE)
                return false;
            }
        },
        
        handleMouseUp = function(e) {
            e = e || window.event;

            documentEvents.stop('mousemove', handleMouseMove);
            documentEvents.stop('mouseup', handleMouseUp);
                
            document.onselectstart = prevSelectStart;
            dragObject.ondragstart = prevDragStart; 
            dragObject = null;
            if (end) { end(); }
        },
        
        handleMouseWheel = function(e){
            if (typeof scroll !== 'function') {
                return;
            }
            
            e = e || window.event;
            if(e.preventDefault) { 
                e.preventDefault();
            }

            e.returnValue = false;
            var delta,
                mousePos = getMousePos(e),
                elementOffset = findElementPosition(element),
                relMousePos = {
                    x: mousePos[0] - elementOffset[0], 
                    y: mousePos[1] - elementOffset[1] 
                };
                
            if(e.wheelDelta) {
                delta = e.wheelDelta / 360; // Chrome/Safari
            } else { 
                delta = e.detail / -9; // Mozilla
            }
            
            scroll(e, delta, relMousePos);
        },
        
        updateScrollEvents = function(scrollCallback) {
           if (!scroll && scrollCallback) {
               // client is interested in scrolling. Start listening to events:
               if (Viva.BrowserInfo.browser === 'webkit') {
                   element.addEventListener('mousewheel', handleMouseWheel, false); // Chrome/Safari
               } else {
                   element.addEventListener('DOMMouseScroll', handleMouseWheel, false); // Others
               }
           } else if (scroll && !scrollCallback) {
               if (Viva.BrowserInfo.browser === 'webkit') {
                   element.removeEventListener('mousewheel', handleMouseWheel, false); // Chrome/Safari
               } else {
                   element.removeEventListener('DOMMouseScroll', handleMouseWheel, false); // Others
               }
           }
           
           scroll = scrollCallback;
        };
        
    
    elementEvents.on('mousedown', handleMouseDown);

    return {
        onStart : function(callback) {
            start = callback;
            return this;
        },
        
        onDrag : function(callback) {
            drag = callback;
            return this;
        },
        
        onStop : function(callback) {
            end = callback;
            return this;
        },
        
        /**
         * Occurs when mouse wheel event happens. callback = function(e, scrollDelta, scrollPoint);
         */
        onScroll : function(callback) {
            updateScrollEvents(callback);
            return this;
        },
        
        release : function() {
            // TODO: could be unsafe. We might wanna release dragObject, etc.
            documentEvents.stop('mousemove', handleMouseMove);
            documentEvents.stop('mousedown', handleMouseDown);
            documentEvents.stop('mouseup', handleMouseUp);
            updateScrollEvents(null);
        }
    };
};
/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva, window*/
Viva.Graph.Utils = Viva.Graph.Utils || {};

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
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
 // I wanted to extract this to make further transition to 
 // requestAnimationFrame easier: http://paulirish.com/2011/requestanimationframe-for-smart-animating/
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
/*global Viva*/

Viva.Graph.geom = function() {
    
    return {
        // function from Graphics GEM to determine lines intersection:
        // http://www.opensource.apple.com/source/graphviz/graphviz-498/graphviz/dynagraph/common/xlines.c
        intersect : function(x1, y1, x2, y2, // first line segment
                            x3, y3, x4, y4) { // second line segment
            var a1, a2, b1, b2, c1, c2, /* Coefficients of line eqns. */
                r1, r2, r3, r4,         /* 'Sign' values */
                denom, offset, num,     /* Intermediate values */
                result = { x: 0, y : 0};

            /* Compute a1, b1, c1, where line joining points 1 and 2
             * is "a1 x  +  b1 y  +  c1  =  0".
             */
            a1 = y2 - y1;
            b1 = x1 - x2;
            c1 = x2 * y1 - x1 * y2;

            /* Compute r3 and r4.
             */
            r3 = a1 * x3 + b1 * y3 + c1;
            r4 = a1 * x4 + b1 * y4 + c1;

            /* Check signs of r3 and r4.  If both point 3 and point 4 lie on
             * same side of line 1, the line segments do not intersect.
             */
        
            if (r3 !== 0 && r4 !== 0 && ((r3 >= 0) === (r4 >= 4))) {
                return null; //no itersection.
            }

            /* Compute a2, b2, c2 */
            a2 = y4 - y3;
            b2 = x3 - x4;
            c2 = x4 * y3 - x3 * y4;

            /* Compute r1 and r2 */
        
            r1 = a2 * x1 + b2 * y1 + c2;
            r2 = a2 * x2 + b2 * y2 + c2;
        
            /* Check signs of r1 and r2.  If both point 1 and point 2 lie
             * on same side of second line segment, the line segments do
             * not intersect.
             */
            if (r1 !== 0 && r2 !== 0 && ((r1 >= 0) === (r2 >= 0 ))) {
                return null; // no intersection;
            }
            /* Line segments intersect: compute intersection point. 
             */

            denom = a1 * b2 - a2 * b1;
            if ( denom === 0 ) {
                return null; // Actually collinear..
            }

            offset = denom < 0 ? - denom / 2 : denom / 2;
            offset = 0.0;

            /* The denom/2 is to get rounding instead of truncating.  It
             * is added or subtracted to the numerator, depending upon the
             * sign of the numerator.
             */
        
            
            num = b1 * c2 - b2 * c1;
            result.x = ( num < 0 ? num - offset : num + offset ) / denom;
        
            num = a2 * c1 - a1 * c2;
            result.y = ( num < 0 ? num - offset : num + offset ) / denom;
        
            return result;                                
        },
          
          /**
           * Returns intersection point of the rectangle defined by
           * left, top, right, bottom and a line starting in x1, y1
           * and ending in x2, y2;
           */      
        intersectRect : function(left, top, right, bottom, x1, y1, x2, y2) {
            return this.intersect(left, top, left, bottom, x1, y1, x2, y2) ||
                   this.intersect(left, bottom, right, bottom, x1, y1, x2, y2) ||
                   this.intersect(right, bottom, right, top, x1, y1, x2, y2) ||
                   this.intersect(right, top, left, top, x1, y1, x2, y2);
        },
        
        convexHull : function(points) {
            var polarAngleSort = function(basePoint, points) {
                var cosAngle = function(p) {
                    var dx = p.x - basePoint.x,
                        dy = p.y - basePoint.y,
                        sign = dx > 0 ? 1 : -1;
                    
                    // We use squared dx, to avoid Sqrt opertion and improve performance.
                    // To avoid sign loss during dx * dx operation we precompute its sign:
                    return sign * dx * dx / (dx * dx + dy * dy);
                };
                
                var sortedPoints = points.sort(function(p1, p2) {
                    return cosAngle(p2) - cosAngle(p1);
                });
                
                // If more than one point has the same angle, remove all but the one that is farthest from basePoint: 
                var lastPoint = sortedPoints[0],
                    lastAngle = cosAngle(lastPoint),
                    dx = lastPoint.x - basePoint.x,
                    dy = lastPoint.y - basePoint.y,
                    lastDistance = dx * dx + dy * dy,
                    curDistance;
                    
                for (var i = 1; i < sortedPoints.length; ++i) {
                    lastPoint = sortedPoints[i];
                    var angle = cosAngle(lastPoint);
                    if (angle === lastAngle) {
                        dx = lastPoint.x - basePoint.x;
                        dy = lastPoint.y - basePoint.y;
                        curDistance = dx * dx + dy * dy;
                        
                        if (curDistance < lastDistance) {
                            sortedPoints.splice(i, 1);
                        } else {
                            sortedPoints.splice(i - 1, 1);
                        }
                    } else {
                        lastAngle = angle;
                    }
                }
                
                return sortedPoints;
            },
            
            /**
             * Returns true if angle formed by points p0, p1, p2 makes left turn.
             * (counterclockwise)
             */
            ccw = function(p0, p1, p2) {
                return ((p2.x - p0.x) * (p1.y - p0.y) - (p2.y - p0.y) * (p1.x - p0.x)) < 0;
            };
            
            if (points.length < 3) {
                return points; // This one is easy... Not precise, but should be enough for now. 
            }
            
            // let p0 be the point in Q with the minimum y-coordinate, or the leftmost 
            // such point in case of a tie
            var p0Idx = 0; 
            for (var i = 0; i < points.length; ++i) {
                if (points[i].y < points[p0Idx].y) {
                    p0Idx = i;
                } else if (points[i].y === points[p0Idx].y && points[i].x < points[p0Idx].x) {
                    p0Idx = i;
                }
            }
            
            var p0 = points[p0Idx];
            // let <p1; p2; ... pm> be the remaining points
            points.splice(p0Idx, 1);
            // sorted by polar angle in counterclockwise order around p0
            var sortedPoints = polarAngleSort(p0, points);
            if (sortedPoints.length < 2) {
                return sortedPoints;
            }
            
            // let S be empty stack
            var s = [];
            s.push(p0);
            s.push(sortedPoints[0]);
            s.push(sortedPoints[1]);
            var sLength = s.length;
            for (i = 2; i < sortedPoints.length; ++i) {
                while(!ccw(s[sLength - 2], s[sLength - 1], sortedPoints[i])) {
                    s.pop();
                    sLength -= 1;
                }
                
                s.push(sortedPoints[i]);
                sLength += 1;
            }
            
            return s;
        }  
    };
};/**
 * @fileOverview Contains definition of the core graph object.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/

/**
 * @namespace Represents a graph data structure.
 *
 * @example
 *  var g = Viva.Graph.graph();
 *  g.addNode(1);     // g has one node.
 *  g.addLink(2, 3);  // now g contains three nodes and one link.
 *
 */
Viva.Graph.graph = function() {
    
    // Graph structure is maintained as dictionary of nodes
    // and array of links. Each node has 'links' property which 
    // hold all links related to that node. And general links
    // array is used to speed up all links enumeration. This is inefficient
    // in terms of memory, but simplifies coding. Furthermore, the graph structure
    // is isolated from outter world, and can be changed to adjacency matrix later.
    
    var nodes = {},
        links = [],
        nodesCount = 0,
        suspendEvents = 0,
        
        // Accumlates all changes made during graph updates.
        // Each change element contains:
        //  changeType - one of the strings: 'add', 'remove' or 'update';
        //  node - if change is related to node this property is set to changed graph's node;
        //  link - if change is related to link this property is set to changed graph's link;
        changes = [],
    
        fireGraphChanged = function(graph){
            // TODO: maybe we shall copy changes? 
            graph.fire('changed', changes);
        },
        
        // Enter, Exit Mofidication allows bulk graph updates without firing events.
        enterModification = function(graph){
            suspendEvents += 1;
        },
        
        exitModification = function(graph){
            suspendEvents -= 1;
            if (suspendEvents === 0 && changes.length > 0){
                fireGraphChanged(graph);
                changes.length = 0;
            }
        },
        
        recordNodeChange = function(node, changeType){
            // TODO: Could add changeType verification.
            changes.push( {node : node, changeType : changeType} );
        },
        
        recordLinkChange = function(link, changeType){
            // TODO: Could add change type verification;
            changes.push( {link : link, changeType : changeType} );
        },
        
        isArray = function (value) { 
            return value &&
                   typeof value === 'object' &&
                   typeof value.length === 'number' &&
                   typeof value.splice === 'function' && 
                   !(value.propertyIsEnumerable('length'));
        };

    /** @scope Viva.Graph.graph */
    var graphPart = {

        /**
         * Adds node to the graph. If node with given id already exists in the graph
         * its data is extended with whatever comes in 'data' argument.
         *
         * @param nodeId the node's identifier. A string is preferred.
         * @param [data] additional data for the node being added. If node already
         *   exists its data object is augmented with the new one.
         *
         * @return {node} The newly added node or node with given id if it already exists.
         */
        addNode : function(nodeId, data) {
            if( typeof nodeId === 'undefined') {
                throw {
                    message: 'Invalid node identifier'
                };
            }
            
            enterModification();

            var node = this.getNode(nodeId);
            if(!node) {
                node = {};
                node.links = [];
                node.id = nodeId;
                nodesCount++;
                
                recordNodeChange(node, 'add');
            } else {
                recordNodeChange(node, 'update');
            }

            if(data) {
                var augmentedData = node.data || {},
                    dataType = typeof data;
                
                if (dataType === 'string' || isArray(data) ||
                    dataType === 'number' || dataType === 'boolean') {
                    augmentedData = data;
                } else if (dataType === 'undefined') {
                    augmentedData = null;
                } else {
                    for(var name in data) {
                        // TODO: Do we want to copy everything, including prototype's properties?
                        if (data.hasOwnProperty(name)){
                            augmentedData[name] = data[name];
                        }
                    }
                }

                node.data = augmentedData;
            }

            nodes[nodeId] = node;

            exitModification(this);
            return node;
        },
        
        /**
         * Adds a link to the graph. The function always create a new
         * link between two nodes. If one of the nodes does not exists
         * a new node is created.
         *
         * @param fromId link start node id;
         * @param toId link end node id;
         * @param [data] additional data to be set on the new link;
         *
         * @return {link} The newly created link
         */
        addLink : function(fromId, toId, data) {
            enterModification();
            
            var fromNode = this.getNode(fromId) || this.addNode(fromId);
            var toNode = this.getNode(toId) || this.addNode(toId);

            var link = {
                fromId : fromId,
                toId : toId,
                data : data
            };

            links.push(link);

            // TODO: this is not cool. On large graphs potentially would consume more memory.
            fromNode.links.push(link);
            toNode.links.push(link);
            
            recordLinkChange(link, 'add');
            
            exitModification(this);

            return link;
        },
        
        /**
         * Removes link from the graph. If link does not exist does nothing.
         * 
         * @param link - object returned by addLink() or getLinks() methods.
         * 
         * @returns true if link was removed; false otherwise.  
         */
        removeLink : function(link) {
            if (!link) { return false; }
            var idx = Viva.Graph.Utils.indexOfElementInArray(link, links);
            if (idx < 0) { return false; }
            
            enterModification();
            
            links.splice(idx, 1);
            
            var fromNode = this.getNode(link.fromId);
            var toNode = this.getNode(link.toId);
            
            if (fromNode) { 
                idx = Viva.Graph.Utils.indexOfElementInArray(link, fromNode.links);
                if (idx >= 0) { 
                    fromNode.links.splice(idx, 1);
                } 
            }
            
            if (toNode) { 
                idx = Viva.Graph.Utils.indexOfElementInArray(link, toNode.links);
                if (idx >= 0) { 
                    toNode.links.splice(idx, 1);
                } 
            }
            
            recordLinkChange(link, 'remove');
            
            exitModification(this);
            
            return true;
        },
        
        /**
         * Removes node with given id from the graph. If node does not exist in the graph
         * does nothing.
         * 
         * @param nodeId node's identifier passed to addNode() function. 
         * 
         * @returns true if node was removed; false otherwise.
         */
        removeNode: function(nodeId) {
            var node = this.getNode(nodeId);
            if (!node) { return false; }
            
            enterModification();
            
            while(node.links.length){
                var link = node.links[0];
                this.removeLink(link);
            }
            
            nodes[nodeId] = null;
            delete nodes[nodeId];
            nodesCount--;
            
            recordNodeChange(node, 'remove');
            
            exitModification(this);
        },
        
        /**
         * Gets node with given identifier. If node does not exist undefined value is returned.
         *
         * @param nodeId requested node identifier;
         *
         * @return {node} in with requested identifier or undefined if no such node exists.
         */
        getNode : function(nodeId) {
            return nodes[nodeId];
        },
        
        /**
         * Gets number of nodes in this graph.
         *
         * @return number of nodes in the graph.
         */
        getNodesCount : function() {
            return nodesCount;
        },
        
        /**
         * Gets total number of links in the graph.
         */
        getLinksCount : function() {
            return links.length;
        },
        
        /**
         * Gets all links (inbound and outbound) from the node with given id.
         * If node with given id is not found null is returned.
         *
         * @param nodeId requested node identifier.
         *
         * @return Array of links from and to requested node if such node exists;
         *   otherwise null is returned.
         */
        getLinks : function(nodeId) {
            var node = this.getNode(nodeId);
            return node ? node.links : null;
        },
        
        /**
         * Invokes callback on each node of the graph.
         *
         * @param {Function(node)} callback Function to be invoked. The function
         *   is passed one argument: visited node.
         */
        forEachNode : function(callback) {
            if( typeof callback !== 'function') {
                return;
            }

            // TODO: could it be faster for nodes iteration if we had indexed access?
            // I.e. use array + 'for' iterator instead of dictionary + 'for .. in'?
            for(var node in nodes) {
                // For performance reasons you might want to sacrifice this sanity check:
                if(nodes.hasOwnProperty(node)) {
                    callback(nodes[node]);
                }
            }
        },
        
        /**
         * Invokes callback on every linked (adjacent) node to the given one.
         *
         * @param nodeId Identifier of the requested node.
         * @param {Function(node, link)} callback Function to be called on all linked nodes.
         *   The function is passed two parameters: adjacent node and link object itself.
         * @param oriented if true graph treated as oriented.
         */
        forEachLinkedNode : function(nodeId, callback, oriented) {
            var node = this.getNode(nodeId),
                i, link, linkedNodeId;
            if(node && node.links && typeof callback === 'function') {
                // Extraced orientation check out of the loop to increase performance
                if (oriented){
                    for(i = 0; i < node.links.length; ++i) {
                        link = node.links[i];
                        if (link.fromId === nodeId){
                            callback(nodes[link.toId], link);
                        }
                    }
                } else {
                    for(i = 0; i < node.links.length; ++i) {
                        link = node.links[i];
                        linkedNodeId = link.fromId === nodeId ? link.toId : link.fromId;
    
                        callback(nodes[linkedNodeId], link);
                    }
                }
            }
        },
        
        /**
         * Enumerates all links in the graph
         *
         * @param {Function(link)} callback Function to be called on all links in the graph.
         *   The function is passed one parameter: graph's link object.
         * 
         * Link object contains at least the following fields:
         *  fromId - node id where link starts;
         *  toId - node id where link ends,
         *  data - additional data passed to graph.addLink() method.
         */
        forEachLink : function(callback) {
            if( typeof callback === 'function') {
                for(var i = 0; i < links.length; ++i) {
                    callback(links[i]);
                }
            }
        },
        
        /**
         * Suspend all notifications about graph changes until
         * endUpdate is called.
         */
        beginUpdate : function() {
            enterModification();
        },
        
        /**
         * Resumes all notifications about graph changes and fires
         * graph 'changed' event in case there are any pending changes.
         */
        endUpdate : function() {
            exitModification(this);
        },
        
        /**
         * Removes all nodes and links from the graph.
         */
        clear : function(){
            var that = this;
            that.beginUpdate();
            that.forEachNode(function(node){ that.removeNode(node.id); });
            that.endUpdate();
        },
        
        /**
         * Detects whether there is a link between two nodes. 
         * Operation complexity is O(n) where n - number of links of a node.
         * 
         * @returns link if there is one. null otherwise.
         */
        hasLink : function(fromNodeId, toNodeId) {
            // TODO: Use adjacency matrix to speed up this operation.
            var node = this.getNode(fromNodeId);
            if (!node) {
                return null;
            }
            
            for (var i = 0; i < node.links.length; ++i) {
                var link = node.links[i];
                if (link.fromId === fromNodeId && link.toId === toNodeId) {
                    return link;
                }
            }
            
            return null; // no link.
        }
    };
    
    // Let graph fire events before we return it to the caller.
    Viva.Graph.Utils.events(graphPart).extend();
    
    return graphPart;
};
/**
 * @fileOverview Contains collection of graph generators.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/

Viva.Graph.generator = function() {

    return {
        /**
         * Generates complete graph Kn.
         *
         * @param n represents number of nodes in the complete graph.
         */
        complete : function(n) {
            if(!n || n < 1) {
                throw { message: 'At least two nodes expected for complete graph' };
            }

            var g = Viva.Graph.graph();
            g.Name = "Complete K" + n;

            for(var i = 0; i < n; ++i) {
                for(var j = i + 1; j < n; ++j) {
                    if(i !== j) {
                        g.addLink(i, j);
                    }
                }
            }

            return g;
        },
        
        /**
         * Generates complete bipartite graph K n,m. Each node in the 
         * first partition is connected to all nodes in the second partition.
         * 
         * @param n represents number of nodes in the first graph partition
         * @param m represents number of nodes in the second graph partition
         */
        completeBipartite : function(n, m){
          if(!n || !m || n < 0 || m < 0) {
                throw { message: 'Graph dimensions are invalid. Number of nodes in each partition should be greate than 0' };
            }

            var g = Viva.Graph.graph();
            g.Name = "Complete K " + n + "," + m;
            for(var i = 0; i < n; ++i){
                for(var j = n; j < n + m; ++j){
                    g.addLink(i, j);
                }
            }  
            
            return g;
        },
        /**
         * Generates a graph in a form of a ladder with n steps.
         *
         * @param n number of steps in the ladder.
         */
        ladder : function(n) {
            if(!n || n < 0) {
                throw { message: 'Invalid number of nodes' };
            }

            var g = Viva.Graph.graph();
            g.Name = "Ladder graph " + n;

            for(var i = 0; i < n - 1; ++i) {
                g.addLink(i, i + 1);
                // first row
                g.addLink(n + i, n + i + 1);
                // second row
                g.addLink(i, n + i);
                // ladder's step
            }

            g.addLink(n - 1, 2 * n - 1);
            // last step in the ladder;

            return g;
        },

        /**
         * Generates a graph in a form of a circular ladder with n steps.
         *
         * @param n number of steps in the ladder.
         */
        circularLadder : function(n){
            if(!n || n < 0) {
                throw { message: 'Invalid number of nodes' };
            }
            
            var g = this.ladder(n);
            g.Name = "Circular ladder graph " + n;
            
            g.addLink(0, n - 1);
            g.addLink(n, 2 * n - 1);
            return g;
        },
        /**
         * Generates a graph in a form of a grid with n rows and m columns.
         *
         * @param n number of rows in the graph.
         * @param m number of columns in the graph.
         */
        grid: function(n, m){
            var g = Viva.Graph.graph();
            g.Name = "Grid graph " + n + "x" + m;
            for(var i = 0; i < n; ++i){
                for (var j = 0; j < m; ++j){
                    var node = i + j * n;
                    if (i > 0) { g.addLink(node, i - 1 + j * n); }
                    if (j > 0) { g.addLink(node, i + (j - 1) * n); }
                }
            }
            
            return g;
        },
        
        path: function(n){
            if(!n || n < 0) {
                throw { message: 'Invalid number of nodes' };
            }
            
            var g = Viva.Graph.graph();
            g.Name = "Path graph " + n;
            g.addNode(0);
            for(var i = 1; i < n; ++i){
                g.addLink(i - 1, i);
            }
            
            return g;
        },
        
        lollipop: function(m, n){
            if(!n || n < 0 || !m || m < 0) {
                throw { message: 'Invalid number of nodes' };
            }
            
            var g = this.complete(m);
            g.Name = "Lollipop graph. Head x Path " + m + "x" + n;
            
            for(var i = 0; i < n; ++i){
                g.addLink(m + i - 1, m + i);
            }
            
            return g;
        },
        
        /**
         * Creates balanced binary tree with n levels.
         */
        balancedBinTree: function (n){
            var g = Viva.Graph.graph();
            g.Name = "Balanced bin tree graph " + n;
            var count = Math.pow(2, n);
            for(var level = 1; level < count; ++level){
                var root = level;
                var left = root * 2;
                var right = root * 2 + 1;
                g.addLink(root, left);
                g.addLink(root, right);
            }
            
            return g;
        },
        /**
         * Generates a graph with n nodes and 0 links.
         *
         * @param n number of nodes in the graph.
         */
        randomNoLinks : function(n){
            if(!n || n < 0) {
                throw { message: 'Invalid number of nodes' };
            }

            var g = Viva.Graph.graph();
            g.Name = "Random graph, no Links: " + n;
            for(var i = 0; i < n; ++i){
                g.addNode(i);
            }
            
            return g;
        }
    };
};
/**
 * @fileOverview Contains collection of primitve operations under graph.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/

Viva.Graph.operations = function() {

    return {
        /**
         * Gets graph density, which is a ratio of actual number of edges to maximum
         * number of edges. I.e. graph density 1 means all nodes are connected with each other with an edge.
         * Density 0 - graph has no edges. Runtime: O(1)
         * 
         * @param graph represents oriented graph structure.
         * 
         * @returns density of the graph if graph has nodes. NaN otherwise 
         */
        density : function(graph) {
            var nodes = graph.getNodesCount();
            if (nodes === 0) {
                return NaN;
            }
            
            return 2 * graph.getLinksCount() / (nodes * (nodes - 1));
        }
    };
};
/**
 * @fileOverview Centrality calcuation algorithms.
 * 
 * @see http://en.wikipedia.org/wiki/Centrality
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/

Viva.Graph.centrality = function() {
    var singleSourceShortestPath = function(graph, node, oriented) {
        // I'm using the same naming convention used in http://www.inf.uni-konstanz.de/algo/publications/b-fabc-01.pdf
        // sorry about cryptic names.
        var P = {}, // predcessors lists. 
            S = [], 
            sigma = {},
            d = {},
            Q = [node.id];

        graph.forEachNode(function(t){
            P[t.id] = [];
            sigma[t.id] = 0;
        });
        
        d[node.id] = 0;
        sigma[node.id] = 1;
        
        
        while(Q.length) { // Using BFS to find shortest paths
            var v = Q.shift(),
                dV = d[v],
                sigmaV = sigma[v];

            S.push(v);
            // TODO: consider extracting function out of the cycle.
            graph.forEachLinkedNode(v, function(w){
                // w found for the first time?
                if (!d.hasOwnProperty(w.id)) {
                    Q.push(w.id);
                    d[w.id] = dV + 1; 
                } 
                // Shortest path to w via v?
                if (d[w.id] === dV + 1) {
                    sigma[w.id] += sigmaV;
                    P[w.id].push(v);
                }
            }, oriented);
        }
        
        return {
            S : S,
            P : P,
            sigma : sigma
        };
    },
     
    accumulate = function(betweenness, shortestPath, s) {
        var delta = {},
            S = shortestPath.S;
        for(var i = 0; i < S.length; ++i){
            delta[S[i]] = 0;
        }
        
        // S returns vertices in order of non-increasing distance from s
        while(S.length) {
            var w = S.pop(),
                coeff = (1 + delta[w])/shortestPath.sigma[w],
                pW = shortestPath.P[w];
            for (i = 0; i < pW.length; ++i){
                var v = pW[i];
                delta[v] += shortestPath.sigma[v] * coeff;
            }
            
            if (w !== s) {
                betweenness[w] += delta[w];
            }
        }
    },
    
    sortBetweennes = function(b) {
        var sorted = [];
        for(var key in b){
            if (b.hasOwnProperty(key)){
                sorted.push({ key : key, value : b[key]});
            }
        }
        return sorted.sort(function(x, y) { return y.value - x.value; });
    };

    return {
        
        /**
         * Compute the shortest-path betweenness centrality for all nodes in a graph.
         * 
         * Betweenness centrality of a node `n` is the sum of the fraction of all-pairs 
         * shortest paths that pass through `n`. Runtime O(n * v) for non-weighted graphs.
         *
         * @see http://en.wikipedia.org/wiki/Centrality#Betweenness_centrality
         * 
         * @see A Faster Algorithm for Betweenness Centrality. 
         *      Ulrik Brandes, Journal of Mathematical Sociology 25(2):163-177, 2001.
         *      http://www.inf.uni-konstanz.de/algo/publications/b-fabc-01.pdf
         * 
         * @see Ulrik Brandes: On Variants of Shortest-Path Betweenness 
         *      Centrality and their Generic Computation.
         *      Social Networks 30(2):136-145, 2008.
         *      http://www.inf.uni-konstanz.de/algo/publications/b-vspbc-08.pdf
         * 
         * @see Ulrik Brandes and Christian Pich: Centrality Estimation in Large Networks.
         *      International Journal of Bifurcation and Chaos 17(7):2303-2318, 2007.
         *      http://www.inf.uni-konstanz.de/algo/publications/bp-celn-06.pdf
         * 
         * @param graph for which we are calculating betweenness centrality. Non-weighted graphs are only supported 
         * @param oriented - identifies how to treat the graph
         */
        betweennessCentrality : function(graph, oriented) {
            var betweennes = {};
            graph.forEachNode(function(node) {
                betweennes[node.id] = 0;
            });
            
            graph.forEachNode(function(node) {
               var shortestPath = singleSourceShortestPath(graph, node);
               accumulate(betweennes, shortestPath, node);
            });
            
            return sortBetweennes(betweennes);
        },
        
        /**
         * Calculates graph nodes degree centrality (in/out or both).
         * 
         * @see http://en.wikipedia.org/wiki/Centrality#Degree_centrality
         * 
         * @param graph for which we are calculating centrality.
         * @param kind optional parameter. Valid values are
         *   'in'  - calculate in-degree centrality
         *   'out' - calculate out-degree centrality
         *         - if it's not set generic degree centrality is calculated
         */
        degreeCentrality : function(graph, kind) {
            var calcDegFunction;
            
            kind = (kind || 'both').toLowerCase();
            if (kind === 'in') {
                calcDegFunction = function(links, nodeId) {
                    var total = 0;
                    for(var i = 0; i < links.length; ++i) {
                         total += (links[i].toId === nodeId) ? 1 : 0;
                    }
                    return total;
                };
            } else if (kind === 'out') {
                calcDegFunction = function(links, nodeId) {
                    var total = 0;
                    for(var i = 0; i < links.length; ++i) {
                         total += (links[i].fromId === nodeId) ? 1 : 0;
                    }
                    return total;
                };
            } else if (kind === 'both') {
                calcDegFunction = function(links, nodeId) {
                    return links.length;
                };
            } else {
                throw 'Expected centrality degree kind is: in, out or both';
            }
            
            var sortedDegrees = [];
            graph.forEachNode(function(node){
                var links = graph.getLinks(node.id),
                    nodeDeg = calcDegFunction(links, node.id);
                
                if (!sortedDegrees.hasOwnProperty(nodeDeg)) {
                    sortedDegrees[nodeDeg] = [node.id];
                } else {
                    sortedDegrees[nodeDeg].push(node.id);
                }
            });
            
            var result = [];
            for (var degree in sortedDegrees){
                if (sortedDegrees.hasOwnProperty(degree)) {
                    var nodes = sortedDegrees[degree];
                    if (!nodes) { continue; }
                    
                    for(var j = 0; j < nodes.length; ++j){
                        result.unshift({key : nodes[j], value : parseInt(degree, 10)});
                    }
                }
            }
            
            return result;
        }
    };
};/*global Viva*/
Viva.Graph._community = {};

/**
 * Implementation of Speaker-listener Label Propagation Algorithm (SLPA) of
 * Jierui Xie and Boleslaw K. Szymanski. 
 * 
 * @see http://arxiv.org/pdf/1109.5720v3.pdf
 * @see https://sites.google.com/site/communitydetectionslpa/ 
 */
Viva.Graph._community.slpaAlgorithm = function(graph, T, r) {
    T = T || 100; // number of evaluation iterations. Should be at least 20. Influence memory consumption by O(n * T);
    r = r || 0.3; // community threshold on scale from 0 to 1. Value greater than 0.5 result in disjoint communities.
    
    var random = Viva.random(1331782216905),
        shuffleRandom = Viva.random('Greeting goes to you, ', 'dear reader');
    
    var calculateCommunities = function(nodeMemory, threshold) {
        var communities = [];
        nodeMemory.forEachUniqueWord(function(word, count){
            if (count > threshold) {
                communities.push({name : word, probability : count / T });
            } else {
                return true; // stop enumeration, nothing more popular after this word.
            }
        });

        return communities;
    },
    
    init = function(graph) {
        var algoNodes = [];
        graph.forEachNode(function(node) {
            var memory = Viva.Graph._community.occuranceMap(random);
            memory.add(node.id);
            
            node.slpa = { memory : memory  };
            algoNodes.push(node.id);
        });
        
        return algoNodes;
    },
    
    evaluate = function(graph, nodes) {
        var shuffle = Viva.randomIterator(nodes, shuffleRandom),
        
       /**
        * One iteration of SLPA.
        */
        processNode = function(nodeId){
            var listner = graph.getNode(nodeId),
                saidWords = Viva.Graph._community.occuranceMap(random);
            
            graph.forEachLinkedNode(nodeId, function(speakerNode){
                var word = speakerNode.slpa.memory.getRandomWord();
                saidWords.add(word);
            });
            
            // selecting the most popular label from what it observed in the current step
            var heard = saidWords.getMostPopularFair();
            listner.slpa.memory.add(heard); 
        };
        
        for (var t = 0; t < T - 1; ++t) { // -1 because one 'step' was during init phase
            shuffle.forEach(processNode);
        }
    },
    
    postProcess = function(graph) {
        var communities = {};
            
        graph.forEachNode(function(node){
            var nodeCommunities = calculateCommunities(node.slpa.memory, r * T);
            
            for (var i = 0; i < nodeCommunities.length; ++i) {
                var communityName = nodeCommunities[i].name;
                if (communities.hasOwnProperty(communityName)){
                    communities[communityName].push(node.id);
                } else {
                    communities[communityName] = [node.id];
                }
            }
            
            node.communities = nodeCommunities; // TODO: I doesn't look right to augment node's properties. No? 
            
            // Speaking of memory. Node memory created by slpa is really expensive. Release it:
            node.slpa = null;
            delete node.slpa; 
        });
        
        return communities;
    };
    
    return {
        
        /**
         * Executes SLPA algorithm. The function returns dictionary of discovered communities: 
         * {
         *     'communityName1' : [nodeId1, nodeId2, .., nodeIdN],
         *     'communityName2' : [nodeIdK1, nodeIdK2, .., nodeIdKN],
         *     ...
         * };
         *  
         * After algorithm is done each node is also augmented with new property 'communities':
         * 
         * node.communities = [ 
         *      {name: 'communityName1', probability: 0.78}, 
         *      {name: 'communityName2', probability: 0.63},
         *     ... 
         * ];
         * 
         * 'probability' is always higher than 'r' parameter and denotes level of confidence 
         * with which we think node belongs to community.
         * 
         * Runtime is O(T * m), where m is total number of edges, and T - number of algorithm iterations.
         *  
         */
        run : function() {
            var nodes = init(graph);
            
            evaluate(graph, nodes);
            
            return postProcess(graph);
        }
    };
};

/**
 * A data structure which serves as node memory during SLPA execution. The main idea is to
 * simplify operations on memory such as
 *  - add word to memory,
 *  - get random word from memory, with probablity proportional to word occurrence in the memory
 *  - get the most popular word in memory
 * 
 * TODO: currently this structure is extremely inefficient in terms of memory. I think it could be
 * optimized.
 */
Viva.Graph._community.occuranceMap = function(random){
    random = random || Viva.random();
    
    var wordsCount = {},
        allWords = [],
        dirtyPopularity = false,
        uniqueWords = [],
        
        rebuildPopularityArray = function() {
            uniqueWords.length = 0;
            for (var key in wordsCount) {
                if (wordsCount.hasOwnProperty(key)) {
                    uniqueWords.push(key);
                }
            }
            
            uniqueWords.sort(function(x, y) {
                var result = wordsCount[y] - wordsCount[x]; 
                if (result) {
                    return result;
                }

                // Not only number of occurances matters but order of keys also does.
                // for ... in implementation in different browsers results in different
                // order, and if we want to have same categories accross all browsers
                // we should order words by key names too:                
                if (x < y) { return -1; }
                if (x > y) { return 1; }
                else { return 0;}
            });
        },
        
        ensureUniqueWordsUpdated = function() {
            if (dirtyPopularity) {
                rebuildPopularityArray();
                dirtyPopularity = false;
            }
        };
        
    return {
        
        /**
         * Adds a new word to the collection of words.
         */
        add : function(word) {
            word = String(word);
            if (wordsCount.hasOwnProperty(word)) {
                wordsCount[word] += 1;
            } else {
                wordsCount[word] = 1;
            }
            
            allWords.push(word);
            dirtyPopularity = true;
        },
        
        /**
         * Gets number of occurances for a given word. If word is not present in the dictionary
         * zero is returned.
         */
        getWordCount : function(word) {
            return wordsCount[word] || 0;
        },
        
        /**
         * Gets the most popular word in the map. If multiple words are at the same position
         * random word among them is choosen.
         * 
         */
        getMostPopularFair : function() {
            if (allWords.length === 1) {
                return allWords[0]; // optimizes speed for simple case.
            }
            
            ensureUniqueWordsUpdated();
                        
            var maxCount = 0;
            
            for(var i = 1; i < uniqueWords.length; ++i) {
               if (wordsCount[uniqueWords[i - 1]] !== wordsCount[uniqueWords[i]]) {
                   break; // other words are less popular... not interested.
               } else {
                   maxCount += 1;
               }
           }
           
           maxCount += 1;  // to include upper bound. i.e. random words between [0, maxCount] (not [0, maxCount) ).
           return uniqueWords[random.next(maxCount)];
        },
        
        /**
         * Selects a random word from map with probability proportional
         * to the occurrence frequency of words.
         */
        getRandomWord : function() {
            if (allWords.length === 0) {
                throw 'The occurance map is empty. Cannot get empty word';
            }
            
            return allWords[random.next(allWords.length)];
        }, 
        
        /**
         * Enumerates all unique words in the map, and calls
         *  callback(word, occuranceCount) function on each word. Callback
         * can return true value to stop enumeration.
         * 
         * Note: enumeration is guaranteed in to run in decreasing order.
         */
        forEachUniqueWord : function(callback) {
            if (typeof callback !== 'function') {
                throw 'Function callback is expected to enumerate all words';
            }
            
            ensureUniqueWordsUpdated();
            
            for (var i = 0; i < uniqueWords.length; ++i) {
                var word = uniqueWords[i],
                    count = wordsCount[word];
                
                var stop = callback(word, count);
                if (stop) {
                    break;
                }
            }
        }
    };
};/**
 * @fileOverview Community structure detection algorithms
 * 
 * @see http://en.wikipedia.org/wiki/Community_structure
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/

Viva.Graph.community = function() {
    return {
        /**
         * Implementation of Speaker-listener Label Propagation Algorithm (SLPA) of
         * Jierui Xie and Boleslaw K. Szymanski. 
         * 
         * @see http://arxiv.org/pdf/1109.5720v3.pdf
         * @see https://sites.google.com/site/communitydetectionslpa/ 
         */
        slpa : function(graph, T, r) {
            var algorithm = Viva.Graph._community.slpaAlgorithm(graph, T, r);
            return algorithm.run();
        }
    };
};/*global Viva*/

Viva.Graph.Physics = Viva.Graph.Physics || {};

Viva.Graph.Physics.Vector = function(x, y){
    this.x = x || 0;
    this.y = y || 0;
};

Viva.Graph.Physics.Vector.prototype = {
    multiply : function(scalar){
        return new Viva.Graph.Physics.Vector(this.x * scalar, this.y * scalar);
    }    
};

Viva.Graph.Physics.Point = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
};

Viva.Graph.Physics.Point.prototype = {
    add : function(point){
        return new Viva.Graph.Physics.Point(this.x + point.x, this.y + point.y);
    }
};

Viva.Graph.Physics.Body = function(){
    this.mass = 1;
    this.force = new Viva.Graph.Physics.Vector();
    this.velocity = new Viva.Graph.Physics.Vector(); // For chained call use vel() method.
    this.location = new Viva.Graph.Physics.Point(); // For chained calls use loc() method instead.
    this.prevLocation = new Viva.Graph.Physics.Point(); // TODO: might be not always needed
};

Viva.Graph.Physics.Body.prototype = {
    loc : function(location){
        if (location){
            this.location.x = location.x;
            this.location.y = location.y;
            
            return this;
        } else { 
            return this.location; 
        }
    },
    vel : function(velocity) {
        if (velocity){
            this.velocity.x = velocity.x;
            this.velocity.y = velocity.y;
            
            return this;
        } else {
            return this.velocity;
        }
    }
};

Viva.Graph.Physics.Spring = function(body1, body2, length, coeff){
    this.body1 = body1;
    this.body2 = body2;
    this.length = length;
    this.coeff = coeff;
};

Viva.Graph.Physics.QuadTreeNode = function(){
    this.centerOfMass = new Viva.Graph.Physics.Point(); 
    this.children = [];
    this.body = null;
    this.hasChildren = false;
    this.x1 = 0;
    this.y1 = 0;
    this.x2 = 0;
    this.y2 = 0;
};
/*global Viva*/

Viva.Graph.Physics = Viva.Graph.Physics || {};

/**
 * Updates velocity and position data using the Euler's method.
 * It is faster than RK4 but may produce less accurate results.
 * 
 * http://en.wikipedia.org/wiki/Euler_method
 */
Viva.Graph.Physics.eulerIntegrator = function() {
    return {
        /**
         * Performs forces integration, using given timestep and force simulator.
         * 
         * @returns squared distance of total position updates. 
         */
        integrate : function(simulator, timeStep){
            var speedLimit = simulator.speedLimit,
                tx = 0, ty = 0;
            
            for(var i = 0, max = simulator.bodies.length; i < max; ++i){
                var body = simulator.bodies[i];

                var coeff = timeStep / body.mass;
                body.velocity.x += coeff * body.force.x;
                body.velocity.y += coeff * body.force.y;
                var vx = body.velocity.x;
                var vy = body.velocity.y;
                var v = Math.sqrt(vx * vx + vy * vy);
                if (v > speedLimit){
                    body.velocity.x = speedLimit * vx / v;
                    body.velocity.y = speedLimit * vy / v;
                }
                
                tx = timeStep * body.velocity.x;
                ty = timeStep * body.velocity.y;
                body.location.x += tx;
                body.location.y += ty;
            }

            return tx * tx + ty * ty; 
        }       
    };
};
/*global Viva*/

/**
 * This is Barnes Hut simulation algorithm. Implementation
 * is adopted to non-recursive solution, since certain browsers
 * handle recursion extremly bad.
 * 
 * http://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html
 */
Viva.Graph.Physics.nbodyForce = function(options) {
    options = options || {};
    
    var gravity = typeof options.gravity === 'number' ? options.gravity : -1,
        updateQueue = [],
        theta = options.theta || 0.8,
        random = Viva.random('5f4dcc3b5aa765d61d8327deb882cf99', 75, 20, 63, 0x6c, 65, 76, 65, 72),
        
        Node = function() {
        this.body = null;
        this.quads = [];
        this.mass = 0;
        this.massX = 0;
        this.massY = 0;
        this.left = 0;
        this.top = 0;
        this.bottom = 0;
        this.right = 0;
        this.isInternal = false;
    };
    var nodesCache = [], 
        currentInCache = 0, 
        newNode = function() {
            // To avoid pressure on GC we reuse nodes.
            var node;
            if(nodesCache[currentInCache]) {
                node = nodesCache[currentInCache];
                node.quads[0] = null;
                node.quads[1] = null;
                node.quads[2] = null;
                node.quads[3] = null;
                node.body = null;
                node.mass = node.massX = node.massY = 0;
                node.left = node.right = node.top = node.bottom = 0;
                node.isInternal = false;
            } else {
                node = new Node();
                nodesCache[currentInCache] = node;
            }
            
            ++currentInCache;
            return node;
        }, 
    
    root = newNode();

    var isSamePosition = function(point1, point2) {
        // TODO: Consider inlining.
        var dx = Math.abs(point1.x - point2.x);
        var dy = Math.abs(point1.y - point2.y);

        return (dx < 0.01 && dy < 0.01);
    },
    
    // Inserts body to the tree
    insert = function(newBody) {
        // TODO: Consider reusing queue's elements if GC hit shows up.
        var queue = [{
            node : root,
            body : newBody
        }];

        while(queue.length) {
            var queueItem = queue.shift(),
                node = queueItem.node, 
                body = queueItem.body;

            if(node.isInternal) {
                // This is internal node. Update the total mass of the node and center-of-mass.
                var x = body.location.x;
                var y = body.location.y;
                node.mass = node.mass + body.mass;
                node.massX = node.massX + body.mass * x;
                node.massY = node.massY + body.mass * y;

                // Recursively insert the body in the appropriate quadrant.
                // But first find the appropriate quadrant.
                var quadIdx = 0, // Assume we are in the 0's quad.
                    left = node.left, 
                    right = (node.right + left) / 2, 
                    top = node.top, 
                    bottom = (node.bottom + top) / 2;

                if(x > right) {// somewhere in the eastern part.
                    quadIdx = quadIdx + 1;
                    var oldLeft = left;
                    left = right;
                    right = right + (right - oldLeft);
                }
                if(y > bottom) {// and in south.
                    quadIdx = quadIdx + 2;
                    var oldTop = top;
                    top = bottom;
                    bottom = bottom + (bottom - oldTop);
                }

                var child = node.quads[quadIdx];
                if(!child) {
                    // The node is internal but this quadrant is not taken. Add
                    // subnode to it.
                    child = newNode();
                    child.left = left;
                    child.top = top;
                    child.right = right;
                    child.bottom = bottom;

                    node.quads[quadIdx] = child;
                }

                // proceed search in this quadrant.
                queue.unshift({
                    node : child,
                    body : body
                });
            } else if(node.body) {
                // We are trying to add to the leaf node.
                // To do this we have to convert current leaf into internal node
                // and continue adding two nodes.
                var oldBody = node.body;
                node.body = null; // internal nodes does not cary bodies
                node.isInternal = true;

                if(isSamePosition(oldBody.location, body.location)) {
                    // Prevent infinite subdivision by bumping one node
                    // slightly. I assume this operation should be quite
                    // rare, that's why usage of cos()/sin() shouldn't hit performance.
                    var newX, newY;
                    do {
                        var angle = random.nextDouble() * 2 * Math.PI;
                        var dx = (node.right - node.left) * 0.006 * Math.cos(angle);
                        var dy = (node.bottom - node.top) * 0.006 * Math.sin(angle);

                        newX = oldBody.location.x + dx;
                        newY = oldBody.location.y + dy;
                        // Make sure we don't bump it out of the box. If we do, next iteration should fix it
                    } while(newX < node.left || newX > node.right ||
                    newY < node.top || newY > node.bottom);

                    oldBody.location.x = newX;
                    oldBody.location.y = newY;
                }

                // Next iteration should subdivide node further.
                queue.unshift({
                    node : node,
                    body : oldBody
                });
                queue.unshift({
                    node : node,
                    body : body
                });
            } else {
                // Node has no body. Put it in here.
                node.body = body;
            }
        }
    }, 
    
    update = function(sourceBody){
        var queue = updateQueue,
            v, dx, dy, r,
            queueLength = 1,
            shiftIdx = 0,
            pushIdx = 1;
            
        queue[0] = root;
        
        // TODO: looks like in rare cases this guy has infinite loop bug. To reproduce
        // render K1000 (complete(1000)) with the settings: {springLength : 3, springCoeff : 0.0005, 
        // dragCoeff : 0.02, gravity : -1.2 }
        while(queueLength){
            var node = queue[shiftIdx],
                body = node.body;
            
            queueLength -= 1;
            shiftIdx += 1;
            
            if (body && body !== sourceBody){
                // If the current node is an external node (and it is not source body), 
                // calculate the force exerted by the current node on body, and add this 
                // amount to body's net force.
                dx = body.location.x - sourceBody.location.x;
                dy = body.location.y - sourceBody.location.y;
                r = Math.sqrt(dx * dx + dy * dy);
                
                if (r === 0){
                    // Poor man's protection agains zero distance.
                    dx = (random.nextDouble() - 0.5) / 50;
                    dy = (random.nextDouble() - 0.5) / 50;
                    r = Math.sqrt(dx * dx + dy * dy);
                }
              
                // This is standard gravition force calculation but we divide
                // by r^3 to save two operations when normalizing force vector.  
                v = gravity * body.mass * sourceBody.mass / (r * r * r);
                sourceBody.force.x = sourceBody.force.x + v * dx; 
                sourceBody.force.y = sourceBody.force.y + v * dy;
            } else {
                // Otherwise, calculate the ratio s / r,  where s is the width of the region 
                // represented by the internal node, and r is the distance between the body 
                // and the node's center-of-mass 
                dx = node.massX / node.mass - sourceBody.location.x;
                dy = node.massY / node.mass - sourceBody.location.y;
                r = Math.sqrt(dx * dx + dy * dy);
                
                if (r === 0){
                    // Sorry about code duplucation. I don't want to create many functions
                    // right away. Just want to see performance first.
                    dx = (random.nextDouble() - 0.5) / 50;
                    dy = (random.nextDouble() - 0.5) / 50;
                    r = Math.sqrt(dx * dx + dy * dy);
                }
                // If s / r < θ, treat this internal node as a single body, and calculate the
                // force it exerts on body b, and add this amount to b's net force.
                if ( (node.right - node.left) / r < theta){
                    // in the if statement above we consider node's width only
                    // because the region was sqaurified during tree creation.  
                    // Thus there is no difference between using width or height.
                    v = gravity * node.mass * sourceBody.mass / (r * r * r);
                    sourceBody.force.x = sourceBody.force.x + v * dx;
                    sourceBody.force.y = sourceBody.force.y + v * dy;
                } else {
                    // Otherwise, run the procedure recursively on each of the current node's children.
                    
                    // I intentionally unfolded this loop, to save several CPU cycles. 
                    if (node.quads[0]) { queue[pushIdx] = node.quads[0]; queueLength += 1; pushIdx += 1; }
                    if (node.quads[1]) { queue[pushIdx] = node.quads[1]; queueLength += 1; pushIdx += 1; }
                    if (node.quads[2]) { queue[pushIdx] = node.quads[2]; queueLength += 1; pushIdx += 1; }
                    if (node.quads[3]) { queue[pushIdx] = node.quads[3]; queueLength += 1; pushIdx += 1; }
                }
            }
        }
    },
    
    init = function(forceSimulator){
        var x1 = Number.MAX_VALUE, 
        y1 = Number.MAX_VALUE,
        x2 = Number.MIN_VALUE, 
        y2 = Number.MIN_VALUE, 
        i,
        bodies = forceSimulator.bodies,
        max = bodies.length;

        // To reduce quad tree depth we are looking for exact bounding box of all particles.
        i = max;
        while(i--) {
            var x = bodies[i].location.x;
            var y = bodies[i].location.y;
            if(x < x1) { x1 = x; }
            if(x > x2) { x2 = x; }
            if(y < y1) { y1 = y; }
            if(y > y2) { y2 = y; }
        }

        // Squarify the bounds.
        var dx = x2 - x1, 
            dy = y2 - y1;
        if (dx > dy) { y2 = y1 + dx; }
        else { x2 = x1 + dy; }

        currentInCache = 0;
        root = newNode();
        root.left = x1;
        root.right = x2;
        root.top = y1;
        root.bottom = y2;
        
        i = max;
        while(i--) {
            insert(bodies[i], root);
        }
    };
    
    return {
        insert : insert,
        init : init,
        update : update,
        options : function(newOptions){
            if (newOptions){
                if (typeof newOptions.gravity === 'number') { gravity = newOptions.gravity; }
                if (typeof newOptions.theta === 'number') { theta = newOptions.theta; }
                
                return this; 
            } else {
                return {gravity : gravity, theta : theta};
            }
        }
    };
};

/**
 * Brute force approach to nbody force calculation with O(n^2) performance.
 * I implemented it only to assist in finding bugs in Barnes Hut implementation. 
 * This force is not intended to be used anywhere and probably weill be removed
 * in future.
 */
Viva.Graph.Physics.nbodyForceBrute = function(options) {
    options = options || {};
    var gravity = typeof options.gravity === 'number' ? options.gravity : -1;
    var bodies = [],
        random = Viva.random('don\'t use this');
    
    var update = function(sourceBody){

        sourceBody.force.x = 0;
        sourceBody.force.y = 0;
        for(var i = 0; i < bodies.length; ++i){
            var body = bodies[i];
            if (body !== sourceBody){
                var dx = body.location.x - sourceBody.location.x;
                var dy = body.location.y - sourceBody.location.y;
                var r = Math.sqrt(dx * dx + dy * dy);
                
                if (r === 0){
                    // Poor man's protection agains zero distance.
                    dx = (random.nextDouble() - 0.5) / 50;
                    dy = (random.nextDouble() - 0.5) / 50;
                    r = Math.sqrt(dx * dx + dy * dy);
                }
              
                // This is standard gravition force calculation but we divide
                // by r^3 to save two operations when normalizing force vector.  
                var v = gravity * body.mass * sourceBody.mass / (r * r * r);
                sourceBody.force.x = sourceBody.force.x + v * dx; 
                sourceBody.force.y = sourceBody.force.y + v * dy;
            }
        }
    };
    
    return {
        insert : function(){},
        init : function(forceSimulator){ 
                bodies = forceSimulator.bodies;
            },
        update : update,
        options : function(newOptions){
            if (newOptions){
                if (typeof newOptions.gravity === 'number') { gravity = newOptions.gravity; }
                
                return this; 
            } else {
                return {gravity : gravity};
            }
        }
    };
};/*global Viva*/

Viva.Graph.Physics.dragForce = function(options){
    options = options || {};
    var currentOptions = {
        coeff : options.coeff || 0.01
    };
    
    return {
        init : function(forceSimulator) {},
        update : function(body){
            body.force.x -= currentOptions.coeff * body.velocity.x;
            body.force.y -= currentOptions.coeff * body.velocity.y;
        },
        options : function(newOptions){
            if (newOptions){
                if (typeof newOptions.coeff === 'number') { currentOptions.coeff = newOptions.coeff; }
                
                return this; 
            } else {
                return currentOptions;
            }
        }
    };
};
/*global Viva*/

Viva.Graph.Physics.springForce = function(options){
    options = options || {};
    var currentOptions = {
        length : options.length || 50,
        coeff : typeof options.coeff === 'number' ? options.coeff : 0.00022
    },
    
    random = Viva.random('Random number 4.', 'Chosen by fair dice roll');
    
    return {
        init : function(forceSimulator) {},
        update : function(spring){
            var body1 = spring.body1;
            var body2 = spring.body2;
            var length = spring.length < 0 ? currentOptions.length : spring.length;
             
            var dx = body2.location.x - body1.location.x;
            var dy = body2.location.y - body1.location.y;
            var r = Math.sqrt(dx * dx + dy * dy);
            if (r === 0){
                dx = (random.nextDouble() - 0.5) / 50;
                dy = (random.nextDouble() - 0.5) / 50;
                r = Math.sqrt(dx * dx + dy * dy);
            } 
            
            var d = r - length;
            var coeff = ( (!spring.coeff || spring.coeff < 0) ? currentOptions.coeff : spring.coeff) * d / r;
            
            body1.force.x += coeff * dx;
            body1.force.y += coeff * dy;
            
            body2.force.x += -coeff * dx;
            body2.force.y += -coeff * dy;
        },
        options : function(newOptions){
            if (newOptions){
                if (typeof newOptions.length === 'number') { currentOptions.length = newOptions.length; }
                if (typeof newOptions.coeff === 'number') { currentOptions.coeff = newOptions.coeff; }
                
                return this;
            } else { return currentOptions; }
        }
    };
};
/*global Viva*/

Viva.Graph.Physics = Viva.Graph.Physics || {};

/**
 * Manages a simulation of physical forces acting on bodies.
 * To create a custom force simulator register forces of the system
 * via addForce() method, choos appropriate integrator and register
 * bodies.
 * 
 * // TODO: Show example.
 */
Viva.Graph.Physics.forceSimulator = function(forceIntegrator){
    var integrator = forceIntegrator || Viva.Graph.Physics.rungeKuttaIntegrator();
    var bodies = []; // Bodies in this simulation.
    var springs = []; // Springs in this simulation.
    var bodyForces = []; // Forces acting on bodies.
    var springForces = []; // Forces acting on springs.
    
    return {
        
        /**
         * The speed limit allowed by this simulator.
         */
        speedLimit : 1.0,
        
        /**
         * Bodies in this simulation
         */
        bodies : bodies,
        
        /**
         * Accumulates all forces acting on the bodies and springs.
         */
        accumulate : function(){
            var i, j, body;
            
            // Reinitialize all forces
            i = bodyForces.length;
            while(i--) {
                bodyForces[i].init(this);
            }
            
            i = springForces.length;
            while(i--){
                springForces[i].init(this);
            }
            
            // Accumulate forces acting on bodies.
            i = bodies.length;
            while(i--){
                body = bodies[i];
                body.force.x = 0; 
                body.force.y = 0;
                
                for (j=0; j < bodyForces.length; j++) {
                    bodyForces[j].update(body);
                }
            }
            
            // Accumulate forces acting on springs.
            for(i = 0; i < springs.length; ++i){
                for(j = 0; j < springForces.length; j++){
                    springForces[j].update(springs[i]);
                }
            }
        },
        
        /**
         * Runs simulation for one time step.
         */
        run : function(timeStep){
            this.accumulate();
            return integrator.integrate(this, timeStep);
        },
        
        /**
         * Adds body to this simulation
         * 
         * @param body - a new body. Bodies expected to have
         *   mass, force, velocity, location and prevLocation properties.
         *   the method does not check all this properties, for the sake of performance.
         *   // TODO: maybe it should check it?
         */
        addBody : function(body){
            if (!body){
                throw {
                    message : 'Cannot add null body to force simulator'
                };
            }
            
            bodies.push(body); // TODO: could mark simulator as dirty...
            
            return body;
        },
        
        removeBody : function(body) {
            if (!body) { return false; }
            
            var idx = Viva.Graph.Utils.indexOfElementInArray(body, bodies);
            if (idx < 0) { return false; }

            return bodies.splice(idx, 1);
        },
        
        /**
         * Adds a spring to this simulation.
         */
        addSpring: function(body1, body2, springLength, springCoefficient){
            if (!body1 || !body2){
                throw {
                    message : 'Cannot add null spring to force simulator'
                };
            }
            
            if (typeof springLength !== 'number'){
                throw {
                    message : 'Spring length should be a number'
                };
            }
            
            var spring = new Viva.Graph.Physics.Spring(body1, body2, springLength, springCoefficient >= 0 ? springCoefficient : -1);
            springs.push(spring); 
            
            // TODO: could mark simulator as dirty.
            return spring;
        },
        
        removeSpring : function(spring) {
            if (!spring) { return false; }
            
            var idx = Viva.Graph.Utils.indexOfElementInArray(spring, springs);
            if (idx < 0) { return false; }

            return springs.splice(idx, 1);
        },
        
        /**
         * Adds a force acting on all bodies in this simulation
         */
        addBodyForce: function(force){
            if (!force){
                throw {
                    message : 'Cannot add mighty (unknown) force to the simulator'
                };
            }
            
            bodyForces.push(force);
        },
        
        /**
         * Adds a spring force acting on all springs in this simulation.
         */
        addSpringForce : function(force){
            if (!force){
                throw {
                    message : 'Cannot add unknown force to the simulator'
                };
            }
            
            springForces.push(force);
        }
    };
};/*global Viva*/

Viva.Graph.Layout = Viva.Graph.Layout || {};

Viva.Graph.Layout.forceDirected = function(graph, userSettings) {
    var STABLE_THRESHOLD = 0.001; // Maximum movement of the system which can be considered as stabilized
    
    if(!graph) {
        throw {
            message : "Graph structure cannot be undefined"
        };
    }
    userSettings = userSettings || {};
    
    var settings = {
            /**
             * Ideal length for links (springs in physical model).
             */
            springLength : typeof userSettings.springLength === 'number' ? userSettings.springLength : 80,
            
            /**
             * Hook's law coefficient. 1 - solid spring.
             */
            springCoeff : typeof userSettings.springCoeff === 'number' ? userSettings.springCoeff : 0.0002,
            
            /**
             * Coulomb's law coefficient. It's used to repel nodes thus should be negative
             * if you make it positive nodes start attract each other :).
             */
            gravity: typeof userSettings.gravity === 'number' ? userSettings.gravity : -1.2,
            
            /**
             * Theta coeffiecient from Barnes Hut simulation. Ranged between (0, 1).
             * The closer it's to 1 the more nodes algorithm will have to go through.
             * Setting it to one makes Barnes Hut simulation no different from 
             * brute-force forces calculation (each node is considered). 
             */
            theta : typeof userSettings.theta === 'number' ? userSettings.theta : 0.8,
            
            /**
             * Drag force coefficient. Used to slow down system, thus should be less than 1.
             * The closer it is to 0 the less tight system will be.
             */
            dragCoeff : typeof userSettings.dragCoeff === 'number' ? userSettings.dragCoeff : 0.02
        },
        
        forceSimulator = Viva.Graph.Physics.forceSimulator(Viva.Graph.Physics.eulerIntegrator()),

        nbodyForce = Viva.Graph.Physics.nbodyForce({gravity : settings.gravity, theta: settings.theta}),
        
        springForce = Viva.Graph.Physics.springForce({length : settings.springLength, coeff: settings.springCoeff }),
        
        dragForce = Viva.Graph.Physics.dragForce({coeff: settings.dragCoeff}),
        
        initializationRequired = true,
        
        graphRect = {x1: 0, y1 : 0, x2 : 0, y2 : 0},
        
        random = Viva.random('ted.com', 103, 114, 101, 97, 116),
        
        getBestNodePosition = function(node) {
            // TODO: Initial position could be picked better, e.g. take into 
            // account all neighbouring nodes/links, not only one.
            // TODO: this is the same as in gem layout. consider refactoring.
            var baseX = (graphRect.x1 + graphRect.x2) / 2,
                baseY = (graphRect.y1 + graphRect.y2) / 2,
                springLength = settings.springLength;
                
            if (node.links && node.links.length > 0){
                var firstLink= node.links[0],
                    otherNode = firstLink.fromId != node.id ? graph.getNode(firstLink.fromId) : graph.getNode(firstLink.toId);
                if (otherNode.position){
                    baseX = otherNode.position.x;
                    baseY = otherNode.position.y;
                }
            }
            
            return {
                x : baseX + random.next(springLength) - springLength/2,
                y : baseY + random.next(springLength) - springLength/2
            };  
        },
        
        updateNodeMass = function(node){
            var body = node.force_directed_body; 
            body.mass = 1 + graph.getLinks(node.id).length / 3.0;
        },
        
        initNode = function(node) {
            var body = node.force_directed_body;
            if (!body){
                // TODO: rename position to location or location to position to be consistent with
                // other places.
                node.position = node.position || getBestNodePosition(node);
                    
                body = new Viva.Graph.Physics.Body();
                node.force_directed_body = body;
                updateNodeMass(node);
                
                body.loc(node.position);
                forceSimulator.addBody(body);                                
            }
        },
        
        releaseNode = function(node) {
            var body = node.force_directed_body;
            if (body) {
                node.force_directed_body = null;
                delete node.force_directed_body;
                
                forceSimulator.removeBody(body);
            }
        },
        
        initLink = function(link) {
            // TODO: what if bodies are not initialized?
            var from = graph.getNode(link.fromId),
                to = graph.getNode(link.toId);
            
            updateNodeMass(from);
            updateNodeMass(to);
            link.force_directed_spring = forceSimulator.addSpring(from.force_directed_body, to.force_directed_body, -1.0);
        },
        
        releaseLink = function(link) {
            var spring = link.force_directed_spring;
            if (spring) {
                var from = graph.getNode(link.fromId),
                    to = graph.getNode(link.toId);
                if (from) { updateNodeMass(from); }
                if (to) { updateNodeMass(to); }

                link.force_directed_spring = null;
                delete link.force_directed_spring ;
                
                forceSimulator.removeSpring(spring);
            }
        },
        
        initSimulator = function() {
            graph.forEachNode(initNode);
            graph.forEachLink(initLink);
        },
        
        isNodePinned = function(node) {
            if(!node) {
                return true;
            }

            return node.isPinned || (node.data && node.data.isPinned);
        },
        
        updateNodePositions = function(){
            var x1 = Number.MAX_VALUE,
                y1 = Number.MAX_VALUE,
                x2 = Number.MIN_VALUE,
                y2 = Number.MIN_VALUE;
            if (graph.getNodesCount() === 0) { return ;}
               
            graph.forEachNode(function(node) {
                var body = node.force_directed_body;
                if (!body){
                    return; // TODO: maybe we shall initialize it?
                }
                
                if (isNodePinned(node)){
                    body.loc(node.position);
                }
                
                // TODO: once again: use one name to be consistent (position vs location)
                node.position.x = body.location.x;
                node.position.y = body.location.y;
                
                if (node.position.x < x1) { x1 = node.position.x; }
                if (node.position.x > x2) { x2 = node.position.x; }
                if (node.position.y < y1) { y1 = node.position.y; }
                if (node.position.y > y2) { y2 = node.position.y; }
            });
            
            graphRect.x1 = x1;
            graphRect.x2 = x2;
            graphRect.y1 = y1;
            graphRect.y2 = y2;
        };
        
    forceSimulator.addSpringForce(springForce);
    forceSimulator.addBodyForce(nbodyForce);
    forceSimulator.addBodyForce(dragForce);
    
    return {
        /**
         * Attempts to layout graph within given number of iterations.
         *
         * @param {integer} [iterationsCount] number of algorithm's iterations.
         */
        run : function(iterationsCount) {
            iterationsCount = iterationsCount || 50;
            
            for(var i = 0; i < iterationsCount; ++i) {
                this.step();
            }
        },
        
        step : function() {
            // we assume graph was not modified between calls. If it was
            // we will have to reinitialize force simulator.
            if (initializationRequired) {
                initSimulator();
                initializationRequired = false;
            }
            
            var energy = forceSimulator.run(20);
            updateNodePositions();
            
            return energy < STABLE_THRESHOLD;
        },
        
        /**
         * Returns rectangle structure {x1, y1, x2, y2}, which represents
         * current space occupied by graph.
         */
        getGraphRect : function() {
            return graphRect;
        }, 
        
        addNode : function(node) {
            initNode(node);
        },
        
        removeNode : function(node) {
            releaseNode(node);
        },
        
        addLink : function(link) {
            initLink(link);
        },
        
        removeLink : function(link) {
            releaseLink(link);
        },
        
        // Layout specific methods
        /**
         * Gets or sets current desired length of the edge.
         * 
         * @param length new desired length of the springs (aka edge, aka link).
         * if this parameter is empty then old spring length is returned.
         */
        springLength : function(length) {
            if (arguments.length === 1) {
                springForce.options({ length : length });
                return this;
            } else { 
                return springForce.options().length; 
            }
        },
        
         /**
         * Gets or sets current spring coeffiсient.
         * 
         * @param coeff new spring coeffiсient.
         * if this parameter is empty then its old value returned.
         */
        springCoeff : function(coeff) {
            if (arguments.length === 1) {
                springForce.options({ coeff : coeff });
                return this;
            } else { 
                return springForce.options().coeff; 
            }
        },
        
        /**
         * Gets or sets current gravity in the nbody simulation.
         * 
         * @param g new gravity constant.
         * if this parameter is empty then its old value returned.
         */
        gravity : function(g) {
            if (arguments.length === 1) {
                nbodyForce.options({ gravity : g });
                return this;
            } else { 
                return nbodyForce.options().gravity; 
            }
        },
        
        /**
         * Gets or sets current theta value in the nbody simulation.
         * 
         * @param t new theta coeffiсient.
         * if this parameter is empty then its old value returned.
         */
        theta : function(t) {
            if (arguments.length === 1) {
                nbodyForce.options({ theta : t });
                return this;
            } else { 
                return nbodyForce.options().theta; 
            }
        },
        
        /**
         * Gets or sets current theta value in the nbody simulation.
         * 
         * @param dragCoeff new drag coeffiсient.
         * if this parameter is empty then its old value returned.
         */
        drag : function(dragCoeff) {
            if (arguments.length === 1) {
                dragForce.options({ coeff : dragCoeff });
                return this;
            } else { 
                return dragForce.options().coeff; 
            }
        }
    };
};/**
 * @fileOverview Defines a graph renderer that uses CSS based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */
/*global Viva*/
Viva.Graph.View = Viva.Graph.View || {};

/**
 * Performs css-based graph rendering. This module does not perform
 * layout, but only visualizes nodes and edeges of the graph.
 * 
 * NOTE: Most likely I will remove this graphics engine due to superior svg support. 
 * In certain cases it doesn't work and require further imporvments:
 *  * does not properly work for dragging.
 *  * does not support scaling.
 *  * does not support IE versions prior to IE9.
 * 
 */
Viva.Graph.View.cssGraphics = function() {
    var container, // Where graph will be rendered
        OLD_IE = 'OLD_IE',
        offsetX,
        offsetY,
        scaleX = 1,
        scaleY = 1,
        
        transformName = (function(){
			var browserName = Viva.BrowserInfo.browser,
                prefix;
    
            switch (browserName) {
                case 'mozilla' :
                    prefix = 'Moz';
                    break;
                case 'webkit' :
                    prefix = 'webkit';
                    break;
                case 'opera' :
                    prefix = 'O';
                    break;
                case 'msie' :
                    var version = Viva.BrowserInfo.version.split(".")[0];
                    if(version > 8) {
                        prefix = 'ms';
                    } else {
                        return OLD_IE;
                    }
             }
             if (prefix) { // CSS3
                return prefix + 'Transform';
             } else { // Unknown browser
                 return null; 
             }
        })(),
        
       /** 
        * Returns a function (ui, x, y, angleRad).
        * 
        * The function attempts to rotate 'ui' dom element on 'angleRad' radians
        * and position it to 'x' 'y' coordinates.
        * 
        * Operation works in most modern browsers that support transform css style
        * and IE.  
        * */
        positionLink = (function() {
            if (transformName === OLD_IE) { // This is old IE, use filters
                return function(ui, x, y, angleRad) {
                    var cos = Math.cos(angleRad);
                    var sin = Math.sin(angleRad);

                    // IE 6, 7 and 8 are screwed up when it comes to transforms;
                    // I could not find justification for their choice of "floating"
                    // matrix transform origin. The following ugly code was written
                    // out of complete dispair.
                    if(angleRad < 0) {
                        angleRad = 2 * Math.PI + angleRad;
                    }

                    if(angleRad < Math.PI / 2) {
                        ui.style.left = x + 'px';
                        ui.style.top = y + 'px';
                    } else if(angleRad < Math.PI) {
                        ui.style.left = x - (ui.clientWidth) * Math.cos(Math.PI - angleRad);
                        ui.style.top = y;
                    } else if(angleRad < (Math.PI + Math.PI / 2)) {
                        ui.style.left = x - (ui.clientWidth) * Math.cos(Math.PI - angleRad);
                        ui.style.top = y + (ui.clientWidth) * Math.sin(Math.PI - angleRad);
                    } else {
                        ui.style.left = x;
                        ui.style.top = y + ui.clientWidth * Math.sin(Math.PI - angleRad);
                    }
                    ui.style.filter = "progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand'," + "M11=" + cos + ", M12=" + (-sin) + "," + "M21=" + sin + ", M22=" + cos + ");";
                };
            } else if (transformName) { // Modern CSS3 browser
                return function(ui, x, y, angleRad) {
                    ui.style.left = x + 'px';
                    ui.style.top = y + 'px';
    
                    ui.style[transformName] = 'rotate(' + angleRad + 'rad)';
                    ui.style[transformName + 'Origin'] = 'left';
                };
            } else {
                return function(ui, x, y, angleRad) {
                    // Don't know how to rotate links in other browsers.
                };
            }
        })(),
        
         nodeBuilder = function(node){
            var nodeUI = document.createElement('div');
            nodeUI.setAttribute('class', 'node');
            return nodeUI;
         },
        
         nodePositionCallback = function(nodeUI, pos) {
            // TODO: Remove magic 5. It should be half of the width or height of the node.
            nodeUI.style.left = pos.x - 5 + 'px';
            nodeUI.style.top = pos.y - 5 + 'px';
        },
        
        linkPositionCallback = function(linkUI, fromPos, toPos) {
            var dx = fromPos.x - toPos.x;
            var dy = fromPos.y - toPos.y;
            var length = Math.sqrt(dx * dx + dy * dy);
            
            linkUI.style.height = '1px';
            linkUI.style.width = length + 'px';
    
            positionLink(linkUI, toPos.x, toPos.y, Math.atan2(dy, dx));
        },
        
        linkBuilder = function(link) {
            var linkUI = document.createElement('div');
            linkUI.setAttribute('class', 'link');
            
            return linkUI;
        },
        
        updateTransform = function() {
            if (container) {
                if (transformName && transformName !== OLD_IE) {
                    var transform = 'matrix(' + scaleX + ", 0, 0," + scaleY + "," + offsetX + "," + offsetY + ")";
                    container.style[transformName] = transform;
                } else {
                    // TODO Implement OLD_IE Filter based transform
                }
            }
        };
        
    return {
        /**
         * Sets the collback that creates node representation or creates a new node
         * presentation if builderCallbackOrNode is not a function. 
         * 
         * @param builderCallbackOrNode a callback function that accepts graph node
         * as a parameter and must return an element representing this node. OR
         * if it's not a function it's treated as a node to which DOM element should be created.
         * 
         * @returns If builderCallbackOrNode is a valid callback function, instance of this is returned;
         * Otherwise a node representation is returned for the passed parameter.
         */
        node : function(builderCallbackOrNode) {
            
            if (builderCallbackOrNode && typeof builderCallbackOrNode !== 'function'){
                return nodeBuilder(builderCallbackOrNode);
            }
            
            nodeBuilder = builderCallbackOrNode;
            
            return this;
        },

        /**
         * Sets the collback that creates link representation or creates a new link
         * presentation if builderCallbackOrLink is not a function. 
         * 
         * @param builderCallbackOrLink a callback function that accepts graph link
         * as a parameter and must return an element representing this link. OR
         * if it's not a function it's treated as a link to which DOM element should be created.
         * 
         * @returns If builderCallbackOrLink is a valid callback function, instance of this is returned;
         * Otherwise a link representation is returned for the passed parameter.
         */        
        link : function(builderCallbackOrLink){
            if (builderCallbackOrLink && typeof builderCallbackOrLink !== 'function'){
                return linkBuilder(builderCallbackOrLink);
            }
            
            linkBuilder = builderCallbackOrLink;
            return this;
        },
        
        /**
         * Sets translate operation that should be applied to all nodes and links.
         */
        setInitialOffset : function(x, y) {
            offsetX = x;
            offsetY = y;
            updateTransform();
        },
        
        translateRel : function(dx, dy) {
            offsetX += dx;
            offsetY += dy;
            updateTransform();
        },
        
        scale : function(x, y) {
            // TODO: implement me
            return 1;
        },
        
        resetScale : function(){
            // TODO: implement me
            return this;
        },

        /**
         * Called every before renderer starts rendering.
         */
        beginRender : function() {},
        
        /**
         * Called every time when renderer finishes one step of rendering.
         */
        endRender : function() {},
        /**
         * Allows to override default position setter for the node with a new
         * function. newPlaceCallback(node, position) is function which
         * is used by updateNode().
         */
        placeNode : function(newPlaceCallback){
            nodePositionCallback = newPlaceCallback;
            return this;
        },
        
        placeLink : function(newPlaceLinkCallback){
            linkPositionCallback = newPlaceLinkCallback;
            return this;
        },
        
        /**
         * Called by Viva.Graph.View.renderer to let concrete graphic output 
         * providers prepare to render.
         */
        init : function (parentContainer) {
            container = parentContainer;
            updateTransform();
        },
        
       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider prepare to render given link of the graph
        * 
        * @param linkUI visual representation of the link created by link() execution.
        */
       initLink : function(linkUI) {
           if(container.childElementCount > 0) {
               container.insertBefore(linkUI, container.firstChild);
           } else {
               container.appendChild(linkUI);
           }
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider remove link from rendering surface.
       * 
       * @param linkUI visual representation of the link created by link() execution.
       **/
       releaseLink : function(linkUI) {
           container.removeChild(linkUI);
       },
       
      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider prepare to render given node of the graph.
       * 
       * @param nodeUI visual representation of the node created by node() execution.
       **/
       initNode : function(nodeUI) {
           container.appendChild(nodeUI);
       },
       
      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider remove node from rendering surface.
       * 
       * @param nodeUI visual representation of the node created by node() execution.
       **/
       releaseNode : function(nodeUI) {
           container.removeChild(nodeUI);
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider place given node to recommended position pos {x, y};
       */ 
       updateNodePosition : function(node, pos) {
           nodePositionCallback(node, pos);
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider place given link of the graph
       */  
       updateLinkPosition : function(link, fromPos, toPos) {
           linkPositionCallback(link, fromPos, toPos);
       }
    };
};
/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva, window*/

/**
 * Simple wrapper over svg object model API, to shorten the usage syntax.
 */
Viva.Graph.svg = function(element) {
    var svgns = "http://www.w3.org/2000/svg",
        xlinkns = 'http://www.w3.org/1999/xlink',
        svgElement = element;
        
    if (typeof element === 'string') {
        svgElement = document.createElementNS(svgns, element);
    }

    if (svgElement.vivagraph_augmented) { return svgElement; }
    
    svgElement.vivagraph_augmented = true;
    
    // Augment svg element (TODO: it's not safe - what if some function already exists on the prototype?):
    
    /**
     * Gets an svg attribute from an element if value is not specified.
     * OR sets a new value to the given attribute.
     * 
     * @param name - svg attribute name;
     * @param value - value to be set;
     * 
     * @returns svg element if both name and value are specified; or value of the given attribute
     * if value parameter is missing.
     */
    svgElement.attr = function(name, value) {
        if (arguments.length === 2) {
            if (value !== null) {
                svgElement.setAttributeNS(null, name, value);
            } else {
                svgElement.removeAttributeNS(null, name);
            }
            
            return svgElement;
        } else {
            return svgElement.getAttributeNS(null, name);
        }
    };
    
    svgElement.append = function(element){
        var child = Viva.Graph.svg(element);
        svgElement.appendChild(child);
        return child;
    };
    
    svgElement.text = function(textContent){
        if (typeof textContent == 'undefined') {
            return svgElement.textContent;
        } else {
            svgElement.textContent = textContent;
        }
        
        return svgElement;
    };
    
    svgElement.link = function(target) {
        if (arguments.length === 0){
            return svgElement.getAttributeNS(xlinkns, 'xlink:href');
        }
        
        svgElement.setAttributeNS(xlinkns, 'xlink:href', target);
        return svgElement;
    };
    
    return svgElement;
};
/**
 * @fileOverview Defines a graph renderer that uses SVG based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */
/*global Viva*/
Viva.Graph.View = Viva.Graph.View || {};

/**
 * Performs svg-based graph rendering. This module does not perform
 * layout, but only visualizes nodes and edeges of the graph.
 */
Viva.Graph.View.svgGraphics = function() {
    var svgContainer,
        svgRoot,
        offsetX,
        offsetY,
        actualScale = 1,
 
        nodeBuilder = function(node){
            return Viva.Graph.svg('rect')
                     .attr('width', 10)
                     .attr('height', 10)
                     .attr('fill', '#00a2e8');
        },
        
        nodePositionCallback = function(nodeUI, pos){
            // TODO: Remove magic 5. It should be halfo of the width or height of the node.
            nodeUI.attr("x", pos.x - 5)
                  .attr("y", pos.y - 5);
        },

        linkBuilder = function(link){
            return Viva.Graph.svg('line')
                              .attr('stroke', '#999');
        },
        
        linkPositionCallback = function(linkUI, fromPos, toPos){
            linkUI.attr("x1", fromPos.x)
                  .attr("y1", fromPos.y)
                  .attr("x2", toPos.x)
                  .attr("y2", toPos.y);
        },
        
        fireRescaled = function(graphics){
            // TODO: maybe we shall copy changes? 
            graphics.fire('rescaled');
        },
        
        updateTransform = function() {
            if (svgContainer) {
                var transform = 'matrix(' + actualScale + ", 0, 0," + actualScale + "," + offsetX + "," + offsetY + ")";
                svgContainer.attr('transform', transform);
            }
        };
    
    var graphics = {
        /**
         * Sets the collback that creates node representation or creates a new node
         * presentation if builderCallbackOrNode is not a function. 
         * 
         * @param builderCallbackOrNode a callback function that accepts graph node
         * as a parameter and must return an element representing this node. OR
         * if it's not a function it's treated as a node to which DOM element should be created.
         * 
         * @returns If builderCallbackOrNode is a valid callback function, instance of this is returned;
         * Otherwise a node representation is returned for the passed parameter.
         */
        node : function(builderCallbackOrNode) {
            
            if (builderCallbackOrNode && typeof builderCallbackOrNode !== 'function'){
                return nodeBuilder(builderCallbackOrNode);
            }
            
            nodeBuilder = builderCallbackOrNode;
            
            return this;
        },
        
        /**
         * Sets the collback that creates link representation or creates a new link
         * presentation if builderCallbackOrLink is not a function. 
         * 
         * @param builderCallbackOrLink a callback function that accepts graph link
         * as a parameter and must return an element representing this link. OR
         * if it's not a function it's treated as a link to which DOM element should be created.
         * 
         * @returns If builderCallbackOrLink is a valid callback function, instance of this is returned;
         * Otherwise a link representation is returned for the passed parameter.
         */        
        link : function(builderCallbackOrLink) {
            if (builderCallbackOrLink && typeof builderCallbackOrLink !== 'function'){
                return linkBuilder(builderCallbackOrLink);
            }
            
            linkBuilder = builderCallbackOrLink;
            return this;
        },
        
        /**
         * Allows to override default position setter for the node with a new
         * function. newPlaceCallback(nodeUI, position) is function which
         * is used by updateNodePosition().
         */
        placeNode : function(newPlaceCallback) {
            nodePositionCallback = newPlaceCallback;
            return this;
        },

        placeLink : function(newPlaceLinkCallback) {
            linkPositionCallback = newPlaceLinkCallback;
            return this;
        },
        
        /**
         * Called every before renderer starts rendering.
         */
        beginRender : function() {},
        
        /**
         * Called every time when renderer finishes one step of rendering.
         */
        endRender : function() {},
        
        /**
         * Sets translate operation that should be applied to all nodes and links.
         */
        setInitialOffset : function(x, y) {
            offsetX = x;
            offsetY = y;
            updateTransform();
        },
        
        translateRel : function(dx, dy) {
            var p = svgRoot.createSVGPoint(),
                t = svgContainer.getCTM(),
                origin = svgRoot.createSVGPoint().matrixTransform(t.inverse());
                
            p.x = dx;
            p.y = dy;
            
            p = p.matrixTransform(t.inverse());
            p.x = (p.x - origin.x) * t.a;
            p.y = (p.y - origin.y) * t.d;
            
            t.e += p.x;
            t.f += p.y;
            
            var transform = 'matrix(' + t.a + ", 0, 0," + t.d + "," + t.e + "," + t.f + ")";
            svgContainer.attr('transform', transform);
        },
        
        scale : function(scaleFactor, scrollPoint) {
            var p = svgRoot.createSVGPoint();
            p.x = scrollPoint.x;
            p.y = scrollPoint.y;
            
            p = p.matrixTransform(svgContainer.getCTM().inverse()); // translate to svg coordinates
            
            // Compute new scale matrix in current mouse position
            var k = svgRoot.createSVGMatrix().translate(p.x, p.y).scale(scaleFactor).translate(-p.x, -p.y),
                t = svgContainer.getCTM().multiply(k);

            actualScale = t.a;
            offsetX = t.e;
            offsetY = t.f;
            var transform = 'matrix(' + t.a + ", 0, 0," + t.d + "," + t.e + "," + t.f + ")";
            svgContainer.attr('transform', transform);
            
            fireRescaled(this);
            return actualScale;
        },
        
        resetScale : function(){
            actualScale = 1;
            var transform = 'matrix(1, 0, 0, 1, 0, 0)';
            svgContainer.attr('transform', transform);
            fireRescaled(this);
            return this;
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output 
        * provider prepare to render.
        */
       init : function(container) {
           svgRoot = Viva.Graph.svg("svg");
           
           svgContainer = Viva.Graph.svg("g")
                .attr('buffered-rendering', 'dynamic');

           svgRoot.appendChild(svgContainer);
           container.appendChild(svgRoot);
           updateTransform();
       },
       
       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider prepare to render given link of the graph
        * 
        * @param linkUI visual representation of the link created by link() execution.
        */
       initLink : function(linkUI) {
           if(svgContainer.childElementCount > 0) {
               svgContainer.insertBefore(linkUI, svgContainer.firstChild);
           } else {
               svgContainer.appendChild(linkUI);
           }
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider remove link from rendering surface.
       * 
       * @param linkUI visual representation of the link created by link() execution.
       **/
       releaseLink : function(linkUI) {
           svgContainer.removeChild(linkUI);
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider prepare to render given node of the graph.
       * 
       * @param nodeUI visual representation of the node created by node() execution.
       **/
       initNode : function(nodeUI) {
           svgContainer.appendChild(nodeUI);
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider remove node from rendering surface.
       * 
       * @param nodeUI visual representation of the node created by node() execution.
       **/
       releaseNode : function(nodeUI) {
           svgContainer.removeChild(nodeUI);
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider place given node UI to recommended position pos {x, y};
       */ 
       updateNodePosition : function(nodeUI, pos) {
           nodePositionCallback(nodeUI, pos);
       },
       
       /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider place given link of the graph. Pos objects are {x, y};
       */  
       updateLinkPosition : function(link, fromPos, toPos) {
           linkPositionCallback(link, fromPos, toPos);
       },
       
       /**
        * Returns root svg element. 
        * 
        * Note: This is internal method specific to this renderer
        * TODO: Renoame this to getGraphicsRoot() to be uniform accross graphics classes
        */
       getSvgRoot : function() {
           return svgRoot;
       }
    };
    
    // Let graphics fire events before we return it to the caller.
    Viva.Graph.Utils.events(graphics).extend();
    
    return graphics;
};
/*global Viva*/

Viva.Graph.View.svgNodeFactory = function(graph){
    var highlightColor = 'orange',
        defaultColor = '#999',
        geom = Viva.Graph.geom(),
        
        attachCustomContent = function(nodeUI, node) {
            nodeUI.size = {w: 10, h: 10};
            nodeUI.append('rect')
                .attr('width', nodeUI.size.w)
                .attr('height', nodeUI.size.h)
                .attr('stroke', 'orange')
                .attr('fill', 'orange');
        },
        
        nodeSize = function(nodeUI) {
            return nodeUI.size;
        };
    
    
    return {
        node : function(node) {
            var nodeUI = Viva.Graph.svg('g');
                
            attachCustomContent(nodeUI, node);
            nodeUI.nodeId = node.id;
            return nodeUI;
        },
        
        link : function(link) {
           var fromNode = graph.getNode(link.fromId),
               nodeUI = fromNode && fromNode.ui;
           
           if (nodeUI && !nodeUI.linksContainer ) {
               var nodeLinks = Viva.Graph.svg('path')
                                   .attr('stroke', defaultColor);
               nodeUI.linksContainer = nodeLinks;
               return nodeLinks;
           }
           
           return null;
        },
        
        /**
         * Sets a callback function for custom nodes contnet. 
         * @param conentCreator(nodeUI, node) - callback function which returns a node content UI. 
         *  Image, for example.
         * @param sizeProvider(nodeUI) - a callback function which accepts nodeUI returned by 
         *  contentCreator and returns it's custom rectangular size.
         * 
         */
        customContent : function(contentCreator, sizeProvider) {
            if (typeof contentCreator !== 'function' ||
                typeof sizeProvider !== 'function') {
                throw 'Two functions expected: contentCreator(nodeUI, node) and size(nodeUI)';
            }
            
            attachCustomContent = contentCreator;
            nodeSize = sizeProvider;
        },
        
        placeNode : function(nodeUI, fromNodePos) {
               var linksPath = '',
                   fromNodeSize = nodeSize(nodeUI);
               
               graph.forEachLinkedNode(nodeUI.nodeId, function(linkedNode, link) {
                   if (!linkedNode.position || !linkedNode.ui) {
                       return; // not yet defined - ignore.
                   }
                   
                   if (linkedNode.ui === nodeUI) {
                       return; // incoming link - ignore;
                   }
                   if (link.fromId !== nodeUI.nodeId) {
                       return; // we process only outgoing links.
                   }
                   
                   var toNodeSize = nodeSize(linkedNode.ui),
                       toNodePos = linkedNode.position;
    
                   var from = geom.intersectRect(
                        fromNodePos.x - fromNodeSize.w / 2, // left
                        fromNodePos.y - fromNodeSize.h / 2, // top 
                        fromNodePos.x + fromNodeSize.w / 2, // right
                        fromNodePos.y + fromNodeSize.h / 2, // bottom 
                        fromNodePos.x, fromNodePos.y, toNodePos.x, toNodePos.y) || fromNodePos;
                   
                   var to = geom.intersectRect(
                       toNodePos.x - toNodeSize.w / 2, // left
                       toNodePos.y - toNodeSize.h / 2, // top 
                       toNodePos.x + toNodeSize.w / 2, // right
                       toNodePos.y + toNodeSize.h / 2, // bottom 
                       toNodePos.x, toNodePos.y, fromNodePos.x, fromNodePos.y) || toNodePos;
                   
                   linksPath += 'M' + Math.round(from.x) + ' ' + Math.round(from.y) +
                                'L' + Math.round(to.x) + ' ' + Math.round(to.y);
               });
               
               nodeUI.attr("transform", 
                           "translate(" + (fromNodePos.x - fromNodeSize.w / 2) + ", " + 
                            (fromNodePos.y - fromNodeSize.h / 2) + ")");
               if (linksPath !== '' && nodeUI.linksContainer) {
                   nodeUI.linksContainer.attr("d", linksPath);
               }
           }

    };
};
/**
 * @fileOverview Defines a model objects to represents graph rendering 
 * primitives in webglGraphics. 
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva Float32Array*/

Viva.Graph.View.WebglUtils = function() {};

/**
 * Parses various color strings and returns color value used in webgl shaders.
 */

Viva.Graph.View.WebglUtils.prototype.parseColor = function(color) {
        var parsedColor = 0x009ee8;
        
        if (typeof color === 'string' && color) {
            if (color.length === 4) { // #rgb
                color = color.replace(/([^#])/g, '$1$1'); // duplicate each letter except first #.
            }
            if (color.length === 9 || color.length === 7) { // #rrggbbaa or #rrggbb. Always ignore alpha:
                parsedColor = parseInt(color.substring(1, 7), 16);
            } else {
                throw 'Color expected in hex format with preceding "#". E.g. #00ff00. Got value: ' + color;
            }
        } else if (typeof color === 'number') {
            parsedColor = color;
        }
        
        return parsedColor;
};

Viva.Graph.View._webglUtil = new Viva.Graph.View.WebglUtils(); // reuse this instance internally.

/**
 * Defines a webgl line. This class has no rendering logic at all,
 * it's just passed to corresponding shader and the shader should
 * figure out how to render it. 
 * 
 * @see Viva.Graph.View.webglLinkShader.position
 */
Viva.Graph.View.webglLine = function(color){
    return {
        /**
         * Gets or sets color of the line. If you set this property externally
         * make sure it always come as integer of 0xRRGGBB format (no alpha channel); 
         */
        color : Viva.Graph.View._webglUtil.parseColor(color)
    };
};

/**
 * Can be used as a callback in the webglGraphics.node() function, to 
 * create a custom looking node.
 * 
 * @param size - size of the node in pixels.
 * @param color - color of the node in '#rrggbb' or '#rgb' format. 
 *  You can also pass '#rrggbbaa', but alpha chanel is always ignored. 
 */
Viva.Graph.View.webglSquare = function(size, color){
    return {
        /**
         * Gets or sets size of the sqare side. 
         */
        size : typeof size === 'number' ? size : 10,
        
        /**
         * Gets or sets color of the square. If you set this property externally
         * make sure it always come as integer of 0xRRGGBB format (no alpha channel); 
         */
        color : Viva.Graph.View._webglUtil.parseColor(color)
    };
};

/**
 * Represents a model for image. 
 */
Viva.Graph.View.webglImage = function(size, src) {
    return {
        /**
         * Gets texture index where current image is placed.s
         */
        _texture : 0,
        
        /**
         * Gets offset in the texture where current image is placed.
         */
        _offset : 0,
        
        /**
         * Gets size of the square with the image.
         */
        size : typeof size === 'number' ? size : 32,
        
        /**
         * Source of the image. If image is comming not from your domain
         * certain origin restrictions applies.
         * See http://www.khronos.org/registry/webgl/specs/latest/#4.2 for more details.
         */
        src  : src
    };
};/**
 * @fileOverview Defines a naive form of nodes for webglGraphics class. 
 * This form allows to change color of node. Shape of nodes is rectangular. 
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva Float32Array*/

/**
 * Defines simple UI for nodes in webgl renderer. Each node is rendered as square. Color and size can be changed.
 */
Viva.Graph.View.webglNodeShader = function() {
   var ATTRIBUTES_PER_PRIMITIVE = 4, // Primitive is point, x, y - its coordinates + color and size == 4 attributes per node. 
         nodesFS = [
        'precision mediump float;',
        'varying vec4 color;',
        
        'void main(void) {',
        '   gl_FragColor = color;',
        '}'].join('\n'),
        nodesVS = [
        'attribute vec2 aVertexPos;',
        // Pack clor and size into vector. First elemnt is color, second - size.
        // note: since it's floating point we can only use 24 bit to pack colors...
        // thus alpha channel is dropped, and is always assumed to be 1.
        'attribute vec2 aCustomAttributes;', 
        'uniform vec2 uScreenSize;',
        'uniform mat4 uTransform;',
        'varying vec4 color;',
        
        'void main(void) {',
        '   gl_Position = uTransform * vec4(aVertexPos/uScreenSize, 0, 1);',
        '   gl_PointSize = aCustomAttributes[1] * uTransform[0][0];',
        '   float c = aCustomAttributes[0];',
        '   color = vec4(0.0, 0.0, 0.0, 255.0);',
        '   color.b = mod(c, 256.0); c = floor(c/256.0);',
        '   color.g = mod(c, 256.0); c = floor(c/256.0);',
        '   color.r = mod(c, 256.0); c = floor(c/256.0); color /= 255.0;',
        '}'].join('\n'),
        
        utils = new Viva.Graph.View.WebglUtils();
        
        return {
            /**
             * Returns fragment shader text which renders this node.
             */
            fragmentShader : nodesFS,
            
            /**
             * Returns vertex shader text which renders this node.
             */
            vertexShader : nodesVS,
            
            /**
             * Returns number of attributes current shader reserves for webgl primtive
             * (point, line, triangle and strips)
             */
            attributesPerPrimitive : ATTRIBUTES_PER_PRIMITIVE,
            
            /**
             * Called by webglGraphics to let shader initialize its custom attributes.
             */
            initCustomAttributes : function(gl, program) {
                program.customAttributes = gl.getAttribLocation(program, 'aCustomAttributes');
            },
            
            /**
             * Called by webglGraphics to let this shader render its custom attributes.
             */
            renderCustomAttributes : function(gl, program) {
                gl.enableVertexAttribArray(program.customAttributes);
                gl.vertexAttribPointer(program.customAttributes, 2, gl.FLOAT, false, ATTRIBUTES_PER_PRIMITIVE * 4, 2 * 4);
            },
            
            /**
             * Updates position of current node in the buffer of nodes. 
             * 
             * @param nodes - buffer where all nodes are stored.
             * @param idx - index of current node.
             * @param pos - new position of the node.
             */
            position : function(nodes, nodeUI, pos) {
                var idx = nodeUI.id;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE] = pos.x;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 1] = pos.y;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 2] = nodeUI.color;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 3] = nodeUI.size;
            },
            
            /**
             * Called by webglGraphics to let this shader init additional properties of the
             * given model of a node.
             */
            buildUI : function(ui) { }
        };
};

/**
 * Defines UI for links in webgl renderer. 
 */
Viva.Graph.View.webglLinkShader = function() {
     var ATTRIBUTES_PER_PRIMITIVE = 6, // primitive is Line with two points. Each has x,y and color = 3 * 2 attributes.
        linksFS = [
        'precision mediump float;',
        'varying vec4 color;',
        'void main(void) {',
        '   gl_FragColor = color;',
        '}'].join('\n'),
        
        linksVS = [
        'attribute vec2 aVertexPos;',
        'attribute float aColor;', 
        
        'uniform vec2 uScreenSize;',
        'uniform mat4 uTransform;',
        
        'varying vec4 color;',
        
        'void main(void) {',
        '   gl_Position = uTransform * vec4(aVertexPos/uScreenSize, 0.0, 1.0);',
        '   color = vec4(0.0, 0.0, 0.0, 255.0);',
        '   float c = aColor;',
        '   color.b = mod(c, 256.0); c = floor(c/256.0);',
        '   color.g = mod(c, 256.0); c = floor(c/256.0);',
        '   color.r = mod(c, 256.0); c = floor(c/256.0); color /= 255.0;',
        '}'].join('\n'),
        
        utils = new Viva.Graph.View.WebglUtils();
        
        return {
            fragmentShader : linksFS,
            vertexShader : linksVS,

            /**
             * Returns number of attributes current shader reserves for webgl primtive
             * (point, line, triangle and strips)
             */
            attributesPerPrimitive : ATTRIBUTES_PER_PRIMITIVE,
            
            /**
             * Called by webglGraphics to let shader initialize its custom attributes.
             */
            initCustomAttributes : function(gl, program) {
                program.colorAttribute = gl.getAttribLocation(program, 'aColor');
            },
            
            /**
             * Called by webglGraphics to let this shader render its custom attributes.
             */
            renderCustomAttributes : function(gl, program) { 
                gl.enableVertexAttribArray(program.colorAttribute);
                gl.vertexAttribPointer(program.colorAttribute, 1, gl.FLOAT, false, 3 * 4, 2 * 4);
            },
            
            position: function(links, linkUi, fromPos, toPos) {
                var linkIdx = linkUi.id,
                    offset = linkIdx * ATTRIBUTES_PER_PRIMITIVE; 
                links[offset + 0] = fromPos.x;
                links[offset + 1] = fromPos.y;
                links[offset + 2] = linkUi.color;
                
                links[offset + 3] = toPos.x;
                links[offset + 4] = toPos.y;
                links[offset + 5] = linkUi.color;
            },
            
            /**
             * Called by webglGraphics to let this shader init additional properties of the
             * given model of a node.
             */
            buildUI : function(ui) { }
        };
};

/**
 * Defines simple UI for nodes in webgl renderer. Each node is rendered as square. Color and size can be changed.
 */
Viva.Graph.View.webglImageNodeShader = function() {
   var ATTRIBUTES_PER_PRIMITIVE = 4, // Primitive is point, x, y - its coordinates + color and size == 4 attributes per node. 
         nodesFS = [
        'precision mediump float;',
        'varying vec4 color;',
        
        'void main(void) {',
        '   gl_FragColor = vec4(1, 0, 0, 1);',
        '}'].join('\n'),
        nodesVS = [
        'attribute vec2 aVertexPos;',
        // Pack clor and size into vector. First elemnt is color, second - size.
        // note: since it's floating point we can only use 24 bit to pack colors...
        // thus alpha channel is dropped, and is always assumed to be 1.
        'attribute vec2 aCustomAttributes;', 
        'uniform vec2 uScreenSize;',
        'uniform mat4 uTransform;',
        'varying vec4 color;',
        
        'void main(void) {',
        '   gl_Position = uTransform * vec4(aVertexPos/uScreenSize, 0, 1);',
        '   gl_PointSize = aCustomAttributes[1] * uTransform[0][0];',
        '   float c = aCustomAttributes[0];',
        '   color = vec4(0.0, 0.0, 0.0, 255.0);',
        '   color.b = mod(c, 256.0); c = floor(c/256.0);',
        '   color.g = mod(c, 256.0); c = floor(c/256.0);',
        '   color.r = mod(c, 256.0); c = floor(c/256.0); color /= 255.0;',
        '}'].join('\n'),
        
        utils = new Viva.Graph.View.WebglUtils();
        
        return {
            /**
             * Returns fragment shader text which renders this node.
             */
            fragmentShader : nodesFS,
            
            /**
             * Returns vertex shader text which renders this node.
             */
            vertexShader : nodesVS,
            
            /**
             * Returns number of attributes current shader reserves for webgl primtive
             * (point, line, triangle and strips)
             */
            attributesPerPrimitive : ATTRIBUTES_PER_PRIMITIVE,
            
            /**
             * Called by webglGraphics to let shader initialize its custom attributes.
             */
            initCustomAttributes : function(gl, program) {
                program.customAttributes = gl.getAttribLocation(program, 'aCustomAttributes');
            },
            
            /**
             * Called by webglGraphics to let this shader render its custom attributes.
             */
            renderCustomAttributes : function(gl, program) {
                gl.enableVertexAttribArray(program.customAttributes);
                gl.vertexAttribPointer(program.customAttributes, 2, gl.FLOAT, false, ATTRIBUTES_PER_PRIMITIVE * 4, 2 * 4);
            },
            
            /**
             * Updates position of current node in the buffer of nodes. 
             * 
             * @param nodes - buffer where all nodes are stored.
             * @param idx - index of current node.
             * @param pos - new position of the node.
             */
            position : function(nodes, nodeUI, pos) {
                var idx = nodeUI.id;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE] = pos.x;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 1] = pos.y;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 2] = nodeUI.color;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 3] = nodeUI.size;
            },
            
            /**
             * Called by webglGraphics to let this shader init additional properties of the
             * given model of a node.
             */
            buildUI : function(ui) { }
        };
};/**
 * @fileOverview Defines a graph renderer that uses WebGL based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */
/*global Viva Float32Array*/
Viva.Graph.View = Viva.Graph.View || {};

/**
 * Performs webgl-based graph rendering. This module does not perform
 * layout, but only visualizes nodes and edeges of the graph.
 */
Viva.Graph.View.webglGraphics = function() {
    var container,
        graphicsRoot,
        gl,
        linksProgram,
        nodesProgram,
        width, height,
        nodesCount = 0,
        linksCount = 0,
        transform,
        userPlaceNodeCallback, 
        userPlaceLinkCallback,
        nodesAttributes = new Float32Array(64), 
        linksAttributes = new Float32Array(64),
        nodes = [], 
        links = [],
        
        // TODO: rename these. They are not really shaders, but they define
        // appearance of nodes and links, providing api to clients to customize ui. 
        // dunno how to name them.
        linkShader = Viva.Graph.View.webglLinkShader(),
        nodeShader = Viva.Graph.View.webglNodeShader(), 
        
        nodeUIBuilder = function(node){
            return Viva.Graph.View.webglSquare.square(); // Just make a square, using provided gl context (a nodeShader);
        },
        
        linkUIBuilder = function(link) {
            return Viva.Graph.View.webglLine('#b3b3b3');
        },
 
        createProgram = function(vertexShader, fragmentShader) {
            var program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)){
                var msg = gl.getShaderInfoLog(program);
                alert(msg);
                throw msg;
            }
            
            return program;
        },
        
        createShader = function(shaderText, type) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, shaderText);
            gl.compileShader(shader);
            
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                var msg = gl.getShaderInfoLog(shader);
                alert(msg);
                throw msg;
            }
            
            return shader;
        },
        
        assertProgramParameter = function(location, attributeOrUniformName) {
           if (location === -1) { 
               throw "Generator didn't provide '" + attributeOrUniformName + "' attribue or uniform in its shader. Make sure it's defined."; 
           }
        },
        
        initRequiredAttributes = function(program) {
           program.postionAttrib = gl.getAttribLocation(program, 'aVertexPos');
           assertProgramParameter(program.postionAttrib, 'aVertexPos');
           
           program.screenSize = gl.getUniformLocation(program, 'uScreenSize');
           assertProgramParameter(program.screenSize, 'uScreenSize');
           
           program.transform = gl.getUniformLocation(program, 'uTransform');
           assertProgramParameter(program.transform, 'uTransform');
           
           gl.uniform2f(program.screenSize, width, height);
           gl.uniformMatrix4fv(program.transform, false, transform);
           
           gl.enableVertexAttribArray(program.postionAttrib);
           program.buffer = gl.createBuffer();
        },
        
        loadBufferData = function(program, data) {
           gl.bindBuffer(gl.ARRAY_BUFFER, program.buffer);
           gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        },

        loadProgram = function(shaderInfo, bufferData){
           var vs = createShader(shaderInfo.vertexShader, gl.VERTEX_SHADER),
               fs = createShader(shaderInfo.fragmentShader, gl.FRAGMENT_SHADER),
               program = createProgram(vs, fs);
           
           shaderInfo.program = program;
           
           gl.useProgram(program);
           
           initRequiredAttributes(program);
           
           shaderInfo.initCustomAttributes(gl, program);
           
           loadBufferData(program, bufferData);
           
           return program;
        },
        
        unloadProgram = function(shaderInfo) {
            if (shaderInfo && gl) {
                if(typeof shaderInfo.release === 'function') {
                    shaderInfo.release();
                }
                
                if (shaderInfo.program) {
                    var program = shaderInfo.program;
                    gl.deleteBuffer(program.buffer);
                    
                    var shaders = gl.getAttachedShaders(program);
                    for(var i = 0; i < shaders.length; ++i) {
                        gl.detachShader(program, shaders[i]);
                        gl.deleteShader(shaders[i]);
                    }
                    
                    // TODO: for some reason DELETE_STATUS after this call is false.
                    gl.deleteProgram(shaderInfo.program); 
                }
            }
        },
                
        updateTransformUniform = function() {
            gl.useProgram(linksProgram);
            gl.uniformMatrix4fv(linksProgram.transform, false, transform);
            
            gl.useProgram(nodesProgram);
            gl.uniformMatrix4fv(nodesProgram.transform, false, transform);
        },
        
        resetScaleInternal = function() {
            transform = [1, 0, 0, 0,
                        0, 1, 0, 0, 
                        0, 0, 1, 0,
                        0, 0, 0, 1];
        },
        
        updateSize = function() {
            width = graphicsRoot.width = Math.max(container.offsetWidth, 1);
            height = graphicsRoot.height = Math.max(container.offsetHeight, 1);
        },
        
        nodeBuilderInternal = function(node){
            if (nodesCount * nodeShader.attributesPerPrimitive + 1 > nodesAttributes.length) {
                // Every time we run out of space create new array twice bigger.
                // TODO: it seems buffer size is limited. Consider using multiple arrays for huge graphs
                var extendedArray = new Float32Array(nodesAttributes.length * nodeShader.attributesPerPrimitive * 2);
                extendedArray.set(nodesAttributes);
                
                nodesAttributes = extendedArray;
            }
            
            var nodeId = nodesCount++,
                ui = nodeUIBuilder(node);
            ui.id = nodeId;
            nodeShader.buildUI(ui);
            
            nodes[nodeId] = node;
            return ui;
        },
        
        reloadNodes = function() {
            for (var i=0; i < nodes.length; i++) {
              nodeShader.buildUI(nodes[i].ui);
            };
        },
        
        nodePositionCallback = function(nodeUI, pos) {
            if(userPlaceNodeCallback) {
                userPlaceNodeCallback(nodeUI, pos); 
            }
            
            nodeShader.position(nodesAttributes, nodeUI, pos);
        },

        linkBuilderInternal = function(link){
            // Check first if we ran out of available buffer size, and increase
            // it if required. 
            // TODO: it seems buffer size is limited. Consider using multiple arrays for huge graphs
            if (linksCount * linkShader.attributesPerPrimitive + 1 > linksAttributes.length) {
                var extendedArray = new Float32Array(linksAttributes.length * linkShader.attributesPerPrimitive * 2);
                extendedArray.set(linksAttributes);
                linksAttributes = extendedArray;
            }
            
            var linkId = linksCount++,
                ui = linkUIBuilder(link);
            ui.id = linkId;
            linkShader.buildUI(ui);
            
            links[linkId] = link;
            return ui;
        },
        
        linkPositionCallback = function(linkUi, fromPos, toPos){
            if(userPlaceLinkCallback) {
                userPlaceLinkCallback(linkUi, fromPos, toPos); 
            }

            linkShader.position(linksAttributes, linkUi, fromPos, toPos);
        },
        
        copyAttributes = function(buffer, from, to, attributesPerIndex) {
            for(var i = 0; i < attributesPerIndex; ++i) {
                buffer[from + i] = buffer[to + i];
            }
        },
        
        fireRescaled = function(graphics){
            graphics.fire('rescaled');
        };
    
    var graphics = {
        /**
         * Sets the collback that creates node representation or creates a new node
         * presentation if builderCallbackOrNode is not a function. 
         * 
         * @param builderCallbackOrNode a callback function that accepts graph node
         * as a parameter and must return an element representing this node. OR
         * if it's not a function it's treated as a node to which DOM element should be created.
         * 
         * @returns If builderCallbackOrNode is a valid callback function, instance of this is returned;
         * Otherwise a node representation is returned for the passed parameter.
         */
        node : function(builderCallbackOrNode) {
            if (builderCallbackOrNode && typeof builderCallbackOrNode !== 'function'){
                return nodeBuilderInternal(builderCallbackOrNode); // create ui for node using current nodeUIBuilder
            }

            nodeUIBuilder = builderCallbackOrNode; // else replace ui builder with provided function.
            
            return this;
        },
        
        /**
         * Sets the collback that creates link representation or creates a new link
         * presentation if builderCallbackOrLink is not a function. 
         * 
         * @param builderCallbackOrLink a callback function that accepts graph link
         * as a parameter and must return an element representing this link. OR
         * if it's not a function it's treated as a link to which DOM element should be created.
         * 
         * @returns If builderCallbackOrLink is a valid callback function, instance of this is returned;
         * Otherwise a link representation is returned for the passed parameter.
         */        
        link : function(builderCallbackOrLink) {
            
            if (builderCallbackOrLink && typeof builderCallbackOrLink !== 'function'){
                return linkBuilderInternal(builderCallbackOrLink);
            }
            
            linkUIBuilder = builderCallbackOrLink;
            return this;
        },
        
        /**
         * Allows to override default position setter for the node with a new
         * function. newPlaceCallback(nodeUI, position) is function which
         * is used by updateNodePosition().
         */
        placeNode : function(newPlaceCallback) {
            userPlaceNodeCallback = newPlaceCallback;
            return this;
        },

        placeLink : function(newPlaceLinkCallback) {
            userPlaceLinkCallback = newPlaceLinkCallback;
            return this;
        },
        
        /**
         * Called every before renderer starts rendering.
         */
        beginRender : function() {},
        
        /**
         * Called every time when renderer finishes one step of rendering.
         */
        endRender : function () {
            if (linksCount > 0) {
               gl.useProgram(linksProgram);
               loadBufferData(linksProgram, linksAttributes);
               
               gl.enableVertexAttribArray(linksProgram.postionAttrib);
               gl.vertexAttribPointer(linksProgram.postionAttrib, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
               linkShader.renderCustomAttributes(gl, linksProgram);
               
               gl.drawArrays(gl.LINES, 0, linksCount * 2);
           }
           if (nodesCount > 0){
               gl.useProgram(nodesProgram);
               loadBufferData(nodesProgram, nodesAttributes);
               
               gl.enableVertexAttribArray(nodesProgram.postionAttrib);
               gl.vertexAttribPointer(nodesProgram.postionAttrib, 2, gl.FLOAT, false, nodeShader.attributesPerPrimitive * Float32Array.BYTES_PER_ELEMENT, 0);
               
               nodeShader.renderCustomAttributes(gl, nodesProgram);
               
               gl.drawArrays(gl.POINTS, 0, nodesCount);
           }
        },
        
        /**
         * Sets translate operation that should be applied to all nodes and links.
         */
        setInitialOffset : function(x, y) {
            // todo: do I need this?
        },
        
        translateRel : function(dx, dy) {
            transform[12] += (2*transform[0] * dx/width) / transform[0];
            transform[13] -= (2*transform[5] * dy/height) / transform[5];
            updateTransformUniform();
        },
        
        scale : function(scaleFactor, scrollPoint) {
            // Transform scroll point to clip-space coordinates: 
            var cx = 2 * scrollPoint.x/width - 1,
                cy = 1 - (2*scrollPoint.y) / height;

            cx -= transform[12]; 
            cy -= transform[13]; 

            transform[12] += cx * (1 - scaleFactor); 
            transform[13] += cy * (1 - scaleFactor);
            
            transform[0] *= scaleFactor;
            transform[5] *= scaleFactor;
            
            updateTransformUniform();
            fireRescaled(this);
            
            return transform[0];
        },
        
        resetScale : function(){
            resetScaleInternal();
            
            if (gl) {
                updateSize();
                gl.useProgram(linksProgram);
                gl.uniform2f(linksProgram.screenSize, width, height);
                updateTransformUniform();
            }
            return this;
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output 
        * provider prepare to render.
        */
       init : function(c) {
           container = c;
           
           graphicsRoot = document.createElement("canvas");
           updateSize(); // todo: monitor container size change.
           resetScaleInternal();
           container.appendChild(graphicsRoot);
           
           gl = graphicsRoot.getContext('experimental-webgl');
           
           linksProgram = loadProgram(linkShader, linksAttributes);
           nodesProgram = loadProgram(nodeShader, nodesAttributes);
           
           updateTransformUniform();
       },
       
       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider prepare to render given link of the graph
        * 
        * @param linkUI visual representation of the link created by link() execution.
        */
       initLink : function(linkUI) {
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider remove link from rendering surface.
       * 
       * @param linkUI visual representation of the link created by link() execution.
       **/
       releaseLink : function(linkToRemove) {
           if (linksCount > 0) { linksCount -= 1; }

           var linkIdToRemove = linkToRemove.id;
           if (linkIdToRemove < linksCount){
               if (linksCount === 0 || linksCount === linkIdToRemove) {
                   return; // no more links or removed link is the last one.
               }
               
               // swap removed link with the last link. This will give us O(1) performance for links removal:
               var attributesCount = linkShader.attributesPerPrimitive;
               copyAttributes(linksAttributes, linkIdToRemove*attributesCount, linksCount*attributesCount, attributesCount);

               // TODO: consider getting rid of this. The only reason why it's here is to update 'ui' property
               // so that renderer will pass proper id in updateLinkPosition. 
               links[linkIdToRemove] = links[linksCount]; 
               links[linkIdToRemove].ui.id = linkIdToRemove;
           }
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider prepare to render given node of the graph.
       * 
       * @param nodeUI visual representation of the node created by node() execution.
       **/
       initNode : function(nodeUI) { },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider remove node from rendering surface.
       * 
       * @param nodeUI visual representation of the node created by node() execution.
       **/
       releaseNode : function(nodeUI) {
           if (nodesCount > 0) { nodesCount -= 1; }

           if (nodeUI.id < nodesCount) {
               var nodeIdToRemove = nodeUI.id;
               if (nodesCount === 0 || nodesCount === nodeIdToRemove) {
                   return ; // no more nodes or removed node is the last in the list.
               }
               
               var attributesCount = nodeShader.attributesPerPrimitive;
               copyAttributes(nodesAttributes, nodeIdToRemove*attributesCount, nodesCount*attributesCount, attributesCount);
               
               nodes[nodeIdToRemove] = nodes[nodesCount];
               nodes[nodeIdToRemove].ui.id = nodeIdToRemove;
           }
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider place given node UI to recommended position pos {x, y};
       */ 
       updateNodePosition : function(nodeUI, pos) {
           nodePositionCallback(nodeUI, pos);
       },
       
       /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider place given link of the graph. Pos objects are {x, y};
       */  
       updateLinkPosition : function(link, fromPos, toPos) {
           linkPositionCallback(link, fromPos, toPos);
       },
       
       /**
        * Returns root element which hosts graphics. 
        */
       getGraphicsRoot : function() {
           return graphicsRoot;
       },
       
       /** 
        * Updates default shader which renders nodes
        * 
        * @param newShader to use for nodes. 
        */
       setNodeShader : function(newShader) {
           if (newShader && gl) {
               unloadProgram(nodeShader);
               nodeShader = newShader;
               nodesProgram = loadProgram(nodeShader, nodesAttributes);
               reloadNodes();
           }
       }
    };
    
    // Let graphics fire events before we return it to the caller.
    Viva.Graph.Utils.events(graphics).extend();
    
    return graphics;
};/**
 * @fileOverview Defines a graph renderer that uses CSS based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */
/*global Viva, window*/

Viva.Graph.View = Viva.Graph.View || {};

/**
 * This is heart of the rendering. Class accepts graph to be rendered and rendering settings.
 * It monitors graph changes and depicts them accordingly.
 * 
 * @param graph - Viva.Graph.graph() object to be rendered.
 * @param settings - rendering settings, composed from the following parts (with their defaults shown):
 *   settings = {
 *     // Represents a module that is capable of displaying graph nodes and links.
 *     // all graphics has to correspond to defined interface and can be later easily
 *     // replaced for specific needs (e.g. adding WebGL should be piece of cake as long
 *     // as WebGL has implemented required interface). See svgGraphics for example.
 *     // NOTE: current version supports Viva.Graph.View.cssGraphics() as well.
 *     graphics : Viva.Graph.View.svgGraphics(),
 * 
 *     // Where the renderer should draw graph. Container size matters, because 
 *     // renderer will attempt center graph to that size. Also graphics modules 
 *     // might depend on it.
 *     container : document.body,
 * 
 *     // Layout algorithm to be used. The algorithm is expected to comply with defined
 *     // interface and is expected to be iterative. Renderer will use it then to calculate
 *     // grpaph's layout. For examples of the interface refer to Viva.Graph.Layout.forceDirected()
 *     // and Viva.Graph.Layout.gem() algorithms.
 *     layout : Viva.Graph.Layout.forceDirected(),
 * 
 *     // Directs renderer to display links. Usually rendering links is the slowest part of this
 *     // library. So if you don't need to display links, consider settings this property to false.
 *     renderLinks : true,
 * 
 *     // Number of layout iterations to run before displaying the graph. The bigger you set this number
 *     // the closer to ideal position graph will apper first time. But be careful: for large graphs
 *     // it can freeze the browser.
 *     prerender : 0
 *   }
 */
Viva.Graph.View.renderer = function(graph, settings) {
    // TODO: This class is getting hard to understand. Consider refactoring.
    // TODO: I have a technical debt here: fix scaling/recentring! Currently it's total mess.
    var FRAME_INTERVAL = 30;
    
    settings = settings || {};
    
    var layout = settings.layout,
        graphics = settings.graphics,
        container = settings.container,
        animationTimer,
        rendererInitialized = false,
        updateCenterRequired = true,
        
        currentStep = 0,
        totalIterationsCount = 0, 
        isStable = false,
        userInteraction = false,
        
        viewPortOffset = {
            x : 0,
            y : 0
        },
        
        transform = {
            offsetX : 0,
            offsetY : 0,
            scale : 1
        };
    
    var prepareSettings = function() {
            container = container || document.body;
            layout = layout || Viva.Graph.Layout.forceDirected(graph);
            graphics = graphics || Viva.Graph.View.svgGraphics(graph, {container : container});
            
            if (typeof settings.renderLinks === 'undefined') {
                settings.renderLinks = true;
            }
            
            settings.prerender = settings.prerender || 0;
        },
        
        renderLink = function(link){
            var fromNode = graph.getNode(link.fromId);
            var toNode = graph.getNode(link.toId);
    
            if(!fromNode || !toNode) {
                return;
            }
            
            var from = {
                x : Math.round(fromNode.position.x),
                y : Math.round(fromNode.position.y),
                node: fromNode
            },
            to = {
                x : Math.round(toNode.position.x),
                y : Math.round(toNode.position.y),
                node : toNode
            };
            
            graphics.updateLinkPosition(link.ui, from, to);
        },
        
        renderNode = function(node) {
            var position = { 
                x : Math.round(node.position.x),
                y : Math.round(node.position.y) 
            };
            
            graphics.updateNodePosition(node.ui, position);
        },
        
        renderGraph = function(){
            graphics.beginRender();
            if(settings.renderLinks && !graphics.omitLinksRendering) {
                graph.forEachLink(renderLink);
            }

            graph.forEachNode(renderNode);
            graphics.endRender();
        },
        
        onRenderFrame = function() {
            isStable = layout.step() && !userInteraction;
            renderGraph();
            
            return !isStable;
        },
    
       renderIterations = function(iterationsCount) {
           if (animationTimer) {
               totalIterationsCount += iterationsCount;
               return;
           }
           
           if (iterationsCount) {
               totalIterationsCount += iterationsCount;
               
               animationTimer = Viva.Graph.Utils.timer(function() {
                   return onRenderFrame();
               }, FRAME_INTERVAL);
           } else { 
                currentStep = 0;
                totalIterationsCount = 0;
                animationTimer = Viva.Graph.Utils.timer(onRenderFrame, FRAME_INTERVAL);
           }
       },
       
       resetStable = function(){
           isStable = false;
           animationTimer.restart();
       },
       
       prerender = function() {
           // To get good initial positions for the graph
           // perform several prerender steps in background.
           if (typeof settings.prerender === 'number' && settings.prerender > 0){
               for (var i = 0; i < settings.prerender; ++i){
                   layout.step();
               }
           } else {
               layout.step(); // make one step to init positions property.
           }
       },
       
       updateCenter = function() {
           var graphRect = layout.getGraphRect(),
               containerSize = Viva.Graph.Utils.getDimension(container);
           
           viewPortOffset.x = viewPortOffset.y = 0;
           transform.offsetX = containerSize.width / 2 - (graphRect.x2 + graphRect.x1) / 2;
           transform.offsetY = containerSize.height / 2 - (graphRect.y2 + graphRect.y1) / 2;
           graphics.setInitialOffset(transform.offsetX + viewPortOffset.x, transform.offsetY + viewPortOffset.y);
           
           updateCenterRequired = false;
       },
       
       createNodeUi = function(node) {
           var nodeUI = graphics.node(node);
           node.ui = nodeUI;
           graphics.initNode(nodeUI);
           if (!node.position) {
               layout.addNode(node);
           }
           
           renderNode(node);
       },
       
       removeNodeUi = function (node) {
           if (typeof node.ui !== 'undefined'){
              graphics.releaseNode(node.ui);
              
              node.ui = null;
              delete node.ui;
           }
           
           layout.removeNode(node);
       },
       
       createLinkUi = function(link) {
           var linkUI = graphics.link(link);
           link.ui = linkUI;
           graphics.initLink(linkUI);

           if (!graphics.omitLinksRendering){ 
               renderLink(link);
           }
       },
       
       removeLinkUi = function(link) {
           if (typeof link.ui !== 'undefined') { 
               graphics.releaseLink(link.ui);
               link.ui = null;
               delete link.ui; 
           }
       },
       
       listenNodeEvents = function(node) {
            var wasPinned = false;
            // TODO: this should come from graphics? WebGL will not support this.
            node.events = Viva.Graph.Utils.dragndrop(node.ui)
                .onStart(function(){
                    wasPinned = node.isPinned;
                    node.isPinned = true;
                    userInteraction = true;
                    resetStable();
                })
                .onDrag(function(e, offset){
                    node.position.x += offset.x / transform.scale;
                    node.position.y += offset.y / transform.scale;
                    userInteraction = true;
                })
                .onStop(function(){
                    node.isPinned = wasPinned;
                    userInteraction = false;
                });
        },
        
        releaseNodeEvents = function(node) {
            if (node.events) {
                // TODO: i'm not sure if this is required in JS world...
                node.events.release();
                node.events = null;
                delete node.events;
            }
        },
       
       initDom = function() {
           graphics.init(container);
           
           graph.forEachNode(createNodeUi);
           
           if(settings.renderLinks) {
                graph.forEachLink(createLinkUi);
           }
       },
       
       processNodeChange = function(change) {
           var node = change.node;
           
           if (change.changeType === 'add') {
               createNodeUi(node);
               listenNodeEvents(node);
               if (updateCenterRequired){
                   updateCenter();
               }
           } else if (change.changeType === 'remove') {
               releaseNodeEvents(node);
               removeNodeUi(node);
               if (graph.getNodesCount() === 0){
                   updateCenterRequired = true; // Next time when node is added - center the graph.
               }
           } else if (change.changeType === 'update') {
               // TODO: Implement this properly!
               // releaseNodeEvents(node);
               // removeNodeUi(node);

               // createNodeUi(node);
               // listenNodeEvents(node);
           }
       },
       
       processLinkChange = function(change) {
           var link = change.link;
           if (change.changeType === 'add') {
               if (settings.renderLinks) { createLinkUi(link); }
               layout.addLink(link);
           } else if (change.changeType === 'remove') {
               if (settings.renderLinks) { removeLinkUi(link); }
               layout.removeLink(link);
           } else if (change.changeType === 'update') {
               // TODO: implement this properly!
               // if (settings.renderLinks) { removeLinkUi(link); }
               // layout.removeLink(link);

               // if (settings.renderLinks) { createLinkUi(link); }
               // layout.addLink(link);
           }
       },
       
       listenToEvents = function() {
            Viva.Graph.Utils.events(window).on('resize', function(){
                updateCenter();
                onRenderFrame();
            });
            
            var containerDrag = Viva.Graph.Utils.dragndrop(container);
            containerDrag.onDrag(function(e, offset){
                viewPortOffset.x += offset.x;
                viewPortOffset.y += offset.y;
                graphics.translateRel(offset.x, offset.y);
                
                renderGraph();
            });
            
            containerDrag.onScroll(function(e, scaleOffset, scrollPoint) {
                var scaleFactor = Math.pow(1 + 0.4, scaleOffset < 0 ? -0.2 : 0.2);
                transform.scale = graphics.scale(scaleFactor, scrollPoint);
                
                renderGraph();
            });
            
            graph.forEachNode(listenNodeEvents);
            
            Viva.Graph.Utils.events(graph).on('changed', function(changes){
                for(var i = 0; i < changes.length; ++i){
                    var change = changes[i];
                    if (change.node) {
                        processNodeChange(change);
                    } else if (change.link) {
                        processLinkChange(change);
                    }
                }
                
                resetStable();

            });
       };
       
    return {
        /**
         * Performs rendering of the graph. 
         * 
         * @param iterationsCount if specified renderer will run only given number of iterations
         * and then stop. Otherwise graph rendering is performed infinitely. 
         * 
         * Note: if rendering stopped by used started dragging nodes or new nodes were added to the
         * graph renderer will give run more iterations to reflect changes.
         */
        run : function(iterationsCount) {
            
            if (!rendererInitialized){
                prepareSettings();
                prerender();
                
                updateCenter();
                initDom();
                listenToEvents();
                
                rendererInitialized = true;
            }
            
            renderIterations(iterationsCount);

            return this;
        },
        
        reset : function(){
            graphics.resetScale();
            updateCenter();
            transform.scale = 1;
        },
        
        pause : function() {
            animationTimer.stop();
        },
        
        resume : function() {
            animationTimer.restart();
        }
    };
};
/*global Viva*/

Viva.Graph.serializer = function(){
    var checkJSON = function(){
        if (typeof JSON === 'undefined' || !JSON.stringify || !JSON.parse) {
                throw 'JSON serializer is not defined.';
        }
    },
    
    nodeTransformStore = function(node){
        return { id : node.id, data: node.data };
    },
    
    linkTransformStore = function(link) {
        return {
            fromId : link.fromId, 
            toId: link.toId,
            data : link.data
       };
    },
    
    nodeTransformLoad = function(node) { 
        return node;
    },
    
    linkTransformLoad = function(link) {
        return link;
    };
    
    return {
        /**
         * Saves graph to JSON format. 
         * 
         * NOTE: ECMAScript 5 (or alike) JSON object is required to be defined
         * to get proper output.
         *
         * @param graph to be saved in JSON format.
         * @param nodeTransform optional callback function(node) which returns what should be passed into nodes collection
         * @param linkTransform optional callback functions(link) which returns what should be passed into the links collection
         */
        storeToJSON : function(graph, nodeTransform, linkTransform) {
            if (!graph) { throw 'Graph is not defined'; }
            checkJSON();
            
            nodeTransform = nodeTransform || nodeTransformStore;
            linkTransform = linkTransform || linkTransformStore;
            
            var store = {
                nodes : [],
                links : []
            };
            
            graph.forEachNode(function(node) { store.nodes.push(nodeTransform(node)); });
            graph.forEachLink(function(link) { store.links.push(linkTransform(link)); });
            
            return JSON.stringify(store);
        },
        
        /**
         * Restores graph from JSON string created by storeToJSON() method. 
         * 
         * NOTE: ECMAScript 5 (or alike) JSON object is required to be defined
         * to get proper output.
         * 
         * @param jsonString is a string produced by storeToJSON() method.
         * @param nodeTransform optional callback function(node) which accepts deserialized node and returns object with
         *        'id' and 'data' properties.
         * @param linkTransform optional callback functions(link) which accepts deserialized link and returns link object with
         *        'fromId', 'toId' and 'data' properties.
         */
        loadFromJSON : function(jsonString, nodeTransform, linkTransform) {
            if (typeof jsonString !== 'string') { throw 'String expected in loadFromJSON() method'; }
            checkJSON();
            
            nodeTransform = nodeTransform || nodeTransformLoad;
            linkTransform = linkTransform || linkTransformLoad;
             
            var store = JSON.parse(jsonString),
                graph = Viva.Graph.graph();
                
            if (!store || !store.nodes || !store.links) { throw 'Passed json string does not represent valid graph'; }
            
            for(var i = 0; i < store.nodes.length; ++i) {
                var parsedNode = nodeTransform(store.nodes[i]);
                if (!parsedNode.hasOwnProperty('id')) { throw 'Graph node format is invalid. Node.id is missing'; }
                
                graph.addNode(parsedNode.id, parsedNode.data);
            }
            
            for (i = 0; i < store.links.length; ++i) {
                var link = linkTransform(store.links[i]);
                if (!link.hasOwnProperty('fromId') || !link.hasOwnProperty('toId')) { throw 'Graph link format is invalid. Both fromId and toId are required'; }
                
                graph.addLink(link.fromId, link.toId, link.data);
            } 
            
            return graph;
        }
    };
};
