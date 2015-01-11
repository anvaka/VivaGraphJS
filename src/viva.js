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

  generator: function () {
    return require('ngraph.generators');
  },

  Input: {
    domInputManager: require('./Input/domInputManager.js'),
    webglInputManager: require('./Input/webglInputManager.js')
  },

  Utils: {
    // TODO: move to Input
    dragndrop: require('./Input/dragndrop.js'),
    findElementPosition: require('./Utils/findElementPosition.js'),
    timer: require('./Utils/timer.js'),
    getDimension: require('./Utils/getDimensions.js'),
    events: function (g) {
      console.log("This method is deprecated. Please use graph.on()/grpah.off() directly");
      return g;
    }
  },

  Layout: {
    forceDirected: require('ngraph.forcelayout')
  },

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
    webglGraphics: require('./View/webglGraphics.js'),
    // TODO: Deprecate this:
    _webglUtil: {
      parseColor: require('./WebGL/parseColor.js')
    },

    // TODO: move to svg namespace
    svgGraphics: require('./View/svgGraphics.js'),

    renderer: require('./View/renderer.js'),

    // deprecated
    cssGraphics: function () {
      throw new Error('cssGraphics is deprecated. Please use older version of vivagraph (< 0.7) if you need it)');
    },

    svgNodeFactory: function () {
      throw new Error('svgNodeFactory is deprecated. Please use older version of vivagraph (< 0.7) if you need it)');
    }
  },

  svg: require('simplesvg'),

  // TODO: should be camelCase
  BrowserInfo: require('./Utils/browserInfo.js')
};

module.exports = Viva;
