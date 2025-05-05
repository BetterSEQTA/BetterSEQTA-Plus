import Color from "color";
export function GetThresholdOfColor(color: any) {
  if (!color) return 0;
  // Case-insensitive regular expression for matching RGBA colors
  const rgbaRegex = /rgba?\(([^)]+)\)/gi;

  // Check if the color string is a gradient (linear or radial)
  if (color.includes("gradient")) {
    let gradientThresholds = [];

    // Find and replace all instances of RGBA in the gradient
    let match;
    while ((match = rgbaRegex.exec(color)) !== null) {
      // Extract the individual components (r, g, b, a)
      const rgbaString = match[1];
      const [r, g, b] = rgbaString.split(",").map((str) => str.trim());

      // Compute the threshold using your existing algorithm
      const threshold = Math.sqrt(
        parseInt(r) ** 2 + parseInt(g) ** 2 + parseInt(b) ** 2,
      );

      // Store the computed threshold
      gradientThresholds.push(threshold);
    }

    // Calculate the average threshold
    const averageThreshold =
      gradientThresholds.reduce((acc, val) => acc + val, 0) /
      gradientThresholds.length;

    return averageThreshold;
  } else {
    // Handle the color as a simple RGBA (or hex, or whatever the Color library supports)
    const rgb = Color.rgb(color).object();
    return Math.sqrt(rgb.r ** 2 + rgb.g ** 2 + rgb.b ** 2);
  }
}
