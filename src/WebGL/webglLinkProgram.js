/**
 * @fileOverview Defines a naive form of links for webglGraphics class. 
 * This form allows to change color of links. 
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva Float32Array*/

/**
 * Defines UI for links in webgl renderer. 
 */
Viva.Graph.View.webglLinkProgram = function() {
     var ATTRIBUTES_PER_PRIMITIVE = 6, // primitive is Line with two points. Each has x,y and color = 3 * 2 attributes.
        linksFS = [
        'precision mediump float;',
        'varying vec4 color;',
        'void main(void) {',
        '   gl_FragColor = color;',
        '}'].join('\n'),
        
        linksVS = [
        'attribute vec2 a_vertexPos;',
        'attribute float a_color;', 
        
        'uniform vec2 u_screenSize;',
        'uniform mat4 u_transform;',
        
        'varying vec4 color;',
        
        'void main(void) {',
        '   gl_Position = u_transform * vec4(a_vertexPos/u_screenSize, 0.0, 1.0);',
        '   color = vec4(0.0, 0.0, 0.0, 255.0);',
        '   float c = a_color;',
        '   color.b = mod(c, 256.0); c = floor(c/256.0);',
        '   color.g = mod(c, 256.0); c = floor(c/256.0);',
        '   color.r = mod(c, 256.0); c = floor(c/256.0); color /= 255.0;',
        '}'].join('\n');
        
        var program,
            gl,
            buffer,
            utils,
            locations,
            linksCount = 0,
            frontLinkId, // used to track z-index of links.
            links = new Float32Array(64),
            width, height, transform, sizeDirty;
        
        return {
            load : function(glContext) {
                gl = glContext;
                utils = Viva.Graph.webgl(glContext);
                
                program = utils.createProgram(linksVS, linksFS);
                gl.useProgram(program);
                locations = utils.getLocations(program, ['a_vertexPos', 'a_color', 'u_screenSize', 'u_transform']);
                
                gl.enableVertexAttribArray(locations.vertexPos);
                gl.enableVertexAttribArray(locations.color);
                
                buffer = gl.createBuffer();
            },
            
            position: function(linkUi, fromPos, toPos) {
                var linkIdx = linkUi.id,
                    offset = linkIdx * ATTRIBUTES_PER_PRIMITIVE; 
                links[offset + 0] = fromPos.x;
                links[offset + 1] = fromPos.y;
                links[offset + 2] = linkUi.color;
                
                links[offset + 3] = toPos.x;
                links[offset + 4] = toPos.y;
                links[offset + 5] = linkUi.color;
            },
            
            createLink : function(ui) {
                 links = utils.extendArray(links, linksCount, ATTRIBUTES_PER_PRIMITIVE);
                 linksCount += 1;
                 frontLinkId = ui.id;
            },
            
            removeLink : function(ui) {
               if (linksCount > 0) { linksCount -= 1;}
               // swap removed link with the last link. This will give us O(1) performance for links removal:
               if (ui.id < linksCount && linksCount > 0) {
                   utils.copyArrayPart(links, ui.id * ATTRIBUTES_PER_PRIMITIVE, linksCount*ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE); 
               }
            },
            
            updateTransform : function(newTransform) {
                sizeDirty = true;
                transform = newTransform;
            },
            
            updateSize : function(w, h) {
                width = w;
                height = h;
                sizeDirty = true;
            },
            
            render : function() {
               gl.useProgram(program);
               gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
               gl.bufferData(gl.ARRAY_BUFFER, links, gl.DYNAMIC_DRAW);

                if (sizeDirty) {
                    sizeDirty = false;
                    gl.uniformMatrix4fv(locations.transform, false, transform);
                    gl.uniform2f(locations.screenSize, width, height);
                }

               gl.vertexAttribPointer(locations.vertexPos, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
               gl.vertexAttribPointer(locations.color, 1, gl.FLOAT, false, 3 * 4, 2 * 4);

               gl.drawArrays(gl.LINES, 0, linksCount * 2);
               
               frontLinkId = linksCount - 1;
            },
            
            bringToFront : function(link) {
                if (frontLinkId > link.id) {
                    utils.swapArrayPart(links, link.id * ATTRIBUTES_PER_PRIMITIVE, frontLinkId * ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE);
                }
                if (frontLinkId > 0) {
                    frontLinkId -= 1;
                }
            },
            
            getFrontLinkId : function() {
                return frontLinkId;
            }
        };
};
