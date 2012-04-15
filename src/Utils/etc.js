/*global Viva */

/**
 * Implenetation of seeded pseudo random number generator, based on LFIB4 algorithm.
 * 
 * Usage example: 
 *  var random = Viva.random('random seed', 'can', 'be', 'multiple strings'),
 *      i = random.next(100); // returns random number from [0 .. 100) range.
 */

Viva.random = function() {
    // From http://baagoe.com/en/RandomMusings/javascript/
    function Mash() {
        var n = 0xefc8249d;
     
        var mash = function(data) {
          data = data.toString();
          for (var i = 0; i < data.length; i++) {
            n += data.charCodeAt(i);
            var h = 0.02519603282416938 * n;
            n = h >>> 0;
            h -= n;
            h *= n;
            n = h >>> 0;
            h -= n;
            n += h * 0x100000000; // 2^32
          }
          return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
        };
     
        mash.version = 'Mash 0.9';
        return mash;
    }

    function LFIB4(args) {
      return(function(args) {
        // George Marsaglia's LFIB4,
        //http://groups.google.com/group/sci.crypt/msg/eb4ddde782b17051
        var k0 = 0,
            k1 = 58,
            k2 = 119,
            k3 = 178,
            j;
     
        var s = [];
     
        var mash = Mash();
        if (args.length === 0) {
          args = [+new Date()];
        }
        for (j = 0; j < 256; j++) {
          s[j] = mash(' ');
          s[j] -= mash(' ') * 4.76837158203125e-7; // 2^-21
          if (s[j] < 0) {
            s[j] += 1;
          }
        }
        for (var i = 0; i < args.length; i++) {
          for (j = 0; j < 256; j++) {
            s[j] -= mash(args[i]);
            s[j] -= mash(args[i]) * 4.76837158203125e-7; // 2^-21
            if (s[j] < 0) {
              s[j] += 1;
            }
          }
        }
        mash = null;
     
        var random = function() {
          var x;
     
          k0 = (k0 + 1) & 255;
          k1 = (k1 + 1) & 255;
          k2 = (k2 + 1) & 255;
          k3 = (k3 + 1) & 255;
     
          x = s[k0] - s[k1];
          if (x < 0) {
            x += 1;
          }
          x -= s[k2];
          if (x < 0) {
            x += 1;
          }
          x -= s[k3];
          if (x < 0) {
            x += 1;
          }
          
          s[k0] = x;
          return x;
        };
     
        random.uint32 = function() {
          return random() * 0x100000000 >>> 0; // 2^32
        };
        random.fract53 = random;
        random.version = 'LFIB4 0.9';
        random.args = args;
     
        return random;
      } (args));
    }
    
    var randomFunc = new LFIB4(Array.prototype.slice.call(arguments));
    
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
        nextDouble : function(){
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
Viva.randomIterator = function(array, random) {
    random = random || Viva.random();
    
    return {
        forEach : function(callback) {
            for (var i = array.length - 1; i > 0; --i) {
               var j = random.next(i + 1); // i inclusive
               var t = array[j];
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
        shuffle : function() {
            for (var i = array.length - 1; i > 0; --i) {
               var j = random.next(i + 1); // i inclusive
               var t = array[j];
               array[j] = array[i];
               array[i] = t;
            }
            
            return array;
        }
    };
};
