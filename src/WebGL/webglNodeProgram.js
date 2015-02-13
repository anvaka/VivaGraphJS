/**
 * @fileOverview Defines a naive form of nodes for webglGraphics class.
 * This form allows to change color of node. Shape of nodes is rectangular.
 *
 * @author Andrei Kashcha (aka anvaka) / https://github.com/anvaka
 */

var glUtils = require('./webgl.js');

module.exports = webglNodeProgram;

/**
 * Defines simple UI for nodes in webgl renderer. Each node is rendered as square. Color and size can be changed.
 */
function webglNodeProgram() {
  var ATTRIBUTES_PER_PRIMITIVE = 4; // Primitive is point, x, y, size, color
  // x, y, z - floats, color = uint.
  var BYTES_PER_NODE = 3 * Float32Array.BYTES_PER_ELEMENT + Uint32Array.BYTES_PER_ELEMENT;
  var nodesFS = [
    'precision mediump float;',
    'varying vec4 color;',

    'void main(void) {',
    '   gl_FragColor = color;',
    '}'
  ].join('\n');
  var nodesVS = [
    'attribute vec3 a_vertexPos;',
    'attribute vec4 a_color;',
    'uniform vec2 u_screenSize;',
    'uniform mat4 u_transform;',
    'varying vec4 color;',

    'void main(void) {',
    '   gl_Position = u_transform * vec4(a_vertexPos.xy/u_screenSize, 0, 1);',
    '   gl_PointSize = a_vertexPos.z * u_transform[0][0];',
    '   color = a_color.abgr;',
    '}'
  ].join('\n');

  var program;
  var gl;
  var buffer;
  var locations;
  var utils;
  var storage = new ArrayBuffer(16 * BYTES_PER_NODE);
  var positions = new Float32Array(storage);
  var colors = new Uint32Array(storage);
  var nodesCount = 0;
  var width;
  var height;
  var transform;
  var sizeDirty;

  return {
    load: load,

    /**
     * Updates position of node in the buffer of nodes.
     *
     * @param idx - index of current node.
     * @param pos - new position of the node.
     */
    position: position,

    updateTransform: updateTransform,

    updateSize: updateSize,

    removeNode: removeNode,

    createNode: createNode,

    replaceProperties: replaceProperties,

    render: render
  };

  function ensureEnoughStorage() {
    if ((nodesCount + 1) * BYTES_PER_NODE >= storage.byteLength) {
      // Every time we run out of space create new array twice bigger.
      // TODO: it seems buffer size is limited. Consider using multiple arrays for huge graphs
      var extendedStorage = new ArrayBuffer(storage.byteLength * 2),
        extendedPositions = new Float32Array(extendedStorage),
        extendedColors = new Uint32Array(extendedStorage);

      extendedColors.set(colors); // should be enough to copy just one view.
      positions = extendedPositions;
      colors = extendedColors;
      storage = extendedStorage;
    }
  }

  function load(glContext) {
    gl = glContext;
    utils = glUtils(glContext);

    program = utils.createProgram(nodesVS, nodesFS);
    gl.useProgram(program);
    locations = utils.getLocations(program, ['a_vertexPos', 'a_color', 'u_screenSize', 'u_transform']);

    gl.enableVertexAttribArray(locations.vertexPos);
    gl.enableVertexAttribArray(locations.color);

    buffer = gl.createBuffer();
  }

  function position(nodeUI, pos) {
    var idx = nodeUI.id;

    positions[idx * ATTRIBUTES_PER_PRIMITIVE] = pos.x;
    positions[idx * ATTRIBUTES_PER_PRIMITIVE + 1] = pos.y;
    positions[idx * ATTRIBUTES_PER_PRIMITIVE + 2] = nodeUI.size;

    colors[idx * ATTRIBUTES_PER_PRIMITIVE + 3] = nodeUI.color;
  }

  function updateTransform(newTransform) {
    sizeDirty = true;
    transform = newTransform;
  }

  function updateSize(w, h) {
    width = w;
    height = h;
    sizeDirty = true;
  }

  function removeNode(node) {
      if (nodesCount > 0) {
        nodesCount -= 1;
      }

      if (node.id < nodesCount && nodesCount > 0) {
        // we can use colors as a 'view' into array array buffer.
        utils.copyArrayPart(colors, node.id * ATTRIBUTES_PER_PRIMITIVE, nodesCount * ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE);
      }
    }

  function createNode() {
    ensureEnoughStorage();
    nodesCount += 1;
  }

  function replaceProperties(/* replacedNode, newNode */) {}

  function render() {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, storage, gl.DYNAMIC_DRAW);

    if (sizeDirty) {
      sizeDirty = false;
      gl.uniformMatrix4fv(locations.transform, false, transform);
      gl.uniform2f(locations.screenSize, width, height);
    }

    gl.vertexAttribPointer(locations.vertexPos, 3, gl.FLOAT, false, ATTRIBUTES_PER_PRIMITIVE * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.vertexAttribPointer(locations.color, 4, gl.UNSIGNED_BYTE, true, ATTRIBUTES_PER_PRIMITIVE * Float32Array.BYTES_PER_ELEMENT, 3 * 4);

    gl.drawArrays(gl.POINTS, 0, nodesCount);
  }
}
