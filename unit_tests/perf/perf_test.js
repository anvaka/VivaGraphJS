// When node is compiled with the lates v8 version performance gain is 35% .. 40%
//
// Take a loook:
// V8 version: 3.20.2 (node version v0.11.5-pre+)
// Grid 100x100, Nodes: 10000, Edges: 19800, 100 layout iterations. Layout time: 9141ms
//
// V8 version: 3.14.5.9 (node version v0.10.10)
// Grid 100x100, Nodes: 10000, Edges: 19800, 100 layout iterations. Layout time: 14771ms

var Viva = require('../../dist/vivagraph');
var gridSize = 100;
var layoutIterations = 100;

console.log('This is a very basic performance test of force directed layout');
console.log('V8 version: ' + process.versions.v8);
console.log('VivaGraph version: ' + Viva.Graph.version);
var generator = Viva.Graph.generator();
var graph = generator.grid(gridSize, gridSize);
console.log('Grid ' + gridSize + 'x' + gridSize + ', Nodes: ' + graph.getNodesCount() + ', Edges: ' + graph.getLinksCount());

console.time('Layout time');
console.log('Performing ' + layoutIterations + ' iterations of layout');
var layout = Viva.Graph.Layout.forceDirected(graph);
for (var i = 0; i < layoutIterations; ++i) {
    layout.step();
}
console.timeEnd('Layout time');
console.log('Done.');

