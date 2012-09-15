/**
 * @fileOverview Defines a graph renderer that uses SVG based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */
/*global Viva*/
Viva.Graph.View = Viva.Graph.View || {};

/**
 * Performs svg-based graph rendering. This module does not perform
 * layout, but only visualizes nodes and edeges of the graph.
 */
Viva.Graph.View.svgGraphics = function () {
    var svgContainer,
        svgRoot,
        offsetX,
        offsetY,
        actualScale = 1,

        nodeBuilder = function (node) {
            return Viva.Graph.svg('rect')
                     .attr('width', 10)
                     .attr('height', 10)
                     .attr('fill', '#00a2e8');
        },

        nodePositionCallback = function (nodeUI, pos) {
            // TODO: Remove magic 5. It should be halfo of the width or height of the node.
            nodeUI.attr("x", pos.x - 5)
                  .attr("y", pos.y - 5);
        },

        linkBuilder = function (link) {
            return Viva.Graph.svg('line')
                              .attr('stroke', '#999');
        },

        linkPositionCallback = function (linkUI, fromPos, toPos) {
            linkUI.attr("x1", fromPos.x)
                  .attr("y1", fromPos.y)
                  .attr("x2", toPos.x)
                  .attr("y2", toPos.y);
        },

        fireRescaled = function (graphics) {
            // TODO: maybe we shall copy changes? 
            graphics.fire('rescaled');
        },

        updateTransform = function () {
            if (svgContainer) {
                var transform = 'matrix(' + actualScale + ", 0, 0," + actualScale + "," + offsetX + "," + offsetY + ")";
                svgContainer.attr('transform', transform);
            }
        };

    var graphics = {
        /**
         * Sets the collback that creates node representation or creates a new node
         * presentation if builderCallbackOrNode is not a function. 
         * 
         * @param builderCallbackOrNode a callback function that accepts graph node
         * as a parameter and must return an element representing this node. OR
         * if it's not a function it's treated as a node to which DOM element should be created.
         * 
         * @returns If builderCallbackOrNode is a valid callback function, instance of this is returned;
         * Otherwise a node representation is returned for the passed parameter.
         */
        node : function (builderCallbackOrNode) {

            if (builderCallbackOrNode && typeof builderCallbackOrNode !== 'function'){
                return nodeBuilder(builderCallbackOrNode);
            }

            nodeBuilder = builderCallbackOrNode;

            return this;
        },

        /**
         * Sets the collback that creates link representation or creates a new link
         * presentation if builderCallbackOrLink is not a function. 
         * 
         * @param builderCallbackOrLink a callback function that accepts graph link
         * as a parameter and must return an element representing this link. OR
         * if it's not a function it's treated as a link to which DOM element should be created.
         * 
         * @returns If builderCallbackOrLink is a valid callback function, instance of this is returned;
         * Otherwise a link representation is returned for the passed parameter.
         */
        link : function (builderCallbackOrLink) {
            if (builderCallbackOrLink && typeof builderCallbackOrLink !== 'function') {
                return linkBuilder(builderCallbackOrLink);
            }

            linkBuilder = builderCallbackOrLink;
            return this;
        },

        /**
         * Allows to override default position setter for the node with a new
         * function. newPlaceCallback(nodeUI, position) is function which
         * is used by updateNodePosition().
         */
        placeNode : function (newPlaceCallback) {
            nodePositionCallback = newPlaceCallback;
            return this;
        },

        placeLink : function (newPlaceLinkCallback) {
            linkPositionCallback = newPlaceLinkCallback;
            return this;
        },

        /**
         * Called every before renderer starts rendering.
         */
        beginRender : function () {},

        /**
         * Called every time when renderer finishes one step of rendering.
         */
        endRender : function () {},

        /**
         * Sets translate operation that should be applied to all nodes and links.
         */
        graphCenterChanged : function (x, y) {
            offsetX = x;
            offsetY = y;
            updateTransform();
        },
        
        /**
         * Default input manager listens to DOM events to process nodes drag-n-drop    
         */
        inputManager : Viva.Input.domInputManager,

        translateRel : function (dx, dy) {
            var p = svgRoot.createSVGPoint(),
                t = svgContainer.getCTM(),
                origin = svgRoot.createSVGPoint().matrixTransform(t.inverse());

            p.x = dx;
            p.y = dy;

            p = p.matrixTransform(t.inverse());
            p.x = (p.x - origin.x) * t.a;
            p.y = (p.y - origin.y) * t.d;

            t.e += p.x;
            t.f += p.y;

            var transform = 'matrix(' + t.a + ", 0, 0," + t.d + "," + t.e + "," + t.f + ")";
            svgContainer.attr('transform', transform);
        },

        scale : function(scaleFactor, scrollPoint) {
            var p = svgRoot.createSVGPoint();
            p.x = scrollPoint.x;
            p.y = scrollPoint.y;
            
            p = p.matrixTransform(svgContainer.getCTM().inverse()); // translate to svg coordinates
            
            // Compute new scale matrix in current mouse position
            var k = svgRoot.createSVGMatrix().translate(p.x, p.y).scale(scaleFactor).translate(-p.x, -p.y),
                t = svgContainer.getCTM().multiply(k);

            actualScale = t.a;
            offsetX = t.e;
            offsetY = t.f;
            var transform = 'matrix(' + t.a + ", 0, 0," + t.d + "," + t.e + "," + t.f + ")";
            svgContainer.attr('transform', transform);
            
            fireRescaled(this);
            return actualScale;
        },
        
        resetScale : function(){
            actualScale = 1;
            var transform = 'matrix(1, 0, 0, 1, 0, 0)';
            svgContainer.attr('transform', transform);
            fireRescaled(this);
            return this;
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output 
        * provider prepare to render.
        */
       init : function(container) {
           svgRoot = Viva.Graph.svg("svg");
           
           svgContainer = Viva.Graph.svg("g")
                .attr('buffered-rendering', 'dynamic');

           svgRoot.appendChild(svgContainer);
           container.appendChild(svgRoot);
           updateTransform();
       },
       
       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider prepare to render given link of the graph
        * 
        * @param linkUI visual representation of the link created by link() execution.
        */
       initLink : function(linkUI) {
            if (!linkUI) { return; }
            if (svgContainer.childElementCount > 0) {
               svgContainer.insertBefore(linkUI, svgContainer.firstChild);
            } else {
                svgContainer.appendChild(linkUI);
            }
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider remove link from rendering surface.
       * 
       * @param linkUI visual representation of the link created by link() execution.
       **/
       releaseLink : function(linkUI) {
           svgContainer.removeChild(linkUI);
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider prepare to render given node of the graph.
       * 
       * @param nodeUI visual representation of the node created by node() execution.
       **/
       initNode : function(nodeUI) {
           svgContainer.appendChild(nodeUI);
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider remove node from rendering surface.
       * 
       * @param nodeUI visual representation of the node created by node() execution.
       **/
       releaseNode : function(nodeUI) {
           svgContainer.removeChild(nodeUI);
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider place given node UI to recommended position pos {x, y};
       */ 
       updateNodePosition : function(nodeUI, pos) {
           nodePositionCallback(nodeUI, pos);
       },
       
       /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider place given link of the graph. Pos objects are {x, y};
       */  
       updateLinkPosition : function(link, fromPos, toPos) {
           linkPositionCallback(link, fromPos, toPos);
       },
       
       /**
        * Returns root svg element. 
        * 
        * Note: This is internal method specific to this renderer
        * TODO: Renoame this to getGraphicsRoot() to be uniform accross graphics classes
        */
       getSvgRoot : function() {
           return svgRoot;
       }
    };
    
    // Let graphics fire events before we return it to the caller.
    Viva.Graph.Utils.events(graphics).extend();
    
    return graphics;
};
