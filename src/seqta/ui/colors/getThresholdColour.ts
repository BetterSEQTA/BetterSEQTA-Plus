import Color from "color";
import {
  colorCssThresholdDistance,
  isBetterseqtaWasmReady,
} from "@/wasm/init";

export function GetThresholdOfColor(color: any) {
  if (!color) return 0;
  const s = typeof color === "string" ? color : String(color);

  if (isBetterseqtaWasmReady()) {
    try {
      const v = colorCssThresholdDistance(s);
      if (v >= 0 && Number.isFinite(v)) return v;
    } catch {
      /* fall through to Color */
    }
  }

  const rgbaRegex = /rgba?\(([^)]+)\)/gi;

  if (s.includes("gradient")) {
    const gradientThresholds = [];
    let match;
    while ((match = rgbaRegex.exec(s)) !== null) {
      const rgbaString = match[1];
      const [r, g, b] = rgbaString.split(",").map((str) => str.trim());
      const threshold = Math.sqrt(
        parseInt(r, 10) ** 2 + parseInt(g, 10) ** 2 + parseInt(b, 10) ** 2,
      );
      gradientThresholds.push(threshold);
    }
    if (gradientThresholds.length === 0) {
      return 0;
    }
    return (
      gradientThresholds.reduce((acc, val) => acc + val, 0) /
      gradientThresholds.length
    );
  }

  const rgb = Color.rgb(s).object();
  return Math.sqrt(rgb.r ** 2 + rgb.g ** 2 + rgb.b ** 2);
}
