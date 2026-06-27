type ColorChannels = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clampAlpha(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toHexByte(value: number): string {
  return clampByte(value).toString(16).padStart(2, "0");
}

function createColor(channels: ColorChannels) {
  const color = {
    red: () => clampByte(channels.r),
    green: () => clampByte(channels.g),
    blue: () => clampByte(channels.b),
    alpha: () => clampAlpha(channels.a),
    hex: () =>
      `#${toHexByte(channels.r)}${toHexByte(channels.g)}${toHexByte(channels.b)}`,
  };

  return {
    ...color,
    alpha: (value?: number) => {
      if (value === undefined) return clampAlpha(channels.a);
      return createColor({ ...channels, a: value });
    },
  };
}

function parseHex(input: string): ColorChannels | null {
  const short = input.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    const [r, g, b] = short[1].split("");
    return {
      r: parseInt(`${r}${r}`, 16),
      g: parseInt(`${g}${g}`, 16),
      b: parseInt(`${b}${b}`, 16),
      a: 1,
    };
  }

  const long = input.match(/^#([0-9a-f]{6})$/i);
  if (!long) return null;

  return {
    r: parseInt(long[1].slice(0, 2), 16),
    g: parseInt(long[1].slice(2, 4), 16),
    b: parseInt(long[1].slice(4, 6), 16),
    a: 1,
  };
}

function parseRgb(input: string): ColorChannels | null {
  const match = input.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i,
  );
  if (!match) return null;

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] !== undefined ? Number(match[4]) : 1,
  };
}

function Color(input: string) {
  const channels = parseHex(input) ?? parseRgb(input);
  if (!channels) {
    throw new Error(`Unable to parse color: ${input}`);
  }
  return createColor(channels);
}

Color.rgb = (r: number, g: number, b: number) => createColor({ r, g, b, a: 1 });

export default Color;
