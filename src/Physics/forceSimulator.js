/*global Viva*/

Viva.Graph.Physics = Viva.Graph.Physics || {};

/**
 * Manages a simulation of physical forces acting on bodies.
 * To create a custom force simulator register forces of the system
 * via addForce() method, choos appropriate integrator and register
 * bodies.
 * 
 * // TODO: Show example.
 */
Viva.Graph.Physics.forceSimulator = function(forceIntegrator){
    var integrator = forceIntegrator || Viva.Graph.Physics.rungeKuttaIntegrator();
    var bodies = []; // Bodies in this simulation.
    var springs = []; // Springs in this simulation.
    var bodyForces = []; // Forces acting on bodies.
    var springForces = []; // Forces acting on springs.
    
    return {
        
        /**
         * The speed limit allowed by this simulator.
         */
        speedLimit : 1.0,
        
        /**
         * Bodies in this simulation
         */
        bodies : bodies,
        
        /**
         * Accumulates all forces acting on the bodies and springs.
         */
        accumulate : function(){
            var i, j, body;
            
            // Reinitialize all forces
            i = bodyForces.length;
            while(i--) {
                bodyForces[i].init(this);
            }
            
            i = springForces.length;
            while(i--){
                springForces[i].init(this);
            }
            
            // Accumulate forces acting on bodies.
            i = bodies.length;
            while(i--){
                body = bodies[i];
                body.force.x = 0; 
                body.force.y = 0;
                
                for (j=0; j < bodyForces.length; j++) {
                    bodyForces[j].update(body);
                }
            }
            
            // Accumulate forces acting on springs.
            for(i = 0; i < springs.length; ++i){
                for(j = 0; j < springForces.length; j++){
                    springForces[j].update(springs[i]);
                }
            }
        },
        
        /**
         * Runs simulation for one time step.
         */
        run : function(timeStep){
            this.accumulate();
            return integrator.integrate(this, timeStep);
        },
        
        /**
         * Adds body to this simulation
         * 
         * @param body - a new body. Bodies expected to have
         *   mass, force, velocity, location and prevLocation properties.
         *   the method does not check all this properties, for the sake of performance.
         *   // TODO: maybe it should check it?
         */
        addBody : function(body){
            if (!body){
                throw {
                    message : 'Cannot add null body to force simulator'
                };
            }
            
            bodies.push(body); // TODO: could mark simulator as dirty...
            
            return body;
        },
        
        removeBody : function(body) {
            if (!body) { return false; }
            
            var idx = Viva.Graph.Utils.indexOfElementInArray(body, bodies);
            if (idx < 0) { return false; }

            return bodies.splice(idx, 1);
        },
        
        /**
         * Adds a spring to this simulation.
         */
        addSpring: function(body1, body2, springLength, springCoefficient, springWeight){
            if (!body1 || !body2){
                throw {
                    message : 'Cannot add null spring to force simulator'
                };
            }
            
            if (typeof springLength !== 'number'){
                throw {
                    message : 'Spring length should be a number'
                };
            }
            springWeight = typeof springWeight === 'number' ? springWeight : 1;
            
            var spring = new Viva.Graph.Physics.Spring(body1, body2, springLength, springCoefficient >= 0 ? springCoefficient : -1, springWeight);
            springs.push(spring); 
            
            // TODO: could mark simulator as dirty.
            return spring;
        },
        
        removeSpring : function(spring) {
            if (!spring) { return false; }
            
            var idx = Viva.Graph.Utils.indexOfElementInArray(spring, springs);
            if (idx < 0) { return false; }

            return springs.splice(idx, 1);
        },
        
        /**
         * Adds a force acting on all bodies in this simulation
         */
        addBodyForce: function(force){
            if (!force){
                throw {
                    message : 'Cannot add mighty (unknown) force to the simulator'
                };
            }
            
            bodyForces.push(force);
        },
        
        /**
         * Adds a spring force acting on all springs in this simulation.
         */
        addSpringForce : function(force){
            if (!force){
                throw {
                    message : 'Cannot add unknown force to the simulator'
                };
            }
            
            springForces.push(force);
        }
    };
};