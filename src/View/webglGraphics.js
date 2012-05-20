/**
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
            return Viva.Graph.View.webglSquare(); // Just make a square, using provided gl context (a nodeShader);
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
           if (!gl && newShader) {
               // Nothing created yet. Just set shader to the new one
               // and let initialization logic take care about rest.
               nodeShader = newShader; 
               return;
           } else if (newShader) {
               // Otherwise unload old shader and reinit.
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
};