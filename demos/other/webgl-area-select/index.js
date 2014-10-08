/**
 * this demo shows one possible way of implementing "area" selection with webgl
 * renderer
 */
function onLoad() {
  var graphGenerator = Viva.Graph.generator();
  var graph = graphGenerator.grid(50, 10);

  var layout = Viva.Graph.Layout.forceDirected(graph);

  var graphics = Viva.Graph.View.webglGraphics();

  var renderer = Viva.Graph.View.renderer(graph, {
    layout: layout,
    graphics: graphics,
    container: document.getElementById('graph-container')
  });

  renderer.run();

  // we are calling this immediately, but this should probably be triggered by
  // a "tool" button, where users can select ractangular nodes
  selectNodes(graph, renderer, layout);
}

function selectNodes(graph, renderer, layout) {
  var graphics = renderer.getGraphics();
  var overlay = createOverlay(document.querySelector('.graph-overlay'), document.getElementById('graph-container'));
  overlay.onAreaSelected(function(area) {
    // For the sake of this demo we are using silly O(n) implementation.
    // Could be improved with spatial indexing if required.
    var topLeft = graphics.transformClientToGraphCoordinates({
      x: area.x,
      y: area.y
    });

    var bottomRight = graphics.transformClientToGraphCoordinates({
      x: area.x + area.width,
      y: area.y + area.height
    });

    graph.forEachNode(higlightIfInside);
    renderer.rerender();

    return;

    function higlightIfInside(node) {
      var nodeUI = graphics.getNodeUI(node.id)
      if (isInside(node.id, topLeft, bottomRight)) {
        nodeUI.color = 0xFFA500ff;
        nodeUI.size = 20;
      } else {
        nodeUI.color = 0x009ee8ff;
        nodeUI.size = 10;
      }
    }

    function isInside(nodeId, topLeft, bottomRight) {
      var nodePos = layout.getNodePosition(nodeId);
      return (topLeft.x < nodePos.x && nodePos.x < bottomRight.x &&
        topLeft.y < nodePos.y && nodePos.y < bottomRight.y);
    }
  });
}

function createOverlay(overlayDom, underElement) {
  var selectionIndicator = document.createElement('div');
  selectionIndicator.className = 'graph-selection-indicator';
  overlayDom.appendChild(selectionIndicator);

  var notify = [];
  var dragndrop = Viva.Graph.Utils.dragndrop(overlayDom);
  var selectedArea = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };
  var startX = 0;
  startY = 0;

  dragndrop.onStart(function(e) {
    startX = selectedArea.x = e.clientX;
    startY = selectedArea.y = e.clientY;
    selectedArea.width = selectedArea.height = 0;

    updateSelectedAreaIndicator();
    selectionIndicator.style.display = 'block';
  });

  dragndrop.onDrag(function(e) {
    recalculateSelectedArea(e);
    updateSelectedAreaIndicator();
    notifyAreaSelected();
  });

  dragndrop.onStop(function(e) {
    selectionIndicator.style.display = 'none';
  });

  dragndrop.onScroll(function (e) {
    // instead of eating this event, let's propagate it to the renderer
    var dispatched = new WheelEvent(e.type, e);
    underElement.dispatchEvent(dispatched);
  });
  return {
    onAreaSelected: function(cb) {
      notify.push(cb);
    }
  }

  function notifyAreaSelected() {
    notify.forEach(function(cb) {
      cb(selectedArea);
    });
  }

  function recalculateSelectedArea(e) {
    selectedArea.width = Math.abs(e.clientX - startX);
    selectedArea.height = Math.abs(e.clientY - startY);
    selectedArea.x = Math.min(e.clientX, startX);
    selectedArea.y = Math.min(e.clientY, startY);
  }

  function updateSelectedAreaIndicator() {
    selectionIndicator.style.left = selectedArea.x + 'px';
    selectionIndicator.style.top = selectedArea.y + 'px';
    selectionIndicator.style.width = selectedArea.width + 'px';
    selectionIndicator.style.height = selectedArea.height + 'px';
  }
}
