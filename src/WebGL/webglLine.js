var parseColor = require('./parseColor.js');

module.exports = webglLine;

/**
 * Defines a webgl line. This class has no rendering logic at all,
 * it's just passed to corresponding shader and the shader should
 * figure out how to render it.
 *
 */
function webglLine(color) {
  return {
    /**
     * Gets or sets color of the line. If you set this property externally
     * make sure it always come as integer of 0xRRGGBBAA format
     */
    color: parseColor(color)
  };
}
