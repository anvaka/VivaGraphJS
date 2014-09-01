/**
 * @fileOverview Defines a graph renderer that uses CSS based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

Viva.Graph.View = Viva.Graph.View || {};

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
 *     // NOTE: current version supports Viva.Graph.View.cssGraphics() as well.
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
 *     // the closer to ideal position graph will apper first time. But be careful: for large graphs
 *     // it can freeze the browser.
 *     prerender : 0
 *   }
 */
Viva.Graph.View.renderer = function (graph, settings) {
    // TODO: This class is getting hard to understand. Consider refactoring.
    // TODO: I have a technical debt here: fix scaling/recentring! Currently it's total mess.
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

        viewPortOffset = {
            x : 0,
            y : 0
        },

        transform = {
            offsetX : 0,
            offsetY : 0,
            scale : 1
        };

    var prepareSettings = function () {
            container = container || window.document.body;
            layout = layout || Viva.Graph.Layout.forceDirected(graph);
            graphics = graphics || Viva.Graph.View.svgGraphics(graph, {container : container});

            if (!settings.hasOwnProperty('renderLinks')) {
                settings.renderLinks = true;
            }

            settings.prerender = settings.prerender || 0;
            inputManager = (graphics.inputManager || Viva.Input.domInputManager)(graph, graphics);
        },
        windowEvents = Viva.Graph.Utils.events(window),
        publicEvents = Viva.Graph.Utils.events({}).extend(),
        graphEvents,
        containerDrag,

        renderGraph = function () {
            graphics.beginRender();

            // todo: move this check graphics
            if (settings.renderLinks) {
                graphics.renderLinks();
            }
            graphics.renderNodes();
            graphics.endRender();
        },

        onRenderFrame = function () {
            isStable = layout.step() && !userInteraction;
            renderGraph();

            return !isStable;
        },

        renderIterations = function (iterationsCount) {
            if (animationTimer) {
                totalIterationsCount += iterationsCount;
                return;
            }

            if (iterationsCount) {
                totalIterationsCount += iterationsCount;

                animationTimer = Viva.Graph.Utils.timer(function () {
                    return onRenderFrame();
                }, FRAME_INTERVAL);
            } else {
                currentStep = 0;
                totalIterationsCount = 0;
                animationTimer = Viva.Graph.Utils.timer(onRenderFrame, FRAME_INTERVAL);
            }
        },

        resetStable = function () {
            if(isPaused) {
                return;
            }

            isStable = false;
            animationTimer.restart();
        },

        prerender = function () {
            // To get good initial positions for the graph
            // perform several prerender steps in background.
            var i;
            if (typeof settings.prerender === 'number' && settings.prerender > 0) {
                for (i = 0; i < settings.prerender; i += 1) {
                    layout.step();
                }
            }
        },

        updateCenter = function () {
            var graphRect = layout.getGraphRect(),
                containerSize = Viva.Graph.Utils.getDimension(container);

            viewPortOffset.x = viewPortOffset.y = 0;
            transform.offsetX = containerSize.width / 2 - (graphRect.x2 + graphRect.x1) / 2;
            transform.offsetY = containerSize.height / 2 - (graphRect.y2 + graphRect.y1) / 2;
            graphics.graphCenterChanged(transform.offsetX, transform.offsetY);

            updateCenterRequired = false;
        },

        createNodeUi = function (node) {
            var nodePosition = layout.getNodePosition(node.id);
            graphics.addNode(node, nodePosition);
        },

        removeNodeUi = function (node) {
            graphics.releaseNode(node);
        },

        createLinkUi = function (link) {
            var linkPosition = layout.getLinkPosition(link);
            graphics.addLink(link, linkPosition);
        },

        removeLinkUi = function (link) {
            graphics.releaseLink(link);
        },

        listenNodeEvents = function (node) {
            var wasPinned = false;
            var nodeInteractive = (typeof interactive === 'string' && interactive.indexOf('node') !== -1) || interactive;
            if (!nodeInteractive) {
                return;
            }

            // TODO: This may not be memory efficient. Consider reusing handlers object.
            inputManager.bindDragNDrop(node, {
                onStart : function () {
                    wasPinned = layout.isNodePinned(node);
                    layout.pinNode(node, true);
                    userInteraction = true;
                    resetStable();
                },
                onDrag : function (e, offset) {
                    var oldPos = layout.getNodePosition(node.id);
                    layout.setNodePosition(node,
                                           oldPos.x + offset.x / transform.scale,
                                           oldPos.y + offset.y / transform.scale);

                    userInteraction = true;

                    renderGraph();
                },
                onStop : function () {
                    layout.pinNode(node, wasPinned);
                    userInteraction = false;
                }
            });
        },

        releaseNodeEvents = function (node) {
            inputManager.bindDragNDrop(node, null);
        },

        initDom = function () {
            graphics.init(container);

            graph.forEachNode(createNodeUi);

            if (settings.renderLinks) {
                graph.forEachLink(createLinkUi);
            }
        },

        releaseDom = function () {
            graphics.release(container);
        },

        processNodeChange = function (change) {
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
        },

        processLinkChange = function (change) {
            var link = change.link;
            if (change.changeType === 'add') {
                if (settings.renderLinks) { createLinkUi(link); }
            } else if (change.changeType === 'remove') {
                if (settings.renderLinks) { removeLinkUi(link); }
            } else if (change.changeType === 'update') {
                throw 'Update type is not implemented. TODO: Implement me!';
            }
        },

        onGraphChanged = function (changes) {
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
        },

        onWindowResized = function () {
            updateCenter();
            onRenderFrame();
        },

        releaseContainerDragManager = function () {
            if (containerDrag) {
                containerDrag.release();
                containerDrag = null;
            }
        },

        releaseGraphEvents = function () {
            if (graphEvents) {
                // Interesting.. why is it not null? Anyway:
                graphEvents.stop('changed', onGraphChanged);
                graphEvents = null;
            }
        },

        scale = function (out, scrollPoint) {
            if (!scrollPoint) {
                var containerSize = Viva.Graph.Utils.getDimension(container);
                scrollPoint = {
                    x: containerSize.width/2,
                    y: containerSize.height/2
                };
            }
            var scaleFactor = Math.pow(1 + 0.4, out ? -0.2 : 0.2);
            transform.scale = graphics.scale(scaleFactor, scrollPoint);

            renderGraph();
            publicEvents.fire('scale', transform.scale);

            return transform.scale;
        },

        listenToEvents = function () {
            windowEvents.on('resize', onWindowResized);

            releaseContainerDragManager();
            var canDrag = (typeof interactive === 'string' && interactive.indexOf('drag') !== -1) || interactive;
            if (canDrag) {
                containerDrag = Viva.Graph.Utils.dragndrop(container);
                containerDrag.onDrag(function (e, offset) {
                    viewPortOffset.x += offset.x;
                    viewPortOffset.y += offset.y;
                    graphics.translateRel(offset.x, offset.y);

                    renderGraph();
                });
            }

            var canScroll = (typeof interactive === 'string' && interactive.indexOf('scroll') !== -1) || interactive;
            if (canScroll) {
                containerDrag.onScroll(function (e, scaleOffset, scrollPoint) {
                    scale(scaleOffset < 0, scrollPoint);
                });
            }

            graph.forEachNode(listenNodeEvents);

            releaseGraphEvents();
            graphEvents = Viva.Graph.Utils.events(graph);
            graphEvents.on('changed', onGraphChanged);
        },

        stopListenToEvents = function () {
            rendererInitialized = false;
            releaseGraphEvents();
            releaseContainerDragManager();
            windowEvents.stop('resize', onWindowResized);
            publicEvents.removeAllListeners();
            animationTimer.stop();

            graph.forEachLink(function (link) {
                if (settings.renderLinks) { removeLinkUi(link); }
            });

            graph.forEachNode(function (node) {
                releaseNodeEvents(node);
                removeNodeUi(node);
            });

            layout.dispose();
            releaseDom();
        };

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
        run : function (iterationsCount) {

            if (!rendererInitialized) {
                prepareSettings();
                prerender();

                updateCenter();
                initDom();
                listenToEvents();

                rendererInitialized = true;
            }

            renderIterations(iterationsCount);

            return this;
        },

        reset : function () {
            graphics.resetScale();
            updateCenter();
            transform.scale = 1;
        },

        pause : function () {
            isPaused = true;
            animationTimer.stop();
        },

        resume : function () {
            isPaused = false;
            animationTimer.restart();
        },

        rerender : function () {
            renderGraph();
            return this;
        },

        zoomOut: function () {
            return scale(true);
        },

        zoomIn: function () {
            return scale(false);
        },

        /**
         * Centers renderer at x,y graph's coordinates
         */
        moveTo: function (x, y) {
            graphics.graphCenterChanged(transform.offsetX - x * transform.scale, transform.offsetY - y * transform.scale);
            renderGraph();
        },

        /**
         * Gets current graphics object
         */
        getGraphics: function () {
            return graphics;
        },

        /**
         * Removes this renderer and deallocates all resources/timers
         */
        dispose : function () {
            stopListenToEvents(); // I quit!
        },

        on : function (eventName, callback) {
            publicEvents.addEventListener(eventName, callback);
            return this;
        },

        off : function (eventName, callback) {
            publicEvents.removeEventListener(eventName, callback);
            return this;
        }
    };
};
