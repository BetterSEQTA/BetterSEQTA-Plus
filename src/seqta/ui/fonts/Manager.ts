import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { FONT_PRESETS, getFontPreset, type FontPreset } from "./presets";

const FONT_STYLE_ID = "betterseqta-font-override";
const FONT_PICKER_BATCH_ID = "betterseqta-font-picker-preview";
const loadedFontIds = new Set<string>();
let pickerFontsPromise: Promise<void> | null = null;

/** Elements that show per-font previews must stay outside the global override. */
export const FONT_PICKER_ROOT_CLASS = "bsplus-font-picker-root";

function googleFamilyParam(preset: FontPreset): string | null {
  if (!preset.googleUrl) return null;
  const name =
    preset.stack.split(",")[0]?.trim().replace(/^"|"$/g, "") ?? "";
  if (!name) return null;
  return `family=${encodeURIComponent(name)}:wght@400;500;600;700`;
}

function injectStylesheet(id: string, href: string): Promise<void> {
  if (document.getElementById(id)) return Promise.resolve();

  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-betterseqta-font-picker-batch", "true");
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

/** Load all Google Fonts for picker previews (batched, awaited). */
export function ensureFontPickerFontsLoaded(): Promise<void> {
  if (!pickerFontsPromise) {
    pickerFontsPromise = (async () => {
      const params = FONT_PRESETS.map(googleFamilyParam).filter(
        (param): param is string => param !== null,
      );

      const chunkSize = 10;
      for (let i = 0; i < params.length; i += chunkSize) {
        const chunk = params.slice(i, i + chunkSize);
        const url = `https://fonts.googleapis.com/css2?${chunk.join("&")}&display=swap`;
        await injectStylesheet(`${FONT_PICKER_BATCH_ID}-${i / chunkSize}`, url);
      }

      try {
        await document.fonts.ready;
      } catch {
        /* FontFaceSet unsupported or blocked */
      }
    })();
  }

  return pickerFontsPromise;
}

export function ensureFontLoaded(preset: FontPreset): void {
  if (!preset.googleUrl || loadedFontIds.has(preset.id)) return;

  if (document.querySelector(`link[data-betterseqta-font="${preset.id}"]`)) {
    loadedFontIds.add(preset.id);
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = preset.googleUrl;
  link.setAttribute("data-betterseqta-font", preset.id);
  document.head.appendChild(link);
  loadedFontIds.add(preset.id);
}

export function buildFontPreviewCss(): string {
  return FONT_PRESETS.map(
    (preset) => `
.bsplus-font-picker-option[data-font-id="${preset.id}"] .bsplus-font-picker-option-name {
  font-family: ${preset.stack} !important;
}`,
  ).join("\n");
}

const SEQTA_FONT_SCOPE = `
  .legacy-root,
  .legacy-root input,
  .legacy-root textarea,
  .legacy-root button,
  .legacy-root select,
  .legacy-root option,
  .legacy-root .input,
  .legacy-root *,
  #container,
  #container *
`;

function buildFontOverrideCss(family: string): string {
  const rule = `font-family: ${family} !important;`;

  return `
    ${SEQTA_FONT_SCOPE} {
      ${rule}
    }

    .iconFamily,
    .iconFamily *,
    button.uiButton.timetable-zoom.iconFamily,
    [class~="iconFamily"],
    [class~="iconFamily"] * {
      font-family: "IconFamily" !important;
    }
  `;
}

export function applySelectedFont(fontId?: string | null): void {
  if (typeof document === "undefined") return;

  const preset = getFontPreset(fontId ?? settingsState.selectedFont);
  ensureFontLoaded(preset);

  document.documentElement.style.setProperty(
    "--betterseqta-font-family",
    preset.stack.split(",")[0]?.trim().replace(/^"|"$/g, "") ?? "Rubik",
  );

  let style = document.getElementById(FONT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = FONT_STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = buildFontOverrideCss(preset.stack);
}
