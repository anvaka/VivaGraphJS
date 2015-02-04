module.exports = parseColor;

function parseColor(color) {
  var parsedColor = 0x009ee8ff;

  if (typeof color === 'string' && color) {
    if (color.length === 4) { // #rgb
      color = color.replace(/([^#])/g, '$1$1'); // duplicate each letter except first #.
    }
    if (color.length === 9) { // #rrggbbaa
      parsedColor = parseInt(color.substr(1), 16);
    } else if (color.length === 7) { // or #rrggbb.
      parsedColor = (parseInt(color.substr(1), 16) << 8) | 0xff;
    } else {
      throw 'Color expected in hex format with preceding "#". E.g. #00ff00. Got value: ' + color;
    }
  } else if (typeof color === 'number') {
    parsedColor = color;
  }

  return parsedColor;
}
