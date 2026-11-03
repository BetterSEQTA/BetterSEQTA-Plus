import Color from "color";

function adjustLuminance(color: string, lum: number) {
  let adjustedColor = Color(color.toLowerCase());
  const rgbObj = adjustedColor.rgb().object();

  adjustedColor = Color.rgb(
    Math.min(Math.max(0, rgbObj.r + rgbObj.r * lum), 255),
    Math.min(Math.max(0, rgbObj.g + rgbObj.g * lum), 255),
    Math.min(Math.max(0, rgbObj.b + rgbObj.b * lum), 255),
  );

  return adjustedColor.string();
}

export default function ColorLuminance(color: string, lum = 0) {
  if (color == "" || color == null) {
    // light cyan blue
    return "#00bfff";
  }
  const colorRegex = /rgba?\(([^)]+)\)/gi; // Case-insensitive match for rgb() or rgba()

  if (color.toLowerCase().includes("gradient")) {
    let gradient = color;

    const uniqueColorSet = new Set();

    let match;
    while ((match = colorRegex.exec(color)) !== null) {
      uniqueColorSet.add(match[0]);
    }

    // Adjust luminance for each unique color stop
    for (const colorStop of uniqueColorSet) {
      const stop = String(colorStop);
      const adjustedColor = adjustLuminance(stop, lum);
      gradient = gradient.replace(new RegExp(stop, "gi"), adjustedColor);
    }

    return gradient;
  } else {
    return adjustLuminance(color, lum);
  }
}
