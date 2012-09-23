/**
 * Very generic rectangle. 
 */
Viva.Graph.Rect = function(x1, y1, x2, y2) {
    this.x1 = x1 || 0;
    this.y1 = y1 || 0;
    this.x2 = x2 || 0;
    this.y2 = y2 || 0;
};

/**
 * Very generic two-dimensional point.
 */
Viva.Graph.Point2d = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}
