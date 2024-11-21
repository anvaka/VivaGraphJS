let graphGenerator = Viva.Graph.generator();
let graph = graphGenerator.grid(20, 20);

let layout = d3Force(graph, {
  springLength : 20,
  springCoeff : 1,
  gravity: -30,
  springIterations: 10
});

let graphics = Viva.Graph.View.webglGraphics();

let renderer = Viva.Graph.View.renderer(graph, {
    layout: layout,
    graphics: graphics,
    renderLinks: true,
    prerender: true
});

renderer.run();

// TODO: extract into module
function d3Force(graph, options) {
  // todo: check input
  let nodes = [], links = [];
  let nodeIdToIdx = Object.create(null);
  let linkIdToD3Link = Object.create(null);

  graph.forEachNode(function(n) {
    let index = nodes.length;
    nodeIdToIdx[n.id] = index;
    let node = {
      index: index
    }
    nodes.push(node);
  });

  graph.forEachLink(function(l) {
    let source = nodeIdToIdx[l.fromId];
    let target = nodeIdToIdx[l.toId];

    let index = links.length;
    let link = {source: source, target: target, index: index}
    links.push(link);
    linkIdToD3Link[l.id] = link;
  });

  let simulation = d3.forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(options.gravity))
      .force("link", d3.forceLink(links)
        .strength(options.springCoeff)
        .distance(options.springLength)
        .iterations(options.springIterations)
      );

  simulation.stop();

  return {
    step: function() {
      simulation.tick();
    },

    getNodePosition: getNodePosition,

    getLinkPosition: function(linkId) {
      let link = linkIdToD3Link[linkId];
      return {
        from: link.source,
        to: link.target
      };
    },

    getGraphRect: function() {
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      nodes.forEach(function(node) {
        if (node.x < minX) minX = node.x;
        if (node.x > maxX) maxX = node.x;

        if (node.y < minY) minY = node.y;
        if (node.y > maxY) maxY = node.y;
      })

      return {
        x1: minX,
        x2: maxX,
        y1: minY,
        y2: maxY
      }
    },

    isNodePinned: function() {
      // TODO: implement
      return false;
    },

    pinNode: function() {
      // TODO: implement me
    },

    dispose: function() {
    },

    setNodePosition: function(nodeId, x, y) {
      let pos = getNodePosition(nodeId);
      pos.x = x;
      pos.y = y;
    }
  }

  function getNodePosition(nodeId) {
      return nodes[nodeIdToIdx[nodeId]];
    }
}
