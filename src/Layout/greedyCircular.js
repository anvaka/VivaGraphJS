/*jshint unused: false*/
/*jshint -W083 */

Viva.Graph.Layout = Viva.Graph.Layout || {};
Viva.Graph.Layout.greedyCircular = function(graph, settings) {

    if (!graph) {
        throw {
            message: 'Graph structure cannot be undefined'
        };
    }

    settings = Viva.lazyExtend(settings, {
        radius: graph.getNodesCount() * 5,
        center: {x : 0, y : 0},
    });

    var graphRect = {
            x1 : settings.center.x - settings.radius,
            y1 : settings.center.y - settings.radius,
            x2 : settings.center.x + settings.radius,
            y2 : settings.center.y + settings.radius
        },
        nodesPositions = [];

    var getPickNodeFunction = function(nodes) {

        // elements are compared according to the number of unplaced neighbors
        // (choose one with the lower number)
        // ties are broken according to the number of placed neighbors.
        // (choose one with the higher number)
        var compareHeapElements = function(element1, element2) {
            if (element1.layoutData.unplacedNodesNumber >
                element2.layoutData.unplacedNodesNumber ) {
                return 1;
            }

            if (element1.layoutData.unplacedNodesNumber <
                element2.layoutData.unplacedNodesNumber ) {
                return -1;
            }

            // element1.unplacedNodesNumber === element2.unplacedNodesNumber

            if (element1.layoutData.placedNodesNumber <
                element2.layoutData.placedNodesNumber) {
                return 1;
            }

            if (element1.layoutData.placedNodesNumber >
                element2.layoutData.placedNodesNumber) {
                return -1;
            }

            return 0;
        },
        heap = Viva.Graph.Utils.heap(compareHeapElements),
        heapElement;

        for (var i = 0 ; i < nodes.length ; ++i) {
            nodes[i].layoutData = {
                neighbors : [],
                placedNodesNumber : 0
            };

            graph.forEachLinkedNode(
                nodes[i].id,
                function(linkedNode) {
                    nodes[i].layoutData.neighbors.push(linkedNode);
                }
            );

            nodes[i].layoutData.unplacedNodesNumber = nodes[i].layoutData.neighbors.length;

            heap.push(nodes[i]);
        }
        return function() {
            var pickedNode = heap.pop();

            for (i = 0 ; i < pickedNode.layoutData.neighbors.length ; ++i) {
                pickedNode.layoutData.neighbors[i].layoutData.placedNodesNumber++;
                pickedNode.layoutData.neighbors[i].layoutData.unplacedNodesNumber--;
                heap.update(pickedNode.layoutData.neighbors[i]);
            }

            return pickedNode;
        };
    },

    circularLayout = function() {
        var head,
            tail,
            len = 0;

        var forEachNode = function(callback) {
            var nextNode = head;
            while(nextNode) {
                callback(nextNode),
                nextNode = nextNode.layoutData.next;
            }
        };

        return {
            len : function() {
                return len;
            },
            forEachNode : forEachNode,
            swap : function(node1, node2) {
            },
            next : function(node) {
                if (node.layoutData.next) {
                    return node.layoutData.next;
                } else {
                    return head;
                }
            },
            prev : function(node) {
                if (node.layoutData.prev) {
                    return node.layoutData.prev;
                } else {
                    return tail;
                }
            },
            add : function(node) {
                var leftCrossingsNumber = 0,
                    rightCrossingsNumber = 0,
                    leftNeighborsNumber = 0,
                    rightNeighborsNumber = node.layoutData.placedNodesNumber;

                console.log('adding ' + node.id);

                forEachNode(function(nextNode) {
                    nextNode.layoutData.currentNeighbor = false;
                });

                for (var i = 0 ; i < node.layoutData.neighbors.length ; ++i) {
                    node.layoutData.neighbors[i].layoutData.currentNeighbor = true;
                }

                forEachNode(function(nextNode) {
                    if (nextNode.layoutData.currentNeighbor === true) {
                        rightNeighborsNumber--;
                        leftNeighborsNumber++;
                    }
                    leftCrossingsNumber += rightNeighborsNumber *
                                           nextNode.layoutData.unplacedNodesNumber;
                    rightCrossingsNumber += leftNeighborsNumber *
                                            nextNode.layoutData.unplacedNodesNumber;
                });

                if (leftCrossingsNumber < rightCrossingsNumber) {
                    // put to the beginning of the linked list
                    if (head) {
                        node.layoutData.next = head;
                        head.layoutData.prev = node;
                    }
                    if (!tail) {
                        tail = node;
                    }
                    head = node;
                } else {
                    // put to the end of the linked list
                    if (tail) {
                        node.layoutData.prev = tail;
                        tail.layoutData.next = node;
                    }
                    if (!head) {
                        head = node;
                    }
                    tail = node;
                }
                len++;
            }
        };
    },


    setNodesPositions = function(layout) {
        var nodesCount = graph.getNodesCount(),
            angleStep,
            angle = 0,
            radius = settings.radius,
            center = settings.center;

        if (nodesCount === 0) {
            return;
        }

        angleStep = 2 * Math.PI / nodesCount;

        layout.forEachNode(function(node) {
            node.position = {
                x : center.x + radius * Math.sin(angle),
                y : center.y + radius * Math.cos(angle)
            };
            angle += angleStep;
        });
    },

    // get number of edge crossings 
    // between pair of vertices
    getCrossingsNumber = function(node1, node2, layout) {

        var neighbors = [],
            crossing = 0,
            notCrossing = 0,
            zerosNumberCrossing = 0,
            zerosNumberNotCrossing = 0,
            prevNode, i;

        layout.forEachNode(function(node) {
            node.layoutData.node1Neighbor = false;
            node.layoutData.node2Neighbor = false;
        });

        for (i = 0 ; i < node1.layoutData.neighbors.length ; ++i) {
            node1.layoutData.neighbors[i].layoutData.node1Neighbor = true;
        }

        for (i = 0 ; i < node2.layoutData.neighbors.length ; ++i) {
            node2.layoutData.neighbors[i].layoutData.node2Neighbor = true;
        }

        prevNode = layout.prev(node1);
        while(prevNode !== node2) {
            if(prevNode.layoutData.node1Neighbor ||
               prevNode.layoutData.node2Neighbor) {
                neighbors.push(prevNode);
            }
            if(prevNode.layoutData.node2Neighbor) {
                zerosNumberNotCrossing++;
            }
            prevNode = layout.prev(prevNode);
        }

        for (i = 0 ; i < neighbors.length ; ++i) {
            if (neighbors[i].layoutData.node1Neighbor) {
                crossing += zerosNumberCrossing;
                notCrossing += zerosNumberNotCrossing;
                if (neighbors[i].layoutData.node2Neighbor) {
                    notCrossing--;
                }
            }
            if (neighbors[i].layoutData.node2Neighbor) {
                zerosNumberCrossing++;
                zerosNumberNotCrossing--;
            }
        }

        return [crossing, notCrossing];
    },

    // Sift node with initial position i
    // Until found best position that
    // minimize number of crossings
    improvePosition = function(node, layout) {

        var nextNode,
            crossingsBeforeAndAfterSwap,
            crossings = 0,
            minCrossings = crossings,
            minCrossingsNode = node;

        for (var i = 0 ; i < layout.len() - 1 ; ++i) {
            nextNode = layout.next(node);

            crossingsBeforeAndAfterSwap = getCrossingsNumber(node, nextNode, layout);
            crossings = crossings -
                        crossingsBeforeAndAfterSwap[0] +
                        crossingsBeforeAndAfterSwap[1];
            if (crossings < minCrossings) {
                minCrossings = crossings;
                minCrossingsNode = nextNode;
            }

            layout.swap(node, nextNode);
        }

        if (node.id === minCrossingsNode.id) {
            return;
        }

        layout.swap(node, minCrossingsNode);
    },

    setLayout = function() {
        var layout = circularLayout(),
            nodesNumber = graph.getNodesCount(),
            nodes = [],
            layoutNodes = [],
            nextNode;

        graph.forEachNode(
            function(node) {
                nodes.push(node);
            }
        );

        var pickNode = getPickNodeFunction(nodes);

        do {
            nextNode = pickNode();
            layout.add(nextNode);
        } while(layout.len() !== nodesNumber);

        // Circular cifting improvement
        for(var i = 0; i < layout.len() ; ++i) {
            console.log('sifting ' + i);
            improvePosition(nodes[i], layout);
        }

        // Set positions (x, y) according to sequence
        setNodesPositions(layout);

        // Clean up
        graph.forEachNode(
            function(node) {
                node.layoutData = undefined;
            }
        );
    };

    setLayout();

    return {

        step: function() {
            return true;
        },

        // Returns rectangle structure {x1, y1, x2, y2}, which represents
        // current space occupied by graph.
        getGraphRect: function() {
            return graphRect;
        },

        // Request to release all resources
        dispose: function() {
        }
    };
};
