var parseColor = require('./parseColor.js');

module.exports = webglSquare;

/**
 * Can be used as a callback in the webglGraphics.node() function, to
 * create a custom looking node.
 *
 * @param size - size of the node in pixels.
 * @param color - color of the node in '#rrggbbaa' or '#rgb' format.
 */
function webglSquare(size, color) {
  return {
    /**
     * Gets or sets size of the square side.
     */
    size: typeof size === 'number' ? size : 10,

    /**
     * Gets or sets color of the square.
     */
    color: parseColor(color)
  };
}
