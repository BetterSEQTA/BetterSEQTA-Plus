import Color from 'color';

function adjustLuminance(color: any, lum: any) {
  let adjustedColor = Color(color.toLowerCase());
  const rgbObj = adjustedColor.rgb().object();
  
  // Adjust luminance
  adjustedColor = Color.rgb(
    Math.min(Math.max(0, rgbObj.r + rgbObj.r * lum), 255),
    Math.min(Math.max(0, rgbObj.g + rgbObj.g * lum), 255),
    Math.min(Math.max(0, rgbObj.b + rgbObj.b * lum), 255)
  );
  
  return adjustedColor.string();
}

export default function ColorLuminance(color: any, lum = 0) {
  if (color == '' || color == null) {
    // light cyan blue
    return '#00bfff';
  }
  const colorRegex = /rgba?\(([^)]+)\)/gi;  // Case-insensitive match for rgb() or rgba()
  
  if (color.toLowerCase().includes('gradient')) {
    let gradient = color;
    
    let uniqueColorSet = new Set();
    
    // Extract all unique color stops
    let match;
    while ((match = colorRegex.exec(color)) !== null) {
      uniqueColorSet.add(match[0]);
    }
    
    // Adjust luminance for each unique color stop
    for (let colorStop of uniqueColorSet) {
      const adjustedColor = adjustLuminance(colorStop, lum);
      gradient = gradient.replace(new RegExp(colorStop as string, 'gi'), adjustedColor);
    }
    
    return gradient;
  } else {
    return adjustLuminance(color, lum);
  }
}