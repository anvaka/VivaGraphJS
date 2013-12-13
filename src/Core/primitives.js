/**
 * Very generic rectangle. 
 */
Viva.Graph.Rect = function (x1, y1, x2, y2) {
    this.x1 = x1 || 0;
    this.y1 = y1 || 0;
    this.x2 = x2 || 0;
    this.y2 = y2 || 0;
};

/**
 * Very generic two-dimensional point.
 */
Viva.Graph.Point2d = function (x, y) {
    this.x = x || 0;
    this.y = y || 0;
};

/**
 * Internal structure to represent node;
 */
Viva.Graph.Node = function (id) {
    this.id = id;
    this.links = [];
    this.data = null;
};

/**
 * Internal structure to represent links;
 */
Viva.Graph.Link = function (fromId, toId, data, id) {
    this.fromId = fromId;
    this.toId = toId;
    this.data = data;
    this.id = id;
};
