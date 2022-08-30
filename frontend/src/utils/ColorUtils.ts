// see https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-r
function rgbStringToHex(rgb: string) {
  let result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(rgb);
  return result ? rgbToHex(parseInt(result[1]), parseInt(result[2]), parseInt(result[3])) : null;
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToRgb(hex: string) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

const ColorUtils = {
  rgbStringToHex,
  rgbToHex,
  hexToRgb,
};

export default ColorUtils;
