import Color from 'color';

export function lightenAndPaleColor(inputColor: any, lightenFactor = 0.75, paleFactor = 0.55) {
  if (!inputColor) return;

  if (inputColor.includes('gradient')) {
    const baseColor = findMatchingColor(inputColor);

    return lightenAndPaleColor(baseColor, lightenFactor, paleFactor);
  }

  // Step 1: Convert the input color to a 'color' object
  const colorObj = Color(inputColor);

  // Step 2: Convert to HSL and get the object
  const hslObj = colorObj.hsl().object();

  // Step 3: Adjust saturation and lightness
  const adjustedS = hslObj.s * (1 - paleFactor);
  const adjustedL = hslObj.l + (100 - hslObj.l) * lightenFactor;

  // Step 4: Create a new 'color' object with the adjusted HSL values
  const newColorObj = Color.hsl(hslObj.h, adjustedS, adjustedL);

  // Step 5: Convert back to RGB
  const result = newColorObj.rgb().string();

  return result;
}
// Utility function to average an array of Color objects
function averageColors(colors: any) {
  let avgR = 0, avgG = 0, avgB = 0;
  colors.forEach((color: any) => {
    avgR += color.red();
    avgG += color.green();
    avgB += color.blue();
  });
  return Color.rgb(avgR / colors.length, avgG / colors.length, avgB / colors.length);
}
// Main function to find a matching color for a CSS gradient
function findMatchingColor(cssGradient: any) {
  try {
    // Step 1: Parse the gradient to extract color stops (case-insensitive)
    const regex = /#[0-9a-fA-F]{6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/gi;
    const colorStops = cssGradient.match(regex);

    if (!colorStops) {
      throw new Error('No valid color stops found in the provided CSS gradient.');
    }

    // Normalize and trim the color stops
    const normalizedColorStops = colorStops.map((color: any) => color.toLowerCase().replace(/\s+/g, ''));

    // Convert the color stops to Color objects
    const colorObjects = normalizedColorStops.map((color: any) => Color(color));

    // Step 2: Average the color stops
    const baseColor = averageColors(colorObjects);


    // Step 4: Return the matching color in HEX format
    return baseColor.hex();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    return null;
  }
}