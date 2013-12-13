Viva.Graph.Physics.dragForce = function (options) {
    if (!options) {
        options = {};
    }

    var currentOptions = {
        coeff : options.coeff || 0.01
    };

    return {
        update : function (body) {
            body.force.x -= currentOptions.coeff * body.velocity.x;
            body.force.y -= currentOptions.coeff * body.velocity.y;
        },
        options : function (newOptions) {
            if (newOptions) {
                if (typeof newOptions.coeff === 'number') { currentOptions.coeff = newOptions.coeff; }

                return this;
            }

            return currentOptions;
        }
    };
};
