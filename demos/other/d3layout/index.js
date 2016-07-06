var graphGenerator = Viva.Graph.generator();
var graph = graphGenerator.grid(20, 20);

var layout = d3Force(graph, {
  springLength : 20,
  springCoeff : 1,
  gravity: -30,
  springIterations: 10
});

var graphics = Viva.Graph.View.webglGraphics();

var renderer = Viva.Graph.View.renderer(graph, {
    layout: layout,
    graphics: graphics,
    renderLinks: true,
    prerender: true
});

renderer.run();

// TODO: extract into module
function d3Force(graph, options) {
  // todo: check input
  var nodes = [], links = [];
  var nodeIdToIdx = Object.create(null);
  var linkIdToD3Link = Object.create(null);

  graph.forEachNode(function(n) {
    var index = nodes.length;
    nodeIdToIdx[n.id] = index;
    var node = {
      index: index
    }
    nodes.push(node);
  });

  graph.forEachLink(function(l) {
    var source = nodeIdToIdx[l.fromId];
    var target = nodeIdToIdx[l.toId];

    var index = links.length;
    var link = {source: source, target: target, index: index}
    links.push(link);
    linkIdToD3Link[l.id] = link;
  });

  var simulation = d3.forceSimulation(nodes)
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
      var link = linkIdToD3Link[linkId];
      return {
        from: link.source,
        to: link.target
      };
    },

    getGraphRect: function() {
      var minX = Number.POSITIVE_INFINITY;
      var minY = Number.POSITIVE_INFINITY;
      var maxX = Number.NEGATIVE_INFINITY;
      var maxY = Number.NEGATIVE_INFINITY;

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
      var pos = getNodePosition(nodeId);
      pos.x = x;
      pos.y = y;
    }
  }

  function getNodePosition(nodeId) {
      return nodes[nodeIdToIdx[nodeId]];
    }
}
