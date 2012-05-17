/**
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
        'attribute vec2 aCustomAttributes;', // Pack clor and size into vector. First elemnt is color, second - size.
        'uniform vec2 uScreenSize;',
        'uniform mat4 uTransform;',
        'varying vec4 color;',
        
        'void main(void) {',
        '   gl_Position = uTransform * vec4(aVertexPos/uScreenSize, 0, 1);',
        '   gl_PointSize = aCustomAttributes[1] * uTransform[0][0];',
        
        '   color = vec4(0.0, 0.0, 0.0, 1);',
        '   float c = aCustomAttributes[0]/256.0;',
        '   color[2] = mod(c,256.0); c /= 256.0;',
        '   color[1] = mod(c,256.0); c /= 256.0;',
        '   color[0] = mod(c,256.0);',
        '   color /= 256.0;',
        
        '}'].join('\n'),
        
        parseColor = function(color) {
            var parsedColor = 0x00A3EAFF;
            
            if(color) {
                if(color.length === 9) { // #rrggbbaa
                    parsedColor = parseInt(color.substring(1, 9), 16);
                } else if (color.length === 7) {// #rrggbb
                    parsedColor = parseInt(color.substring(1, 7) + 'ff', 16);
                } else {
                    debugger;
                    throw 'Color expected in hex format with preceding "#". E.g. #00ff00. Got value: ' + color;
                }
            } 
            
            return parsedColor;
        };
        
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
            
            square : function(size, color) {
                return {
                    size : typeof size === 'number' ? size : 10,
                    color : parseColor(color)
                };
            }
        };
};

/**
 * Defines UI for links in webgl renderer. 
 */
Viva.Graph.View.webglLinkShader = function() {
     var ATTRIBUTES_PER_PRIMITIVE = 4, // primitive is Line, from/to positions == 4 attributes
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
        '}'].join('\n');
        
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
            initCustomAttributes : function(gl, program) { },
            
            /**
             * Called by webglGraphics to let this shader render its custom attributes.
             */
            renderCustomAttributes : function(gl, program) { },
            
            position: function(links, linkIdx, fromPos, toPos) {
                var offset = linkIdx * ATTRIBUTES_PER_PRIMITIVE; 
                links[offset + 0] = fromPos.x;
                links[offset + 1] = fromPos.y;
                links[offset + 2] = toPos.x;
                links[offset + 3] = toPos.y;
            }
        };
};