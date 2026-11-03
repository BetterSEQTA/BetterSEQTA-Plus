export type Rgba = { r: number; g: number; b: number; a: number };
export type Hsva = { h: number; s: number; v: number; a: number };
export type GradientStop = { colour: Rgba; position: number };
export type ColourValue =
  | { kind: "solid"; colour: Rgba }
  | { kind: "linear"; angle: number; stops: GradientStop[] }
  | { kind: "radial"; stops: GradientStop[] };

const FALLBACK: Rgba = { r: 17, g: 88, b: 131, a: 1 };

const SIDE_ANGLES: Record<string, number> = {
  "to top": 0,
  "to top right": 45,
  "to right top": 45,
  "to right": 90,
  "to bottom right": 135,
  "to right bottom": 135,
  "to bottom": 180,
  "to bottom left": 225,
  "to left bottom": 225,
  "to left": 270,
  "to top left": 315,
  "to left top": 315,
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

function parseAlpha(part: string): number {
  return clamp(part.endsWith("%") ? parseFloat(part) / 100 : parseFloat(part), 0, 1);
}

function hexToRgba(hex: string): Rgba | null {
  const digits = hex.slice(1);
  if (![3, 4, 6, 8].includes(digits.length)) return null;
  const full = digits.length <= 4 ? [...digits].map((d) => d + d).join("") : digits;
  const [r, g, b, a = 255] = full.match(/../g)!.map((pair) => parseInt(pair, 16));
  return { r, g, b, a: round(a / 255, 2) };
}

function hslToRgba(h: number, s: number, l: number, a: number): Rgba {
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) =>
    l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255), a };
}

export function parseColour(input: string): Rgba | null {
  const value = input.trim().toLowerCase();
  if (value === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (/^#[0-9a-f]+$/.test(value)) return hexToRgba(value);

  const fn = value.match(/^(rgba?|hsla?)\(([^()]*)\)$/);
  if (!fn) return null;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const a = parts[3] === undefined ? 1 : parseAlpha(parts[3]);
  if (Number.isNaN(a)) return null;

  if (fn[1].startsWith("rgb")) {
    const [r, g, b] = parts
      .slice(0, 3)
      .map((part) =>
        clamp(Math.round(part.endsWith("%") ? parseFloat(part) * 2.55 : parseFloat(part)), 0, 255),
      );
    return [r, g, b].some(Number.isNaN) ? null : { r, g, b, a };
  }

  const [h, s, l] = [parseFloat(parts[0]), parseFloat(parts[1]) / 100, parseFloat(parts[2]) / 100];
  return [h, s, l].some(Number.isNaN)
    ? null
    : hslToRgba(((h % 360) + 360) % 360, clamp(s, 0, 1), clamp(l, 0, 1), a);
}

export function formatColour({ r, g, b, a }: Rgba): string {
  return `rgba(${r}, ${g}, ${b}, ${round(a, 2)})`;
}

export function rgbaToHex({ r, g, b }: Rgba): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function rgbaToHsva({ r, g, b, a }: Rgba): Hsva {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  let h = 0;
  if (delta) {
    if (max === red) h = ((green - blue) / delta) % 6;
    else if (max === green) h = (blue - red) / delta + 2;
    else h = (red - green) / delta + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max ? (delta / max) * 100 : 0, v: max * 100, a };
}

export function hsvaToRgba({ h, s, v, a }: Hsva): Rgba {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v / 100) * (1 - (s / 100) * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return { r: f(5), g: f(3), b: f(1), a };
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of input) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseStop(part: string): { colour: Rgba; position?: number } | null {
  const withPosition = part.match(/^(.+?)\s+(-?[\d.]+)%$/);
  const colour = withPosition ? parseColour(withPosition[1]) : null;
  if (colour) return { colour, position: clamp(parseFloat(withPosition![2]), 0, 100) };
  const plain = parseColour(part);
  return plain ? { colour: plain } : null;
}

function fillPositions(stops: { colour: Rgba; position?: number }[]): GradientStop[] {
  const positions = stops.map((stop) => stop.position);
  positions[0] ??= 0;
  positions[positions.length - 1] ??= 100;
  for (let i = 1; i < positions.length - 1; i++) {
    if (positions[i] !== undefined) continue;
    const next = positions.findIndex((position, j) => j > i && position !== undefined);
    const start = positions[i - 1]!;
    positions[i] = start + (positions[next]! - start) / (next - i + 1);
  }
  return stops.map((stop, i) => ({ colour: stop.colour, position: round(positions[i]!, 2) }));
}

export function parseValue(input: string): ColourValue {
  const gradient = input.trim().match(/^(linear|radial)-gradient\(([\s\S]*)\)$/i);
  if (!gradient) return { kind: "solid", colour: parseColour(input) ?? FALLBACK };

  const kind = gradient[1].toLowerCase() as "linear" | "radial";
  const args = splitTopLevel(gradient[2]);
  let angle = 180;
  if (args.length && !parseStop(args[0])) {
    const direction = args.shift()!.toLowerCase().replace(/\s+/g, " ");
    const degrees = direction.match(/^(-?[\d.]+)deg$/);
    if (degrees) angle = ((parseFloat(degrees[1]) % 360) + 360) % 360;
    else if (direction in SIDE_ANGLES) angle = SIDE_ANGLES[direction];
  }

  const stops = args.map(parseStop).filter((stop) => stop !== null);
  if (stops.length < 2) return { kind: "solid", colour: stops[0]?.colour ?? FALLBACK };
  const filled = fillPositions(stops);
  return kind === "linear" ? { kind, angle, stops: filled } : { kind, stops: filled };
}

export function formatStops(stops: GradientStop[]): string {
  return [...stops]
    .sort((a, b) => a.position - b.position)
    .map((stop) => `${formatColour(stop.colour)} ${round(stop.position)}%`)
    .join(", ");
}

export function formatValue(value: ColourValue): string {
  if (value.kind === "solid") return formatColour(value.colour);
  if (value.kind === "linear")
    return `linear-gradient(${round(value.angle)}deg, ${formatStops(value.stops)})`;
  return `radial-gradient(circle, ${formatStops(value.stops)})`;
}

export function colourAt(stops: GradientStop[], position: number): Rgba {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const after = sorted.findIndex((stop) => stop.position >= position);
  if (after <= 0) return { ...sorted[after === 0 ? 0 : sorted.length - 1].colour };
  const [from, to] = [sorted[after - 1], sorted[after]];
  const t = (position - from.position) / (to.position - from.position || 1);
  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    r: Math.round(mix(from.colour.r, to.colour.r)),
    g: Math.round(mix(from.colour.g, to.colour.g)),
    b: Math.round(mix(from.colour.b, to.colour.b)),
    a: round(mix(from.colour.a, to.colour.a), 2),
  };
}
