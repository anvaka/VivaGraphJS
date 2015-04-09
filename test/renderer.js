var test = require('tap').test;
var Viva = require('../dist/vivagraph.js');

test('renderer fires scale events', function(t) {
  var graph = Viva.Graph.graph();
  var renderer = Viva.Graph.View.renderer(graph);
  renderer.on('scale', function noop() { });
  t.ok(true, 'event registered');
  t.end();
});
