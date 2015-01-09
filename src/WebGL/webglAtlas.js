var Texture = require('./texture.js');

module.exports = webglAtlas;

/**
 * My naive implementation of textures atlas. It allows clients to load
 * multiple images into atlas and get canvas representing all of them.
 *
 * @param tilesPerTexture - indicates how many images can be loaded to one
 *          texture of the atlas. If number of loaded images exceeds this
 *          parameter a new canvas will be created.
 */
function webglAtlas(tilesPerTexture) {
    var tilesPerRow = Math.sqrt(tilesPerTexture || 1024) << 0,
        tileSize = tilesPerRow,
        lastLoadedIdx = 1,
        loadedImages = {},
        dirtyTimeoutId,
        skipedDirty = 0,
        textures = [],
        trackedUrls = [],
        that,

        isPowerOf2 = function (n) {
            return (n & (n - 1)) === 0;
        },
        createTexture = function () {
            var texture = new Texture(tilesPerRow * tileSize);
            textures.push(texture);
        },
        getTileCoordinates = function (absolutePosition) {
            var textureNumber = (absolutePosition / tilesPerTexture) << 0,
                localTileNumber =  (absolutePosition % tilesPerTexture),
                row = (localTileNumber / tilesPerRow) << 0,
                col = (localTileNumber % tilesPerRow);

            return {textureNumber : textureNumber, row : row, col: col};
        },
        markDirtyNow = function () {
            that.isDirty = true;
            skipedDirty = 0;
            dirtyTimeoutId = null;
        },
        markDirty = function () {
            // delay this call, since it results in texture reload
            if (dirtyTimeoutId) {
                window.clearTimeout(dirtyTimeoutId);
                skipedDirty += 1;
                dirtyTimeoutId = null;
            }

            if (skipedDirty > 10) {
                markDirtyNow();
            } else {
                dirtyTimeoutId = window.setTimeout(markDirtyNow, 400);
            }
        },

        copy = function (from, to) {
            var fromCanvas = textures[from.textureNumber].canvas,
                toCtx = textures[to.textureNumber].ctx,
                x = to.col * tileSize,
                y = to.row * tileSize;

            toCtx.drawImage(fromCanvas, from.col * tileSize, from.row * tileSize, tileSize, tileSize, x, y, tileSize, tileSize);
            textures[from.textureNumber].isDirty = true;
            textures[to.textureNumber].isDirty = true;
        },

        drawAt = function (tileNumber, img, callback) {
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
        throw "Tiles per texture should be power of two.";
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
            var i;
            this.isDirty = false;
            for (i = 0; i < textures.length; ++i) {
                textures[i].isDirty = false;
            }
        },

        /**
         * Removes given url from collection of tiles in the atlas.
         */
        remove : function (imgUrl) {
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
        getTextures : function () {
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
        getCoordinates : function (imgUrl) {
            return loadedImages[imgUrl];
        },

        /**
         * Asynchronously Loads the image to the atlas. Cross-domain security
         * limitation applies.
         */
        load : function (imgUrl, callback) {
            if (loadedImages.hasOwnProperty(imgUrl)) {
                callback(loadedImages[imgUrl]);
            } else {
                var img = new window.Image(),
                    imgId = lastLoadedIdx;

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
}
