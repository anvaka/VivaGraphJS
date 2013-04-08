/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

Viva.Graph.Utils = Viva.Graph.Utils || {};

Viva.Graph.Utils.indexOfElementInArray = function (element, array) {
    if (array.indexOf) {
        return array.indexOf(element);
    }

    var len = array.length,
        i;

    for (i = 0; i < len; i += 1) {
        if (array.hasOwnProperty(i) && (array[i] === element)) {
            return i;
        }
    }

    return -1;
};
