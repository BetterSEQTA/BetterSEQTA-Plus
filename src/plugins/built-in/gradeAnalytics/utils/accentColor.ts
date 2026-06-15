import Color from "color";

export type ContrastAccentPalette = {
  accent: string;
  accentSubtle: string;
  onAccent: string;
};

type ColorInstance = ReturnType<typeof Color>;

const MIN_CONTRAST_LIGHT = 4.5;
const MIN_CONTRAST_DARK = 3;

function contrastRatio(foreground: ColorInstance, background: ColorInstance): number {
  const fg = foreground.luminosity();
  const bg = background.luminosity();
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function adjustLightnessForContrast(
  hue: number,
  saturation: number,
  lightness: number,
  background: ColorInstance,
  isDark: boolean,
): ColorInstance {
  const minContrast = isDark ? MIN_CONTRAST_DARK : MIN_CONTRAST_LIGHT;
  let candidate = Color.hsl(hue, saturation, lightness);

  for (let i = 0; i < 16; i++) {
    if (contrastRatio(candidate, background) >= minContrast) {
      return candidate;
    }
    const { l } = candidate.hsl().object();
    candidate = Color.hsl(
      hue,
      saturation,
      isDark ? Math.min(l + 5, 82) : Math.max(l - 5, 18),
    );
  }

  return candidate;
}

/**
 * Keep the user's hue/saturation but pick lightness so accent text and fills
 * stay readable against the analytics surface background.
 */
export function buildContrastAccentPalette(
  accentRaw: string,
  backgroundRaw: string,
): ContrastAccentPalette {
  const accent = Color(accentRaw);
  const background = Color(backgroundRaw);
  const isDark = background.isDark();

  const { h, s } = accent.hsl().object();
  const saturation = Math.min(Math.max(s, 42), 88);
  const baseLightness = isDark ? 64 : 40;

  const foreground = adjustLightnessForContrast(
    h,
    saturation,
    baseLightness,
    background,
    isDark,
  );

  const accentHex = foreground.hex();
  const subtleLightness = isDark ? 28 : 94;
  const subtle = Color.hsl(h, saturation * 0.75, subtleLightness);

  return {
    accent: accentHex,
    accentSubtle: subtle.alpha(isDark ? 0.22 : 0.14).rgb().string(),
    onAccent: foreground.isLight() ? "#141414" : "#ffffff",
  };
}
