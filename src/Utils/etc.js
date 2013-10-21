/** 
 * Extends target object with given fields/values in the options object.
 * Unlike jQuery's extend this method does not override target object
 * properties if their type matches corresponding type in the options object
 */
Viva.lazyExtend = function (target, options) {
    var key;
    if (!target) { target = {}; }
    if (options) {
        for (key in options) {
            if (options.hasOwnProperty(key)) {
                var targetHasIt = target.hasOwnProperty(key),
                    optionsValueType = typeof options[key],
                    shouldReplace = !targetHasIt || (typeof target[key] !== optionsValueType);

                if (shouldReplace) {
                    target[key] = options[key];
                } else if (optionsValueType === 'object') {
                    // go deep, don't care about loops here, we are simple API!:
                    target[key] = Viva.lazyExtend(target[key], options[key]);
                }
            }
        }
    }

    return target;
};
/**
 * Implenetation of seeded pseudo random number generator, based on Robert Jenkin's 32 bit integer hash function
 *
 * Usage example:
 *  var random = Viva.random(seedNumber),
 *      i = random.next(100); // returns random number from [0 .. 100) range.
 */

Viva.random = function () {
    var firstArg = arguments[0];
    var seed;
    if (typeof firstArg === 'number') {
        seed = firstArg;
    } else if (typeof firstArg === 'string') {
        seed = firstArg.length;
    } else {
        seed = +new Date();
    }
    var randomFunc = function() {
            // Robert Jenkins' 32 bit integer hash function.
            seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
            seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
            seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
            seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
            seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
            seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
            return (seed & 0xfffffff) / 0x10000000;
        };

    return {
        /**
         * Generates random integer number in the range from 0 (inclusive) to maxValue (exclusive)
         *
         * @param maxValue is REQUIRED. Ommitit this numbe will result in NaN values from PRNG.
         */
        next : function (maxValue) {
            return Math.floor(randomFunc() * maxValue);
        },

        /**
         * Generates random double number in the range from 0 (inclusive) to 1 (exclusive)
         * This function is the same as Math.random() (except that it could be seeded)
         */
        nextDouble : function () {
            return randomFunc();
        }
    };
};

/**
 * Iterates over array in arbitrary order. The iterator modifies actual array content.
 * It's based on modern version of Fisher–Yates shuffle algorithm.
 *
 * @see http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
 *
 * @param array to be shuffled
 * @param random - a [seeded] random number generator to produce same sequences. This parameter
 * is optional. If you don't need determenistic randomness keep it blank.
 */
Viva.randomIterator = function (array, random) {
    random = random || Viva.random();

    return {
        forEach : function (callback) {
            var i, j, t;
            for (i = array.length - 1; i > 0; --i) {
                j = random.next(i + 1); // i inclusive
                t = array[j];
                array[j] = array[i];
                array[i] = t;

                callback(t);
            }

            if (array.length) {
                callback(array[0]);
            }
        },

        /**
         * Shuffles array randomly.
         */
        shuffle : function () {
            var i, j, t;
            for (i = array.length - 1; i > 0; --i) {
                j = random.next(i + 1); // i inclusive
                t = array[j];
                array[j] = array[i];
                array[i] = t;
            }

            return array;
        }
    };
};
