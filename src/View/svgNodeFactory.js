/*global Viva*/

Viva.Graph.View.svgNodeFactory = function(graph){
    var highlightColor = 'orange',
        defaultColor = '#999',
        geom = Viva.Graph.geom(),
        
        attachCustomContent = function(nodeUI, node) {
            nodeUI.size = {w: 10, h: 10};
            nodeUI.append('rect')
                .attr('width', nodeUI.size.w)
                .attr('height', nodeUI.size.h)
                .attr('stroke', 'orange')
                .attr('fill', 'orange');
        },
        
        nodeSize = function(nodeUI) {
            return nodeUI.size;
        };
    
    
    return {
        node : function(node) {
            var nodeUI = Viva.Graph.svg('g');
                
            attachCustomContent(nodeUI, node);
            nodeUI.nodeId = node.id;
            return nodeUI;
        },
        
        link : function(link) {
           var fromNode = graph.getNode(link.fromId),
               nodeUI = fromNode && fromNode.ui;
           
           if (nodeUI && !nodeUI.linksContainer ) {
               var nodeLinks = Viva.Graph.svg('path')
                                   .attr('stroke', defaultColor);
               nodeUI.linksContainer = nodeLinks;
               return nodeLinks;
           }
           
           return null;
        },
        
        /**
         * Sets a callback function for custom nodes contnet. 
         * @param conentCreator(nodeUI, node) - callback function which returns a node content UI. 
         *  Image, for example.
         * @param sizeProvider(nodeUI) - a callback function which accepts nodeUI returned by 
         *  contentCreator and returns it's custom rectangular size.
         * 
         */
        customContent : function(contentCreator, sizeProvider) {
            if (typeof contentCreator !== 'function' ||
                typeof sizeProvider !== 'function') {
                throw 'Two functions expected: contentCreator(nodeUI, node) and size(nodeUI)';
            }
            
            attachCustomContent = contentCreator;
            nodeSize = sizeProvider;
        },
        
        placeNode : function(nodeUI, fromNodePos) {
               var linksPath = '',
                   fromNodeSize = nodeSize(nodeUI);
               
               graph.forEachLinkedNode(nodeUI.nodeId, function(linkedNode, link) {
                   if (!linkedNode.position || !linkedNode.ui) {
                       return; // not yet defined - ignore.
                   }
                   
                   if (linkedNode.ui === nodeUI) {
                       return; // incoming link - ignore;
                   }
                   if (link.fromId !== nodeUI.nodeId) {
                       return; // we process only outgoing links.
                   }
                   
                   var toNodeSize = nodeSize(linkedNode.ui),
                       toNodePos = linkedNode.position;
    
                   var from = geom.intersectRect(
                        fromNodePos.x - fromNodeSize.w / 2, // left
                        fromNodePos.y - fromNodeSize.h / 2, // top 
                        fromNodePos.x + fromNodeSize.w / 2, // right
                        fromNodePos.y + fromNodeSize.h / 2, // bottom 
                        fromNodePos.x, fromNodePos.y, toNodePos.x, toNodePos.y) || fromNodePos;
                   
                   var to = geom.intersectRect(
                       toNodePos.x - toNodeSize.w / 2, // left
                       toNodePos.y - toNodeSize.h / 2, // top 
                       toNodePos.x + toNodeSize.w / 2, // right
                       toNodePos.y + toNodeSize.h / 2, // bottom 
                       toNodePos.x, toNodePos.y, fromNodePos.x, fromNodePos.y) || toNodePos;
                   
                   linksPath += 'M' + Math.round(from.x) + ' ' + Math.round(from.y) +
                                'L' + Math.round(to.x) + ' ' + Math.round(to.y);
               });
               
               nodeUI.attr("transform", 
                           "translate(" + (fromNodePos.x - fromNodeSize.w / 2) + ", " + 
                            (fromNodePos.y - fromNodeSize.h / 2) + ")");
               if (linksPath !== '' && nodeUI.linksContainer) {
                   nodeUI.linksContainer.attr("d", linksPath);
               }
           }

    };
};
