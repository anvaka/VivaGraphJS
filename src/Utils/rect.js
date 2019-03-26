module.exports = Rect;

/**
 * Very generic rectangle.
 */
function Rect (x1, y1, x2, y2) {
    this.x1 = x1 || 0;
    this.y1 = y1 || 0;
    this.x2 = x2 || 0;
    this.y2 = y2 || 0;
}

Rect.prototype.getCenter = function () {
    return {
        x: (this.x1 + this.x2) / 2,
        y: (this.y1 + this.y2) / 2
    };
};

Rect.prototype.getWidth = function () {
    return Math.abs(this.x2 - this.x1);
};

Rect.prototype.getHeight = function () {
    return Math.abs(this.y2 - this.y1);
};