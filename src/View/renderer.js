/**
 * @fileOverview Defines a graph renderer that uses CSS based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */
/*global Viva, window*/

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
 *     // Layout algorithm to be used. The algorithm is expected to comply with defined
 *     // interface and is expected to be iterative. Renderer will use it then to calculate
 *     // grpaph's layout. For examples of the interface refer to Viva.Graph.Layout.forceDirected()
 *     // and Viva.Graph.Layout.gem() algorithms.
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
Viva.Graph.View.renderer = function(graph, settings) {
    // TODO: This class is getting hard to understand. Consider refactoring.
    // TODO: I have a technical debt here: fix scaling/recentring! Currently it's total mess.
    var FRAME_INTERVAL = 30;
    
    settings = settings || {};
    
    var layout = settings.layout,
        graphics = settings.graphics,
        container = settings.container,
        inputManager,
        animationTimer,
        rendererInitialized = false,
        updateCenterRequired = true,
        
        currentStep = 0,
        totalIterationsCount = 0, 
        isStable = false,
        userInteraction = false,
        
        viewPortOffset = {
            x : 0,
            y : 0
        },
        
        transform = {
            offsetX : 0,
            offsetY : 0,
            scale : 1
        };
    
    var prepareSettings = function() {
            container = container || document.body;
            layout = layout || Viva.Graph.Layout.forceDirected(graph);
            graphics = graphics || Viva.Graph.View.svgGraphics(graph, {container : container});
            
            if (typeof settings.renderLinks === 'undefined') {
                settings.renderLinks = true;
            }
            
            settings.prerender = settings.prerender || 0;
            inputManager = (graphics.inputManager || Viva.Input.domListener)(graph, graphics);
        },
        // Cache positions object to prevent GC pressure
        cachedFromPos = {x : 0, y : 0, node: null},
        cachedToPos = {x : 0, y : 0, node: null},
        cachedNodePos = { x: 0, y: 0},
        
        renderLink = function(link){
            var fromNode = graph.getNode(link.fromId),
                toNode = graph.getNode(link.toId);
    
            if(!fromNode || !toNode) {
                return;
            }
            
            cachedFromPos.x = fromNode.position.x;
            cachedFromPos.y = fromNode.position.y;
            cachedFromPos.node = fromNode;
            
            cachedToPos.x = toNode.position.x;
            cachedToPos.y = toNode.position.y;
            cachedToPos.node = toNode;
            
            graphics.updateLinkPosition(link.ui, cachedFromPos, cachedToPos);
        },
        
        renderNode = function(node) {
            cachedNodePos.x = node.position.x;
            cachedNodePos.y = node.position.y; 
            
            graphics.updateNodePosition(node.ui, cachedNodePos);
        },
        
        renderGraph = function(){
            graphics.beginRender();
            if(settings.renderLinks && !graphics.omitLinksRendering) {
                graph.forEachLink(renderLink);
            }

            graph.forEachNode(renderNode);
            graphics.endRender();
        },
        
        onRenderFrame = function() {
            isStable = layout.step() && !userInteraction;
            renderGraph();
            
            return !isStable;
        },
    
       renderIterations = function(iterationsCount) {
           if (animationTimer) {
               totalIterationsCount += iterationsCount;
               return;
           }
           
           if (iterationsCount) {
               totalIterationsCount += iterationsCount;
               
               animationTimer = Viva.Graph.Utils.timer(function() {
                   return onRenderFrame();
               }, FRAME_INTERVAL);
           } else { 
                currentStep = 0;
                totalIterationsCount = 0;
                animationTimer = Viva.Graph.Utils.timer(onRenderFrame, FRAME_INTERVAL);
           }
       },
       
       resetStable = function(){
           isStable = false;
           animationTimer.restart();
       },
       
       prerender = function() {
           // To get good initial positions for the graph
           // perform several prerender steps in background.
           var i;
           if (typeof settings.prerender === 'number' && settings.prerender > 0){
               for (i = 0; i < settings.prerender; i += 1){
                   layout.step();
               }
           } else {
               layout.step(); // make one step to init positions property.
           }
       },
       
       updateCenter = function() {
           var graphRect = layout.getGraphRect(),
               containerSize = Viva.Graph.Utils.getDimension(container);
           
           viewPortOffset.x = viewPortOffset.y = 0;
           transform.offsetX = containerSize.width / 2 - (graphRect.x2 + graphRect.x1) / 2;
           transform.offsetY = containerSize.height / 2 - (graphRect.y2 + graphRect.y1) / 2;
           graphics.graphCenterChanged(transform.offsetX + viewPortOffset.x, transform.offsetY + viewPortOffset.y);
           
           updateCenterRequired = false;
       },
       
       createNodeUi = function(node) {
           var nodeUI = graphics.node(node);
           node.ui = nodeUI;
           graphics.initNode(nodeUI);
           layout.addNode(node);
           
           renderNode(node);
       },
       
       removeNodeUi = function (node) {
           if (typeof node.ui !== 'undefined'){
              graphics.releaseNode(node.ui);
              
              node.ui = null;
              delete node.ui;
           }
           
           layout.removeNode(node);
       },
       
       createLinkUi = function(link) {
           var linkUI = graphics.link(link);
           link.ui = linkUI;
           graphics.initLink(linkUI);

           if (!graphics.omitLinksRendering){ 
               renderLink(link);
           }
       },
       
       removeLinkUi = function(link) {
           if (typeof link.ui !== 'undefined') { 
               graphics.releaseLink(link.ui);
               link.ui = null;
               delete link.ui; 
           }
       },
       
       listenNodeEvents = function(node) {
            var wasPinned = false;
            
            // TODO: This may not be memory efficient. Consider reusing handlers object.
            inputManager.bindDragNDrop(node, {
                    onStart : function(){
                        wasPinned = node.isPinned;
                        node.isPinned = true;
                        userInteraction = true;
                        resetStable();
                    },
                    onDrag : function(e, offset){
                        node.position.x += offset.x / transform.scale;
                        node.position.y += offset.y / transform.scale;
                        userInteraction = true;
                        
                        renderGraph();
                    },
                    onStop : function(){
                        node.isPinned = wasPinned;
                        userInteraction = false;
                    } 
                }
            );
        },
        
        releaseNodeEvents = function(node) {
            inputManager.bindDragNDrop(node, null);
        },
       
       initDom = function() {
           graphics.init(container);
           
           graph.forEachNode(createNodeUi);
           
           if(settings.renderLinks) {
                graph.forEachLink(createLinkUi);
           }
       },
       
       processNodeChange = function(change) {
           var node = change.node;
           
           if (change.changeType === 'add') {
               createNodeUi(node);
               listenNodeEvents(node);
               if (updateCenterRequired){
                   updateCenter();
               }
           } else if (change.changeType === 'remove') {
               releaseNodeEvents(node);
               removeNodeUi(node);
               if (graph.getNodesCount() === 0){
                   updateCenterRequired = true; // Next time when node is added - center the graph.
               }
           } else if (change.changeType === 'update') {
               // TODO: Implement this properly!
               // releaseNodeEvents(node);
               // removeNodeUi(node);

               // createNodeUi(node);
               // listenNodeEvents(node);
           }
       },
       
       processLinkChange = function(change) {
           var link = change.link;
           if (change.changeType === 'add') {
               if (settings.renderLinks) { createLinkUi(link); }
               layout.addLink(link);
           } else if (change.changeType === 'remove') {
               if (settings.renderLinks) { removeLinkUi(link); }
               layout.removeLink(link);
           } else if (change.changeType === 'update') {
               // TODO: implement this properly!
               // if (settings.renderLinks) { removeLinkUi(link); }
               // layout.removeLink(link);

               // if (settings.renderLinks) { createLinkUi(link); }
               // layout.addLink(link);
           }
       },
       
       listenToEvents = function() {
            Viva.Graph.Utils.events(window).on('resize', function(){
                updateCenter();
                onRenderFrame();
            });
            
            var containerDrag = Viva.Graph.Utils.dragndrop(container);
            containerDrag.onDrag(function(e, offset){
                viewPortOffset.x += offset.x;
                viewPortOffset.y += offset.y;
                graphics.translateRel(offset.x, offset.y);
                
                renderGraph();
            });
            
            containerDrag.onScroll(function(e, scaleOffset, scrollPoint) {
                var scaleFactor = Math.pow(1 + 0.4, scaleOffset < 0 ? -0.2 : 0.2);
                transform.scale = graphics.scale(scaleFactor, scrollPoint);
                
                renderGraph();
            });
            
            graph.forEachNode(listenNodeEvents);
            
            Viva.Graph.Utils.events(graph).on('changed', function(changes){
                var i, change;
                for(i = 0; i < changes.length; i += 1){
                    change = changes[i];
                    if (change.node) {
                        processNodeChange(change);
                    } else if (change.link) {
                        processLinkChange(change);
                    }
                }
                
                resetStable();
            });
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
        run : function(iterationsCount) {
            
            if (!rendererInitialized){
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
        
        reset : function(){
            graphics.resetScale();
            updateCenter();
            transform.scale = 1;
        },
        
        pause : function() {
            animationTimer.stop();
        },
        
        resume : function() {
            animationTimer.restart();
        },
        
        rerender : function() {
            renderGraph();
            return this;
        }
    };
};
