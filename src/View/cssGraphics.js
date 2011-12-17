/**
 * @fileOverview Defines a graph renderer that uses CSS based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */
/*global Viva*/
Viva.Graph.View = Viva.Graph.View || {};

/**
 * Performs css-based graph rendering. This module does not perform
 * layout, but only visualizes nodes and edeges of the graph.
 * 
 */
Viva.Graph.View.cssGraphics = function() {
    var container, // Where graph will be rendered

       /** 
        * Returns a function (ui, x, y, angleRad).
        * 
        * The function attempts to rotate 'ui' dom element on 'angleRad' radians
        * and position it to 'x' 'y' coordinates.
        * 
        * Operation works in most modern browsers that support transform css style
        * and IE.  
        * */
        positionLink = (function() {
            var browserName = Viva.BrowserInfo.browser;
            var prefix = '';
    
            switch (browserName) {
                case 'mozilla' :
                    prefix = 'Moz';
                    break;
                case 'webkit' :
                    prefix = 'webkit';
                    break;
                case 'opera' :
                    prefix = 'O';
                    break;
                case 'msie' :
                    var version = Viva.BrowserInfo.version.split(".")[0];
                    if(version > 8) {
                        prefix = 'ms';
                    } else {
                        return function(ui, x, y, angleRad) {
                            var cos = Math.cos(angleRad);
                            var sin = Math.sin(angleRad);

                            // IE 6, 7 and 8 are screwed up when it comes to transforms;
                            // I could not find justification for their choice of "floating"
                            // matrix transform origin. The following ugly code was written
                            // out of complete dispair.
                            if(angleRad < 0) {
                                angleRad = 2 * Math.PI + angleRad;
                            }

                            if(angleRad < Math.PI / 2) {
                                ui.style.left = x + 'px';
                                ui.style.top = y + 'px';
                            } else if(angleRad < Math.PI) {
                                ui.style.left = x - (ui.clientWidth) * Math.cos(Math.PI - angleRad);
                                ui.style.top = y;
                            } else if(angleRad < (Math.PI + Math.PI / 2)) {
                                ui.style.left = x - (ui.clientWidth) * Math.cos(Math.PI - angleRad);
                                ui.style.top = y + (ui.clientWidth) * Math.sin(Math.PI - angleRad);
                            } else {
                                ui.style.left = x;
                                ui.style.top = y + ui.clientWidth * Math.sin(Math.PI - angleRad);
                            }
                            ui.style.filter = "progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand'," + "M11=" + cos + ", M12=" + (-sin) + "," + "M21=" + sin + ", M22=" + cos + ");";
                        };
                    }
                    break;
            }
    
            if(prefix) {
                return function(ui, x, y, angleRad) {
                    ui.style.left = x + 'px';
                    ui.style.top = y + 'px';
    
                    ui.style[prefix + 'Transform'] = 'rotate(' + angleRad + 'rad)';
                    ui.style[prefix + 'TransformOrigin'] = 'left';
                };
            } else {
                return function(ui, x, y, angleRad) {
                    // Don't know how to rotate links in other browsers.
                };
            }
        })(),
        
         nodeBuilder = function(node){
            var nodeUI = document.createElement('div');
            nodeUI.setAttribute('class', 'node');
            return nodeUI;
         },
        
         nodePositionCallback = function(nodeUI, pos) {
            // TODO: Remove magic 5. It should be half of the width or height of the node.
            nodeUI.style.left = pos.x - 5 + 'px';
            nodeUI.style.top = pos.y - 5 + 'px';
        },
        
        linkPositionCallback = function(linkUI, fromPos, toPos) {
            var dx = fromPos.x - toPos.x;
            var dy = fromPos.y - toPos.y;
            var length = Math.sqrt(dx * dx + dy * dy);
            
            linkUI.style.height = '1px';
            linkUI.style.width = length + 'px';
    
            positionLink(linkUI, toPos.x, toPos.y, Math.atan2(dy, dx));
        },
        
        linkBuilder = function(link) {
            var linkUI = document.createElement('div');
            linkUI.setAttribute('class', 'link');
            
            return linkUI;
        };
        
    return {
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
        node : function(builderCallbackOrNode) {
            
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
        link : function(builderCallbackOrLink){
            if (builderCallbackOrLink && typeof builderCallbackOrLink !== 'function'){
                return linkBuilder(builderCallbackOrLink);
            }
            
            linkBuilder = builderCallbackOrLink;
            return this;
        },

        
        /**
         * Allows to override default position setter for the node with a new
         * function. newPlaceCallback(node, position) is function which
         * is used by updateNode().
         */
        placeNode : function(newPlaceCallback){
            nodePositionCallback = newPlaceCallback;
            return this;
        },
        
        placeLink : function(newPlaceLinkCallback){
            linkPositionCallback = newPlaceLinkCallback;
            return this;
        },
        
        /**
         * Called by Viva.Graph.View.renderer to let concrete graphic output 
         * providers prepare to render.
         */
        init : function (parentContainer) {
            container = parentContainer;
        },
        
       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider prepare to render given link of the graph
        * 
        * @param linkUI visual representation of the link created by link() execution.
        */
       initLink : function(linkUI) {
           if(container.childElementCount > 0) {
               container.insertBefore(linkUI, container.firstChild);
           } else {
               container.appendChild(linkUI);
           }
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider remove link from rendering surface.
       * 
       * @param linkUI visual representation of the link created by link() execution.
       **/
       releaseLink : function(linkUI) {
           container.removeChild(linkUI);
       },
       
      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider prepare to render given node of the graph.
       * 
       * @param nodeUI visual representation of the node created by node() execution.
       **/
       initNode : function(nodeUI) {
           container.appendChild(nodeUI);
       },
       
      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider remove node from rendering surface.
       * 
       * @param nodeUI visual representation of the node created by node() execution.
       **/
       releaseNode : function(nodeUI) {
           container.removeChild(nodeUI);
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider place given node to recommended position pos {x, y};
       */ 
       updateNodePosition : function(node, pos) {
           nodePositionCallback(node, pos);
       },

      /**
       * Called by Viva.Graph.View.renderer to let concrete graphic output
       * provider place given link of the graph
       */  
       updateLinkPosition : function(link, fromPos, toPos) {
           linkPositionCallback(link, fromPos, toPos);
       }
    };
};
