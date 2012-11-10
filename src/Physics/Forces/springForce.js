/*global Viva*/
/*jslint sloppy: true, vars: true, plusplus: true, bitwise: true, nomen: true */

Viva.Graph.Physics.springForce = function (options) {
    if (!options) {
        options = {};
    }

    var currentOptions = {
            length : options.length || 50,
            coeff : typeof options.coeff === 'number' ? options.coeff : 0.00022
        },
        random = Viva.random('Random number 4.', 'Chosen by fair dice roll');

    return {
        init : function (forceSimulator) {},

        update : function (spring) {
            var body1 = spring.body1,
                body2 = spring.body2,
                length = spring.length < 0 ? currentOptions.length : spring.length,
                dx = body2.location.x - body1.location.x,
                dy = body2.location.y - body1.location.y,
                r = Math.sqrt(dx * dx + dy * dy);

            if (r === 0) {
                dx = (random.nextDouble() - 0.5) / 50;
                dy = (random.nextDouble() - 0.5) / 50;
                r = Math.sqrt(dx * dx + dy * dy);
            }

            var d = r - length;
            var coeff = ((!spring.coeff || spring.coeff < 0) ? currentOptions.coeff : spring.coeff) * d / r * spring.weight;

            body1.force.x += coeff * dx;
            body1.force.y += coeff * dy;

            body2.force.x += -coeff * dx;
            body2.force.y += -coeff * dy;
        },

        options : function (newOptions) {
            if (newOptions) {
                if (typeof newOptions.length === 'number') { currentOptions.length = newOptions.length; }
                if (typeof newOptions.coeff === 'number') { currentOptions.coeff = newOptions.coeff; }

                return this;
            }
            return currentOptions;
        }
    };
};
