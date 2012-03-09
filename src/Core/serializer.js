/*global Viva*/

Viva.Graph.serializer = function(){
    var checkJSON = function(){
        if (typeof JSON === 'undefined' || !JSON.stringify || !JSON.parse) {
                throw 'JSON serializer is not defined.';
        }
    },
    
    nodeTransformStore = function(node){
        return { id : node.id, data: node.data };
    },
    
    linkTransformStore = function(link) {
        return {
            fromId : link.fromId, 
            toId: link.toId,
            data : link.data
       };
    },
    
    nodeTransformLoad = function(node) { 
        return node;
    },
    
    linkTransformLoad = function(link) {
        return link;
    };
    
    return {
        /**
         * Saves graph to JSON format. 
         * 
         * NOTE: ECMAScript 5 (or alike) JSON object is required to be defined
         * to get proper output.
         *
         * @param graph to be saved in JSON format.
         * @param nodeTransform optional callback function(node) which returns what should be passed into nodes collection
         * @param linkTransform optional callback functions(link) which returns what should be passed into the links collection
         */
        storeToJSON : function(graph, nodeTransform, linkTransform) {
            if (!graph) { throw 'Graph is not defined'; }
            checkJSON();
            
            nodeTransform = nodeTransform || nodeTransformStore;
            linkTransform = linkTransform || linkTransformStore;
            
            var store = {
                nodes : [],
                links : []
            };
            
            graph.forEachNode(function(node) { store.nodes.push(nodeTransform(node)); });
            graph.forEachLink(function(link) { store.links.push(linkTransform(link)); });
            
            return JSON.stringify(store);
        },
        
        /**
         * Restores graph from JSON string created by storeToJSON() method. 
         * 
         * NOTE: ECMAScript 5 (or alike) JSON object is required to be defined
         * to get proper output.
         * 
         * @param jsonString is a string produced by storeToJSON() method.
         * @param nodeTransform optional callback function(node) which accepts deserialized node and returns object with
         *        'id' and 'data' properties.
         * @param linkTransform optional callback functions(link) which accepts deserialized link and returns link object with
         *        'fromId', 'toId' and 'data' properties.
         */
        loadFromJSON : function(jsonString, nodeTransform, linkTransform) {
            if (typeof jsonString !== 'string') { throw 'String expected in loadFromJSON() method'; }
            checkJSON();
            
            nodeTransform = nodeTransform || nodeTransformLoad;
            linkTransform = linkTransform || linkTransformLoad;
             
            var store = JSON.parse(jsonString),
                graph = Viva.Graph.graph();
                
            if (!store || !store.nodes || !store.links) { throw 'Passed json string does not represent valid graph'; }
            
            for(var i = 0; i < store.nodes.length; ++i) {
                var parsedNode = nodeTransform(store.nodes[i]);
                if (!parsedNode.hasOwnProperty('id')) { throw 'Graph node format is invalid. Node.id is missing'; }
                
                graph.addNode(parsedNode.id, parsedNode.data);
            }
            
            for (i = 0; i < store.links.length; ++i) {
                var link = linkTransform(store.links[i]);
                if (!link.hasOwnProperty('fromId') || !link.hasOwnProperty('toId')) { throw 'Graph link format is invalid. Both fromId and toId are required'; }
                
                graph.addLink(link.fromId, link.toId, link.data);
            } 
            
            return graph;
        }
    };
};
