Viva.Graph.Physics.gravityForce = function (gravityConstant, options) {
    if (!options) {
        options = {};
    }

    var currentOptions = {
        direction : options.direction || Math.PI / 2,
        gravity : options.gravity || 1e-4
    };


    return {
        update : function (body) {
            var coeff = currentOptions.gravity * body.mass;

            body.force.x += Math.cos(currentOptions.direction) * coeff;
            body.force.y += Math.sin(currentOptions.direction) * coeff;
        },
        options : function (newOptions) {
            if (newOptions) {
                if (newOptions.direction) { currentOptions.direction = newOptions.direction; }
                if (newOptions.gravity) { currentOptions.gravity = newOptions.gravity; }

                return this;
            }

            return currentOptions;
        }
    };
};
