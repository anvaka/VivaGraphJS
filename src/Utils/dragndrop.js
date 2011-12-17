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
                
                // prevent text selection in IE
                document.onselectstart = function () { return false; };
                // prevent IE from trying to drag an image
                dragObject.ondragstart = function() { return false; };
                
                // prevent text selection (except IE)
                return false;
            }
        },
        
        handleMouseUp = function(e) {
            e = e || window.event;

            dragObject = null;
            documentEvents.stop('mousemove', handleMouseMove);
            documentEvents.stop('mouseup', handleMouseUp);
 
            if (end) { end(); }
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
        
        release : function() {
            // TODO: could be unsafe. We might wanna release dragObject, etc.
            documentEvents.stop('mousemove', handleMouseMove);
            documentEvents.stop('mousedown', handleMouseDown);
            documentEvents.stop('mouseup', handleMouseUp);
        }
    };
};
