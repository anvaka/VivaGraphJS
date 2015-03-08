/**
 * This demo shows how to dispose renderer and create a new one.
 */
function removeGraph() {
  if (!window.renderer) {
    return; // already removed
  }
  window.renderer.dispose(); // remove the graph
  window.renderer = null;
}

function createNewGraph() {
  removeGraph();
  // just a random size for a grid graph [1, 9):
  var n = Math.random() * 10|0 + 1;
  var m = Math.random() * 10|0 + 1;
  var graph = Viva.Graph.generator().grid(n, m);

  window.renderer = Viva.Graph.View.renderer(graph, {
      layout : createPhysicsLayout(graph)
  });
  window.renderer.run();
}

function createPhysicsLayout(graph) {
  return Viva.Graph.Layout.forceDirected(graph, {
      springLength : 10,
      springCoeff : 0.0005,
      dragCoeff : 0.02,
      gravity : -1.2
  });
}
