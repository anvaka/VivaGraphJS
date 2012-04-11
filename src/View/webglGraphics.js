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
        linksBuffer,
        nodesBuffer,
        nodesCount = 0,
        linksCount = 0,
        transform,
        nodes = new Float32Array(100000),
        links = new Float32Array(500000),
        
        linksFS = [
        'precision mediump float;',
        'void main(void) {',
        '   gl_FragColor = vec4(0.6, 0.6, 0.6, 1.0);',
        '}'].join('\n'),
        linksVS = [
        'attribute vec2 aVertexPos;',
        
        'uniform vec2 uScreenSize;',
        'uniform mat4 uTransform;',
        
        'void main(void) {',
        '   gl_Position = uTransform * vec4(aVertexPos/uScreenSize, 0.0, 1.0);',
        '}'].join('\n'),
        
        nodesFS = [
        'precision mediump float;',
        'void main(void) {',
        '   gl_FragColor = vec4(0.0, 0.62, 0.91, 1.0);',
        '}'].join('\n'),
        nodesVS = [
        'attribute vec2 aVertexPos;',
        'uniform vec2 uScreenSize;',
        'uniform mat4 uTransform;',
        
        'void main(void) {',
        '   gl_Position = uTransform * vec4(aVertexPos/uScreenSize, 0, 1);',
        '   gl_PointSize = 10.0 * uTransform[0][0];',
        '}'].join('\n'),
 
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
        
        nodeBuilder = function(node){
            if (nodesCount + 1 > nodes.length) {
                // todo: rebuild array.
                throw 'TODO: Rebuild array!';
            }
            return nodesCount++;
        },
        
        nodePositionCallback = function(nodeUI, pos){
            nodes[nodeUI * 2] = pos.x;
            nodes[nodeUI * 2 + 1] = pos.y;
        },

        linkBuilder = function(link){
            if (linksCount + 1 > links.length) {
                throw 'TODO: Rebuild array!';
            }
            return linksCount++;
        },
        
        linkPositionCallback = function(linkUI, fromPos, toPos){
            links[linkUI * 4 + 0] = fromPos.x;
            links[linkUI * 4 + 1] = fromPos.y;
            links[linkUI * 4 + 2] = toPos.x;
            links[linkUI * 4 + 3] = toPos.y;
        },
        
        fireRescaled = function(graphics){
            // TODO: maybe we shall copy changes? 
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
        endRender : function () {
           gl.useProgram(linksProgram);
           gl.bindBuffer(gl.ARRAY_BUFFER, linksBuffer);
           gl.bufferData(gl.ARRAY_BUFFER, links, gl.STATIC_DRAW);
           
           gl.enableVertexAttribArray(linksProgram.postionAttrib);
           gl.vertexAttribPointer(linksProgram.postionAttrib, 2, gl.FLOAT, false, 0, 0);
           gl.drawArrays(gl.LINES, 0, linksCount*2);
           
           gl.useProgram(nodesProgram);
           gl.bindBuffer(gl.ARRAY_BUFFER, nodesBuffer);
           gl.bufferData(gl.ARRAY_BUFFER, nodes, gl.STATIC_DRAW);
           
           gl.enableVertexAttribArray(nodesProgram.postionAttrib);
           gl.vertexAttribPointer(nodesProgram.postionAttrib, 2, gl.FLOAT, false, 0, 0);
           gl.drawArrays(gl.POINTS, 0, nodesCount);
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
           
           linksProgram = createProgram(createShader(linksVS, gl.VERTEX_SHADER), createShader(linksFS, gl.FRAGMENT_SHADER));
           gl.useProgram(linksProgram);
           linksBuffer = gl.createBuffer();
           linksProgram.postionAttrib = gl.getAttribLocation(linksProgram, 'aVertexPos');
           linksProgram.screenSize = gl.getUniformLocation(linksProgram, 'uScreenSize');
           linksProgram.transform = gl.getUniformLocation(linksProgram, 'uTransform');
           
           gl.uniform2f(linksProgram.screenSize, width, height);
           gl.enableVertexAttribArray(linksProgram.postionAttrib);
           
           gl.bindBuffer(gl.ARRAY_BUFFER, linksBuffer);
           gl.bufferData(gl.ARRAY_BUFFER, links, gl.STATIC_DRAW);
           
           nodesProgram = createProgram(createShader(nodesVS, gl.VERTEX_SHADER), createShader(nodesFS, gl.FRAGMENT_SHADER));
           gl.useProgram(nodesProgram);
           nodesProgram.postionAttrib = gl.getAttribLocation(nodesProgram, 'aVertexPos');
           nodesProgram.screenSize = gl.getUniformLocation(nodesProgram, 'uScreenSize');
           
           nodesProgram.transform = gl.getUniformLocation(nodesProgram, 'uTransform');
           gl.uniform2f(nodesProgram.screenSize, width, height);
           
           updateTransformUniform();

           gl.enableVertexAttribArray(nodesProgram.postionAttrib);
           
           nodesBuffer = gl.createBuffer();
           gl.bindBuffer(gl.ARRAY_BUFFER, nodesBuffer);
           gl.bufferData(gl.ARRAY_BUFFER, nodes, gl.STATIC_DRAW);
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
       releaseLink : function(linkUI) {
           if (linkUI < linksCount && linksCount > 0){
               linksCount -= 1;
               if (linksCount === 0 || linksCount === linkUI) {
                   return; // no more links or removed link is the last one.
               }
               
               // swap removed link with the last link. This will give us O(1)
               // performance for links removal:
               links[linkUI * 4 + 0] = links[linksCount * 4 + 0];
               links[linkUI * 4 + 1] = links[linksCount * 4 + 1];
               links[linkUI * 4 + 2] = links[linksCount * 4 + 2];
               links[linkUI * 4 + 3] = links[linksCount * 4 + 3];
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
           // TODO: Check this stuff. It doesn't seem it works for dynamic.html test, leavin artifact when cleared.
           if (nodeUI < nodesCount && nodesCount > 0) {
               nodesCount -= 1;
               if (nodesCount === 0 || nodesCount === nodeUI) {
                   return ; // no more nodes or removed node is the last in the list.
               }
               
               nodes[nodeUI * 2 + 0] = nodes[nodesCount * 2 + 0];
               nodes[nodeUI * 2 + 1] = nodes[nodesCount * 2 + 1];
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
       }
    };
    
    // Let graphics fire events before we return it to the caller.
    Viva.Graph.Utils.events(graphics).extend();
    
    return graphics;
};
