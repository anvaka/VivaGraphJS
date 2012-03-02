/*global Viva*/

Viva.Graph.Physics = Viva.Graph.Physics || {};

/**
 * Updates velocity and position data using the 4th order
 * Runge-Kutta method (RK4). It is slower but more accurate
 * than other techniques (such as Euler's method).
 * The method requires reevaluating forces 4 times for a given step.
 *
 * http://en.wikipedia.org/wiki/Runge%E2%80%93Kutta_methods
 */
Viva.Graph.Physics.rungeKuttaIntegrator = function() {
    var ensureRk4Initialized = function(forceSimulator) {
        // Sanity check
        if(!forceSimulator || !forceSimulator.bodies) {
            throw {
                message : 'Simulator does not have defined bodies array'
            };
        }

        if(!forceSimulator.rk4) {
            // Init storage for interm steps of RK4.
            for(var i = 0; i < forceSimulator.bodies.length; i++) {
                var body = forceSimulator.bodies[i];
                body.rgkDataV = [];
                body.rgkDataF = [];
            }
            forceSimulator.rk4 = true;
        }
    };
    return {
        setSimulator : function(forceSimulator) {
        },
        integrate : function(forceSimulator, timeStep) {
            ensureRk4Initialized(forceSimulator);

            // TODO: if number of bodies changed we might get into troubles here
            var speedLimit = forceSimulator.speedLimit,
                ar, vx, vy, v, coeff,
                body, location,
                i,
                max = forceSimulator.bodies.length; 

            for(i = 0; i < max; ++i) {
                body = forceSimulator.bodies[i];
                coeff = timeStep / body.mass;
                
                body.prevLocation.x = body.location.x;
                body.prevLocation.y = body.location.y;

                // I would love to have more expressive syntax here
                // rather than all these operations inlined, but
                // from performance perspective this should be better.
                body.rgkDataV[0] = {
                    x : timeStep * body.velocity.x,
                    y : timeStep * body.velocity.y
                };
                body.rgkDataF[0] = {
                    x : body.force.x * coeff,
                    y : body.force.y * coeff
                };
                location = body.prevLocation;
                body.loc({
                    x : location.x + 0.5 * body.rgkDataV[0].x,
                    y : location.y + 0.5 * body.rgkDataV[0].y
                });
            }

            forceSimulator.accumulate();

            for( i = 0; i < max; i++) {
                body = forceSimulator.bodies[i];
                coeff = timeStep / body.mass;

                // Had to expand these operations. I'm really scared about performance here.
                vx = body.velocity.x + 0.5 * body.rgkDataF[0].x;
                vy = body.velocity.y + 0.5 * body.rgkDataF[0].y;
                v = Math.sqrt(vx * vx + vy * vy);
                if(v > speedLimit) {
                    vx = speedLimit * vx / v;
                    vy = speedLimit * vy / v;
                }

                body.rgkDataV[1] = {
                    x : timeStep * vx,
                    y : timeStep * vy
                };
                body.rgkDataF[1] = {
                    x : body.force.x * coeff,
                    y : body.force.y * coeff
                };
                location = body.prevLocation;
                body.loc({
                    x : location.x + 0.5 * body.rgkDataV[1].x,
                    y : location.y + 0.5 * body.rgkDataV[1].y
                });
            }

            forceSimulator.accumulate();

            for( i = 0; i < max; i++) {
                body = forceSimulator.bodies[i];
                coeff = timeStep / body.mass;
                vx = body.velocity.x + 0.5 * body.rgkDataF[1].x;
                vy = body.velocity.y + 0.5 * body.rgkDataF[1].y;
                v = Math.sqrt(vx * vx + vy * vy);
                if(v > speedLimit) {
                    vx = speedLimit * vx / v;
                    vy = speedLimit * vy / v;
                }

                body.rgkDataV[2] = {
                    x : timeStep * vx,
                    y : timeStep * vy
                };
                body.rgkDataF[2] = {
                    x : body.force.x * coeff,
                    y : body.force.y * coeff
                };
                location = body.prevLocation;
                body.loc({
                    x : location.x + 0.5 * body.rgkDataV[2].x,
                    y : location.y + 0.5 * body.rgkDataV[2].y
                });
            }

            forceSimulator.accumulate();

            var tx = 0, ty = 0;
            
            for( i = 0; i < max; i++) {
                body = forceSimulator.bodies[i];
                coeff = timeStep / body.mass;
                vx = body.velocity.x + body.rgkDataF[2].x;
                vy = body.velocity.y + body.rgkDataF[2].y;
                v = Math.sqrt(vx * vx + vy * vy);
                if(v > speedLimit) {
                    vx = speedLimit * vx / v;
                    vy = speedLimit * vy / v;
                }

                body.rgkDataV[3] = {
                    x : timeStep * vx,
                    y : timeStep * vy
                };
                body.rgkDataF[3] = {
                    x : body.force.x * coeff,
                    y : body.force.y * coeff
                };
                location = body.prevLocation;
                var rgkDataV = body.rgkDataV;

                body.loc({
                    x : location.x + (rgkDataV[0].x + rgkDataV[3].x) / 6 + (rgkDataV[1].x + rgkDataV[2].x) / 3,
                    y : location.y + (rgkDataV[0].y + rgkDataV[3].y) / 6 + (rgkDataV[1].y + rgkDataV[2].y) / 3
                });

                var rgkDataF = body.rgkDataF;
                vx = (rgkDataF[0].x + rgkDataF[3].x) / 6 + (rgkDataF[1].x + rgkDataF[2].x) / 3;
                vy = (rgkDataF[0].y + rgkDataF[3].y) / 6 + (rgkDataF[1].y + rgkDataF[2].y) / 3;
                v = Math.sqrt(vx * vx + vy * vy);
                if(v > speedLimit) {
                    vx = speedLimit * vx / v;
                    vy = speedLimit * vy / v;
                }

                tx += vx;
                ty += vy; // not quite right; should be distances, to comply with eulerIntegrator, but not sure whether I need this anyway
                
                body.velocity.x += vx;
                body.velocity.y += vy;
            }
            
            return tx * tx + ty * ty; 
        }
    };
};
