/**
 * @fileOverview Defines a graph renderer that uses CSS based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / https://github.com/anvaka
 */

module.exports = renderer;

var eventify = require('ngraph.events');
var forceDirected = require('ngraph.forcelayout');
var svgGraphics = require('./svgGraphics.js');
var windowEvents = require('../Utils/windowEvents.js');
var domInputManager = require('../Input/domInputManager.js');
var timer = require('../Utils/timer.js');
var getDimension = require('../Utils/getDimensions.js');
var dragndrop = require('../Input/dragndrop.js');

/**
 * This is heart of the rendering. Class accepts graph to be rendered and rendering settings.
 * It monitors graph changes and depicts them accordingly.
 *
 * @param graph - Viva.Graph.graph() object to be rendered.
 * @param settings - rendering settings, composed from the following parts (with their defaults shown):
 *   settings = {
 *     // Represents a module that is capable of displaying graph nodes and links.
 *     // all graphics has to correspond to defined interface and can be later easily
 *     // replaced for specific needs (e.g. adding WebGL should be piece of cake as long
 *     // as WebGL has implemented required interface). See svgGraphics for example.
 *     graphics : Viva.Graph.View.svgGraphics(),
 *
 *     // Where the renderer should draw graph. Container size matters, because
 *     // renderer will attempt center graph to that size. Also graphics modules
 *     // might depend on it.
 *     container : document.body,
 *
 *     // Defines whether graph can respond to use input
 *     interactive: true,
 *
 *     // Layout algorithm to be used. The algorithm is expected to comply with defined
 *     // interface and is expected to be iterative. Renderer will use it then to calculate
 *     // grpaph's layout. For examples of the interface refer to Viva.Graph.Layout.forceDirected()
 *     layout : Viva.Graph.Layout.forceDirected(),
 *
 *     // Directs renderer to display links. Usually rendering links is the slowest part of this
 *     // library. So if you don't need to display links, consider settings this property to false.
 *     renderLinks : true,
 *
 *     // Number of layout iterations to run before displaying the graph. The bigger you set this number
 *     // the closer to ideal position graph will appear first time. But be careful: for large graphs
 *     // it can freeze the browser.
 *     prerender : 0
 *   }
 */
function renderer(graph, settings) {
  // TODO: This class is getting hard to understand. Consider refactoring.
  // TODO: I have a technical debt here: fix scaling/recentering! Currently it's a total mess.
  var FRAME_INTERVAL = 30;

  settings = settings || {};

  var layout = settings.layout,
    graphics = settings.graphics,
    container = settings.container,
    interactive = settings.interactive !== undefined ? settings.interactive : true,
    inputManager,
    animationTimer,
    rendererInitialized = false,
    updateCenterRequired = true,

    currentStep = 0,
    totalIterationsCount = 0,
    isStable = false,
    userInteraction = false,
    isPaused = false,

    transform = {
      offsetX: 0,
      offsetY: 0,
      scale: 1
    },

    publicEvents = eventify({}),
    containerDrag;

  return {
    /**
     * Performs rendering of the graph.
     *
     * @param iterationsCount if specified renderer will run only given number of iterations
     * and then stop. Otherwise graph rendering is performed infinitely.
     *
     * Note: if rendering stopped by used started dragging nodes or new nodes were added to the
     * graph renderer will give run more iterations to reflect changes.
     */
    run: function(iterationsCount) {

      if (!rendererInitialized) {
        prepareSettings();
        prerender();

        initDom();
        updateCenter();
        listenToEvents();

        rendererInitialized = true;
      }

      renderIterations(iterationsCount);

      return this;
    },

    reset: function() {
      graphics.resetScale();
      updateCenter();
      transform.scale = 1;
    },

    pause: function() {
      isPaused = true;
      animationTimer.stop();
    },

    resume: function() {
      isPaused = false;
      animationTimer.restart();
    },

    rerender: function() {
      renderGraph();
      return this;
    },

    zoomOut: function() {
      return scale(true);
    },

    zoomIn: function() {
      return scale(false);
    },

    /**
     * Centers renderer at x,y graph's coordinates
     */
    moveTo: function(x, y) {
      graphics.graphCenterChanged(transform.offsetX - x * transform.scale, transform.offsetY - y * transform.scale);
      renderGraph();
    },

    /**
     * Gets current graphics object
     */
    getGraphics: function() {
      return graphics;
    },

    /**
     * Removes this renderer and deallocates all resources/timers
     */
    dispose: function() {
      stopListenToEvents(); // I quit!
    },

    on: function(eventName, callback) {
      publicEvents.on(eventName, callback);
      return this;
    },

    off: function(eventName, callback) {
      publicEvents.off(eventName, callback);
      return this;
    }
  };

  /**
   * Checks whether given interaction (node/scroll) is enabled
   */
  function isInteractive(interactionName) {
    if (typeof interactive === 'string') {
      return interactive.indexOf(interactionName) >= 0;
    } else if (typeof interactive === 'boolean') {
      return interactive;
    }
    return true; // default setting
  }

  function prepareSettings() {
    container = container || window.document.body;
    layout = layout || forceDirected(graph, {
      springLength: 80,
      springCoeff: 0.0002,
    });
    graphics = graphics || svgGraphics(graph, {
      container: container
    });

    if (!settings.hasOwnProperty('renderLinks')) {
      settings.renderLinks = true;
    }

    settings.prerender = settings.prerender || 0;
    inputManager = (graphics.inputManager || domInputManager)(graph, graphics);
  }

  function renderGraph() {
    graphics.beginRender();

    // todo: move this check graphics
    if (settings.renderLinks) {
      graphics.renderLinks();
    }
    graphics.renderNodes();
    graphics.endRender();
  }

  function onRenderFrame() {
    isStable = layout.step() && !userInteraction;
    renderGraph();

    return !isStable;
  }

  function renderIterations(iterationsCount) {
    if (animationTimer) {
      totalIterationsCount += iterationsCount;
      return;
    }

    if (iterationsCount) {
      totalIterationsCount += iterationsCount;

      animationTimer = timer(function() {
        return onRenderFrame();
      }, FRAME_INTERVAL);
    } else {
      currentStep = 0;
      totalIterationsCount = 0;
      animationTimer = timer(onRenderFrame, FRAME_INTERVAL);
    }
  }

  function resetStable() {
    if (isPaused) {
      return;
    }

    isStable = false;
    animationTimer.restart();
  }

  function prerender() {
    // To get good initial positions for the graph
    // perform several prerender steps in background.
    if (typeof settings.prerender === 'number' && settings.prerender > 0) {
      for (var i = 0; i < settings.prerender; i += 1) {
        layout.step();
      }
    }
  }

  function updateCenter() {
    var graphRect = layout.getGraphRect(),
      containerSize = getDimension(container);

    var cx = (graphRect.x2 + graphRect.x1) / 2;
    var cy = (graphRect.y2 + graphRect.y1) / 2;
    transform.offsetX = containerSize.width / 2 - (cx * transform.scale - cx);
    transform.offsetY = containerSize.height / 2 - (cy * transform.scale - cy);
    graphics.graphCenterChanged(transform.offsetX, transform.offsetY);

    updateCenterRequired = false;
  }

  function createNodeUi(node) {
    var nodePosition = layout.getNodePosition(node.id);
    graphics.addNode(node, nodePosition);
  }

  function removeNodeUi(node) {
    graphics.releaseNode(node);
  }

  function createLinkUi(link) {
    var linkPosition = layout.getLinkPosition(link.id);
    graphics.addLink(link, linkPosition);
  }

  function removeLinkUi(link) {
    graphics.releaseLink(link);
  }

  function listenNodeEvents(node) {
    if (!isInteractive('node')) {
      return;
    }

    var wasPinned = false;

    // TODO: This may not be memory efficient. Consider reusing handlers object.
    inputManager.bindDragNDrop(node, {
      onStart: function() {
        wasPinned = layout.isNodePinned(node);
        layout.pinNode(node, true);
        userInteraction = true;
        resetStable();
      },
      onDrag: function(e, offset) {
        var oldPos = layout.getNodePosition(node.id);
        layout.setNodePosition(node.id,
          oldPos.x + offset.x / transform.scale,
          oldPos.y + offset.y / transform.scale);

        userInteraction = true;

        renderGraph();
      },
      onStop: function() {
        layout.pinNode(node, wasPinned);
        userInteraction = false;
      }
    });
  }

  function releaseNodeEvents(node) {
    inputManager.bindDragNDrop(node, null);
  }

  function initDom() {
    graphics.init(container);

    graph.forEachNode(createNodeUi);

    if (settings.renderLinks) {
      graph.forEachLink(createLinkUi);
    }
  }

  function releaseDom() {
    graphics.release(container);
  }

  function processNodeChange(change) {
    var node = change.node;

    if (change.changeType === 'add') {
      createNodeUi(node);
      listenNodeEvents(node);
      if (updateCenterRequired) {
        updateCenter();
      }
    } else if (change.changeType === 'remove') {
      releaseNodeEvents(node);
      removeNodeUi(node);
      if (graph.getNodesCount() === 0) {
        updateCenterRequired = true; // Next time when node is added - center the graph.
      }
    } else if (change.changeType === 'update') {
      releaseNodeEvents(node);
      removeNodeUi(node);

      createNodeUi(node);
      listenNodeEvents(node);
    }
  }

  function processLinkChange(change) {
    var link = change.link;
    if (change.changeType === 'add') {
      if (settings.renderLinks) {
        createLinkUi(link);
      }
    } else if (change.changeType === 'remove') {
      if (settings.renderLinks) {
        removeLinkUi(link);
      }
    } else if (change.changeType === 'update') {
      throw 'Update type is not implemented. TODO: Implement me!';
    }
  }

  function onGraphChanged(changes) {
    var i, change;
    for (i = 0; i < changes.length; i += 1) {
      change = changes[i];
      if (change.node) {
        processNodeChange(change);
      } else if (change.link) {
        processLinkChange(change);
      }
    }

    resetStable();
  }

  function onWindowResized() {
    updateCenter();
    onRenderFrame();
  }

  function releaseContainerDragManager() {
    if (containerDrag) {
      containerDrag.release();
      containerDrag = null;
    }
  }

  function releaseGraphEvents() {
    graph.off('changed', onGraphChanged);
  }

  function scale(out, scrollPoint) {
    if (!scrollPoint) {
      var containerSize = getDimension(container);
      scrollPoint = {
        x: containerSize.width / 2,
        y: containerSize.height / 2
      };
    }
    var scaleFactor = Math.pow(1 + 0.4, out ? -0.2 : 0.2);
    transform.scale = graphics.scale(scaleFactor, scrollPoint);

    renderGraph();
    publicEvents.fire('scale', transform.scale);

    return transform.scale;
  }

  function listenToEvents() {
    windowEvents.on('resize', onWindowResized);

    releaseContainerDragManager();
    if (isInteractive('drag')) {
      containerDrag = dragndrop(container);
      containerDrag.onDrag(function(e, offset) {
        graphics.translateRel(offset.x, offset.y);

        renderGraph();
      });
    }

    if (isInteractive('scroll')) {
      if (!containerDrag) {
        containerDrag = dragndrop(container);
      }
      containerDrag.onScroll(function(e, scaleOffset, scrollPoint) {
        scale(scaleOffset < 0, scrollPoint);
      });
    }

    graph.forEachNode(listenNodeEvents);

    releaseGraphEvents();
    graph.on('changed', onGraphChanged);
  }

  function stopListenToEvents() {
    rendererInitialized = false;
    releaseGraphEvents();
    releaseContainerDragManager();
    windowEvents.off('resize', onWindowResized);
    publicEvents.off();
    animationTimer.stop();

    graph.forEachLink(function(link) {
      if (settings.renderLinks) {
        removeLinkUi(link);
      }
    });

    graph.forEachNode(function(node) {
      releaseNodeEvents(node);
      removeNodeUi(node);
    });

    layout.dispose();
    releaseDom();
  }
}
