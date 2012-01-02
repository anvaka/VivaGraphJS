/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

// TODO: rename all links to edges. Otherwise it's incositent
var Viva = Viva || {};

Viva.Graph = Viva.Graph || {};
Viva.Graph.version = '1.0.0.42';/*global Viva*/

Viva.BrowserInfo = (function(){
    var ua = navigator.userAgent;
    
    // Useragent RegExp
    var rwebkit = /(webkit)[ \/]([\w.]+)/;
    var ropera = /(opera)(?:.*version)?[ \/]([\w.]+)/;
    var rmsie = /(msie) ([\w.]+)/;
    var rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/;
    
    ua = ua.toLowerCase();

    var match = rwebkit.exec( ua ) ||
                ropera.exec( ua ) ||
                rmsie.exec( ua ) ||
                ua.indexOf("compatible") < 0 && rmozilla.exec( ua ) || [];

    return { 
        browser: match[1] || "", 
        version: match[2] || "0" 
    };
})();
/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/
Viva.Graph.Utils = Viva.Graph.Utils || {};

Viva.Graph.Utils.indexOfElementInArray = function(element, array) {
    if (array.indexOf) {
        return array.indexOf(element);
    }

    var len = array.length;
    var i = 0;

    for ( ; i < len; i++ ) {
        if ( i in array && array[i] === element ) {
            return i;
        }
    }
    
    return -1;
};
/*global Viva*/

Viva.Utils = (function(){
    return {
        getDimension : function(container){
            if (!container){
                throw {
                    message : 'Cannot get dimensions of undefined container'
                };
            }
            
            // TODO: Potential cross browser bug.
            var width = container.clientWidth;
            var height = container.clientHeight;
            
            return {
                left : 0,
                top : 0,
                width : width,
                height : height
            };
        }
    };
})();
/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva, window*/
Viva.Graph.Utils = Viva.Graph.Utils || {};

// TODO: I don't really like the way I implemented events. It looks clumsy and
// hard to understand. Refactor it. 

/**
 * Allows to start/stop listen to element's events. An element can be arbitrary
 * DOM element, or object with eventuality behavior. 
 * 
 * To add eventuality behavior to arbitrary object 'obj' call 
 * Viva.Graph.Utils.event(obj).extend() method.
 * After this call is made the object can use obj.fire(eventName, params) method, and listeners
 * can listen to event by Viva.Graph.Utils.events(obj).on(eventName, callback) method.
 */
Viva.Graph.Utils.events = function(element){
    
    /**
     * Extends arbitrary object with fire method and allows it to be used with on/stop methods.
     * 
     * This behavior is based on Crockford's eventuality example, but with a minor changes:
     *   - fire() method accepts parameters to pass to callbacks (instead of setting them in 'on' method)
     *   - on() method is replaced with addEventListener(), to let objects be used as a DOM objects.
     *   - behavoir contract is simplified to "string as event name"/"function as callback" convention.
     *   - removeEventListener() method added to let unsubscribe from events.
     */
    var eventuality = function(that){
        var registry = {};
        
        /**
         * Fire an event on an object. The event is a string containing the name of the event 
         * Handlers registered by the 'addEventListener' method that match the event name 
         * will be invoked.
         */ 
        that.fire = function (eventName, parameters) {
            var registeredHandlers,
                callback,
                handler;
           
            if (typeof eventName !== 'string') {
                throw 'Only strings can be used as even type';
            }
            
            // If an array of handlers exist for this event, then
            // loop through it and execute the handlers in order.
            if (registry.hasOwnProperty(eventName)) {
                registeredHandlers = registry[eventName];
                for (var i = 0; i < registeredHandlers.length; ++i) {
                    handler = registeredHandlers[i];
                    callback = handler.method;
                    callback(parameters);
                }
            }
            
            return this;
        };
        
        that.addEventListener = function (eventName, callback) {
            if (typeof callback !== 'function'){
                throw 'Only functions allowed to be callbacks';
            }
            
            var handler = {
                method: callback
            };
            if (registry.hasOwnProperty(eventName)) {
                registry[eventName].push(handler);
            } else {
                registry[eventName] = [handler];
            }
            
            return this;
        };
        
        that.removeEventListener = function(eventName, callback){
            if (typeof callback !== 'function'){
                throw 'Only functions allowed to be callbacks';
            }
            
            if (registry.hasOwnProperty(eventName)) {
                var handlers = registry[eventName];
                for (var i = 0; i < handlers.length; ++i) {
                   if (handlers[i].callback === callback) {
                       handlers.splice(i);
                       break;
                   } 
                }
            }
            
            return this;
        };
        
        return that;        
    };
    
    return {
        /**
         * Registes callback to be called when element fires event with given event name.
         */
        on : function(eventName, callback) {
            if (element.addEventListener) {// W3C DOM and eventuality objecets.
                element.addEventListener(eventName, callback, false);
            } else if (element.attachEvent) { // IE DOM
                element.attachEvent("on" + eventName, callback);
            }
            
            return this;
        },
        
        /**
         * Unsubcribes from object's events.
         */
        stop : function(eventName, callback) {
            if (element.removeEventListener) {
                element.removeEventListener(eventName, callback, false);
            } else if (element.detachEvent) {
                element.detachEvent('on' + eventName, callback);
            }
        },
        
        /**
         * Adds eventuality to arbitrary JavaScript object. Eventuality adds
         * fire(), addEventListner() and removeEventListners() to the target object.
         *  
         * This is required if you want to use object with on(), stop() methods.
         */
        extend : function(){
            return eventuality(element);
        }
    };
};/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva, window*/
Viva.Graph.Utils = Viva.Graph.Utils || {};
// TODO: Add support for touch events: http://www.sitepen.com/blog/2008/07/10/touching-and-gesturing-on-the-iphone/
Viva.Graph.Utils.dragndrop = function(element) {
    
    var start,
        drag,
        end,
        prevSelectStart, 
        prevDragStart,
        documentEvents = Viva.Graph.Utils.events(window.document),
        elementEvents = Viva.Graph.Utils.events(element),
        
        startX = 0,
        startY = 0,
        dragObject,
        
        stopPropagation = function (e)
        {
            if (e.stopPropagation) { e.stopPropagation(); }
            else { 
                e.cancelBubble = true; 
            }
        },
        
        handleDisabledEvent = function(e) {
            stopPropagation(e);
            return false;
        },
        
        handleMouseMove = function(e) {
            e = e || window.event;

            if (drag){
                drag(e, {x : e.clientX - startX, y : e.clientY - startY });
            }
            
            startX = e.clientX;
            startY = e.clientY;
        },
        
        handleMouseDown = function(e) {
            e = e || window.event;

            // for IE, left click == 1
            // for Firefox, left click == 0
            var isLeftButton = (e.button === 1 && window.event !== null || e.button === 0);
            
            if (isLeftButton) {
                startX = e.clientX;
                startY = e.clientY;
                
                // TODO: bump zIndex?
                dragObject = e.target || e.srcElement;

                if (start) { start(e, {x: startX, y : startY}); }
                
                documentEvents.on('mousemove', handleMouseMove);
                documentEvents.on('mouseup', handleMouseUp);
                
                stopPropagation(e);
                // TODO: This is suggested here: http://luke.breuer.com/tutorial/javascript-drag-and-drop-tutorial.aspx
                // do we need it? What if event already there?
                // Not bullet proof:
                prevSelectStart = document.onselectstart;
                prevDragStart = document.ondragstart;
                
                document.onselectstart = handleDisabledEvent;
                dragObject.ondragstart = handleDisabledEvent;

                // prevent text selection (except IE)
                return false;
            }
        },
        
        handleMouseUp = function(e) {
            e = e || window.event;

            documentEvents.stop('mousemove', handleMouseMove);
            documentEvents.stop('mouseup', handleMouseUp);
                
            document.onselectstart = prevSelectStart;
            dragObject.ondragstart = prevDragStart; 
            dragObject = null;
            if (end) { end(); }
        };
    
    elementEvents.on('mousedown', handleMouseDown);

    return {
        onStart : function(callback) {
            start = callback;
            return this;
        },
        
        onDrag : function(callback) {
            drag = callback;
            return this;
        },
        
        onStop : function(callback) {
            end = callback;
            return this;
        },
        
        release : function() {
            // TODO: could be unsafe. We might wanna release dragObject, etc.
            documentEvents.stop('mousemove', handleMouseMove);
            documentEvents.stop('mousedown', handleMouseDown);
            documentEvents.stop('mouseup', handleMouseUp);
        }
    };
};
/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva, window*/
Viva.Graph.Utils = Viva.Graph.Utils || {};

/**
 * Timer that fires callback with given interval (in ms) until
 * callback returns true;
 */
Viva.Graph.Utils.timer = function(callback, interval){
 // I wanted to extract this to make further transition to 
 // requestAnimationFrame easier: http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 var intervalId = setInterval(function() {
        if (!callback()) { clearInterval(intervalId); }
    }, interval);
    
    return {
        /**
         * Stops execution of the callback
         */
        stop: function() {
            clearInterval(intervalId);
        }
    };
};
/*global Viva*/

Viva.Graph.geom = function() {
    
    return {
        // function from Graphics GEM to determine lines intersection:
        // http://www.opensource.apple.com/source/graphviz/graphviz-498/graphviz/dynagraph/common/xlines.c
        intersect : function(x1, y1, x2, y2, // first line segment
                            x3, y3, x4, y4) { // second line segment
            var a1, a2, b1, b2, c1, c2, /* Coefficients of line eqns. */
                r1, r2, r3, r4,         /* 'Sign' values */
                denom, offset, num,     /* Intermediate values */
                result = { x: 0, y : 0};

            /* Compute a1, b1, c1, where line joining points 1 and 2
             * is "a1 x  +  b1 y  +  c1  =  0".
             */
            a1 = y2 - y1;
            b1 = x1 - x2;
            c1 = x2 * y1 - x1 * y2;

            /* Compute r3 and r4.
             */
            r3 = a1 * x3 + b1 * y3 + c1;
            r4 = a1 * x4 + b1 * y4 + c1;

            /* Check signs of r3 and r4.  If both point 3 and point 4 lie on
             * same side of line 1, the line segments do not intersect.
             */
        
            if (r3 !== 0 && r4 !== 0 && ((r3 >= 0) === (r4 >= 4))) {
                return null; //no itersection.
            }

            /* Compute a2, b2, c2 */
            a2 = y4 - y3;
            b2 = x3 - x4;
            c2 = x4 * y3 - x3 * y4;

            /* Compute r1 and r2 */
        
            r1 = a2 * x1 + b2 * y1 + c2;
            r2 = a2 * x2 + b2 * y2 + c2;
        
            /* Check signs of r1 and r2.  If both point 1 and point 2 lie
             * on same side of second line segment, the line segments do
             * not intersect.
             */
            if (r1 !== 0 && r2 !== 0 && ((r1 >= 0) === (r2 >= 0 ))) {
                return null; // no intersection;
            }
            /* Line segments intersect: compute intersection point. 
             */

            denom = a1 * b2 - a2 * b1;
            if ( denom === 0 ) {
                return null; // Actually collinear..
            }

            offset = denom < 0 ? - denom / 2 : denom / 2;
            offset = 0.0;

            /* The denom/2 is to get rounding instead of truncating.  It
             * is added or subtracted to the numerator, depending upon the
             * sign of the numerator.
             */
        
            
            num = b1 * c2 - b2 * c1;
            result.x = ( num < 0 ? num - offset : num + offset ) / denom;
        
            num = a2 * c1 - a1 * c2;
            result.y = ( num < 0 ? num - offset : num + offset ) / denom;
        
            return result;                                
        },
                
        intersectRect : function(left, top, right, bottom, x1, y1, x2, y2) {
            return this.intersect(left, top, left, bottom, x1, y1, x2, y2) ||
                   this.intersect(left, bottom, right, bottom, x1, y1, x2, y2) ||
                   this.intersect(right, bottom, right, top, x1, y1, x2, y2) ||
                   this.intersect(right, top, left, top, x1, y1, x2, y2);
        }
    };
};/**
 * @fileOverview Contains definition of the core graph object.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/

/**
 * @namespace Represents a graph data structure.
 *
 * @example
 *  var g = Viva.Graph.graph();
 *  g.addNode(1);     // g has one node.
 *  g.addLink(2, 3);  // now g contains three nodes and one link.
 *
 */
Viva.Graph.graph = function() {
    
    // Graph structure is maintained as dictionary of nodes
    // and array of links. Each node has 'links' property which 
    // hold all links related to that node. And general links
    // array is used to speed up all links enumeration. This is inefficient
    // in terms of memory, but simplifies coding. Furthermore, the graph structure
    // is isolated from outter world, and can be changed to adjacency matrix later.
    
    var nodes = {},
        links = [],
        nodesCount = 0,
        suspendEvents = 0,
        
        // Accumlates all changes made during graph updates.
        // Each change element contains:
        //  changeType - one of the strings: 'add', 'remove' or 'update';
        //  node - if change is related to node this property is set to changed graph's node;
        //  link - if change is related to link this property is set to changed graph's link;
        changes = [],
    
        fireGraphChanged = function(graph){
            // TODO: maybe we shall copy changes? 
            graph.fire('changed', changes);
        },
        
        // Enter, Exit Mofidication allows bulk graph updates without firing events.
        enterModification = function(graph){
            suspendEvents += 1;
        },
        
        exitModification = function(graph){
            suspendEvents -= 1;
            if (suspendEvents === 0 && changes.length > 0){
                fireGraphChanged(graph);
                changes.length = 0;
            }
        },
        
        recordNodeChange = function(node, changeType){
            // TODO: Could add changeType verification.
            changes.push( {node : node, changeType : changeType} );
        },
        
        recordLinkChange = function(link, changeType){
            // TODO: Could add change type verification;
            changes.push( {link : link, changeType : changeType} );
        },
        
        isArray = function (value) { 
            return value &&
                   typeof value === 'object' &&
                   typeof value.length === 'number' &&
                   typeof value.splice === 'function' && 
                   !(value.propertyIsEnumerable('length'));
        };

    /** @scope Viva.Graph.graph */
    var graphPart = {

        /**
         * Adds node to the graph. If node with given id already exists in the graph
         * its data is extended with whatever comes in 'data' argument.
         *
         * @param nodeId the node's identifier. A string is preferred.
         * @param [data] additional data for the node being added. If node already
         *   exists its data object is augmented with the new one.
         *
         * @return {node} The newly added node or node with given id if it already exists.
         */
        addNode : function(nodeId, data) {
            if( typeof nodeId === 'undefined') {
                throw {
                    message: 'Invalid node identifier'
                };
            }
            
            enterModification();

            var node = this.getNode(nodeId);
            if(!node) {
                node = {};
                node.links = [];
                node.id = nodeId;
                nodesCount++;
                
                recordNodeChange(node, 'add');
            } else {
                recordNodeChange(node, 'update');
            }

            if(data) {
                var augmentedData = node.data || {};
                if (typeof data === 'string' || isArray(data)) {
                    augmentedData = data;
                } else {
                    for(var name in data) {
                        // TODO: Do we want to copy everything, including prototype's properties?
                        if (data.hasOwnProperty(name)){
                            augmentedData[name] = data[name];
                        }
                    }
                }

                node.data = augmentedData;
            }

            nodes[nodeId] = node;

            exitModification(this);
            return node;
        },
        
        /**
         * Adds a link to the graph. The function always create a new
         * link between two nodes. If one of the nodes does not exists
         * a new node is created.
         *
         * @param fromId link start node id;
         * @param toId link end node id;
         * @param [data] additional data to be set on the new link;
         *
         * @return {link} The newly created link
         */
        addLink : function(fromId, toId, data) {
            enterModification();
            // It is not oriented graph. Probably have to rethink this.
            var fromNode = this.getNode(fromId) || this.addNode(fromId);
            var toNode = this.getNode(toId) || this.addNode(toId);

            var link = {
                fromId : fromId,
                toId : toId,
                data : data
            };

            links.push(link);

            // TODO: this is not cool. On large graphs potentially would consume more memory.
            fromNode.links.push(link);
            toNode.links.push(link);
            
            recordLinkChange(link, 'add');
            
            exitModification(this);

            return link;
        },
        
        /**
         * Removes link from the graph. If link does not exist does nothing.
         * 
         * @param link - object returned by addLink() or getLinks() methods.
         * 
         * @returns true if link was removed; false otherwise.  
         */
        removeLink : function(link) {
            if (!link) { return false; }
            var idx = Viva.Graph.Utils.indexOfElementInArray(link, links);
            if (idx < 0) { return false; }
            
            enterModification();
            
            links.splice(idx, 1);
            
            var fromNode = this.getNode(link.fromId);
            var toNode = this.getNode(link.toId);
            
            if (fromNode) { 
                idx = Viva.Graph.Utils.indexOfElementInArray(link, fromNode.links);
                if (idx >= 0) { 
                    fromNode.links.splice(idx, 1);
                } 
            }
            
            if (toNode) { 
                idx = Viva.Graph.Utils.indexOfElementInArray(link, toNode.links);
                if (idx >= 0) { 
                    toNode.links.splice(idx, 1);
                } 
            }
            
            recordLinkChange(link, 'remove');
            
            exitModification(this);
            
            return true;
        },
        
        /**
         * Removes node with given id from the graph. If node does not exist in the graph
         * does nothing.
         * 
         * @param nodeId node's identifier passed to addNode() function. 
         * 
         * @returns true if node was removed; false otherwise.
         */
        removeNode: function(nodeId) {
            var node = this.getNode(nodeId);
            if (!node) { return false; }
            
            enterModification();
            
            while(node.links.length){
                var link = node.links[0];
                this.removeLink(link);
            }
            
            nodes[nodeId] = null;
            delete nodes[nodeId];
            nodesCount--;
            
            recordNodeChange(node, 'remove');
            
            exitModification(this);
        },
        
        /**
         * Gets node with given identifier. If node does not exist undefined value is returned.
         *
         * @param nodeId requested node identifier;
         *
         * @return {node} in with requested identifier or undefined if no such node exists.
         */
        getNode : function(nodeId) {
            return nodes[nodeId];
        },
        
        /**
         * Gets number of nodes in this graph.
         *
         * @return number of nodes in the graph.
         */
        getNodesCount : function() {
            return nodesCount;
        },
        
        /**
         * Gets all links (inbound and outbound) from the node with given id.
         * If node with given id is not found null is returned.
         *
         * @param nodeId requested node identifier.
         *
         * @return Array of links from and to requested node if such node exists;
         *   otherwise null is returned.
         */
        getLinks : function(nodeId) {
            var node = this.getNode(nodeId);
            return node ? node.links : null;
        },
        
        /**
         * Invokes callback on each node of the graph.
         *
         * @param {Function(node)} callback Function to be invoked. The function
         *   is passed one argument: visited node.
         */
        forEachNode : function(callback) {
            if( typeof callback !== 'function') {
                return;
            }

            // TODO: could it be faster for nodes iteration if we had indexed access?
            // I.e. use array + 'for' iterator instead of dictionary + 'for .. in'?
            for(var node in nodes) {
                // For performance reasons you might want to sacrifice this sanity check:
                if(nodes.hasOwnProperty(node)) {
                    callback(nodes[node]);
                }
            }
        },
        
        /**
         * Invokes callback on every linked (adjacent) node to the given one.
         *
         * @param nodeId Identifier of the requested node.
         * @param {Function(node, link)} callback Function to be called on all linked nodes.
         *   The function is passed two parameters: adjacent node and link object itself.
         */
        forEachLinkedNode : function(nodeId, callback) {
            var node = this.getNode(nodeId);
            if(node && node.links && typeof callback === 'function') {
                for(var i = 0; i < node.links.length; ++i) {
                    var link = node.links[i];
                    var linkedNodeId = link.fromId === nodeId ? link.toId : link.fromId;

                    callback(nodes[linkedNodeId], link);
                }
            }
        },
        
        /**
         * Enumerates all links in the graph
         *
         * @param {Function(link)} callback Function to be called on all links in the graph.
         *   The function is passed one parameter: graph's link object.
         * 
         * Link object contains at least the following fields:
         *  fromId - node id where link starts;
         *  toId - node id where link ends,
         *  data - additional data passed to graph.addLink() method.
         */
        forEachLink : function(callback) {
            if( typeof callback === 'function') {
                for(var i = 0; i < links.length; ++i) {
                    callback(links[i]);
                }
            }
        },
        
        /**
         * Suspend all notifications about graph changes until
         * endUpdate is called.
         */
        beginUpdate : function() {
            enterModification();
        },
        
        /**
         * Resumes all notifications about graph changes and fires
         * graph 'changed' event in case there are any pending changes.
         */
        endUpdate : function() {
            exitModification(this);
        },
        
        /**
         * Removes all nodes and links from the graph.
         */
        clear : function(){
            var that = this;
            that.beginUpdate();
            that.forEachNode(function(node){ that.removeNode(node.id); });
            that.endUpdate();
        },
        
        /**
         * Detects whether there is a link between two nodes. 
         * Operation complexity is O(n) where n - number of links of a node.
         * 
         * @returns link if there is one. null otherwise.
         */
        hasLink : function(fromNodeId, toNodeId) {
            // TODO: Use adjacency matrix to speed up this operation.
            var node = this.getNode(fromNodeId);
            if (!node) {
                return null;
            }
            
            for (var i = 0; i < node.links.length; ++i) {
                var link = node.links[i];
                if (link.fromId === fromNodeId && link.toId === toNodeId) {
                    return link;
                }
            }
            
            return null; // no link.
        }
    };
    
    // Let graph fire events before we return it to the caller.
    Viva.Graph.Utils.events(graphPart).extend();
    
    return graphPart;
};
/**
 * @fileOverview Contains collection of graph generators.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/

Viva.Graph.generator = function() {

    return {
        /**
         * Generates complete graph Kn.
         *
         * @param n represents number of nodes in the complete graph.
         */
        complete : function(n) {
            if(!n || n < 1) {
                throw { message: 'At least two nodes expected for complete graph' };
            }

            var g = Viva.Graph.graph();
            g.Name = "Complete K" + n;

            for(var i = 0; i < n; ++i) {
                for(var j = i + 1; j < n; ++j) {
                    if(i !== j) {
                        g.addLink(i, j);
                    }
                }
            }

            return g;
        },
        
        /**
         * Generates complete bipartite graph K n,m. Each node in the 
         * first partition is connected to all nodes in the second partition.
         * 
         * @param n represents number of nodes in the first graph partition
         * @param m represents number of nodes in the second graph partition
         */
        completeBipartite : function(n, m){
          if(!n || !m || n < 0 || m < 0) {
                throw { message: 'Graph dimensions are invalid. Number of nodes in each partition should be greate than 0' };
            }

            var g = Viva.Graph.graph();
            g.Name = "Complete K " + n + "," + m;
            for(var i = 0; i < n; ++i){
                for(var j = n; j < n + m; ++j){
                    g.addLink(i, j);
                }
            }  
            
            return g;
        },
        /**
         * Generates a graph in a form of a ladder with n steps.
         *
         * @param n number of steps in the ladder.
         */
        ladder : function(n) {
            if(!n || n < 0) {
                throw { message: 'Invalid number of nodes' };
            }

            var g = Viva.Graph.graph();
            g.Name = "Ladder graph " + n;

            for(var i = 0; i < n - 1; ++i) {
                g.addLink(i, i + 1);
                // first row
                g.addLink(n + i, n + i + 1);
                // second row
                g.addLink(i, n + i);
                // ladder's step
            }

            g.addLink(n - 1, 2 * n - 1);
            // last step in the ladder;

            return g;
        },

        /**
         * Generates a graph in a form of a circular ladder with n steps.
         *
         * @param n number of steps in the ladder.
         */
        circularLadder : function(n){
            if(!n || n < 0) {
                throw { message: 'Invalid number of nodes' };
            }
            
            var g = this.ladder(n);
            g.Name = "Circular ladder graph " + n;
            
            g.addLink(0, n - 1);
            g.addLink(n, 2 * n - 1);
            return g;
        },
        /**
         * Generates a graph in a form of a grid with n rows and m columns.
         *
         * @param n number of rows in the graph.
         * @param m number of columns in the graph.
         */
        grid: function(n, m){
            var g = Viva.Graph.graph();
            g.Name = "Grid graph " + n + "x" + m;
            for(var i = 0; i < n; ++i){
                for (var j = 0; j < m; ++j){
                    var node = i + j * n;
                    if (i > 0) { g.addLink(node, i - 1 + j * n); }
                    if (j > 0) { g.addLink(node, i + (j - 1) * n); }
                }
            }
            
            return g;
        },
        
        path: function(n){
            if(!n || n < 0) {
                throw { message: 'Invalid number of nodes' };
            }
            
            var g = Viva.Graph.graph();
            g.Name = "Path graph " + n;
            g.addNode(0);
            for(var i = 1; i < n; ++i){
                g.addLink(i - 1, i);
            }
            
            return g;
        },
        
        lollipop: function(m, n){
            if(!n || n < 0 || !m || m < 0) {
                throw { message: 'Invalid number of nodes' };
            }
            
            var g = this.complete(m);
            g.Name = "Lollipop graph. Head x Path " + m + "x" + n;
            
            for(var i = 0; i < n; ++i){
                g.addLink(m + i - 1, m + i);
            }
            
            return g;
        },
        
        /**
         * Creates balanced binary tree with n levels.
         */
        balancedBinTree: function (n){
            var g = Viva.Graph.graph();
            g.Name = "Balanced bin tree graph " + n;
            var count = Math.pow(2, n);
            for(var level = 1; level < count; ++level){
                var root = level;
                var left = root * 2;
                var right = root * 2 + 1;
                g.addLink(root, left);
                g.addLink(root, right);
            }
            
            return g;
        },
        /**
         * Generates a graph with n nodes and 0 links.
         *
         * @param n number of nodes in the graph.
         */
        randomNoLinks : function(n){
            if(!n || n < 0) {
                throw { message: 'Invalid number of nodes' };
            }

            var g = Viva.Graph.graph();
            g.Name = "Random graph, no Links: " + n;
            for(var i = 0; i < n; ++i){
                g.addNode(i);
            }
            
            return g;
        }
    };
};
/*global Viva*/

Viva.Graph.Physics = Viva.Graph.Physics || {};

Viva.Graph.Physics.Vector = function(x, y){
    this.x = x || 0;
    this.y = y || 0;
};

Viva.Graph.Physics.Vector.prototype = {
    multiply : function(scalar){
        return new Viva.Graph.Physics.Vector(this.x * scalar, this.y * scalar);
    }    
};

Viva.Graph.Physics.Point = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
};

Viva.Graph.Physics.Point.prototype = {
    add : function(point){
        return new Viva.Graph.Physics.Point(this.x + point.x, this.y + point.y);
    }
};

Viva.Graph.Physics.Body = function(){
    this.mass = 1;
    this.force = new Viva.Graph.Physics.Vector();
    this.velocity = new Viva.Graph.Physics.Vector(); // For chained call use vel() method.
    this.location = new Viva.Graph.Physics.Point(); // For chained calls use loc() method instead.
    this.prevLocation = new Viva.Graph.Physics.Point(); // TODO: might be not always needed
};

Viva.Graph.Physics.Body.prototype = {
    loc : function(location){
        if (location){
            this.location.x = location.x;
            this.location.y = location.y;
            
            return this;
        } else { 
            return this.location; 
        }
    },
    vel : function(velocity) {
        if (velocity){
            this.velocity.x = velocity.x;
            this.velocity.y = velocity.y;
            
            return this;
        } else {
            return this.velocity;
        }
    }
};

Viva.Graph.Physics.Spring = function(body1, body2, length, coeff){
    this.body1 = body1;
    this.body2 = body2;
    this.length = length;
    this.coeff = coeff;
};

Viva.Graph.Physics.QuadTreeNode = function(){
    this.centerOfMass = new Viva.Graph.Physics.Point(); 
    this.children = [];
    this.body = null;
    this.hasChildren = false;
    this.x1 = 0;
    this.y1 = 0;
    this.x2 = 0;
    this.y2 = 0;
};
/*global Viva*/

Viva.Graph.Physics = Viva.Graph.Physics || {};

/**
 * Updates velocity and position data using the 4th order
 * Runge-Kutta method (RK4). It is slower but more accurate
 * than other techniques (such as Euler's method).
 * The method requires reevaluating forces 4 times for a given step.
 *
 * http://en.wikipedia.org/wiki/Runge%E2%80%93Kutta_methods
 */
Viva.Graph.Physics.rungeKuttaIntegrator = function() {
    var ensureRk4Initialized = function(forceSimulator) {
        // Sanity check
        if(!forceSimulator || !forceSimulator.bodies) {
            throw {
                message : 'Simulator does not have defined bodies array'
            };
        }

        if(!forceSimulator.rk4) {
            // Init storage for interm steps of RK4.
            for(var i = 0; i < forceSimulator.bodies.length; i++) {
                var body = forceSimulator.bodies[i];
                body.rgkDataV = [];
                body.rgkDataF = [];
            }
            forceSimulator.rk4 = true;
        }
    };
    return {
        setSimulator : function(forceSimulator) {
        },
        integrate : function(forceSimulator, timeStep) {
            ensureRk4Initialized(forceSimulator);

            // TODO: if number of bodies changed we might get into troubles here
            var speedLimit = forceSimulator.speedLimit,
                ar, vx, vy, v, coeff,
                body, location,
                i,
                max = forceSimulator.bodies.length; 

            for(i = 0; i < max; ++i) {
                body = forceSimulator.bodies[i];
                coeff = timeStep / body.mass;
                
                body.prevLocation.x = body.location.x;
                body.prevLocation.y = body.location.y;

                // I would love to have more expressive syntax here
                // rather than all these operations inlined, but
                // from performance perspective this should be better.
                body.rgkDataV[0] = {
                    x : timeStep * body.velocity.x,
                    y : timeStep * body.velocity.y
                };
                body.rgkDataF[0] = {
                    x : body.force.x * coeff,
                    y : body.force.y * coeff
                };
                location = body.prevLocation;
                body.loc({
                    x : location.x + 0.5 * body.rgkDataV[0].x,
                    y : location.y + 0.5 * body.rgkDataV[0].y
                });
            }

            forceSimulator.accumulate();

            for( i = 0; i < max; i++) {
                body = forceSimulator.bodies[i];
                coeff = timeStep / body.mass;

                // Had to expand these operations. I'm really scared about performance here.
                vx = body.velocity.x + 0.5 * body.rgkDataF[0].x;
                vy = body.velocity.y + 0.5 * body.rgkDataF[0].y;
                v = Math.sqrt(vx * vx + vy * vy);
                if(v > speedLimit) {
                    vx = speedLimit * vx / v;
                    vy = speedLimit * vy / v;
                }

                body.rgkDataV[1] = {
                    x : timeStep * vx,
                    y : timeStep * vy
                };
                body.rgkDataF[1] = {
                    x : body.force.x * coeff,
                    y : body.force.y * coeff
                };
                location = body.prevLocation;
                body.loc({
                    x : location.x + 0.5 * body.rgkDataV[1].x,
                    y : location.y + 0.5 * body.rgkDataV[1].y
                });
            }

            forceSimulator.accumulate();

            for( i = 0; i < max; i++) {
                body = forceSimulator.bodies[i];
                coeff = timeStep / body.mass;
                vx = body.velocity.x + 0.5 * body.rgkDataF[1].x;
                vy = body.velocity.y + 0.5 * body.rgkDataF[1].y;
                v = Math.sqrt(vx * vx + vy * vy);
                if(v > speedLimit) {
                    vx = speedLimit * vx / v;
                    vy = speedLimit * vy / v;
                }

                body.rgkDataV[2] = {
                    x : timeStep * vx,
                    y : timeStep * vy
                };
                body.rgkDataF[2] = {
                    x : body.force.x * coeff,
                    y : body.force.y * coeff
                };
                location = body.prevLocation;
                body.loc({
                    x : location.x + 0.5 * body.rgkDataV[2].x,
                    y : location.y + 0.5 * body.rgkDataV[2].y
                });
            }

            forceSimulator.accumulate();

            for( i = 0; i < max; i++) {
                body = forceSimulator.bodies[i];
                coeff = timeStep / body.mass;
                vx = body.velocity.x + body.rgkDataF[2].x;
                vy = body.velocity.y + body.rgkDataF[2].y;
                v = Math.sqrt(vx * vx + vy * vy);
                if(v > speedLimit) {
                    vx = speedLimit * vx / v;
                    vy = speedLimit * vy / v;
                }

                body.rgkDataV[3] = {
                    x : timeStep * vx,
                    y : timeStep * vy
                };
                body.rgkDataF[3] = {
                    x : body.force.x * coeff,
                    y : body.force.y * coeff
                };
                location = body.prevLocation;
                var rgkDataV = body.rgkDataV;

                body.loc({
                    x : location.x + (rgkDataV[0].x + rgkDataV[3].x) / 6 + (rgkDataV[1].x + rgkDataV[2].x) / 3,
                    y : location.y + (rgkDataV[0].y + rgkDataV[3].y) / 6 + (rgkDataV[1].y + rgkDataV[2].y) / 3
                });

                var rgkDataF = body.rgkDataF;
                vx = (rgkDataF[0].x + rgkDataF[3].x) / 6 + (rgkDataF[1].x + rgkDataF[2].x) / 3;
                vy = (rgkDataF[0].y + rgkDataF[3].y) / 6 + (rgkDataF[1].y + rgkDataF[2].y) / 3;
                v = Math.sqrt(vx * vx + vy * vy);
                if(v > speedLimit) {
                    vx = speedLimit * vx / v;
                    vy = speedLimit * vy / v;
                }

                body.velocity.x += vx;
                body.velocity.y += vy;
            }
        }
    };
};
/*global Viva*/

Viva.Graph.Physics = Viva.Graph.Physics || {};

/**
 * Updates velocity and position data using the Euler's method.
 * It is faster than RK4 but may produce less accurate results.
 * 
 * http://en.wikipedia.org/wiki/Euler_method
 */
Viva.Graph.Physics.eulerIntegrator = function() {
    return {
        integrate : function(simulator, timeStep){
            var speedLimit = simulator.speedLimit;
            
            for(var i = 0, max = simulator.bodies.length; i < max; ++i){
                var body = simulator.bodies[i];

                var coeff = timeStep / body.mass;
                body.velocity.x += coeff * body.force.x;
                body.velocity.y += coeff * body.force.y;
                var vx = body.velocity.x;
                var vy = body.velocity.y;
                var v = Math.sqrt(vx * vx + vy * vy);
                if (v > speedLimit){
                    body.velocity.x = speedLimit * vx / v;
                    body.velocity.y = speedLimit * vy / v;
                }
                
                body.location.x += timeStep * body.velocity.x;
                body.location.y += timeStep * body.velocity.y;
            }
        }       
    };
};
/*global Viva*/

/**
 * This is Barnes Hut simulation algorithm. Implementation
 * is adopted to non-recursive solution, since certain browsers
 * handle recursion extremly bad.
 * 
 * http://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html
 */
Viva.Graph.Physics.nbodyForce = function(options) {
    options = options || {};
    
    var gravity = typeof options.gravity === 'number' ? options.gravity : -1,
        theta = options.theta || 0.8,
        
        Node = function() {
        this.body = null;
        this.quads = [];
        this.mass = 0;
        this.massX = 0;
        this.massY = 0;
        this.left = 0;
        this.top = 0;
        this.bottom = 0;
        this.right = 0;
        this.isInternal = false;
    };
    var nodesCache = [], 
        currentInCache = 0, 
        newNode = function() {
            // To avoid pressure on GC we reuse nodes.
            var node;
            if(nodesCache[currentInCache]) {
                node = nodesCache[currentInCache];
                node.quads[0] = null;
                node.quads[1] = null;
                node.quads[2] = null;
                node.quads[3] = null;
                node.body = null;
                node.mass = node.massX = node.massY = 0;
                node.left = node.right = node.top = node.bottom = 0;
                node.isInternal = false;
            } else {
                node = new Node();
                nodesCache[currentInCache] = node;
            }
            
            ++currentInCache;
            return node;
        }, 
    
    root = newNode();

    var isSamePosition = function(point1, point2) {
        // TODO: Consider inlining.
        var dx = Math.abs(point1.x - point2.x);
        var dy = Math.abs(point1.y - point2.y);

        return (dx < 0.01 && dy < 0.01);
    },
    
    // Inserts body to the tree
    insert = function(newBody) {
        // TODO: Consider reusing queue's elements if GC hit shows up.
        var queue = [{
            node : root,
            body : newBody
        }];

        while(queue.length) {
            var queueItem = queue.shift(),
                node = queueItem.node, 
                body = queueItem.body;

            if(node.isInternal) {
                // This is internal node. Update the total mass of the node and center-of-mass.
                var x = body.location.x;
                var y = body.location.y;
                node.mass = node.mass + body.mass;
                node.massX = node.massX + body.mass * x;
                node.massY = node.massY + body.mass * y;

                // Recursively insert the body in the appropriate quadrant.
                // But first find the appropriate quadrant.
                var quadIdx = 0, // Assume we are in the 0's quad.
                    left = node.left, 
                    right = (node.right + left) / 2, 
                    top = node.top, 
                    bottom = (node.bottom + top) / 2;

                if(x > right) {// somewhere in the eastern part.
                    quadIdx = quadIdx + 1;
                    var oldLeft = left;
                    left = right;
                    right = right + (right - oldLeft);
                }
                if(y > bottom) {// and in south.
                    quadIdx = quadIdx + 2;
                    var oldTop = top;
                    top = bottom;
                    bottom = bottom + (bottom - oldTop);
                }

                var child = node.quads[quadIdx];
                if(!child) {
                    // The node is internal but this quadrant is not taken. Add
                    // subnode to it.
                    child = newNode();
                    child.left = left;
                    child.top = top;
                    child.right = right;
                    child.bottom = bottom;

                    node.quads[quadIdx] = child;
                }

                // proceed search in this quadrant.
                queue.unshift({
                    node : child,
                    body : body
                });
            } else if(node.body) {
                // We are trying to add to the leaf node.
                // To do this we have to convert current leaf into internal node
                // and continue adding two nodes.
                var oldBody = node.body;
                node.body = null; // internal nodes does not cary bodies
                node.isInternal = true;

                if(isSamePosition(oldBody.location, body.location)) {
                    // Prevent infinite subdivision by bumping one node
                    // slightly. I assume this operation should be quite
                    // rare, that's why usage of cos()/sin() shouldn't hit performance.
                    var newX, newY;
                    do {
                        var angle = 2 * Math.random() * Math.PI;
                        var dx = (node.right - node.left) * 0.006 * Math.cos(angle);
                        var dy = (node.bottom - node.top) * 0.006 * Math.sin(angle);

                        newX = oldBody.location.x + dx;
                        newY = oldBody.location.y + dy;
                        // Make sure we don't bump it out of the box. If we do, next iteration should fix it
                    } while(newX < node.left || newX > node.right ||
                    newY < node.top || newY > node.bottom);

                    oldBody.location.x = newX;
                    oldBody.location.y = newY;
                }

                // Next iteration should subdivide node further.
                queue.unshift({
                    node : node,
                    body : oldBody
                });
                queue.unshift({
                    node : node,
                    body : body
                });
            } else {
                // Node has no body. Put it in here.
                node.body = body;
            }
        }
    }, 
    
    update = function(sourceBody){
        var queue = [root],
            v, dx, dy, r;
        
        // TODO: looks like in rare cases this guy has infinite loop bug. To reproduce
        // render K1000 (complete(1000)) with the settings: {springLength : 3, springCoeff : 0.0005, 
        // dragCoeff : 0.02, gravity : -1.2 }
        while(queue.length){
            var node = queue.shift(),
                body = node.body;
            
            if (body && body !== sourceBody){
                // If the current node is an external node (and it is not source body), 
                // calculate the force exerted by the current node on body, and add this 
                // amount to body's net force.
                dx = body.location.x - sourceBody.location.x;
                dy = body.location.y - sourceBody.location.y;
                r = Math.sqrt(dx * dx + dy * dy);
                
                if (r === 0){
                    // Poor man's protection agains zero distance.
                    dx = (Math.random() - 0.5) / 50;
                    dy = (Math.random() - 0.5) / 50;
                    r = Math.sqrt(dx * dx + dy * dy);
                }
              
                // This is standard gravition force calculation but we divide
                // by r^3 to save two operations when normalizing force vector.  
                v = gravity * body.mass * sourceBody.mass / (r * r * r);
                sourceBody.force.x = sourceBody.force.x + v * dx; 
                sourceBody.force.y = sourceBody.force.y + v * dy;
            } else {
                // Otherwise, calculate the ratio s / r,  where s is the width of the region 
                // represented by the internal node, and r is the distance between the body 
                // and the node's center-of-mass 
                dx = node.massX / node.mass - sourceBody.location.x;
                dy = node.massY / node.mass - sourceBody.location.y;
                r = Math.sqrt(dx * dx + dy * dy);
                
                if (r === 0){
                    // Sorry about code duplucation. I don't want to create many functions
                    // right away. Just want to see performance first.
                    dx = (Math.random() - 0.5) / 50;
                    dy = (Math.random() - 0.5) / 50;
                    r = Math.sqrt(dx * dx + dy * dy);
                }
                // If s / r < θ, treat this internal node as a single body, and calculate the
                // force it exerts on body b, and add this amount to b's net force.
                if ( (node.right - node.left) / r < theta){
                    // in the if statement above we consider node's width only
                    // because the region was sqaurified during tree creation.  
                    // Thus there is no difference between using width or height.
                    v = gravity * node.mass * sourceBody.mass / (r * r * r);
                    sourceBody.force.x = sourceBody.force.x + v * dx;
                    sourceBody.force.y = sourceBody.force.y + v * dy;
                } else {
                    // Otherwise, run the procedure recursively on each of the current node's children.
                    
                    // I intentionally unfolded this loop, to save several CPU cycles. 
                    if (node.quads[0]) { queue.push(node.quads[0]); }
                    if (node.quads[1]) { queue.push(node.quads[1]); }
                    if (node.quads[2]) { queue.push(node.quads[2]); }
                    if (node.quads[3]) { queue.push(node.quads[3]); }
                }
            }
        }
    },
    
    init = function(forceSimulator){
        var x1 = Number.MAX_VALUE, 
        y1 = Number.MAX_VALUE,
        x2 = Number.MIN_VALUE, 
        y2 = Number.MIN_VALUE, 
        i,
        bodies = forceSimulator.bodies,
        max = bodies.length;

        // To reduce quad tree depth we are looking for exact bounding box of all particles.
        i = max;
        while(i--) {
            var x = bodies[i].location.x;
            var y = bodies[i].location.y;
            if(x < x1) { x1 = x; }
            if(x > x2) { x2 = x; }
            if(y < y1) { y1 = y; }
            if(y > y2) { y2 = y; }
        }

        // Squarify the bounds.
        var dx = x2 - x1, 
            dy = y2 - y1;
        if (dx > dy) { y2 = y1 + dx; }
        else { x2 = x1 + dy; }

        currentInCache = 0;
        root = newNode();
        root.left = x1;
        root.right = x2;
        root.top = y1;
        root.bottom = y2;
        
        i = max;
        while(i--) {
            insert(bodies[i], root);
        }
    };
    
    return {
        insert : insert,
        init : init,
        update : update,
        options : function(newOptions){
            if (newOptions){
                if (typeof newOptions.gravity === 'number') { gravity = newOptions.gravity; }
                if (typeof newOptions.theta === 'number') { theta = newOptions.theta; }
                
                return this; 
            } else {
                return {gravity : gravity, theta : theta};
            }
        }
    };
};

/**
 * Brute force approach to nbody force calculation with O(n^2) performance.
 * I implemented it only to assist in finding bugs in Barnes Hut implementation. 
 * This force is not intended to be used anywhere and probably weill be removed
 * in future.
 */
Viva.Graph.Physics.nbodyForceBrute = function(options) {
    options = options || {};
    var gravity = typeof options.gravity === 'number' ? options.gravity : -1;
    var bodies = [];
    
    var update = function(sourceBody){

        sourceBody.force.x = 0;
        sourceBody.force.y = 0;
        for(var i = 0; i < bodies.length; ++i){
            var body = bodies[i];
            if (body !== sourceBody){
                var dx = body.location.x - sourceBody.location.x;
                var dy = body.location.y - sourceBody.location.y;
                var r = Math.sqrt(dx * dx + dy * dy);
                
                if (r === 0){
                    // Poor man's protection agains zero distance.
                    dx = (Math.random() - 0.5) / 50;
                    dy = (Math.random() - 0.5) / 50;
                    r = Math.sqrt(dx * dx + dy * dy);
                }
              
                // This is standard gravition force calculation but we divide
                // by r^3 to save two operations when normalizing force vector.  
                var v = gravity * body.mass * sourceBody.mass / (r * r * r);
                sourceBody.force.x = sourceBody.force.x + v * dx; 
                sourceBody.force.y = sourceBody.force.y + v * dy;
            }
        }
    };
    
    return {
        insert : function(){},
        init : function(forceSimulator){ 
                bodies = forceSimulator.bodies;
            },
        update : update,
        options : function(newOptions){
            if (newOptions){
                if (typeof newOptions.gravity === 'number') { gravity = newOptions.gravity; }
                
                return this; 
            } else {
                return {gravity : gravity};
            }
        }
    };
};/*global Viva*/

Viva.Graph.Physics.dragForce = function(options){
    options = options || {};
    var currentOptions = {
        coeff : options.coeff || 0.01
    };
    
    return {
        init : function(forceSimulator) {},
        update : function(body){
            body.force.x -= currentOptions.coeff * body.velocity.x;
            body.force.y -= currentOptions.coeff * body.velocity.y;
        },
        options : function(newOptions){
            if (newOptions){
                if (typeof newOptions.coeff === 'number') { currentOptions.coeff = newOptions.coeff; }
                
                return this; 
            } else {
                return currentOptions;
            }
        }
    };
};
/*global Viva*/

Viva.Graph.Physics.springForce = function(options){
    options = options || {};
    var currentOptions = {
        length : options.length || 50,
        coeff : typeof options.coeff === 'number' ? options.coeff : 0.00022
    };
    
    return {
        init : function(forceSimulator) {},
        update : function(spring){
            var body1 = spring.body1;
            var body2 = spring.body2;
            var length = spring.length < 0 ? currentOptions.length : spring.length;
             
            var dx = body2.location.x - body1.location.x;
            var dy = body2.location.y - body1.location.y;
            var r = Math.sqrt(dx * dx + dy * dy);
            if (r === 0){
                dx = (Math.random() - 0.5) / 50;
                dy = (Math.random() - 0.5) / 50;
                r = Math.sqrt(dx * dx + dy * dy);
            } 
            
            var d = r - length;
            var coeff = ( (!spring.coeff || spring.coeff < 0) ? currentOptions.coeff : spring.coeff) * d / r;
            
            body1.force.x += coeff * dx;
            body1.force.y += coeff * dy;
            
            body2.force.x += -coeff * dx;
            body2.force.y += -coeff * dy;
        },
        options : function(newOptions){
            if (newOptions){
                if (typeof newOptions.length === 'number') { currentOptions.length = newOptions.length; }
                if (typeof newOptions.coeff === 'number') { currentOptions.coeff = newOptions.coeff; }
                
                return this;
            } else { return currentOptions; }
        }
    };
};
/*global Viva*/

Viva.Graph.Physics = Viva.Graph.Physics || {};

/**
 * Manages a simulation of physical forces acting on bodies.
 * To create a custom force simulator register forces of the system
 * via addForce() method, choos appropriate integrator and register
 * bodies.
 * 
 * // TODO: Show example.
 */
Viva.Graph.Physics.forceSimulator = function(forceIntegrator){
    var integrator = forceIntegrator || Viva.Graph.Physics.rungeKuttaIntegrator();
    var bodies = []; // Bodies in this simulation.
    var springs = []; // Springs in this simulation.
    var bodyForces = []; // Forces acting on bodies.
    var springForces = []; // Forces acting on springs.
    
    return {
        
        /**
         * The speed limit allowed by this simulator.
         */
        speedLimit : 1.0,
        
        /**
         * Bodies in this simulation
         */
        bodies : bodies,
        
        /**
         * Accumulates all forces acting on the bodies and springs.
         */
        accumulate : function(){
            var i, j, body;
            
            // Reinitialize all forces
            i = bodyForces.length;
            while(i--) {
                bodyForces[i].init(this);
            }
            
            i = springForces.length;
            while(i--){
                springForces[i].init(this);
            }
            
            // Accumulate forces acting on bodies.
            i = bodies.length;
            while(i--){
                body = bodies[i];
                body.force.x = 0; 
                body.force.y = 0;
                
                for (j=0; j < bodyForces.length; j++) {
                    bodyForces[j].update(body);
                }
            }
            
            // Accumulate forces acting on springs.
            for(i = 0; i < springs.length; ++i){
                for(j = 0; j < springForces.length; j++){
                    springForces[j].update(springs[i]);
                }
            }
        },
        
        /**
         * Runs simulation for one time step.
         */
        run : function(timeStep){
            this.accumulate();
            integrator.integrate(this, timeStep);            
        },
        
        /**
         * Adds body to this simulation
         * 
         * @param body - a new body. Bodies expected to have
         *   mass, force, velocity, location and prevLocation properties.
         *   the method does not check all this properties, for the sake of performance.
         *   // TODO: maybe it should check it?
         */
        addBody : function(body){
            if (!body){
                throw {
                    message : 'Cannot add null body to force simulator'
                };
            }
            
            bodies.push(body); // TODO: could mark simulator as dirty...
            
            return body;
        },
        
        removeBody : function(body) {
            if (!body) { return false; }
            
            var idx = Viva.Graph.Utils.indexOfElementInArray(body, bodies);
            if (idx < 0) { return false; }

            return bodies.splice(idx, 1);
        },
        
        /**
         * Adds a spring to this simulation.
         */
        addSpring: function(body1, body2, springLength, springCoefficient){
            if (!body1 || !body2){
                throw {
                    message : 'Cannot add null spring to force simulator'
                };
            }
            
            if (typeof springLength !== 'number'){
                throw {
                    message : 'Spring length should be a number'
                };
            }
            
            var spring = new Viva.Graph.Physics.Spring(body1, body2, springLength, springCoefficient >= 0 ? springCoefficient : -1);
            springs.push(spring); 
            
            // TODO: could mark simulator as dirty.
            return spring;
        },
        
        removeSpring : function(spring) {
            if (!spring) { return false; }
            
            var idx = Viva.Graph.Utils.indexOfElementInArray(spring, springs);
            if (idx < 0) { return false; }

            return springs.splice(idx, 1);
        },
        
        /**
         * Adds a force acting on all bodies in this simulation
         */
        addBodyForce: function(force){
            if (!force){
                throw {
                    message : 'Cannot add mighty (unknown) force to the simulator'
                };
            }
            
            bodyForces.push(force);
        },
        
        /**
         * Adds a spring force acting on all springs in this simulation.
         */
        addSpringForce : function(force){
            if (!force){
                throw {
                    message : 'Cannot add unknown force to the simulator'
                };
            }
            
            springForces.push(force);
        }
    };
};/*global Viva*/

Viva.Graph.Layout = Viva.Graph.Layout || {};

Viva.Graph.Layout.forceDirected = function(graph, userSettings) {
    if(!graph) {
        throw {
            message : "Graph structure cannot be undefined"
        };
    }
    userSettings = userSettings || {};
    
    var settings = {
            /**
             * Ideal length for links (springs in physical model).
             */
            springLength : typeof userSettings.springLength === 'number' ? userSettings.springLength : 80,
            
            /**
             * Hook's law coefficient. 1 - solid spring.
             */
            springCoeff : typeof userSettings.springCoeff === 'number' ? userSettings.springCoeff : 0.0002,
            
            /**
             * Coulomb's law coefficient. It's used to repel nodes thus should be negative
             * if you make it positive nodes start attract each other :).
             */
            gravity: typeof userSettings.gravity === 'number' ? userSettings.gravity : -1.2,
            
            /**
             * Theta coeffiecient from Barnes Hut simulation. Ranged between (0, 1).
             * The closer it's to 1 the more nodes algorithm will have to go through.
             * Setting it to one makes Barnes Hut simulation no different from 
             * brute-force forces calculation (each node is considered). 
             */
            theta : typeof userSettings.theta === 'number' ? userSettings.theta : 0.8,
            
            /**
             * Drag force coefficient. Used to slow down system, thus should be less than 1.
             * The closer it is to 0 the less tight system will be.
             */
            dragCoeff : typeof userSettings.dragCoeff === 'number' ? userSettings.dragCoeff : 0.02
        },
        
        forceSimulator = Viva.Graph.Physics.forceSimulator(Viva.Graph.Physics.eulerIntegrator()),

        nbodyForce = Viva.Graph.Physics.nbodyForce({gravity : settings.gravity, theta: settings.theta}),
        
        springForce = Viva.Graph.Physics.springForce({length : settings.springLength, coeff: settings.springCoeff }),
        
        dragForce = Viva.Graph.Physics.dragForce({coeff: settings.dragCoeff}),
        
        initializationRequired = true,
        
        graphRect = {x1: 0, y1 : 0, x2 : 0, y2 : 0},
        
        rndNext = function rndNext(maxValue) {
            return Math.floor(Math.random() * (maxValue || 0xffffffff));
        },
        
        getBestNodePosition = function(node) {
            // TODO: Initial position could be picked better, e.g. take into 
            // account all neighbouring nodes/links, not only one.
            // TODO: this is the same as in gem layout. consider refactoring.
            var baseX = (graphRect.x1 + graphRect.x2) / 2,
                baseY = (graphRect.y1 + graphRect.y2) / 2,
                springLength = settings.springLength;
                
            if (node.links && node.links.length > 0){
                var firstLink= node.links[0],
                    otherNode = firstLink.fromId != node.id ? graph.getNode(firstLink.fromId) : graph.getNode(firstLink.toId);
                if (otherNode.position){
                    baseX = otherNode.position.x;
                    baseY = otherNode.position.y;
                }
            }
            
            return {
                x : baseX + rndNext(springLength) - springLength/2,
                y : baseY + rndNext(springLength) - springLength/2
            };  
        },
        
        initNode = function(node) {
            var body = node.force_directed_body;
            if (!body){
                // TODO: rename position to location or location to position to be consistent with
                // other places.
                node.position = node.position || getBestNodePosition(node);
                    
                body = new Viva.Graph.Physics.Body();
                body.mass = 1 + graph.getLinks(node.id).length / 3.0;
                node.force_directed_body = body;
                
                body.loc(node.position);
                forceSimulator.addBody(body);                                
            }
        },
        
        releaseNode = function(node) {
            var body = node.force_directed_body;
            if (body) {
                node.force_directed_body = null;
                delete node.force_directed_body;
                
                forceSimulator.removeBody(body);
            }
        },
        
        initLink = function(link) {
            // TODO: what if bodies are not initialized?
            var from = graph.getNode(link.fromId).force_directed_body,
                to = graph.getNode(link.toId).force_directed_body;
            
            link.force_directed_spring = forceSimulator.addSpring(from, to, -1.0);
        },
        
        releaseLink = function(link) {
            var spring = link.force_directed_spring;
            if (spring) {
                link.force_directed_spring = null;
                delete link.force_directed_spring ;
                
                forceSimulator.removeSpring(spring);
            }
        },
        
        initSimulator = function() {
            graph.forEachNode(initNode);
            graph.forEachLink(initLink);
        },
        
        isNodePinned = function(node) {
            if(!node) {
                return true;
            }

            return node.isPinned || (node.data && node.data.isPinned);
        },
        
        updateNodePositions = function(){
            var x1 = Number.MAX_VALUE,
                y1 = Number.MAX_VALUE,
                x2 = Number.MIN_VALUE,
                y2 = Number.MIN_VALUE;
            if (graph.getNodesCount() === 0) { return ;}
               
            graph.forEachNode(function(node) {
                var body = node.force_directed_body;
                if (!body){
                    return; // TODO: maybe we shall initialize it?
                }
                
                if (isNodePinned(node)){
                    body.loc(node.position);
                }
                
                // TODO: once again: use one name to be consistent (position vs location)
                node.position.x = body.location.x;
                node.position.y = body.location.y;
                
                if (node.position.x < x1) { x1 = node.position.x; }
                if (node.position.x > x2) { x2 = node.position.x; }
                if (node.position.y < y1) { y1 = node.position.y; }
                if (node.position.y > y2) { y2 = node.position.y; }
            });
            
            graphRect.x1 = x1;
            graphRect.x2 = x2;
            graphRect.y1 = y1;
            graphRect.y2 = y2;
        };
        
    forceSimulator.addSpringForce(springForce);
    forceSimulator.addBodyForce(nbodyForce);
    forceSimulator.addBodyForce(dragForce);
    
    return {
        /**
         * Attempts to layout graph within given number of iterations.
         *
         * @param {integer} [iterationsCount] number of algorithm's iterations.
         */
        run : function(iterationsCount) {
            iterationsCount = iterationsCount || 50;
            
            for(var i = 0; i < iterationsCount; ++i) {
                this.step();
            }
        },
        
        step : function() {
            // we assume graph was not modified between calls. If it was
            // we will have to reinitialize force simulator.
            if (initializationRequired) {
                initSimulator();
                initializationRequired = false;
            }
            
            forceSimulator.run(20);
            updateNodePositions();
        },
        
        /**
         * Returns rectangle structure {x1, y1, x2, y2}, which represents
         * current space occupied by graph.
         */
        getGraphRect : function() {
            return graphRect;
        }, 
        
        addNode : function(node) {
            initNode(node);
        },
        
        removeNode : function(node) {
            releaseNode(node);
        },
        
        addLink : function(link) {
            initLink(link);
        },
        
        removeLink : function(link) {
            releaseLink(link);
        },
        
        // Layout specific methods
        /**
         * Gets or sets current desired length of the edge.
         * 
         * @param length new desired length of the springs (aka edge, aka link).
         * if this parameter is empty then old spring length is returned.
         */
        springLength : function(length) {
            if (arguments.length === 1) {
                springForce.options({ length : length });
                return this;
            } else { 
                return springForce.options().length; 
            }
        },
        
         /**
         * Gets or sets current spring coeffiсient.
         * 
         * @param coeff new spring coeffiсient.
         * if this parameter is empty then its old value returned.
         */
        springCoeff : function(coeff) {
            if (arguments.length === 1) {
                springForce.options({ coeff : coeff });
                return this;
            } else { 
                return springForce.options().coeff; 
            }
        },
        
        /**
         * Gets or sets current gravity in the nbody simulation.
         * 
         * @param g new gravity constant.
         * if this parameter is empty then its old value returned.
         */
        gravity : function(g) {
            if (arguments.length === 1) {
                nbodyForce.options({ gravity : g });
                return this;
            } else { 
                return nbodyForce.options().gravity; 
            }
        },
        
        /**
         * Gets or sets current theta value in the nbody simulation.
         * 
         * @param t new theta coeffiсient.
         * if this parameter is empty then its old value returned.
         */
        theta : function(t) {
            if (arguments.length === 1) {
                nbodyForce.options({ theta : t });
                return this;
            } else { 
                return nbodyForce.options().theta; 
            }
        },
        
        /**
         * Gets or sets current theta value in the nbody simulation.
         * 
         * @param dragCoeff new drag coeffiсient.
         * if this parameter is empty then its old value returned.
         */
        drag : function(dragCoeff) {
            if (arguments.length === 1) {
                dragForce.options({ coeff : dragCoeff });
                return this;
            } else { 
                return dragForce.options().coeff; 
            }
        }
    };
};/**
 * @fileOverview Implements GEM graph drawing algorithm.
 *
 * @see The <a href='http://www.springerlink.com/index/Y4H746K55233W685.pdf'>
 * A fast adaptive layout algorithm for undirected graphs (abstract)</a> and
 * <a href='http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.113.9565&rep=rep1&type=pdf'>
 * [PDF] from psu.edu</a>
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 * 
 * TODO: According to GEM hypothesis random node processing order during one iteration
 * leads to faster GEM convergence. Current implementation does not employ this techinque.
 * 
 */
/*global Viva*/

Viva.Graph.Layout = Viva.Graph.Layout || {};

/**
 * Implements GEM graph drawing algorithm.
 *
 * @example
 *
 *   var graphGenerator = Viva.Graph.generator();
 *   var graph = graphGenerator.complete(5); // Create complete graph K5
 *
 *   var gemLayout = Viva.Graph.Layout.gem(graph);
 *   gemLayout.run();
 *   // Now every node of the graph has position.x and position.y
 *   // pointing to 'nice' locations.
 */
Viva.Graph.Layout.gem = function(graph, customSettings) {
    if(!graph) {
        throw {
            message : "Graph structure cannot be undefined"
        };
    }

    var settings = (function buildAlgorithmSettings(userSettings) {
        var finalSettings = {
            /**
             * Start temperature of every node.
             */
            initialTemperature : userSettings.initialTemperature || 0.3,

            /**
             * Temperature of the system that we are trying to reach.
             */
            stopTemperature : userSettings.stopTemperature || 0.02,
            maxIterations : userSettings.MaxIterations || 5,

            /**
             * Desired edge length.
             */
            edgeLength : userSettings.springLength || 80,

            /**
             * Gravitational constant that is used to calculate attraction to center of gravity.
             * Used during node impulse calculation.
             */
            gravitationalConstant : userSettings.gravitationalConstant || 0.05,

            /**
             * Maximum percentage of @EdgeLength that is allowed for random nodes movement.
             * Used during node impulse calculation.
             */
            shakeDisturbance : userSettings.shakeDisturbance || 0.2,

            /**
             * Sensitivity towards oscillation.
             */
            oscilationSensitivity : userSettings.oscilationSensitivity || 0.4,

            /**
             * Sensitivity towards rotation.
             */
            rotationSensitivity : userSettings.rotationSensitivity || 0.9,
            minimalRotationTemperature : userSettings.minimalRotationTemperature || 2
        };

        // Max local temperature.
        finalSettings.maximalTemperature = userSettings.maximalTemperature || 1.5 * finalSettings.edgeLength;
        finalSettings.edgeLengthSquared = finalSettings.edgeLength * finalSettings.edgeLength;

        finalSettings.maxShakeOffset = finalSettings.shakeDisturbance * finalSettings.edgeLength;

        return finalSettings;
    })(customSettings || {}),

        // Sum of all nodes coordinates. Used to simplify barycenter computation.
        systemCenterX, systemCenterY,

        // Current temperature of the system.
        systemTemperature,

        graphRect = {x1: 0, y1 : 0, x2 : 0, y2 : 0},
        
        initializationRequired = true,

        /**
         * Helper function to get random positive integer numbers.
         *
         * @param maxValue the biggest integer number
         */
        rndNext = function (maxValue) {
            return Math.floor(Math.random() * (maxValue || 0xffffffff));
        },
        
        getBestNodePosition = function(node) {
            // TODO: Initial position could be picked better, like take into 
            // account all neighbouring nodes/links, not only one.
            // TODO: this is the same as in force based layout. consider refactoring.
            var baseX = (graphRect.x1 + graphRect.x2) / 2,
                baseY = (graphRect.y1 + graphRect.y2) / 2,
                springLength = settings.edgeLength;
                
            if (node.links && node.links.length > 0){
                var firstLink= node.links[0],
                    otherNode = firstLink.fromId != node.id ? graph.getNode(firstLink.fromId) : graph.getNode(firstLink.toId);
                if (otherNode.position){
                    baseX = otherNode.position.x;
                    baseY = otherNode.position.y;
                }
            }
            
            return {
                x : baseX + rndNext(springLength) - springLength/2,
                y : baseY + rndNext(springLength) - springLength/2
            };  
        },
        
        initGemNode = function(node) {
            node.position = node.position || getBestNodePosition(node);

            node.gemData = {
                // Current temperature of this node
                heat : settings.initialTemperature * settings.edgeLength,

                // Impulse X
                iX : 0,

                // Impulse Y
                iY : 0,
                skewGauge : 0,
                mass : 1 + graph.getLinks(node.id).length / 3.0
            };
            
            systemTemperature += node.gemData.heat * node.gemData.heat;
            systemCenterX += node.position.x;
            systemCenterY += node.position.y;
        },
        
        releaseGemNode = function(node) {
            if (node.gemData) { 
                delete node.gemData;
            }
        },

       initSimulator = function () {
           systemTemperature = 0;
           systemCenterX = 0;
           systemCenterY = 0;
    
           graph.forEachNode(initGemNode);
       },

    /**
     * Computes impulse of the given node. Runtime: O(N + m), N - number of graph nodes, m - number of linked nodes.
     *
     * @returns object {iX, iY}, with corresponding impulse values.
     */
       computeImpulse = function(node) {
            var position = node.position;
            if(!position) {
                return ; // This is a new node. Wait untill renderer requests us to initialize it.
            }
    
            var edgeLengthSquared = settings.edgeLengthSquared;
            var nodeX = position.x;
            var nodeY = position.y;
    
            var gemNode = node.gemData;
            var nodesCount = graph.getNodesCount();
    
            // Attraction to center of gravity:
            var impulseX = (systemCenterX / nodesCount - nodeX) * gemNode.mass * settings.gravitationalConstant;
            var impulseY = (systemCenterY / nodesCount - nodeY) * gemNode.mass * settings.gravitationalConstant;
    
            // Random disturbance:
            impulseX += rndNext() % (2 * settings.maxShakeOffset + 1) - settings.maxShakeOffset;
            impulseY += rndNext() % (2 * settings.maxShakeOffset + 1) - settings.maxShakeOffset;
            // +1 to exclude zero.
    
            // Repulsive forces
            graph.forEachNode(function(otherNode) {
                if(otherNode.id !== node.id) {
                    var dx = nodeX - otherNode.position.x;
                    var dy = nodeY - otherNode.position.y;
                    var lenSqr = dx * dx + dy * dy;
                    if(lenSqr > 0) {
                        impulseX += dx * edgeLengthSquared / lenSqr;
                        impulseY += dy * edgeLengthSquared / lenSqr;
                    }
                }
            });
            // Attractive forces
            graph.forEachLinkedNode(node.id, function(adjacentNode) {
                var dx = nodeX - adjacentNode.position.x;
                var dy = nodeY - adjacentNode.position.y;
                var lenSqr = dx * dx + dy * dy;
                impulseX -= dx * lenSqr / (edgeLengthSquared * node.gemData.mass);
                impulseY -= dy * lenSqr / (edgeLengthSquared * node.gemData.mass);
            });
          
            return {
                iX : impulseX,
                iY : impulseY
            };
        },
        
       /**
        * Updates node's position, temperature and impulse.
        * Also detects possible rotations oscillations. Runtime is O(1).
        */
        updatePositionAndTemperature = function(node, impulse) {
            var impulseX = impulse.iX,
                impulseY = impulse.iY,
                nodesCount = graph.getNodesCount();
    
            if(impulseX === 0 && impulseY === 0) {
                return;
                // Impulse is negligible.
            }
            
            var scale = Math.max(Math.abs(impulseX), Math.abs(impulseY)) / settings.edgeLengthSquared;
    
            // Don't let impulse vector be longer than edge:
            if(scale > 1) {
                impulseX /= scale;
                impulseY /= scale;
            }
    
            var gemNode = node.gemData;
    
            // scale with current temperature:
            var impulseLength = Math.sqrt(impulseX * impulseX + impulseY * impulseY);
            var currentTemperature = gemNode.heat;
            impulseX = currentTemperature * impulseX / impulseLength;
            impulseY = currentTemperature * impulseY / impulseLength;
            node.position.x += impulseX;
            node.position.y += impulseY;
    
            // save the division at this point
            systemCenterX += impulseX;
            systemCenterY += impulseY;
    
            var nodeImpulse = currentTemperature * Math.sqrt(gemNode.iX * gemNode.iX + gemNode.iY * gemNode.iY);
            if(nodeImpulse > 0) {
                systemTemperature -= currentTemperature * currentTemperature;
                // Oscillation:
                currentTemperature += currentTemperature * settings.oscilationSensitivity * (impulseX * gemNode.iX + impulseY * gemNode.iY) / nodeImpulse;
                currentTemperature = Math.min(currentTemperature, settings.maximalTemperature);
                // Rotation:
                gemNode.skewGauge += settings.rotationSensitivity * (impulseX * gemNode.iY - impulseY * gemNode.iX) / nodeImpulse;
                currentTemperature -= currentTemperature * Math.abs(gemNode.skewGauge) / nodesCount;
                currentTemperature = Math.max(currentTemperature, settings.minimalRotationTemperature);
                systemTemperature += currentTemperature * currentTemperature;
                gemNode.heat = currentTemperature;
            }
    
            gemNode.iX = impulseX;
            gemNode.iY = impulseY;
        };

    return {
        /**
         * Attempts to layout graph within given number of iterations.
         *
         * @param {integer} [iterationsCount] number of algorithm's iterations.
         */
        run : function(iterationsCount) {
            iterationsCount = iterationsCount || 50;
            for(var i = 0; i < iterationsCount; ++i) {
                this.step();
            }
        },
        /**
         * Performs one iteration of the layout algorithm. Could be used to visualize the algorithm.
         *
         * Note: Gem is not well-suited for animation. It's fast but visualization of the process
         * is not very appealing.
         */
        step : function() {
            if (initializationRequired){
                initSimulator();
                initializationRequired = false;
            }
            
            var nodesCount = graph.getNodesCount(),
                stopTemperature = settings.stopTemperature * settings.stopTemperature * settings.edgeLengthSquared * nodesCount,
                maxIteration = settings.maxIterations * nodesCount * nodesCount,
                x1 = Number.MAX_VALUE,
                y1 = Number.MAX_VALUE,
                x2 = Number.MIN_VALUE,
                y2 = Number.MIN_VALUE,
                that = this;
            
            if(systemTemperature < stopTemperature || nodesCount === 0) {
                return;
            }
            
            graph.forEachNode(function (node) {
               if(that.isNodePinned(node) || !node.gemData) {
                    return;
                }

                var impulse = computeImpulse(node);
                updatePositionAndTemperature(node, impulse);
                
                if (node.position.x < x1) { x1 = node.position.x; }
                if (node.position.x > x2) { x2 = node.position.x; }
                if (node.position.y < y1) { y1 = node.position.y; }
                if (node.position.y > y2) { y2 = node.position.y; }
            });
            
            graphRect.x1 = x1;
            graphRect.x2 = x2;
            graphRect.y1 = y1;
            graphRect.y2 = y2;
        },
        
        /**
         * Determines whether or not given node should be considered by layout algorithm.
         * If node is "pinned" layout algorithm does not move it.
         *
         * @param node under question. Note: It is NOT an identifier of the node, but actual
         *  object returned from graph.addNode() or graph.getNode() methods.
         */
        isNodePinned : function(node) {
            if(!node) {
                return true;
            }

            return node.isPinned || (node.data && node.data.isPinned);
        },
        
         /**
         * Returns rectangle structure {x1, y1, x2, y2}, which represents
         * current space occupied by graph.
         */
        getGraphRect : function() {
            return graphRect;
        },
        
        
        addNode : function(node) {
            initGemNode(node);
        },
        
        removeNode : function(node) {
            releaseGemNode(node);
        },
        
        addLink : function(link) {
            // NOP. Just for compliance with renderer; 
        },
        
        removeLink : function(link) {
            // NOP. Just for compliance with renderer; 
        }
    };
};
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
/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva, window*/

/**
 * Simple wrapper over svg object model API, to shorten the usage syntax.
 */
Viva.Graph.svg = function(element) {
    var svgns = "http://www.w3.org/2000/svg",
        xlinkns = 'http://www.w3.org/1999/xlink',
        svgElement = element;
        
    if (typeof element === 'string') {
        svgElement = document.createElementNS(svgns, element);
    }

    if (svgElement.vivagraph_augmented) { return svgElement; }
    
    svgElement.vivagraph_augmented = true;
    
    // Augment svg element (TODO: it's not safe - what if some function already exists on the prototype?):
    
    /**
     * Gets an svg attribute from an element if value is not specified.
     * OR sets a new value to the given attribute.
     * 
     * @param name - svg attribute name;
     * @param value - value to be set;
     * 
     * @returns svg element if both name and value are specified; or value of the given attribute
     * if value parameter is missing.
     */
    svgElement.attr = function(name, value) {
        if (arguments.length === 2) {
            svgElement.setAttributeNS(null, name, value);
            return svgElement;
        } else {
            return svgElement.getAttributeNS(null, name);
        }
    };
    
    svgElement.append = function(element){
        var child = Viva.Graph.svg(element);
        svgElement.appendChild(child);
        return child;
    };
    
    svgElement.text = function(textContent){
        if (typeof textContent == 'undefined') {
            return svgElement.textContent;
        } else {
            svgElement.textContent = textContent;
        }
        
        return svgElement;
    };
    
    svgElement.link = function(target) {
        if (arguments.length === 0){
            return svgElement.getAttributeNS(xlinkns, 'xlink:href');
        }
        
        svgElement.setAttributeNS(xlinkns, 'xlink:href', target);
        return svgElement;
    };
    
    return svgElement;
};
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
Viva.Graph.View.svgGraphics = function() {
    var svgContainer,
        svgRoot,
 
        nodeBuilder = function(node){
            return Viva.Graph.svg('rect')
                     .attr('width', 10)
                     .attr('height', 10)
                     .attr('fill', '#00a2e8');
        },
        
        nodePositionCallback = function(nodeUI, pos){
            // TODO: Remove magic 5. It should be halfo of the width or height of the node.
            nodeUI.attr("x", pos.x - 5)
                  .attr("y", pos.y - 5);
        },

        linkBuilder = function(link){
            return Viva.Graph.svg('line')
                              .attr('stroke', '#999');
        },
        
        linkPositionCallback = function(linkUI, fromPos, toPos){
            linkUI.attr("x1", fromPos.x)
                  .attr("y1", fromPos.y)
                  .attr("x2", toPos.x)
                  .attr("y2", toPos.y);
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
        link : function(builderCallbackOrLink) {
            if (builderCallbackOrLink && typeof builderCallbackOrLink !== 'function'){
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
        placeNode : function(newPlaceCallback) {
            nodePositionCallback = newPlaceCallback;
            return this;
        },

        placeLink : function(newPlaceLinkCallback) {
            linkPositionCallback = newPlaceLinkCallback;
            return this;
        },
        
       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output 
        * provider prepare to render.
        */
       init : function(container) {
           svgRoot = Viva.Graph.svg("svg");
           
           svgContainer = Viva.Graph.svg("g");

           svgRoot.appendChild(svgContainer);
           container.appendChild(svgRoot);
       },
       
       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider prepare to render given link of the graph
        * 
        * @param linkUI visual representation of the link created by link() execution.
        */
       initLink : function(linkUI) {
           if(svgContainer.childElementCount > 0) {
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
        */
       getSvgRoot : function() {
           return svgRoot;
       }
    };
};
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
            offsetY : 0 // TODO: Could add scale later.
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
                x : Math.round(fromNode.position.x + transform.offsetX + viewPortOffset.x),
                y : Math.round(fromNode.position.y + transform.offsetY + viewPortOffset.y),
                node: fromNode
            },
            to = {
                x : Math.round(toNode.position.x + transform.offsetX + viewPortOffset.x),
                y : Math.round(toNode.position.y + transform.offsetY + viewPortOffset.y),
                node : toNode
            };
            
            graphics.updateLinkPosition(link.ui, from, to);
        },
        
        renderNode = function(node) {
            var position = { 
                x : Math.round(node.position.x + transform.offsetX + viewPortOffset.x),
                y : Math.round(node.position.y + transform.offsetY + viewPortOffset.y) 
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
           var graphRect = layout.getGraphRect();
           var containerSize = Viva.Utils.getDimension(container);
           
           viewPortOffset.x = viewPortOffset.y = 0;
           transform.offsetX = containerSize.width / 2 - (graphRect.x2 + graphRect.x1) / 2;
           transform.offsetY = containerSize.height / 2 - (graphRect.y2 + graphRect.y1) / 2;
           
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
                    node.position.x += offset.x;
                    node.position.y += offset.y;
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
                
                renderGraph();
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
/*global Viva*/

Viva.Graph.serializer = function(){
    var checkJSON = function(){
        if (typeof JSON === 'undefined' || !JSON.stringify || !JSON.parse) {
                throw 'JSON serializer is not defined.';
        }
    };
    
    return {
        /**
         * Saves graph to JSON format. 
         * 
         * NOTE: ECMAScript 5 (or alike) JSON object is required to be defined
         * to get proper output.
         *
         * @param graph to be saved in JSON format.
         */
        storeToJSON : function(graph) {
            if (!graph) { throw 'Graph is not defined'; }
            checkJSON();
            
            var store = {
                nodes : [],
                links : []
            };
            
            graph.forEachNode(function(node) { store.nodes.push({id: node.id, data : node.data }); });
            graph.forEachLink(function(link) {
                store.links.push({
                    fromId : link.fromId, 
                    toId: link.toId,
                    data : link.data
               });
            });
            
            return JSON.stringify(store);
        },
        
        /**
         * Restores graph from JSON string created by storeToJSON() method. 
         * 
         * NOTE: ECMAScript 5 (or alike) JSON object is required to be defined
         * to get proper output.
         * 
         * @param jsonString is a string produced by storeToJSON() method.
         */
        loadFromJSON : function(jsonString) {
            if (typeof jsonString !== 'string') { throw 'String expected in loadFromJSON() metho'; }
            checkJSON();
            
            var store = JSON.parse(jsonString);
            var graph = Viva.Graph.graph();
            if (!store || !store.nodes || !store.links) { throw 'Passed json string does not represent valid graph'; }
            
            for(var i = 0; i < store.nodes.length; ++i) {
                var parsedNode = store.nodes[i];
                if (!parsedNode.id) { throw 'Graph node format is invalid. Node.id is missing'; }
                
                graph.addNode(parsedNode.id, parsedNode.data);
            }
            
            for (i = 0; i < store.links.length; ++i) {
                var link = store.links[i];
                if (!link.fromId || !link.toId) { throw 'Graph link format is invalid. Both fromId and toId are required'; }
                
                graph.addLink(link.fromId, link.toId, link.data);
            } 
            
            return graph;
        }
    };
};
