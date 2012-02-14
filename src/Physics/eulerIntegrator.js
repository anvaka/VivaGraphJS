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
        /**
         * Performs forces integration, using given timestep and force simulator.
         * 
         * @returns squared distance of total position updates. 
         */
        integrate : function(simulator, timeStep){
            var speedLimit = simulator.speedLimit,
                tx = 0, ty = 0;
            
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
                
                tx = timeStep * body.velocity.x;
                ty = timeStep * body.velocity.y;
                body.location.x += tx;
                body.location.y += ty;
            }

            return tx * tx + ty * ty; 
        }       
    };
};
