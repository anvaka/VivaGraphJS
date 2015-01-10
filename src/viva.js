/**
 * This is an entry point for global namespace. If you want to use separate
 * modules individually - you are more than welcome to do so.
 */
var Viva = {};

Viva.Graph = {
  version: require('./version.js'),
  graph: require('ngraph.graph'),

  webgl: require('./WebGL/webgl.js'),
  webglInputEvents: require('./WebGL/webglInputEvents.js'),

  View: {
    // TODO: Move `webglXXX` out to webgl namespace
    Texture: require('./WebGL/texture.js'),
    // TODO: This should not be even exported
    webglAtlas: require('./WebGL/webglAtlas.js'),
    webglImageNodeProgram: require('./WebGL/webglImageNodeProgram.js'),
    webglLinkProgram: require('./WebGL/webglLinkProgram.js'),
    webglNodeProgram: require('./WebGL/webglNodeProgram.js'),
    webglLine: require('./WebGL/webglLine.js'),
    webglSquare: require('./WebGL/webglSquare.js'),
    webglImage: require('./WebGL/webglImage.js'),
    // TODO: Deprecate this:
    _webglUtil: {
      parseColor: require('./WebGL/parseColor.js')
    },


    cssGraphics: function () {
      throw new Error('cssGraphics is deprecated. Please use older version of vivagraph (< 0.7) if you need it)');
    }
  }
};

module.exports = Viva;
