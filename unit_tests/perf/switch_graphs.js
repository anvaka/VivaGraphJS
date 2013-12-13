// Testing behavior of graph cleanup and restart of layout
var Viva = require('../../dist/vivagraph');
var gridSize = 100;
var layoutIterations = 30;
var repetition = 10;

console.log('This is a very basic performance test of force directed layout');
console.log('V8 version: ' + process.versions.v8);
console.log('VivaGraph version: ' + Viva.Graph.version);

var graph = Viva.Graph.graph();
var layout = Viva.Graph.Layout.forceDirected(graph);

var i;
for (var r = 1; r < repetition + 1; ++r) {
    console.time('Layout time');
    makeGrid(gridSize, gridSize, graph);
    console.log(r + '. Performing ' + layoutIterations + ' iterations of layout');
    for (i = 0; i < layoutIterations; ++i) {
        layout.step();
    }
    makeComplete(gridSize, graph);
    for (i = 0; i < layoutIterations; ++i) {
        layout.step();
    }
    console.timeEnd('Layout time');
    console.log('Finished step ' + r + '.');
}

function makeGrid(n, m, g) {
    g.clear();
    g.beginUpdate();
    for (var i = 0; i < n; ++i) {
        for (var j = 0; j < m; ++j) {
            var node = i + j * n;
            if (i > 0) { g.addLink(node, i - 1 + j * n); }
            if (j > 0) { g.addLink(node, i + (j - 1) * n); }
        }
    }
    g.endUpdate();
}

function makeComplete(n, g) {
    g.clear();
    g.beginUpdate();
    for (var i = 0; i < n; ++i) {
        for (var j = i + 1; j < n; ++j) {
            if (i !== j) {
                g.addLink(i, j);
            }
        }
    }
    g.endUpdate();
}
