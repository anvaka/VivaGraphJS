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
        updateQueue = [],
        theta = options.theta || 0.8,
        random = Viva.random('5f4dcc3b5aa765d61d8327deb882cf99', 75, 20, 63, 0x6c, 65, 76, 65, 72),
        
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
                        var angle = random.nextDouble() * 2 * Math.PI;
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
        var queue = updateQueue,
            v, dx, dy, r,
            queueLength = 1,
            shiftIdx = 0,
            pushIdx = 1;
            
        queue[0] = root;
        
        // TODO: looks like in rare cases this guy has infinite loop bug. To reproduce
        // render K1000 (complete(1000)) with the settings: {springLength : 3, springCoeff : 0.0005, 
        // dragCoeff : 0.02, gravity : -1.2 }
        while(queueLength){
            var node = queue[shiftIdx],
                body = node.body;
            
            queueLength -= 1;
            shiftIdx += 1;
            
            if (body && body !== sourceBody){
                // If the current node is an external node (and it is not source body), 
                // calculate the force exerted by the current node on body, and add this 
                // amount to body's net force.
                dx = body.location.x - sourceBody.location.x;
                dy = body.location.y - sourceBody.location.y;
                r = Math.sqrt(dx * dx + dy * dy);
                
                if (r === 0){
                    // Poor man's protection agains zero distance.
                    dx = (random.nextDouble() - 0.5) / 50;
                    dy = (random.nextDouble() - 0.5) / 50;
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
                    dx = (random.nextDouble() - 0.5) / 50;
                    dy = (random.nextDouble() - 0.5) / 50;
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
                    if (node.quads[0]) { queue[pushIdx] = node.quads[0]; queueLength += 1; pushIdx += 1; }
                    if (node.quads[1]) { queue[pushIdx] = node.quads[1]; queueLength += 1; pushIdx += 1; }
                    if (node.quads[2]) { queue[pushIdx] = node.quads[2]; queueLength += 1; pushIdx += 1; }
                    if (node.quads[3]) { queue[pushIdx] = node.quads[3]; queueLength += 1; pushIdx += 1; }
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
    var bodies = [],
        random = Viva.random('don\'t use this');
    
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
                    dx = (random.nextDouble() - 0.5) / 50;
                    dy = (random.nextDouble() - 0.5) / 50;
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
};