import { generateImageId } from "@/interface/utils/themeImageHandlers";
import { DEFAULT_FONT_ID, getFontPreset, type FontPreset } from "@/seqta/ui/fonts/presets";
import type { LoadedCustomTheme } from "@/types/CustomThemes";

export type ThemeBuilderDraft = {
  name: string;
  description?: string;
  accentColor: string;
  gradientEnd?: string;
  gradientAngle?: number;
  backgroundBlurPx?: number;
  overlayOpacity?: number;
  fontId?: string;
  photoBlobs: Blob[];
  customCssExtra?: string;
  themeId?: string;
};

/** Keep the BetterSEQTA title bar opaque (generated themes must not use the old transparent #title hack). */
const TITLEBAR_SOLID = `#title {
  background: var(--background-primary) !important;
}`;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function buildThemeBuilderCss(
  font: FontPreset,
  imageVariables: string[],
  draft: Pick<
    ThemeBuilderDraft,
    "accentColor" | "gradientEnd" | "gradientAngle" | "backgroundBlurPx" | "overlayOpacity" | "customCssExtra"
  >,
): string {
  const importLine = font.googleUrl ? `@import url("${font.googleUrl}");\n` : "";
  const angle = draft.gradientAngle ?? 135;
  const overlay = clamp(draft.overlayOpacity ?? 0.35, 0, 0.85);
  const blurPx = clamp(draft.backgroundBlurPx ?? 0, 0, 24);
  const endColor = (draft.gradientEnd ?? draft.accentColor).trim();

  const rules: string[] = [
    `${importLine}body, #container, .dashboard {
  font-family: ${font.stack} !important;
}`,
  ];

  const imageLayer =
    imageVariables.length > 0
      ? imageVariables.map((name) => `var(--${name})`).join(", ")
      : "";
  const gradientLayer = `linear-gradient(${angle}deg, color-mix(in srgb, ${draft.accentColor} ${Math.round(overlay * 100)}%, transparent), color-mix(in srgb, ${endColor} ${Math.round(overlay * 100)}%, transparent))`;

  rules.push(`#container {
  isolation: isolate;
  position: relative;
}`);

  if (imageLayer && blurPx > 0) {
    rules.push(`#container::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  background-image: ${imageLayer};
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  filter: blur(${blurPx}px);
  transform: scale(1.04);
}`);
    rules.push(`#container {
  background-image: ${gradientLayer} !important;
  background-size: cover !important;
  background-position: center !important;
  background-attachment: fixed !important;
}`);
  } else {
    const bgLayers: string[] = [gradientLayer];
    if (imageLayer) bgLayers.push(imageLayer);
    rules.push(`#container {
  background-image: ${bgLayers.join(", ")} !important;
  background-size: cover !important;
  background-position: center !important;
  background-attachment: fixed !important;
}`);
  }

  rules.push(`#container::before {
  display: none !important;
  content: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}`);

  if (!imageLayer || blurPx === 0) {
    rules.push(`#container::after {
  display: none !important;
  content: none !important;
  filter: none !important;
}`);
  }

  rules.push(TITLEBAR_SOLID);
  const extra = draft.customCssExtra?.trim();
  if (extra) rules.push(extra);
  return rules.join("\n\n");
}

export function buildThemeFromDraft(draft: ThemeBuilderDraft): LoadedCustomTheme {
  const name = draft.name.trim();
  if (!name) throw new Error("Theme name is required");

  const font = getFontPreset(draft.fontId ?? DEFAULT_FONT_ID);
  const photoBlobs = draft.photoBlobs.filter((blob) => blob.size > 0);
  const CustomImages = photoBlobs.map((blob, index) => ({
    id: generateImageId(),
    blob,
    variableName: `theme-bg-${index}`,
  }));

  return {
    id: draft.themeId ?? crypto.randomUUID(),
    name,
    description: (draft.description ?? "").trim(),
    defaultColour: draft.accentColor.trim() || "rgba(0, 123, 255, 1)",
    CanChangeColour: true,
    allowBackgrounds: true,
    CustomCSS: buildThemeBuilderCss(font, CustomImages.map((i) => i.variableName), draft),
    CustomImages,
    coverImage: photoBlobs[0] ?? null,
    isEditable: true,
    hideThemeName: Boolean(photoBlobs[0]),
    adaptiveCssVariables: [],
  };
}
