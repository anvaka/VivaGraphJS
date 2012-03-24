/*global Viva*/

Viva.Graph.geom = function() {
    
    return {
        // function from Graphics GEM to determine lines intersection:
        // http://www.opensource.apple.com/source/graphviz/graphviz-498/graphviz/dynagraph/common/xlines.c
        intersect : function(x1, y1, x2, y2, // first line segment
                            x3, y3, x4, y4) { // second line segment
            var a1, a2, b1, b2, c1, c2, /* Coefficients of line eqns. */
                r1, r2, r3, r4,         /* 'Sign' values */
                denom, offset, num,     /* Intermediate values */
                result = { x: 0, y : 0};

            /* Compute a1, b1, c1, where line joining points 1 and 2
             * is "a1 x  +  b1 y  +  c1  =  0".
             */
            a1 = y2 - y1;
            b1 = x1 - x2;
            c1 = x2 * y1 - x1 * y2;

            /* Compute r3 and r4.
             */
            r3 = a1 * x3 + b1 * y3 + c1;
            r4 = a1 * x4 + b1 * y4 + c1;

            /* Check signs of r3 and r4.  If both point 3 and point 4 lie on
             * same side of line 1, the line segments do not intersect.
             */
        
            if (r3 !== 0 && r4 !== 0 && ((r3 >= 0) === (r4 >= 4))) {
                return null; //no itersection.
            }

            /* Compute a2, b2, c2 */
            a2 = y4 - y3;
            b2 = x3 - x4;
            c2 = x4 * y3 - x3 * y4;

            /* Compute r1 and r2 */
        
            r1 = a2 * x1 + b2 * y1 + c2;
            r2 = a2 * x2 + b2 * y2 + c2;
        
            /* Check signs of r1 and r2.  If both point 1 and point 2 lie
             * on same side of second line segment, the line segments do
             * not intersect.
             */
            if (r1 !== 0 && r2 !== 0 && ((r1 >= 0) === (r2 >= 0 ))) {
                return null; // no intersection;
            }
            /* Line segments intersect: compute intersection point. 
             */

            denom = a1 * b2 - a2 * b1;
            if ( denom === 0 ) {
                return null; // Actually collinear..
            }

            offset = denom < 0 ? - denom / 2 : denom / 2;
            offset = 0.0;

            /* The denom/2 is to get rounding instead of truncating.  It
             * is added or subtracted to the numerator, depending upon the
             * sign of the numerator.
             */
        
            
            num = b1 * c2 - b2 * c1;
            result.x = ( num < 0 ? num - offset : num + offset ) / denom;
        
            num = a2 * c1 - a1 * c2;
            result.y = ( num < 0 ? num - offset : num + offset ) / denom;
        
            return result;                                
        },
          
          /**
           * Returns intersection point of the rectangle defined by
           * left, top, right, bottom and a line starting in x1, y1
           * and ending in x2, y2;
           */      
        intersectRect : function(left, top, right, bottom, x1, y1, x2, y2) {
            return this.intersect(left, top, left, bottom, x1, y1, x2, y2) ||
                   this.intersect(left, bottom, right, bottom, x1, y1, x2, y2) ||
                   this.intersect(right, bottom, right, top, x1, y1, x2, y2) ||
                   this.intersect(right, top, left, top, x1, y1, x2, y2);
        },
        
        convexHull : function(points) {
            var polarAngleSort = function(basePoint, points) {
                var cosAngle = function(p) {
                    var dx = p.x - basePoint.x,
                        dy = p.y - basePoint.y,
                        sign = dx > 0 ? 1 : -1;
                    
                    // We use squared dx, to avoid Sqrt opertion and improve performance.
                    // To avoid sign loss during dx * dx operation we precompute its sign:
                    return sign * dx * dx / (dx * dx + dy * dy);
                };
                
                var sortedPoints = points.sort(function(p1, p2) {
                    return cosAngle(p2) - cosAngle(p1);
                });
                
                // If more than one point has the same angle, remove all but the one that is farthest from basePoint: 
                var lastPoint = sortedPoints[0],
                    lastAngle = cosAngle(lastPoint),
                    dx = lastPoint.x - basePoint.x,
                    dy = lastPoint.y - basePoint.y,
                    lastDistance = dx * dx + dy * dy,
                    curDistance;
                    
                for (var i = 1; i < sortedPoints.length; ++i) {
                    lastPoint = sortedPoints[i];
                    var angle = cosAngle(lastPoint);
                    if (angle === lastAngle) {
                        dx = lastPoint.x - basePoint.x;
                        dy = lastPoint.y - basePoint.y;
                        curDistance = dx * dx + dy * dy;
                        
                        if (curDistance < lastDistance) {
                            sortedPoints.splice(i, 1);
                        } else {
                            sortedPoints.splice(i - 1, 1);
                        }
                    } else {
                        lastAngle = angle;
                    }
                }
                
                return sortedPoints;
            },
            
            /**
             * Returns true if angle formed by points p0, p1, p2 makes left turn.
             * (counterclockwise)
             */
            ccw = function(p0, p1, p2) {
                return ((p2.x - p0.x) * (p1.y - p0.y) - (p2.y - p0.y) * (p1.x - p0.x)) < 0;
            };
            
            if (points.length < 3) {
                return points; // This one is easy... Not precise, but should be enough for now. 
            }
            
            // let p0 be the point in Q with the minimum y-coordinate, or the leftmost 
            // such point in case of a tie
            var p0Idx = 0; 
            for (var i = 0; i < points.length; ++i) {
                if (points[i].y < points[p0Idx].y) {
                    p0Idx = i;
                } else if (points[i].y === points[p0Idx].y && points[i].x < points[p0Idx].x) {
                    p0Idx = i;
                }
            }
            
            var p0 = points[p0Idx];
            // let <p1; p2; ... pm> be the remaining points
            points.splice(p0Idx, 1);
            // sorted by polar angle in counterclockwise order around p0
            var sortedPoints = polarAngleSort(p0, points);
            if (sortedPoints.length < 2) {
                return sortedPoints;
            }
            
            // let S be empty stack
            var s = [];
            s.push(p0);
            s.push(sortedPoints[0]);
            s.push(sortedPoints[1]);
            var sLength = s.length;
            for (i = 2; i < sortedPoints.length; ++i) {
                while(!ccw(s[sLength - 2], s[sLength - 1], sortedPoints[i])) {
                    s.pop();
                    sLength -= 1;
                }
                
                s.push(sortedPoints[i]);
                sLength += 1;
            }
            
            return s;
        }  
    };
};