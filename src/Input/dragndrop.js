/**
 * @author Andrei Kashcha (aka anvaka) / https://github.com/anvaka
 */

module.exports = dragndrop;

var documentEvents = require('../Utils/documentEvents.js');
var browserInfo = require('../Utils/browserInfo.js');
var findElementPosition = require('../Utils/findElementPosition.js');

// TODO: Move to input namespace
// TODO: Methods should be extracted into the prototype. This class
// does not need to consume so much memory for every tracked element
function dragndrop(element) {
    var start,
        drag,
        end,
        scroll,
        prevSelectStart,
        prevDragStart,

        startX = 0,
        startY = 0,
        dragObject,
        touchInProgress = false,
        pinchZoomLength = 0,

        getMousePos = function (e) {
            var posx = 0,
                posy = 0;

            e = e || window.event;

            if (e.pageX || e.pageY) {
                posx = e.pageX;
                posy = e.pageY;
            } else if (e.clientX || e.clientY) {
                posx = e.clientX + window.document.body.scrollLeft + window.document.documentElement.scrollLeft;
                posy = e.clientY + window.document.body.scrollTop + window.document.documentElement.scrollTop;
            }

            return [posx, posy];
        },

        move = function (e, clientX, clientY) {
            if (drag) {
                drag(e, {x : clientX - startX, y : clientY - startY });
            }

            startX = clientX;
            startY = clientY;
        },

        stopPropagation = function (e) {
            if (e.stopPropagation) { e.stopPropagation(); } else { e.cancelBubble = true; }
        },
        preventDefault = function (e) {
            if (e.preventDefault) { e.preventDefault(); }
        },

        handleDisabledEvent = function (e) {
            stopPropagation(e);
            return false;
        },

        handleMouseMove = function (e) {
            e = e || window.event;

            move(e, e.clientX, e.clientY);
        },

        handleMouseDown = function (e) {
            e = e || window.event;
            if (touchInProgress) {
                // modern browsers will fire mousedown for touch events too
                // we do not want this, since touch is handled separately.
                stopPropagation(e);
                return false;
            }
            // for IE, left click == 1
            // for Firefox, left click == 0
            var isLeftButton = ((e.button === 1 && window.event !== null) || e.button === 0);

            if (isLeftButton) {
                startX = e.clientX;
                startY = e.clientY;

                // TODO: bump zIndex?
                dragObject = e.target || e.srcElement;

                if (start) { start(e, {x: startX, y : startY}); }

                documentEvents.on('mousemove', handleMouseMove);
                documentEvents.on('mouseup', handleMouseUp);


                stopPropagation(e);
                // TODO: What if event already there? Not bullet proof:
                prevSelectStart = window.document.onselectstart;
                prevDragStart = window.document.ondragstart;

                window.document.onselectstart = handleDisabledEvent;
                dragObject.ondragstart = handleDisabledEvent;

                // prevent text selection (except IE)
                return false;
            }
        },

        handleMouseUp = function (e) {
            e = e || window.event;

            documentEvents.off('mousemove', handleMouseMove);
            documentEvents.off('mouseup', handleMouseUp);

            window.document.onselectstart = prevSelectStart;
            dragObject.ondragstart = prevDragStart;
            dragObject = null;
            if (end) { end(e); }
        },

        handleMouseWheel = function (e) {
            if (typeof scroll !== 'function') {
                return;
            }

            e = e || window.event;
            if (e.preventDefault) {
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

            if (e.wheelDelta) {
                delta = e.wheelDelta / 360; // Chrome/Safari
            } else {
                delta = e.detail / -9; // Mozilla
            }

            scroll(e, delta, relMousePos);
        },

        updateScrollEvents = function (scrollCallback) {
            if (!scroll && scrollCallback) {
                // client is interested in scrolling. Start listening to events:
                if (browserInfo.browser === 'webkit') {
                    element.addEventListener('mousewheel', handleMouseWheel, false); // Chrome/Safari
                } else {
                    element.addEventListener('DOMMouseScroll', handleMouseWheel, false); // Others
                }
            } else if (scroll && !scrollCallback) {
                if (browserInfo.browser === 'webkit') {
                    element.removeEventListener('mousewheel', handleMouseWheel, false); // Chrome/Safari
                } else {
                    element.removeEventListener('DOMMouseScroll', handleMouseWheel, false); // Others
                }
            }

            scroll = scrollCallback;
        },

        getPinchZoomLength = function(finger1, finger2) {
            return (finger1.clientX - finger2.clientX) * (finger1.clientX - finger2.clientX) +
                   (finger1.clientY - finger2.clientY) * (finger1.clientY - finger2.clientY);
        },

        handleTouchMove = function (e) {
            if (e.touches.length === 1) {
                stopPropagation(e);

                var touch = e.touches[0];
                move(e, touch.clientX, touch.clientY);
            } else if (e.touches.length === 2) {
                // it's a zoom:
                var currentPinchLength = getPinchZoomLength(e.touches[0], e.touches[1]);
                var delta = 0;
                if (currentPinchLength < pinchZoomLength) {
                    delta = -1;
                } else if (currentPinchLength > pinchZoomLength) {
                    delta = 1;
                }
                scroll(e, delta, {x: e.touches[0].clientX, y: e.touches[0].clientY});
                pinchZoomLength = currentPinchLength;
                stopPropagation(e);
                preventDefault(e);
            }
        },

        handleTouchEnd = function (e) {
            touchInProgress = false;
            documentEvents.off('touchmove', handleTouchMove);
            documentEvents.off('touchend', handleTouchEnd);
            documentEvents.off('touchcancel', handleTouchEnd);
            dragObject = null;
            if (end) { end(e); }
        },

        handleSignleFingerTouch = function (e, touch) {
            stopPropagation(e);
            preventDefault(e);

            startX = touch.clientX;
            startY = touch.clientY;

            dragObject = e.target || e.srcElement;

            if (start) { start(e, {x: startX, y : startY}); }
            // TODO: can I enter into the state when touch is in progress
            // but it's still a single finger touch?
            if (!touchInProgress) {
                touchInProgress = true;
                documentEvents.on('touchmove', handleTouchMove);
                documentEvents.on('touchend', handleTouchEnd);
                documentEvents.on('touchcancel', handleTouchEnd);
            }
        },

        handleTouchStart = function (e) {
            if (e.touches.length === 1) {
                return handleSignleFingerTouch(e, e.touches[0]);
            } else if (e.touches.length === 2) {
                // handleTouchMove() will care about pinch zoom.
                stopPropagation(e);
                preventDefault(e);

                pinchZoomLength = getPinchZoomLength(e.touches[0], e.touches[1]);

            }
            // don't care about the rest.
        };


    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('touchstart', handleTouchStart);

    return {
        onStart : function (callback) {
            start = callback;
            return this;
        },

        onDrag : function (callback) {
            drag = callback;
            return this;
        },

        onStop : function (callback) {
            end = callback;
            return this;
        },

        /**
         * Occurs when mouse wheel event happens. callback = function(e, scrollDelta, scrollPoint);
         */
        onScroll : function (callback) {
            updateScrollEvents(callback);
            return this;
        },

        release : function () {
            // TODO: could be unsafe. We might wanna release dragObject, etc.
            element.removeEventListener('mousedown', handleMouseDown);
            element.removeEventListener('touchstart', handleTouchStart);

            documentEvents.off('mousemove', handleMouseMove);
            documentEvents.off('mouseup', handleMouseUp);
            documentEvents.off('touchmove', handleTouchMove);
            documentEvents.off('touchend', handleTouchEnd);
            documentEvents.off('touchcancel', handleTouchEnd);

            updateScrollEvents(null);
        }
    };
}
