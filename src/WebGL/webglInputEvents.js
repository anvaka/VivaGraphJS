/*global Viva */

/**
 * Monitors graph-related mouse input in webgl graphics and notifies subscribers. 
 * 
 * @param {Viva.Graph.View.webglGraphics} webglGraphics
 * @param {Viva.Graph.graph} graph
 */
Viva.Graph.webglInputEvents = function(webglGraphics, graph){
    if (webglGraphics.webglInputEvents) {
        // Don't listen twice, if we are already attached to this graphics:
        return webglGraphics.webglInputEvents;
    }
    
    var preciseCheck = function(node, x, y) {
            if (node.ui && node.ui.size) {
                var pos = node.position,
                    half = node.ui.size;
    
                return pos.x - half < x && x < pos.x + half &&
                       pos.y - half < y && y < pos.y + half;
            } 
    
            return true;
        },
        mouseCapturedNode = null,

        spatialIndex = Viva.Graph.spatialIndex(graph, preciseCheck),
        mouseEnterCallback = [],
        mouseLeaveCallback = [],
        mouseDownCallback = [],
        mouseUpCallback = [],
        mouseMoveCallback = [],
        clickCallback = [],
        dblClickCallback = [],
        documentEvents = Viva.Graph.Utils.events(window.document),
        prevSelectStart,
        
        stopPropagation = function (e) {
            if (e.stopPropagation) { e.stopPropagation(); }
            else { 
                e.cancelBubble = true; 
            }
        },
        
        handleDisabledEvent = function(e) {
            stopPropagation(e);
            return false;
        },

        invoke = function(callbacksChain, args) {
            var i, stopPropagation;
            for (i=0; i < callbacksChain.length; i += 1) {
              stopPropagation = callbacksChain[i].apply(undefined, args);
              if (stopPropagation) { return true; }
            }
        },

        startListen = function(root) {
            var pos = {x : 0, y : 0},
                lastFound = null,
                lastClickTime = +new Date(),
                
                handleMouseMove = function(e) {
                    invoke(mouseMoveCallback, [lastFound, e]);
                    pos.x = e.clientX;
                    pos.y = e.clientY;
                },
                
                handleMouseUp = function(e) {
                    documentEvents.stop('mousemove', handleMouseMove);
                    documentEvents.stop('mouseup', handleMouseUp);
                },
                
                updateBoundRect = function() {
                    boundRect = root.getBoundingClientRect();
                };
                
             window.addEventListener('resize', updateBoundRect);
             updateBoundRect();

             // mouse move inside container serves only to track mouse enter/leave events.
             root.addEventListener('mousemove',
                function (e) {
                    if (mouseCapturedNode) {
                        return; 
                    }
                    
                    var cancelBubble = false,
                        node;
                    
                    pos.x = e.clientX - boundRect.left;
                    pos.y = e.clientY - boundRect.top;

                    webglGraphics.getGraphCoordinates(pos);
                    node = spatialIndex.getNodeAt(pos.x, pos.y);
                       
                    if (node && lastFound !== node) {
                        lastFound = node;
                        cancelBubble = cancelBubble || invoke(mouseEnterCallback, [lastFound]);
                    } else if (node && lastFound === node) {
                        // cancelBubble = cancelBubble || invoke(mouseMoveCallback, [lastFound, e]);
                    } else if (node === null && lastFound !== node) {
                        cancelBubble = cancelBubble || invoke(mouseLeaveCallback, [lastFound]);
                        lastFound = null;
                    }
                    
                    if (cancelBubble) { stopPropagation(e); }
              });
              
              root.addEventListener('mousedown',
                 function(e) {
                    var cancelBubble = false,
                        args;
                    pos.x = e.clientX - boundRect.left;
                    pos.y = e.clientY - boundRect.top;
                    webglGraphics.getGraphCoordinates(pos);
                    
                    args =[spatialIndex.getNodeAt(pos.x, pos.y), e];
                    if (args[0]) {
                        cancelBubble = invoke(mouseDownCallback, args);
                        // we clicked on a node. Following drag should be handled on document events:
                        documentEvents.on('mousemove', handleMouseMove);
                        documentEvents.on('mouseup', handleMouseUp);
                        
                        prevSelectStart = document.onselectstart;
                        prevDragStart = document.ondragstart;
                        
                        document.onselectstart = handleDisabledEvent;
                        
                        lastFound = args[0];
                    } else {
                         lastFound = null;
                    }
                    if (cancelBubble) { stopPropagation(e); }
              });
              
              root.addEventListener('mouseup',
                  function(e) {
                        var clickTime = +new Date(),
                            args;
                            
                        pos.x = e.clientX - boundRect.left;
                        pos.y = e.clientY - boundRect.top;
                        webglGraphics.getGraphCoordinates(pos);
                        
                        args =[spatialIndex.getNodeAt(pos.x, pos.y), e];
                        if (args[0]) {
                            document.onselectstart = prevSelectStart;
    
                            if (clickTime - lastClickTime < 400 && args[0] === lastFound) {
                                cancelBubble = invoke(dblClickCallback, args);
                            } else {
                                cancelBubble = invoke(clickCallback, args);
                            }
                            lastClickTime = clickTime;
                            
                            if (invoke(mouseUpCallback, args)) {
                                stopPropagation(e);
                            }
                        }
                  });
        };
    
    // webgl may not be initialized at this point. Pass callback
    // to start listen after graphics root is ready.
    webglGraphics.getGraphicsRoot(startListen);
    
    webglGraphics.webglInputEvents = {
        mouseEnter : function(callback) {
            if (typeof callback === 'function') {
                mouseEnterCallback.push(callback);
            }
            return this;
        },
        mouseLeave : function(callback) {
            if (typeof callback === 'function') {
                mouseLeaveCallback.push(callback);
            }
            return this;
        },
        mouseDown : function(callback) {
            if (typeof callback === 'function') {
                mouseDownCallback.push(callback);
            }
            return this;
        },
        mouseUp : function(callback) {
            if (typeof callback === 'function') {
                mouseUpCallback.push(callback);
            }
            return this;
        },
        mouseMove : function(callback) {
            if (typeof callback === 'function') {
                mouseMoveCallback.push(callback);
            }
            return this;
        },
        click : function(callback) {
            if (typeof callback === 'function') {
                clickCallback.push(callback);
            }
            return this;
        },
        dblClick : function(callback){
            if (typeof callback === 'function') {
                dblClickCallback.push(callback);
            }
            return this;
        },
        mouseCapture : function(node) {
            mouseCapturedNode = node;
        },
        releaseMouseCapture : function(node) {
            mouseCapturedNode = null;
        }
    };
    
    return webglGraphics.webglInputEvents;
};
