
Viva.Graph.Utils = Viva.Graph.Utils || {};

Viva.Graph.Utils.heap = function(compare){
    var elements = [],
    setupElement = function(idx) {
        var element = elements[idx];
        if (!element.heapData) {
            element.heapData = {};
        }
        element.heapData.idx = idx;
        element.heapData.left = elements[idx * 2 + 1];
        element.heapData.right = elements[idx * 2 + 2];
        if (0 !== idx) {
            if (element.heapData.idx % 2 === 1) {
                element.heapData.parent = elements[(idx - 1) / 2];
                element.heapData.parent.heapData.left = element;
            } else {
                element.heapData.parent = elements[(idx - 2) / 2];
                element.heapData.parent.heapData.right = element;
            }
        } else {
            element.heapData.parent = undefined;
        }
        if (element.heapData.left) {
            element.heapData.left.heapData.parent = element;
        }
        if (element.heapData.right) {
            element.heapData.right.heapData.parent = element;
        }
    },
    swap = function(element1, element2) {
        // swap element1 with element2 in array
        var idx1 = element1.heapData.idx,
            idx2 = element2.heapData.idx;
        elements[idx1] = element2;
        elements[idx2] = element1;
        // update heap data
        setupElement(idx1);
        setupElement(idx2);
    },
    heapify = function(element) {
        var moveUp = false,
            moveDown = false,
            child;

        if(element.heapData.parent) {
            moveUp = (compare(element.heapData.parent, element) > 0);
        }

        while (moveUp) {
            // swap element with it's parent
            swap(element, element.heapData.parent);

            if(element.heapData.parent) {
                moveUp = (compare(element.heapData.parent, element) > 0);
            } else {
                moveUp = false;
            }

            if(!moveUp) {
                return;
            }
        }

        if(element.heapData.left) {
            moveDown = (compare(element, element.heapData.left) > 0);
        }
        if (!moveDown && element.heapData.right) {
            moveDown = (compare(element, element.heapData.right) > 0);
        }

        while (moveDown) {
            // select child to swap with
            if (!element.heapData.left) {
                child = element.heapData.right;
            } else {
                if (!element.heapData.right) {
                    child = element.heapData.left;
                } else {
                    child = compare(element.heapData.left, element.heapData.right) < 0 ?
                            element.heapData.left :
                            element.heapData.right;
                }
            }

            // swap element with it's child
            swap(element, child);

            moveDown = false;
            if(element.heapData.left) {
                moveDown = (compare(element, element.heapData.left) > 0);
            }
            if (!moveDown && element.heapData.right) {
                moveDown = (compare(element, element.heapData.right) > 0);
            }
        }
    };
    return {
        push : function(element) {
            // put at the end of heap
            elements.push(element);
            setupElement(elements.length - 1);

            // heapify last element of the heap
            if (elements.length !== 1) {
                heapify(elements[elements.length - 1]);
            }
        },
        pop : function() {
            if (1 === elements.length) {
                return elements.pop();
            }
            // swap top with the last element
            swap(elements[0], elements[elements.length - 1]);

            // cut last element (was on the top before swap),
            // which is our min
            var minElement = elements.pop();

            // remove it from heap
            if (minElement.heapData.idx % 2 === 1) {
                minElement.heapData.parent.heapData.left = undefined;
            } else {
                minElement.heapData.parent.heapData.right = undefined;
            }

            // update top
            heapify(elements[0]);

            // mark element as removed
            minElement.heapData = undefined;

            return minElement;
        },
        empty : function() {
            if (elements.length === 0) {
                return true;
            }
            return false;
        },
        update : function(element) {
            if (element.heapData) {
                heapify(element);
            }
        },
        heap : function() {
            return elements;
        }
    };
};
