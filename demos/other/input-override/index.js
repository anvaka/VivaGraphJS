// let's just rend all possible graphs on this page:
var generator = Viva.Graph.generator();
var graphNames = Object.keys(generator);

for (var i = 0; i < graphNames.length; ++i) {
  renderGraph(graphNames[i]);
}

function renderGraph(name) {
  var graph = generateGraphByName(name);
  var layout = Viva.Graph.Layout.forceDirected(graph, {
    springLength: 30,
    springCoeff: 0.0008,
    dragCoeff: 0.01,
    gravity: -1.2,
    theta: 1
  });

  var graphics = Viva.Graph.View.webglGraphics();
  var renderer = Viva.Graph.View.renderer(graph, {
    // This prevents vivagraph from handling scrolling, but will let user interact
    // with individual nodes:
    interactive: 'nodes',
    // if you want to completely disable interaction, set `interactive` to false.
    // interactive: false,
    layout: layout,
    graphics: graphics,
    container: createContainer()
  });

  renderer.run();
}

function createContainer() {
  var container = document.createElement('div');
  container.className = 'graph-container';
  document.body.appendChild(container);
  return container;
}

// you can safely ignore this function for the purpose of this demo. It just
// generates a random graph an duses custom nodes/links count based on generator
// name.
function generateGraphByName(name) {
  if (name === 'wattsStrogatz') {
    // wattsStrogatz has different default arguments, let's respect it:
    return generator.wattsStrogatz(20, 4, 0.02);
  } else if (name === 'completeBipartite') {
    // it's more stable this way:
    return generator.completeBipartite(3, 3);
  }
  return generator[name](5, 5, 5);
}

