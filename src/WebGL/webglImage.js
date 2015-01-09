module.exports = webglImage;

/**
 * Represents a model for image.
 */
function webglImage(size, src) {
    return {
        /**
         * Gets texture index where current image is placed.
         */
        _texture : 0,

        /**
         * Gets offset in the texture where current image is placed.
         */
        _offset : 0,

        /**
         * Gets size of the square with the image.
         */
        size : typeof size === 'number' ? size : 32,

        /**
         * Source of the image. If image is coming not from your domain
         * certain origin restrictions applies.
         * See http://www.khronos.org/registry/webgl/specs/latest/#4.2 for more details.
         */
        src  : src
    };
}
