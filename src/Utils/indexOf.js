/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

/*global Viva*/
Viva.Graph.Utils = Viva.Graph.Utils || {};

Viva.Graph.Utils.indexOfElementInArray = function(element, array) {
    if (array.indexOf) {
        return array.indexOf(element);
    }

    var len = array.length;
    var i = 0;

    for ( ; i < len; i++ ) {
        if ( i in array && array[i] === element ) {
            return i;
        }
    }
    
    return -1;
};
