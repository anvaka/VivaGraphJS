Viva.Graph.Physics = Viva.Graph.Physics || {};

/**
 * Manages a simulation of physical forces acting on bodies.
 * To create a custom force simulator register forces of the system
 * via addForce() method, choos appropriate integrator and register
 * bodies.
 *
 * // TODO: Show example.
 */
Viva.Graph.Physics.forceSimulator = function (forceIntegrator) {
    var integrator = forceIntegrator,
        bodies = [], // Bodies in this simulation.
        springs = [], // Springs in this simulation.
        springForce,
        nBodyForce,
        dragForce;

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
        accumulate : function () {
            var i, body;

            nBodyForce.init(this);

            // Accumulate forces acting on bodies.
            i = bodies.length;
            while (i--) {
                body = bodies[i];
                body.force.x = 0;
                body.force.y = 0;

                nBodyForce.update(body);
                dragForce.update(body);
            }

            // Accumulate forces acting on springs.
            i = springs.length;
            while(i--) {
                springForce.update(springs[i]);
            }
        },

        /**
         * Runs simulation for one time step.
         */
        run : function (timeStep) {
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
        addBody : function (body) {
            if (!body) {
                throw {
                    message : 'Cannot add null body to force simulator'
                };
            }

            bodies.push(body); // TODO: could mark simulator as dirty...

            return body;
        },

        removeBody : function (body) {
            if (!body) { return false; }

            var idx = Viva.Graph.Utils.indexOfElementInArray(body, bodies);
            if (idx < 0) { return false; }

            return bodies.splice(idx, 1);
        },

        /**
         * Adds a spring to this simulation.
         */
        addSpring: function (body1, body2, springLength, springWeight, springCoefficient) {
            if (!body1 || !body2) {
                throw {
                    message : 'Cannot add null spring to force simulator'
                };
            }

            if (typeof springLength !== 'number') {
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

        removeSpring : function (spring) {
            if (!spring) { return false; }

            var idx = Viva.Graph.Utils.indexOfElementInArray(spring, springs);
            if (idx < 0) { return false; }

            return springs.splice(idx, 1);
        },

        /**
         * Sets n-body force acting on all bodies in this simulation
         */
        setNbodyForce: function (force) {
            if (!force) {
                throw {
                    message : 'Cannot add mighty (unknown) force to the simulator'
                };
            }

            nBodyForce = force;
        },

        setDragForce: function (force) {
            if (!force) {
                throw {
                    message : 'Cannot add mighty (unknown) force to the simulator'
                };
            }

            dragForce = force;
        },
        /**
         * Adds a spring force acting on all springs in this simulation.
         */
        setSpringForce : function (force) {
            if (!force) {
                throw {
                    message : 'Cannot add unknown force to the simulator'
                };
            }

            springForce =  force;
        }
    };
};
