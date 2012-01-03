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
    var FRAME_INTERVAL = 30;
    
    settings = settings || {};
    
    var layout = settings.layout,
        graphics = settings.graphics,
        container = settings.container,
        animationTimer,
        rendererInitialized = false,
        updateCenterRequired = true,
        
        currentStep = 0,
        totalIterationsCount = 0, 
        
        viewPortOffset = {
            x : 0,
            y : 0
        },
        
        transform = {
            offsetX : 0,
            offsetY : 0,
            scaleX : 1,
            scaleY : 1
        };
    
    var prepareSettings = function() {
            container = container || document.body;
            layout = layout || Viva.Graph.Layout.forceDirected(graph);
            graphics = graphics || Viva.Graph.View.svgGraphics(graph, {container : container});
            
            if (typeof settings.renderLinks === 'undefined') {
                settings.renderLinks = true;
            }
            
            settings.prerender = settings.prerender || 0;
        },
        
        renderLink = function(link){
            var fromNode = graph.getNode(link.fromId);
            var toNode = graph.getNode(link.toId);
    
            if(!fromNode || !toNode) {
                return;
            }
            
            var from = {
                x : Math.round(fromNode.position.x),
                y : Math.round(fromNode.position.y),
                node: fromNode
            },
            to = {
                x : Math.round(toNode.position.x),
                y : Math.round(toNode.position.y),
                node : toNode
            };
            
            graphics.updateLinkPosition(link.ui, from, to);
        },
        
        renderNode = function(node) {
            var position = { 
                x : Math.round(node.position.x),
                y : Math.round(node.position.y) 
            };
            
            graphics.updateNodePosition(node.ui, position);
        },
        
        renderGraph = function(){
            if(settings.renderLinks) {
                graph.forEachLink(renderLink);
            }

            graph.forEachNode(renderNode);
        },
        
        onRenderFrame = function() {
            var completed = layout.step();
            renderGraph();
            
            return !completed;
        },
    
       renderIterations = function(iterationsCount) {
           if (animationTimer) {
               totalIterationsCount += iterationsCount;
               return;
           }
           
           if (iterationsCount) {
               totalIterationsCount += iterationsCount;
               
               animationTimer = Viva.Graph.Utils.timer(function() {
                   currentStep++;
                   onRenderFrame();
                   var isOver = currentStep >= totalIterationsCount;
                   if (isOver) { animationTimer = null;}
                   return !isOver;
               }, FRAME_INTERVAL);
           } else { 
                currentStep = 0;
                totalIterationsCount = 0;
                animationTimer = Viva.Graph.Utils.timer(onRenderFrame, FRAME_INTERVAL);
           }
       },
       
       increaseTotalIterations = function(increaseBy){
           if (totalIterationsCount > 0){
               renderIterations(increaseBy);
           }
       },
       
       prerender = function() {
           // To get good initial positions for the graph
           // perform several prerender steps in background.
           if (typeof settings.prerender === 'number' && settings.prerender > 0){
               for (var i = 0; i < settings.prerender; ++i){
                   layout.step();
               }
           } else {
               layout.step(); // make one step to init positions property.
           }
       },
       
       updateCenter = function() {
           var graphRect = layout.getGraphRect(),
               containerSize = Viva.Utils.getDimension(container);
           
           viewPortOffset.x = viewPortOffset.y = 0;
           transform.offsetX = containerSize.width / 2 - (graphRect.x2 + graphRect.x1) / 2;
           transform.offsetY = containerSize.height / 2 - (graphRect.y2 + graphRect.y1) / 2;
           graphics.translate(transform.offsetX + viewPortOffset.x, transform.offsetY + viewPortOffset.y);
           
           updateCenterRequired = false;
       },
       
       createNodeUi = function(node) {
           var nodeUI = graphics.node(node);
           node.ui = nodeUI;
           graphics.initNode(nodeUI);
           if (!node.position) {
               layout.addNode(node);
           }
           
           renderNode(node);
       },
       
       removeNodeUi = function (node) {
           if (node.ui){
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

           renderLink(link);
       },
       
       removeLinkUi = function(link) {
           if (link.ui) { 
               graphics.releaseLink(link.ui);
               link.ui = null;
               delete link.ui; 
           }
       },
       
       listenNodeEvents = function(node) {
            var wasPinned = false;
            node.events = Viva.Graph.Utils.dragndrop(node.ui)
                .onStart(function(){
                    wasPinned = node.isPinned;
                    node.isPinned = true;
                })
                .onDrag(function(e, offset){
                    node.position.x += offset.x / transform.scaleX;
                    node.position.y += offset.y / transform.scaleY;
                    increaseTotalIterations(2);
                })
                .onStop(function(){
                    node.isPinned = wasPinned;
                    increaseTotalIterations(100);
                });
        },
        
        releaseNodeEvents = function(node) {
            if (node.events) {
                // TODO: i'm not sure if this is required in JS world...
                node.events.release();
                node.events = null;
                delete node.events;
            }
        },
       
       initDom = function() {
           graphics.init(container);
           
           if(settings.renderLinks) {
                graph.forEachLink(createLinkUi);
           }
           
           graph.forEachNode(createNodeUi);
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
                graphics.translate(transform.offsetX + viewPortOffset.x, transform.offsetY + viewPortOffset.y);
                
                renderGraph();
            });
            
            containerDrag.onScroll(function(e, scaleOffset) {
                var scale = transform.scaleX,
                    ds = scale * 0.05;
                    
                if (scaleOffset < 0) {
                    ds = -ds;
                }
                
                scale += ds;
                if (scale > 0) {
                    transform.scaleX = transform.scaleY = scale;
                    graphics.scale(transform.scaleX, transform.scaleY);
                }
            });
            
            graph.forEachNode(listenNodeEvents);
            
            Viva.Graph.Utils.events(graph).on('changed', function(changes){
                for(var i = 0; i < changes.length; ++i){
                    var change = changes[i];
                    if (change.node) {
                        processNodeChange(change);
                    } else if (change.link) {
                        processLinkChange(change);
                    }
                }
                
                increaseTotalIterations(100);
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
        }
    };
};
