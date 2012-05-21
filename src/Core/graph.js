/**
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
                var augmentedData = node.data || {},
                    dataType = typeof data;
                
                if (dataType === 'string' || isArray(data) ||
                    dataType === 'number' || dataType === 'boolean') {
                    augmentedData = data;
                } else if (dataType === 'undefined') {
                    augmentedData = null;
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
         * Gets total number of links in the graph.
         */
        getLinksCount : function() {
            return links.length;
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
                    if (callback(nodes[node])) {
                        return; // client doesn't want to proceed. return.
                    }
                }
            }
        },
        
        /**
         * Invokes callback on every linked (adjacent) node to the given one.
         *
         * @param nodeId Identifier of the requested node.
         * @param {Function(node, link)} callback Function to be called on all linked nodes.
         *   The function is passed two parameters: adjacent node and link object itself.
         * @param oriented if true graph treated as oriented.
         */
        forEachLinkedNode : function(nodeId, callback, oriented) {
            var node = this.getNode(nodeId),
                i, link, linkedNodeId;
            if(node && node.links && typeof callback === 'function') {
                // Extraced orientation check out of the loop to increase performance
                if (oriented){
                    for(i = 0; i < node.links.length; ++i) {
                        link = node.links[i];
                        if (link.fromId === nodeId){
                            callback(nodes[link.toId], link);
                        }
                    }
                } else {
                    for(i = 0; i < node.links.length; ++i) {
                        link = node.links[i];
                        linkedNodeId = link.fromId === nodeId ? link.toId : link.fromId;
    
                        callback(nodes[linkedNodeId], link);
                    }
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
