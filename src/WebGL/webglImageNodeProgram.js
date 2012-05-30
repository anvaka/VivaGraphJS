/**
 * @fileOverview Defines an image nodes for webglGraphics class. 
 * Shape of nodes is sqare. 
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva Float32Array*/

/**
 * Single texture in the webglAtlas.
 */
Viva.Graph.View.Texture = function(size) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.isDirty = false;
    this.canvas.width = this.canvas.height = size;
};

/**
 * My naive implementation of textures atlas. It allows clients to load
 * multimple images into atlas and get canvas representing all of them.
 * 
 * @param tilesPerTexture - indicates how many images can be loaded to one 
 *          texture of the atlas. If number of loaded images exceeds this 
 *          parameter a new canvas will be created.
 */
Viva.Graph.View.webglAtlas = function(tilesPerTexture) {
    var tilesPerRow = Math.sqrt(tilesPerTexture || 1024) << 0, 
        tileSize = tilesPerRow,
        lastLoadedIdx = 1,
        loadedImages = {},
        dirtyTimeoutId,
        skipedDirty = 0,
        textures = [],
        trackedUrls = [],
        that,
    
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
    getTileCoordinates = function(absolutePosition) {
        var textureNumber = (absolutePosition / tilesPerTexture) << 0,
            localTileNumber =  (absolutePosition % tilesPerTexture),
            row = (localTileNumber / tilesPerRow) << 0,
            col = (localTileNumber % tilesPerRow);
        
        return {textureNumber : textureNumber, row : row, col: col};
    },
    markDirtyNow = function() {
        that.isDirty = true;
        skipedDirty = 0; 
        dirtyTimeoutId = null;
    },
    markDirty = function() {
        // delay this call, since it results in texture reload
        if (dirtyTimeoutId) {
            clearTimeout(dirtyTimeoutId);
            skipedDirty += 1;
            dirtyTimeoutId = null;
        }
        
        if (skipedDirty > 10) {
            markDirtyNow();
        } else {
            dirtyTimeoutId = setTimeout(markDirtyNow, 400);
        }        
    },
    
    copy = function(from, to) {
        var fromCanvas = textures[from.textureNumber].canvas,
            toCtx = textures[to.textureNumber].ctx,
            x = to.col * tileSize, 
            y = to.row * tileSize;
        
       toCtx.drawImage(fromCanvas, from.col * tileSize, from.row * tileSize, tileSize, tileSize, x, y, tileSize, tileSize);
       textures[from.textureNumber].isDirty = true;
       textures[to.textureNumber].isDirty = true;
    },
    
    drawAt = function(tileNumber, img, callback) {
        var tilePosition = getTileCoordinates(tileNumber),
            coordinates = { offset : tileNumber };
        
        if (tilePosition.textureNumber >= textures.length) {
            createTexture();
        }
        var currentTexture = textures[tilePosition.textureNumber];
            
        currentTexture.ctx.drawImage(img, tilePosition.col * tileSize, tilePosition.row * tileSize, tileSize, tileSize);
        trackedUrls[tileNumber] = img.src;
        
        loadedImages[img.src] = coordinates;
        currentTexture.isDirty = true;
        
        callback(coordinates);
    };
    
    if (!isPowerOf2(tilesPerTexture)) {
        throw 'Tiles per texture should be power of two.';
    }
    
    // this is the return object
    that = {
        /**
         * indicates whether atlas has changed texture in it. If true then
         * some of the textures has isDirty flag set as well.
         */
        isDirty : false,
        
        /**
         * Clears any signs of atlas changes.
         */
        clearDirty : function () {
            this.isDirty = false;
            for(var i = 0; i < textures.length; ++i) {
                textures[i].isDirty = false;
            }
        },
        
        /**
         * Removes given url from colleciton of tiles in the atlas.
         */
        remove : function(imgUrl) {
            var coordinates = loadedImages[imgUrl];
            if (!coordinates) { return false; }
            delete loadedImages[imgUrl];
            lastLoadedIdx -= 1;
            
            
            if (lastLoadedIdx === coordinates.offset) {
                return true; // Ignore if it's last image in the whole set.
            }
            
            var tileToRemove = getTileCoordinates(coordinates.offset),
                lastTileInSet = getTileCoordinates(lastLoadedIdx);
            
            copy(lastTileInSet, tileToRemove);
            
            var replacedOffset = loadedImages[trackedUrls[lastLoadedIdx]];
            replacedOffset.offset = coordinates.offset;
            trackedUrls[coordinates.offset] = trackedUrls[lastLoadedIdx];
            
            markDirty();
            return true;
        },
        
        /**
         * Gets all textures in the atlas.
         */
        getTextures : function() {
            return textures; // I trust you...
        },
        
        /**
         * Gets coordinates of the given image in the atlas. Coordinates is an object:
         * {offset : int } - where offset is an absolute position of the image in the 
         * atlas. 
         * 
         * Absolute means it can be larger than tilesPerTexture parameter, and in that
         * case clients should get next texture in getTextures() collection. 
         */
        getCoordinates : function(imgUrl) {
            return loadedImages[imgUrl];
        },
        
        /**
         * Asynchronously Loads the image to the atlas. Cross-domain security 
         * limitation applies. 
         */
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
                    markDirty();
                    drawAt(imgId, img, callback);
                };
                
                img.src = imgUrl;
            }
        }
    };
    
    return that;
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
        atlas,
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
                
                // todo: get it from parameters 
                tilesPerTexture = 1024;
                atlas = new Viva.Graph.View.webglAtlas(tilesPerTexture);
                
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
            
            removeNode : function(nodeUI) {
                if (nodesCount > 0) { nodesCount -=1; }
                
                if (nodeUI.id < nodesCount && nodesCount > 0) {
                    if (nodeUI.src) {
                        atlas.remove(nodeUI.src);
                    }
                    
                    utils.copyArrayPart(nodes, nodeUI.id*ATTRIBUTES_PER_PRIMITIVE, nodesCount*ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE);
                    
                }
            },
            
            replaceProperties : function(replacedNode, newNode) {
                newNode._offset = replacedNode._offset;
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