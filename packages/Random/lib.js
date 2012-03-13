
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

function LFIB4() {
  return(function(args) {
    // George Marsaglia's LFIB4,
    //http://groups.google.com/group/sci.crypt/msg/eb4ddde782b17051
    var k0 = 0,
        k1 = 58,
        k2 = 119,
        k3 = 178;
 
    var s = [];
 
    var mash = Mash();
    if (args.length === 0) {
      args = [+new Date()];
    }
    for (var j = 0; j < 256; j++) {
      s[j] = mash(' ');
      s[j] -= mash(' ') * 4.76837158203125e-7; // 2^-21
      if (s[j] < 0) {
        s[j] += 1;
      }
    }
    for (var i = 0; i < args.length; i++) {
      for (var j = 0; j < 256; j++) {
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
 
      return s[k0] = x;
    }
 
    random.uint32 = function() {
      return random() * 0x100000000 >>> 0; // 2^32
    };
    random.fract53 = random;
    random.version = 'LFIB4 0.9';
    random.args = args;
 
    return random;
  } (Array.prototype.slice.call(arguments)));
}