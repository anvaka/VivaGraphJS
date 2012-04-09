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
    var svgContainer,
        graphicsRoot,
        gl,
        linksProgram,
        nodesProgram,
        offsetX,
        offsetY, width, height,
        linksBuffer,
        nodesBuffer,
        actualScale = 1,
        nodesCount = 0,
        linksCount = 0,
        nodes = new Float32Array(100000),
        links = new Float32Array(100000),
        
        linksFS = [
        'precision mediump float;',
        'void main(void) {',
        '   gl_FragColor = vec4(0.6, 0.6, 0.6, 1.0);',
        '}'].join('\n'),
        linksVS = [
        'attribute vec2 pos;',
        'void main(void) {',
        '   gl_Position = vec4(pos*0.2, 0.0, 1.0);',
        '}'].join('\n'),
        
        nodesFS = [
        'precision mediump float;',
        'void main(void) {',
        '   gl_FragColor = vec4(0.0, 0.62, 0.91, 1.0);',
        '}'].join('\n'),
        nodesVS = [
        'attribute vec2 pos;',
        'void main(void) {',
        '   gl_Position = vec4(pos*0.2, 0, 1);',
        '   gl_PointSize = 10.0*0.2;',
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
        
        nodeBuilder = function(node){
            if (nodesCount + 1 > nodes.length) {
                // todo: rebuild array.
                throw 'TODO: Rebuild array!';
            }
            return nodesCount++;
        },
        
        nodePositionCallback = function(nodeUI, pos){
            nodes[nodeUI * 2] = pos.x / width;
            nodes[nodeUI * 2 + 1] = pos.y  / height;
        },

        linkBuilder = function(link){
            if (linksCount + 1 > links.length) {
                throw 'TODO: Rebuild array!';
            }
            return linksCount++;
        },
        
        linkPositionCallback = function(linkUI, fromPos, toPos){
            links[linkUI * 4 + 0] = fromPos.x / width;
            links[linkUI * 4 + 1] = fromPos.y / height;
            links[linkUI * 4 + 2] = toPos.x / width;
            links[linkUI * 4 + 3] = toPos.y / height;
        },
        
        fireRescaled = function(graphics){
            // TODO: maybe we shall copy changes? 
            graphics.fire('rescaled');
        },
        
        updateTransform = function() {
            // if (svgContainer) {
                // var transform = 'matrix(' + actualScale + ", 0, 0," + actualScale + "," + offsetX + "," + offsetY + ")";
                // svgContainer.attr('transform', transform);
            // }
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
           
           
           //gl.drawArrays(gl.POINTS, 0, 12);​
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
            // var p = svgRoot.createSVGPoint(),
                // t = svgContainer.getCTM(),
                // origin = svgRoot.createSVGPoint().matrixTransform(t.inverse());
//                 
            // p.x = dx;
            // p.y = dy;
//             
            // p = p.matrixTransform(t.inverse());
            // p.x = (p.x - origin.x) * t.a;
            // p.y = (p.y - origin.y) * t.d;
//             
            // t.e += p.x;
            // t.f += p.y;
//             
            // var transform = 'matrix(' + t.a + ", 0, 0," + t.d + "," + t.e + "," + t.f + ")";
            // svgContainer.attr('transform', transform);
        },
        
        scale : function(scaleFactor, scrollPoint) {
            // scaleX = x;
            // scaleY = y;
//             
            // var p = svgRoot.createSVGPoint();
            // p.x = scrollPoint.x;
            // p.y = scrollPoint.y;
//             
            // p = p.matrixTransform(svgContainer.getCTM().inverse()); // translate to svg coordinates
//             
            // // Compute new scale matrix in current mouse position
            // var k = svgRoot.createSVGMatrix().translate(p.x, p.y).scale(scaleFactor).translate(-p.x, -p.y),
                // t = svgContainer.getCTM().multiply(k);
// 
            // actualScale = t.a;
            // offsetX = t.e;
            // offsetY = t.f;
            // var transform = 'matrix(' + t.a + ", 0, 0," + t.d + "," + t.e + "," + t.f + ")";
            // svgContainer.attr('transform', transform);
//             
            // fireRescaled(this);
            return actualScale;
        },
        
        resetScale : function(){
            // actualScale = 1;
            // var transform = 'matrix(1, 0, 0, 1, 0, 0)';
            // svgContainer.attr('transform', transform);
            // fireRescaled(this);
            return this;
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output 
        * provider prepare to render.
        */
       init : function(container) {
           graphicsRoot = document.createElement("canvas");
           width = graphicsRoot.width = container.offsetWidth;
           height = graphicsRoot.height = container.offsetHeight;
           
           container.appendChild(graphicsRoot);
           gl = graphicsRoot.getContext('experimental-webgl');
           
           linksProgram = createProgram(createShader(linksVS, gl.VERTEX_SHADER), createShader(linksFS, gl.FRAGMENT_SHADER));
           gl.useProgram(linksProgram);
           linksBuffer = gl.createBuffer();
           linksProgram.postionAttrib = gl.getAttribLocation(linksProgram, 'pos');
           gl.enableVertexAttribArray(linksProgram.postionAttrib);
           
           gl.bindBuffer(gl.ARRAY_BUFFER, linksBuffer);
           gl.bufferData(gl.ARRAY_BUFFER, links, gl.STATIC_DRAW);
           
           nodesProgram = createProgram(createShader(nodesVS, gl.VERTEX_SHADER), createShader(nodesFS, gl.FRAGMENT_SHADER));
           gl.useProgram(nodesProgram);
           nodesProgram.postionAttrib = gl.getAttribLocation(nodesProgram, 'pos');
           gl.enableVertexAttribArray(nodesProgram.postionAttrib);
           
           nodesBuffer = gl.createBuffer();
           gl.bindBuffer(gl.ARRAY_BUFFER, nodesBuffer);
           gl.bufferData(gl.ARRAY_BUFFER, nodes, gl.STATIC_DRAW);

           // TODO: throw error if webgl is not supported.
           updateTransform();
       },
       
       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider prepare to render given link of the graph
        * 
        * @param linkUI visual representation of the link created by link() execution.
        */
       initLink : function(linkUI) {
           // if(svgContainer.childElementCount > 0) {
               // svgContainer.insertBefore(linkUI, svgContainer.firstChild);
           // } else {
               // svgContainer.appendChild(linkUI);
           // }
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
           //svgContainer.appendChild(nodeUI);
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
