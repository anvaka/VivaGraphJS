/**
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
        
        startX = 0,
        startY = 0,
        dragObject,
        
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
            e = e || window.event;
            if(e.preventDefault) { 
                e.preventDefault();
            }

            e.returnValue = false;
            var delta;
            if(e.wheelDelta) {
                delta = e.wheelDelta / 360; // Chrome/Safari
            } else { 
                delta = e.detail / -9; // Mozilla
            }
            
            if (scroll) {
                scroll(e, delta);
            }
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
         * Occurs when mouse wheel event happens. callback = function(e, scrollDelta);
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
