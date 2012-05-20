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

Viva.Graph.Physics.Spring = function(body1, body2, length, coeff, weight){
    this.body1 = body1;
    this.body2 = body2;
    this.length = length;
    this.coeff = coeff;
    this.weight = weight;
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
