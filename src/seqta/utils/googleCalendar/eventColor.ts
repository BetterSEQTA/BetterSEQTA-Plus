/** Google Calendar event palette (`colorId` → background). */
export const GOOGLE_EVENT_COLORS: ReadonlyArray<{ id: string; background: string }> = [
  { id: "1", background: "#a4bdfc" },
  { id: "2", background: "#7ae7bf" },
  { id: "3", background: "#dbadff" },
  { id: "4", background: "#ff887c" },
  { id: "5", background: "#fbd75b" },
  { id: "6", background: "#ffb878" },
  { id: "7", background: "#46d6db" },
  { id: "8", background: "#e1e1e1" },
  { id: "9", background: "#5484ed" },
  { id: "10", background: "#51b749" },
  { id: "11", background: "#dc2127" },
];

type Rgb = { r: number; g: number; b: number };

function expandHex(hex: string): string | null {
  const raw = hex.replace("#", "").trim();
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return raw
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^[0-9a-fA-F]{8}$/.test(raw)) return raw.slice(0, 6);
  return null;
}

/** Parse common CSS colour strings to RGB (hex / rgb / rgba). */
export function parseRgbColour(value: string): Rgb | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hexMatch = trimmed.match(/#([0-9a-fA-F]{3,8})\b/);
  if (hexMatch) {
    const expanded = expandHex(hexMatch[1]!);
    if (!expanded) return null;
    return {
      r: Number.parseInt(expanded.slice(0, 2), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      b: Number.parseInt(expanded.slice(4, 6), 16),
    };
  }

  const rgbMatch = trimmed.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i,
  );
  if (rgbMatch) {
    return {
      r: Math.round(Number(rgbMatch[1])),
      g: Math.round(Number(rgbMatch[2])),
      b: Math.round(Number(rgbMatch[3])),
    };
  }

  return null;
}

function rgbDistance(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/**
 * Maps a SEQTA subject colour to the nearest Google Calendar event `colorId`.
 * Returns undefined when the colour cannot be parsed.
 */
export function nearestGoogleEventColorId(colour: string | undefined): string | undefined {
  const target = colour ? parseRgbColour(colour) : null;
  if (!target) return undefined;

  let bestId: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entry of GOOGLE_EVENT_COLORS) {
    const candidate = parseRgbColour(entry.background);
    if (!candidate) continue;
    const distance = rgbDistance(target, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = entry.id;
    }
  }

  return bestId;
}
