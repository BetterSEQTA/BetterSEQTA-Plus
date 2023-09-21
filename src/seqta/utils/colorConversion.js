import { Color } from "color";

export function convertColor(inputColor, outputMode) {
  console.log(`Converting to ${outputMode}`);

  // Convert color to desired output mode
  let convertedColor = Color[outputMode]().string();
  return convertedColor;
}