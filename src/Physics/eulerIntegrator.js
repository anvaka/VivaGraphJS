/*global Viva*/

Viva.Graph.Physics = Viva.Graph.Physics || {};

/**
 * Updates velocity and position data using the Euler's method.
 * It is faster than RK4 but may produce less accurate results.
 * 
 * http://en.wikipedia.org/wiki/Euler_method
 */
Viva.Graph.Physics.eulerIntegrator = function() {
    return {
        integrate : function(simulator, timeStep){
            var speedLimit = simulator.speedLimit;
            
            for(var i = 0, max = simulator.bodies.length; i < max; ++i){
                var body = simulator.bodies[i];

                var coeff = timeStep / body.mass;
                body.velocity.x += coeff * body.force.x;
                body.velocity.y += coeff * body.force.y;
                var vx = body.velocity.x;
                var vy = body.velocity.y;
                var v = Math.sqrt(vx * vx + vy * vy);
                if (v > speedLimit){
                    body.velocity.x = speedLimit * vx / v;
                    body.velocity.y = speedLimit * vy / v;
                }
                
                body.location.x += timeStep * body.velocity.x;
                body.location.y += timeStep * body.velocity.y;
            }
        }       
    };
};
