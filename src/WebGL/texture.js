module.exports = Texture;

/**
 * Single texture in the webglAtlas.
 */
function Texture(size) {
  this.canvas = window.document.createElement("canvas");
  this.ctx = this.canvas.getContext("2d");
  this.isDirty = false;
  this.canvas.width = this.canvas.height = size;
}
