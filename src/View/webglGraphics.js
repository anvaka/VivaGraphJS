/**
 * @fileOverview Defines a graph renderer that uses WebGL based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */
/* global Viva Float32Array */
Viva.Graph.View = Viva.Graph.View || {};

/**
 * Performs webgl-based graph rendering. This module does not perform
 * layout, but only visualizes nodes and edeges of the graph.
 * 
 * @param options - to customize graphics  behavior. Currently supported parameter
 *  enableBlending - true by default, allows to use transparency in node/links colors.
 */

Viva.Graph.View.webglGraphics = function(options) {
    options = options || {};
    options.enableBlending = typeof options.enableBlending !== 'boolean' ? true : options.enableBlending;  
    
    var container,
        graphicsRoot,
        gl,
        width, height,
        nodesCount = 0,
        linksCount = 0,
        transform,
        userPlaceNodeCallback, 
        userPlaceLinkCallback,
        nodes = [], 
        links = [],
        initCallback,
        
        linkProgram = Viva.Graph.View.webglLinkProgram(),
        nodeProgram = Viva.Graph.View.webglNodeProgram(), 
        
        nodeUIBuilder = function(node){
            return Viva.Graph.View.webglSquare(); // Just make a square, using provided gl context (a nodeProgram);
        },
        
        linkUIBuilder = function(link) {
            return Viva.Graph.View.webglLine(0xb3b3b3ff);
        },
 
        updateTransformUniform = function() {
            linkProgram.updateTransform(transform);
            nodeProgram.updateTransform(transform);
        },
        
        resetScaleInternal = function() {
            transform = [1, 0, 0, 0,
                        0, 1, 0, 0, 
                        0, 0, 1, 0,
                        0, 0, 0, 1];
        },
        
        updateSize = function() {
            if (container && graphicsRoot) {
                width = graphicsRoot.width = Math.max(container.offsetWidth, 1);
                height = graphicsRoot.height = Math.max(container.offsetHeight, 1);
                if (gl) { gl.viewport(0, 0, width, height);}
                if (linkProgram) { linkProgram.updateSize(width/2, height/2); }
                if (nodeProgram) { nodeProgram.updateSize(width/2, height/2); }
            }
        },
        
        nodeBuilderInternal = function(node){
            var nodeId = nodesCount++,
                ui = nodeUIBuilder(node);
            ui.id = nodeId;
            
            nodeProgram.createNode(ui);
            
            nodes[nodeId] = node;
            return ui;
        },
        
        linkBuilderInternal = function(link){
            var linkId = linksCount++,
                ui = linkUIBuilder(link);
            ui.id = linkId;

            linkProgram.createLink(ui);
            
            links[linkId] = link;
            return ui;
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
         * Custom input manager listens to mouse events to process nodes drag-n-drop inside WebGL canvas    
         */
        inputManager : Viva.Input.webglInputManager,
        
        /**
         * Called every before renderer starts rendering.
         */
        beginRender : function() {},
        
        /**
         * Called every time when renderer finishes one step of rendering.
         */
        endRender : function () {
           if (linksCount > 0) {
               linkProgram.render();
           }
           if (nodesCount > 0){
               nodeProgram.render();
           }
        },
        
        bringLinkToFront : function(linkUI) {
            var frontLinkId = linkProgram.getFrontLinkId(),
                srcLinkId, temp;

            linkProgram.bringToFront(linkUI);
            
            if (frontLinkId > linkUI.id) {
               srcLinkId = linkUI.id;

               temp = links[frontLinkId];
               links[frontLinkId] = links[srcLinkId];
               links[frontLinkId].ui.id = frontLinkId; 
               links[srcLinkId] = temp; 
               links[srcLinkId].ui.id = srcLinkId; 
            }
        },
        
        /**
         * Sets translate operation that should be applied to all nodes and links.
         */
        graphCenterChanged : function(x, y) {
            updateSize();
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
                // TODO: what is this?
                // gl.useProgram(linksProgram);
                // gl.uniform2f(linksProgram.screenSize, width, height);
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
           updateSize();
           resetScaleInternal();
           container.appendChild(graphicsRoot);
           
           gl = graphicsRoot.getContext('experimental-webgl');
           if (!gl) {
               var msg = "Could not initialize WebGL. Seems like the browser doesn't support it.";
               alert(msg);
               throw msg; 
           }
           if (options.enableBlending) {
               gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
               gl.enable(gl.BLEND);
           }
           
           linkProgram.load(gl);
           linkProgram.updateSize(width/2, height/2);
           
           nodeProgram.load(gl);
           nodeProgram.updateSize(width/2, height/2);
           
           updateTransformUniform();
           
           // Notify the world if someoen waited for update. TODO: should send an event
           if (typeof initCallback === 'function') {
               initCallback(graphicsRoot);
           }
       },
       
       /**
        * Checks whether webgl is supported by this browser. 
        */
       isSupported : function() {
           var c = document.createElement("canvas"),
               gl = c && c.getContext && c.getContext('experimental-webgl');
           return gl;
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

           linkProgram.removeLink(linkToRemove);
           
           var linkIdToRemove = linkToRemove.id;
           if (linkIdToRemove < linksCount){
               if (linksCount === 0 || linksCount === linkIdToRemove) {
                   return; // no more links or removed link is the last one.
               }

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

           nodeProgram.removeNode(nodeUI);
            
           if (nodeUI.id < nodesCount) {
               var nodeIdToRemove = nodeUI.id;
               if (nodesCount === 0 || nodesCount === nodeIdToRemove) {
                   return ; // no more nodes or removed node is the last in the list.
               }
               
               var lastNode = nodes[nodesCount],
                   replacedNode = nodes[nodeIdToRemove];
                    
               nodes[nodeIdToRemove] = lastNode;
               nodes[nodeIdToRemove].ui.id = nodeIdToRemove;
               
               // Since concrete shaders may cache properties in the ui element
               // we are letting them to make this swap (e.g. image node shader
               // uses this approach to update node's offset in the atlas) 
               nodeProgram.replaceProperties(replacedNode.ui, lastNode.ui);
           }
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider place given node UI to recommended position pos {x, y};
       */ 
       updateNodePosition : function(nodeUI, pos) {
           // WebGL coordinate system is different. Would be better
           // to have this transform in the shader code, but it would
           // require every shader to be updated..           
           pos.y = -pos.y;
           if(userPlaceNodeCallback) {
                userPlaceNodeCallback(nodeUI, pos); 
           }
           
           nodeProgram.position(nodeUI, pos);
       },
       
       /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider place given link of the graph. Pos objects are {x, y};
       */  
       updateLinkPosition : function(link, fromPos, toPos) {
           // WebGL coordinate system is different. Would be better
           // to have this transform in the shader code, but it would
           // require every shader to be updated..
           fromPos.y = -fromPos.y;
           toPos.y = -toPos.y;
           if(userPlaceLinkCallback) {
               userPlaceLinkCallback(link, fromPos, toPos); 
           }

           linkProgram.position(link, fromPos, toPos);
       },
       
       /**
        * Returns root element which hosts graphics. 
        */
       getGraphicsRoot : function(callbackWhenReady) {
           if (typeof callbackWhenReady === 'function') {
               if (graphicsRoot) {
                   callbackWhenReady(graphicsRoot);
               } else {
                   initCallback = callbackWhenReady;
               }
           }
           return graphicsRoot;
       },
       
       /** 
        * Updates default shader which renders nodes
        * 
        * @param newProgram to use for nodes. 
        */
       setNodeProgram : function(newProgram) {
           if (!gl && newProgram) {
               // Nothing created yet. Just set shader to the new one
               // and let initialization logic take care about the rest.
               nodeProgram = newProgram; 
           } else if (newProgram) {
               throw "Not implemented. Cannot swap shader on the fly... yet.";
               // TODO: unload old shader and reinit.
           }
       },
       
       /** 
        * Updates default shader which renders links
        * 
        * @param newProgram to use for links. 
        */
       setLinkProgram : function(newProgram) {
           if (!gl && newProgram) {
               // Nothing created yet. Just set shader to the new one
               // and let initialization logic take care about the rest.
               linkProgram = newProgram; 
           } else if (newProgram) {
               throw "Not implemented. Cannot swap shader on the fly... yet.";
               // TODO: unload old shader and reinit.
           }
       },
       getGraphCoordinates : function(graphicsRootPos) {
           // TODO: could be a problem when container has margins?
           // to save memory we modify incoming parameter:
           // point in clipspace coordinates:
            graphicsRootPos.x = 2 * graphicsRootPos.x/width - 1;
            graphicsRootPos.y = 1 - (2*graphicsRootPos.y) / height;
            // apply transform:
            graphicsRootPos.x = (graphicsRootPos.x - transform[12])/transform[0];
            graphicsRootPos.y = (graphicsRootPos.y - transform[13])/transform[5]; 
            // now transform to graph coordinates:
            graphicsRootPos.x *= width/2;
            graphicsRootPos.y *= -height/2;
            
            return graphicsRootPos;
       }
    };
    
    // Let graphics fire events before we return it to the caller.
    Viva.Graph.Utils.events(graphics).extend();
    
    return graphics;
};