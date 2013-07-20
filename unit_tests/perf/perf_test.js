var Viva = require('../../dist/vivagraph');
var gridSize = 100;
var layoutIterations = 100;

console.log('This is a very basic performance test of force directed layout');
console.log('Constructing graph: Grid ' + gridSize + 'x' + gridSize);
var generator = Viva.Graph.generator();
var graph = generator.grid(gridSize, gridSize);
console.log('Nodes: ' + graph.getNodesCount() + ', Edges: ' + graph.getLinksCount());

console.time('Layout time');
console.log('Performing ' + layoutIterations + ' iterations of layout');
var layout = Viva.Graph.Layout.forceDirected(graph);
for (var i = 0; i < layoutIterations; ++i) {
    layout.step();
}
console.timeEnd('Layout time');
console.log('Done.');
