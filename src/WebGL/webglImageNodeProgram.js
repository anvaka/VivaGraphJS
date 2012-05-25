/**
 * @fileOverview Defines an image-nodes for webglGraphics class. 
 * This form allows to change color of node. Shape of nodes is sqare. 
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva Float32Array*/
Viva.Graph.View.Texture = function(size) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.isDirty = false;
    
    this.canvas.width = this.canvas.height = size;
};


Viva.Graph.View.webglAtlas = function(tilesPerTexture) {
    var tilesPerRow = Math.sqrt(tilesPerTexture || 1024) << 0, 
        tileSize = tilesPerRow,
        lastLoadedIdx = 1,
        loadedImages = {},
        dirtyTimeoutId,
        skipedDirty = 0,
        textures = [],
    
    findNearestPowerOf2 = function (n) {
        // TODO: probably don't need this anymore
        // http://en.wikipedia.org/wiki/Power_of_two#Algorithm_to_round_up_to_power_of_two
        n = n << 0; // make it integer
        n = n - 1;
        n = n | (n >> 1); n = n | (n >> 2); n = n | (n >> 4); n = n | (n >> 8); n = n | (n >> 16);
        return n + 1;
    },
    isPowerOf2 = function(n) {
        return (n & (n - 1)) === 0;
    },
    createTexture = function(){
        var texture = new Viva.Graph.View.Texture(tilesPerRow * tileSize);
        textures.push(texture);
    },
    drawAt = function(tileNumber, img, callback) {
        var textureNumber = (tileNumber / tilesPerTexture) << 0,
            localTileNumber =  (tileNumber % tilesPerTexture),
            row = (localTileNumber / tilesPerRow) << 0,
            col = (localTileNumber % tilesPerRow),
            
            coordinates = {
                offset : tileNumber
            };
        
        if (textureNumber >= textures.length) {
            createTexture();
        }
        var currentTexture = textures[textureNumber];
            
        currentTexture.ctx.drawImage(img, col * tileSize, row * tileSize, tileSize, tileSize);
        loadedImages[img.src] = coordinates;
        currentTexture.isDirty = true;
        
        callback(coordinates);
    };
    
    if (!isPowerOf2(tilesPerTexture)) {
        throw 'Tiles per texture should be power of two.';
    }
    
    return {
        isDirty : false,
        
        clearDirty : function () {
            this.isDirty = false;
            for(var i = 0; i < textures.length; ++i) {
                textures[i].isDirty = false;
            }
        },
        
        getTextures : function() {
            return textures; // I trust you...
        },
        
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
   var ATTRIBUTES_PER_PRIMITIVE = 18,  
         nodesFS = [
        'precision mediump float;',
        'varying vec4 color;',
        'varying vec3 vTextureCoord;',
        'uniform sampler2D u_sampler0;',
        'uniform sampler2D u_sampler1;',
        'uniform sampler2D u_sampler2;',
        'uniform sampler2D u_sampler3;',
        
        'void main(void) {',
        '   if (vTextureCoord.z == 0.) {',
        '     gl_FragColor = texture2D(u_sampler0, vTextureCoord.xy);',
        '   } else if (vTextureCoord.z == 1.) {',
        '     gl_FragColor = texture2D(u_sampler1, vTextureCoord.xy);',
        '   } else if (vTextureCoord.z == 2.) {',
        '     gl_FragColor = texture2D(u_sampler2, vTextureCoord.xy);',
        '   } else if (vTextureCoord.z == 3.) {',
        '     gl_FragColor = texture2D(u_sampler3, vTextureCoord.xy);',
        '   } else { gl_FragColor = vec4(0, 1, 0, 1); }',
        '}'].join('\n'),
        nodesVS = [
        'attribute vec2 a_vertexPos;',

        'attribute float a_customAttributes;', 
        'uniform vec2 u_screenSize;',
        'uniform mat4 u_transform;',
        'uniform float u_tilesPerTexture;', 
        'varying vec3 vTextureCoord;',
        
        'void main(void) {',
        '   gl_Position = u_transform * vec4(a_vertexPos/u_screenSize, 0, 1);',
        'float corner = mod(a_customAttributes, 4.);',
        'float tileIndex = mod(floor(a_customAttributes / 4.), u_tilesPerTexture);',
        'float tilesPerRow = sqrt(u_tilesPerTexture);',
        'float tileSize = 1./tilesPerRow;',
        'float tileColumn = mod(tileIndex, tilesPerRow);',
        'float tileRow = floor(tileIndex/tilesPerRow);',
        
        'if(corner == 0.0) {',
        '  vTextureCoord.xy = vec2(0, 1);',
        '} else if(corner == 1.0) {',
        '  vTextureCoord.xy = vec2(1, 1);',
        '} else if(corner == 2.0) {',
        '  vTextureCoord.xy = vec2(0, 0);',
        '} else {',
        '  vTextureCoord.xy = vec2(1, 0);',
        '}',
        
        'vTextureCoord *= tileSize;',
        'vTextureCoord.x += tileColumn * tileSize;',
        'vTextureCoord.y += tileRow * tileSize;',
        'vTextureCoord.z = floor(floor(a_customAttributes / 4.)/u_tilesPerTexture);',
        '}'].join('\n'),
        
        tilesPerTexture = 1024, // TODO: Get based on max texture size
        atlas = new Viva.Graph.View.webglAtlas(tilesPerTexture),
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
        
        refreshTexture = function(texture, idx) {
            if(texture.nativeObject) {
                gl.deleteTexture(texture.nativeObject);
            }
            
            var nativeObject = gl.createTexture();
            gl.activeTexture(gl['TEXTURE' + idx]);
            gl.bindTexture(gl.TEXTURE_2D, nativeObject);  
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.canvas);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);  
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);  
        
            gl.generateMipmap(gl.TEXTURE_2D);  
            gl.uniform1i(locations['sampler' + idx], idx);
            
            texture.nativeObject = nativeObject;
        },
        
        ensureAtlasTextureUpdated = function(){
            if (atlas.isDirty) {
                var textures = atlas.getTextures();
                for(var i = 0; i < textures.length; ++i) {
                    if (textures[i].isDirty || !textures[i].nativeObject){
                        refreshTexture(textures[i], i);
                    }
                }
                          
                atlas.clearDirty();
            }
        };
        
        return {
            load : function(glContext) {
                gl = glContext;
                utils = Viva.Graph.webgl(glContext);
                
                program = utils.createProgram(nodesVS, nodesFS);
                gl.useProgram(program);
                locations = utils.getLocations(program, ['a_vertexPos', 'a_customAttributes', 'u_screenSize', 'u_transform', 'u_sampler0','u_sampler1','u_sampler2','u_sampler3', 'u_tilesPerTexture']);
                
                gl.uniform1f(locations.tilesPerTexture, tilesPerTexture);
                
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
                var idx = nodeUI.id * ATTRIBUTES_PER_PRIMITIVE;
                
                nodes[idx + 0] = pos.x - nodeUI.size; nodes[idx + 1] = pos.y - nodeUI.size; nodes[idx + 2] = nodeUI._offset * 4 + 0;
                nodes[idx + 3] = pos.x + nodeUI.size; nodes[idx + 4] = pos.y - nodeUI.size; nodes[idx + 5] = nodeUI._offset * 4 + 1;
                nodes[idx + 6] = pos.x - nodeUI.size; nodes[idx + 7] = pos.y + nodeUI.size; nodes[idx + 8] = nodeUI._offset * 4 + 2;

                nodes[idx + 9] = pos.x - nodeUI.size; nodes[idx + 10] = pos.y + nodeUI.size; nodes[idx + 11] = nodeUI._offset * 4 + 2;
                nodes[idx + 12] = pos.x + nodeUI.size; nodes[idx + 13] = pos.y - nodeUI.size; nodes[idx + 14] = nodeUI._offset * 4 + 1;
                nodes[idx + 15] = pos.x + nodeUI.size; nodes[idx + 16] = pos.y + nodeUI.size; nodes[idx + 17] = nodeUI._offset * 4 + 3;
            },
            
            createNode : function(ui) {
                nodes = utils.extendArray(nodes, nodesCount, ATTRIBUTES_PER_PRIMITIVE);
                nodesCount += 1;

                var coordinates = atlas.getCoordinates(ui.src);
                if (coordinates) {
                    ui._offset = coordinates.offset;
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

                gl.vertexAttribPointer(locations.vertexPos, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
                gl.vertexAttribPointer(locations.customAttributes, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * 4);

                ensureAtlasTextureUpdated();

                gl.drawArrays(gl.TRIANGLES, 0, nodesCount*6);
            }
        };
};