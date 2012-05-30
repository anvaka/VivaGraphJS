/*global Viva */

/**
 * Monitors mouse input in webgl graphics and notifies subscribers. 
 * 
 * @param {Object} webglGraphics
 * @param {Object} graph
 */
Viva.Graph.webglInputEvents = function(webglGraphics, graph){
    var preciseCheck = function(node, x, y) {
        if (node.ui && node.ui.size) {
            var pos = node.position,
                half = node.ui.size;
            return pos.x - half < x && x < pos.x + half &&
                   pos.y - half < y && y < pos.y + half;  
        } else { 
            return true; 
        }
    },
    
    spatialIndex = Viva.Graph.spatialIndex(graph, preciseCheck),
    mouseEnterCallback, 
    mouseLeaveCallback,
    clickCallback,
    dblClickCallback,
    
    startListen = function(root) {
        var pos = {x : 0, y : 0},
            lastFound = null;
         
         root.addEventListener('mousemove',
            function(e){
                 pos.x = e.clientX;
                 pos.y = e.clientY;
                 webglGraphics.getGraphCoordinates(pos);
                 var node = spatialIndex.getNodeAt(pos.x, pos.y);
                    
                 if (node && lastFound !== node) {
                     lastFound = node;
                     if (typeof mouseEnterCallback === 'function') {
                         mouseEnterCallback(lastFound);
                     }
                 } else if (node === null && lastFound !== node){
                     if (typeof mouseLeaveCallback === 'function') {
                         mouseLeaveCallback(lastFound);
                     }
                     
                     lastFound = null;
                 }
          });
          
          var lastClickTime = +new Date();
          
          root.addEventListener('mousedown',
            function(e) {
                var clickTime = +new Date();
                 pos.x = e.clientX;
                 pos.y = e.clientY;
                 webglGraphics.getGraphCoordinates(pos);
                 var node = spatialIndex.getNodeAt(pos.x, pos.y);
                 if (node) {
                     if (clickTime - lastClickTime < 400 && typeof dblClickCallback === 'function' && node === lastFound) {
                         dblClickCallback(node, e);
                     } else if (typeof clickCallback === 'function'){
                        clickCallback(node, e);
                     }
                     lastFound = node;
                 } else {
                     lastFound = null;
                 }
                 lastClickTime = clickTime;
          });
    };
    
    // webgl may not be initialized at this point. Pass callback
    // to start listen after graphics root is ready.
    webglGraphics.getGraphicsRoot(startListen);
    
    return {
        mouseEnter : function(callback){
            mouseEnterCallback = callback;
            return this;
        },
        mouseLeave : function(callback) {
            mouseLeaveCallback = callback;
            return this;
        },
        click : function(callback){
            clickCallback = callback;
            return this;
        },
        dblClick : function(callback){
            dblClickCallback = callback;
            return this;
        }
    };
};
