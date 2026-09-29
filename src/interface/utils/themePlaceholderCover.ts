import type { LoadedCustomTheme } from "@/types/CustomThemes";

/** SVG cover used when a theme has no store/community cover image. */
export function createDefaultThemeCoverSvg(accentHint = "#52525b"): string {
  const accent = accentHint.startsWith("#") ? accentHint : "#52525b";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" role="img" aria-label="Theme cover placeholder">
  <defs>
    <linearGradient id="bsplus-theme-cover-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.45"/>
      <stop offset="55%" stop-color="#27272a" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bsplus-theme-cover-grad)"/>
  <g fill="none" stroke="#fafafa" stroke-opacity="0.35" stroke-width="2">
    <rect x="280" y="130" width="240" height="160" rx="16"/>
    <path d="M310 250 L350 190 L390 230 L430 170 L490 250 Z" fill="#fafafa" fill-opacity="0.12" stroke="none"/>
    <circle cx="430" cy="175" r="14" fill="#fafafa" fill-opacity="0.2" stroke="none"/>
  </g>
  <text x="400" y="330" text-anchor="middle" fill="#fafafa" fill-opacity="0.85" font-family="system-ui,Segoe UI,sans-serif" font-size="22" font-weight="600">No cover image</text>
  <text x="400" y="360" text-anchor="middle" fill="#fafafa" fill-opacity="0.5" font-family="system-ui,Segoe UI,sans-serif" font-size="14">Add one in Theme Creator</text>
</svg>`;
}

export function defaultThemeCoverDataUrl(accentHint?: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    createDefaultThemeCoverSvg(accentHint),
  )}`;
}

let cachedCoverBlob: Blob | null = null;

export async function getDefaultThemeCoverBlob(accentHint?: string): Promise<Blob> {
  if (!cachedCoverBlob) {
    cachedCoverBlob = new Blob([createDefaultThemeCoverSvg(accentHint)], {
      type: "image/svg+xml",
    });
  }
  return cachedCoverBlob;
}

export async function ensureThemeCoverImage(theme: LoadedCustomTheme): Promise<LoadedCustomTheme> {
  if (theme.coverImage && theme.coverImage.size > 0) return theme;
  const coverImage = await getDefaultThemeCoverBlob(theme.defaultColour);
  return { ...theme, coverImage };
}
