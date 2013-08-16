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
            if (element1.unplacedNodesNumber > element2.unplacedNodesNumber ) {
                return 1;
            }

            if (element1.unplacedNodesNumber < element2.unplacedNodesNumber ) {
                return -1;
            }

            // element1.unplacedNodesNumber === element2.unplacedNodesNumber

            if (element1.placedNodesNumber < element2.placedNodesNumber) {
                return 1;
            }

            if (element1.placedNodesNumber > element2.placedNodesNumber) {
                return -1;
            }

            return 0;
        },
        heap = Viva.Graph.Utils.heap(compareHeapElements),
        heapElement;

        for (var i = 0 ; i < nodes.length ; ++i) {
            nodes[i].neighbors = [];
            nodes[i].placedNodesNumber = 0;

            graph.forEachLinkedNode(
                nodes[i].id,
                function(linkedNode) {
                    nodes[i].neighbors.push(linkedNode);
                }
            );

            nodes[i].unplacedNodesNumber = nodes[i].neighbors.length;

            heap.push(nodes[i]);
        }
        return function() {
            var pickedNode = heap.pop();

            for (i = 0 ; i < pickedNode.neighbors.length ; ++i) {
                pickedNode.neighbors[i].placedNodesNumber++;
                pickedNode.neighbors[i].unplacedNodesNumber--;
                heap.update(pickedNode.neighbors[i]);
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
                nextNode = nextNode.next;
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
                if (node.next) {
                    return node.next;
                } else {
                    return head;
                }
            },
            prev : function(node) {
                if (node.prev) {
                    return node.prev;
                } else {
                    return tail;
                }
            },
            add : function(node) {
                var leftCrossingsNumber = 0,
                    rightCrossingsNumber = 0,
                    leftNeighborsNumber = 0,
                    rightNeighborsNumber = node.placedNodesNumber;

                console.log('adding ' + node.id);

                forEachNode(function(nextNode) {
                    nextNode.currentNeighbor = false;
                });

                for (var i = 0 ; i < node.neighbors.length ; ++i) {
                    node.neighbors[i].currentNeighbor = true;
                }

                forEachNode(function(nextNode) {
                    if (nextNode.currentNeighbor === true) {
                        rightNeighborsNumber--;
                        leftNeighborsNumber++;
                    }
                    leftCrossingsNumber += rightNeighborsNumber * nextNode.unplacedNodesNumber;
                    rightCrossingsNumber += leftNeighborsNumber * nextNode.unplacedNodesNumber;
                });

                if (leftCrossingsNumber < rightCrossingsNumber) {
                    // put to the beginning of the linked list
                    if (head) {
                        node.next = head;
                        head.prev = node;
                    }
                    if (!tail) {
                        tail = node;
                    }
                    head = node;
                } else {
                    // put to the end of the linked list
                    if (tail) {
                        node.prev = tail;
                        tail.next = node;
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
            i = 0,
            radius = settings.radius,
            center = settings.center;

        if (nodesCount === 0) {
            return;
        }

        angleStep = 2 * Math.PI / nodesCount;

        layout.forEachNode(function(node) {
            node.position = {
                angle : angle,
                x : center.x + radius * Math.sin(angle),
                y : center.y + radius * Math.cos(angle),
                i : i,
            };
            angle += angleStep;
            i++;
        });
    },

    // get number of edge crossings 
    // between pair of vertices
    getCrossingsNumber = function(node1, node2, layout) {

        var neighbors = [],
            crossing = 0,
            notCrossing = 0,
            zerosNumberCrossing = 0,
            zerosNumberNotCrossing = node2.neighbors.length,
            prevNode, i;

        layout.forEachNode(function(node) {
            node.node1Neighbor = false;
            node.node2Neighbor = false;
        });

        for (i = 0 ; i < node1.neighbors.length ; ++i) {
            node1.neighbors[i].node1Neighbor = true;
        }

        for (i = 0 ; i < node2.neighbors.length ; ++i) {
            node2.neighbors[i].node2Neighbor = true;
        }

        prevNode = layout.prev(node1);
        while(prevNode !== node2) {
            if(prevNode.node1Neighbor || prevNode.node2Neighbor) {
                neighbors.push(prevNode);
            }
            prevNode = layout.prev(prevNode);
        }

        for (i = 0 ; i < neighbors.length ; ++i) {
            if (neighbors[i].node1Neighbor) {
                crossing += zerosNumberCrossing;
                notCrossing += zerosNumberNotCrossing;
                if (neighbors[i].node1Neighbor) {
                    notCrossing--;
                }
            }
            if (neighbors[i].node2Neighbor) {
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
            crossings = graph.getLinksCount() * graph.getLinksCount(), // TODO
            // any value will be less then this
            minCrossings = crossings,
            minCrossingsNode = node;

        for (var i = 0 ; i < layout.len() - 1 ; ++i) {
            nextNode = layout.next(node);

            crossingsBeforeAndAfterSwap = getCrossingsNumber(node, nextNode, layout);
            crossings = crossings - crossingsBeforeAndAfterSwap[0] + crossingsBeforeAndAfterSwap[1];
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
                node.position = {x : settings.center.x, y : settings.center.y}; // TODO for testing, remove this
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
