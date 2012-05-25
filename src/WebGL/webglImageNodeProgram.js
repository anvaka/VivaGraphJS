/**
 * @fileOverview Defines an image-nodes for webglGraphics class. 
 * This form allows to change color of node. Shape of nodes is sqare. 
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva Float32Array*/
Viva.Graph.View.webglAtlas = function(tileSize) {
    var canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        tilesPerRow = 32, // TODO: Get based on max texture size
        lastLoadedIdx = 1,
        loadedImages = {},
        dirtyTimeoutId,
        skipedDirty = 0,
    
    findNearestPowerOf2 = function (n) {
        // http://en.wikipedia.org/wiki/Power_of_two#Algorithm_to_round_up_to_power_of_two
        n = n << 0; // make it integer
        n = n - 1;
        n = n | (n >> 1); n = n | (n >> 2); n = n | (n >> 4); n = n | (n >> 8); n = n | (n >> 16);
        return n + 1;
    },
    
    drawAt = function(tileNumber, img, callback) {
        var row = (tileNumber / tilesPerRow) << 0,
            col = (tileNumber % tilesPerRow),
            coordinates = {
                offset : tileNumber
            };
        
        ctx.drawImage(img, col * tileSize, row * tileSize, tileSize, tileSize);
        loadedImages[img.src] = coordinates;
        
        callback(coordinates);
    };
    
    tileSize = typeof tileSize === 'number' ? findNearestPowerOf2(tileSize) : 32;
    
    canvas.width = tilesPerRow * tileSize;
    canvas.height = tilesPerRow * tileSize;

    return {
        isDirty : false,
        image : canvas,
        
        getCoordinates : function(imgUrl) {
            return loadedImages[imgUrl];
        },
        
        load : function(imgUrl, callback) {
            if (loadedImages.hasOwnProperty(imgUrl)) {
                callback(loadedImages[imgUrl]);
            } else {
                var img = new Image(),
                    imgId = lastLoadedIdx,
                    that = this;
                    
                lastLoadedIdx += 1;
                img.crossOrigin = "anonymous";
                img.onload = function () {
                    // delay this call, since it results in texture reload
                    if (dirtyTimeoutId) {
                        clearTimeout(dirtyTimeoutId);
                        skipedDirty += 1;
                        dirtyTimeoutId = null;
                    }
                    if (skipedDirty > 10) {
                        that.isDirty = true;
                        skipedDirty = 0;
                    } else {
                        dirtyTimeoutId = setTimeout(function() { that.isDirty = true; }, 400);
                    }
                    
                    drawAt(imgId, img, callback);
                };
                
                img.src = imgUrl;
            }
        }
    };
};

/**
 * Defines simple UI for nodes in webgl renderer. Each node is rendered as an image.
 */
Viva.Graph.View.webglImageNodeProgram = function() {
   var ATTRIBUTES_PER_PRIMITIVE = 4, // Primitive is point, x, y - its coordinates + color and size == 4 attributes per node. 
         nodesFS = [
        'precision mediump float;',
        'varying vec4 color;',
        'varying vec3 vTextureCoord;',
        'uniform sampler2D u_sampler;',
        
        'void main(void) {',
        '   gl_FragColor = texture2D(u_sampler, ',
        '                            vec2(vTextureCoord.x * gl_PointCoord.x + vTextureCoord.y, vTextureCoord.x*(1.-gl_PointCoord.y) + vTextureCoord.z));', 
        '}'].join('\n'),
        nodesVS = [
        'attribute vec2 a_vertexPos;',

        'attribute vec2 a_customAttributes;', 
        'uniform vec2 u_screenSize;',
        'uniform mat4 u_transform;',
        'varying vec3 vTextureCoord;',
        
        'void main(void) {',
        '   gl_Position = u_transform * vec4(a_vertexPos/u_screenSize, 0, 1);',
        '   gl_PointSize = a_customAttributes[1] * u_transform[0][0];',
      
      'float dim = 32.0;',
      'float idx = a_customAttributes[0];',
      
      'float col = floor(idx/dim);',
      'float row = mod(idx, dim);',
      'vTextureCoord = vec3(1.0/dim, row/dim, col/dim);',
        '}'].join('\n'),
        
        atlas = new Viva.Graph.View.webglAtlas(),
        customPrimitiveType;
        
    var program,
        gl,
        buffer,
        utils,
        locations,
        nodesCount = 0,
        texture,
        nodes = new Float32Array(64),
        width, height, transform, sizeDirty,
        
        ensureAtlasTextureUpdated = function(){
            if (atlas.isDirty) {
                atlas.isDirty = false;
                    
                if(texture) {
                    gl.deleteTexture(texture);
                }
                
                texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);  
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.image);  
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);  
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);  
        
                gl.generateMipmap(gl.TEXTURE_2D);  
                gl.uniform1i(locations.sampler, 0);
            }
        };
        
        return {
            load : function(glContext) {
                gl = glContext;
                utils = Viva.Graph.webgl(glContext);
                
                program = utils.createProgram(nodesVS, nodesFS);
                gl.useProgram(program);
                locations = utils.getLocations(program, ['a_vertexPos', 'a_customAttributes', 'u_screenSize', 'u_transform', 'u_sampler']);
                
                gl.enableVertexAttribArray(locations.vertexPos);
                gl.enableVertexAttribArray(locations.customAttributes);
                
                buffer = gl.createBuffer();
            },
            
            /**
             * Updates position of current node in the buffer of nodes. 
             * 
             * @param idx - index of current node.
             * @param pos - new position of the node.
             */
            position : function(nodeUI, pos) {
                var idx = nodeUI.id;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE] = pos.x;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 1] = pos.y;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 2] = nodeUI._offset;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 3] = nodeUI.size;
            },
            
            createNode : function(ui) {
                nodes = utils.extendArray(nodes, nodesCount, ATTRIBUTES_PER_PRIMITIVE);
                nodesCount += 1;

                var coordinates = atlas.getCoordinates(ui.src);
                if (coordinates) {
                    ui._offset = coordinates.offset;
                    // TODO: Support for mutliple textures.
                } else {
                    ui._offset = 0;
                    // Image is not yet loaded into the atlas. Reload it:
                    atlas.load(ui.src, function(coordinates){
                        ui._offset = coordinates.offset;
                    });
                }
            },
            
            removeNode : function(node) {
                if (nodesCount > 0) { nodesCount -=1; }
                
                if (node.id < nodesCount && nodesCount > 0) {
                    utils.copyArrayPart(nodes, node.id*ATTRIBUTES_PER_PRIMITIVE, nodesCount*ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE);
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
                gl.bufferData(gl.ARRAY_BUFFER, nodes, gl.DYNAMIC_DRAW);

                if (sizeDirty) {
                    sizeDirty = false;
                    gl.uniformMatrix4fv(locations.transform, false, transform);
                    gl.uniform2f(locations.screenSize, width, height);
                }

                gl.vertexAttribPointer(locations.vertexPos, 2, gl.FLOAT, false, ATTRIBUTES_PER_PRIMITIVE * Float32Array.BYTES_PER_ELEMENT, 0);
                gl.vertexAttribPointer(locations.customAttributes, 2, gl.FLOAT, false, ATTRIBUTES_PER_PRIMITIVE * 4, 2 * 4);

                ensureAtlasTextureUpdated();

                gl.drawArrays(gl.POINTS, 0, nodesCount);
            }
        };
};