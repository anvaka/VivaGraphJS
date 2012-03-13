/*global Viva, LFIB4*/

var randomFunc = new LFIB4(313371, "Hm...");

// Math.random; //new MersenneTwister19937(31337).genrand_real2; //Math.random; //new Alea("Let seed ", 31337, "be"); //new KISS07("Let seed ", 31337, "be");
/**
 * Returns a random integer number between 0 and maxValue inclusive.
 * 
 * @param maxValue is required parameter. 
 * 
 * TODO: remove usage of Math.random() from other places.
 */
Viva.random = function (maxValue) {
    return Math.floor(randomFunc() * maxValue);
};

/**
 * Iterates over array in arbitrary order. The iterator modifies actual array content. 
 * It's based on modern version of Fisher–Yates shuffle algorithm.  
 * 
 * @see http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
 */
Viva.randomIterator = function(array) {
    return {
        forEach : function(callback) {
            for (var i = array.length - 1; i > 0; --i) {
               var j = Viva.random(i);
               var t = array[j];
               array[j] = array[i];
               array[i] = t;
               
               callback(t);
            }
            
            if (array.length) {
                callback(array[0]);
            }
        }
    };
};
