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
