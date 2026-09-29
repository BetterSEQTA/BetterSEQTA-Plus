import { buildThemeBuilderCss } from "@/interface/utils/themeBuilderDraft";
import { applySelectedFont } from "@/seqta/ui/fonts/Manager";
import { DEFAULT_FONT_ID, getFontPreset } from "@/seqta/ui/fonts/presets";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import type { LoadedCustomTheme, ThemeCreatorMeta } from "@/types/CustomThemes";

export type ThemeCreatorSidebarMeta = {
  sidebarStyle?: string;
  sidebarDensity?: string;
  sidebarCornerRadius?: number;
  sidebarActiveIndicator?: string;
  sidebarWidth?: string;
  sidebarPosition?: string;
  sidebarBlur?: number;
  transparencyEffects?: boolean;
};

export function defaultThemeCreatorMeta(
  overrides: Partial<ThemeCreatorMeta> = {},
): ThemeCreatorMeta {
  return {
    fontId: settingsState.selectedFont ?? DEFAULT_FONT_ID,
    pageBackgroundImageId: null,
    backgroundBlurPx: 0,
    overlayOpacity: 0.35,
    gradientAngle: 135,
    gradientEnd: "",
    userCustomCss: "",
    ...overrides,
  };
}

export function snapshotSidebarSettings(): ThemeCreatorSidebarMeta {
  return {
    sidebarStyle: settingsState.sidebarStyle,
    sidebarDensity: settingsState.sidebarDensity,
    sidebarCornerRadius: settingsState.sidebarCornerRadius,
    sidebarActiveIndicator: settingsState.sidebarActiveIndicator,
    sidebarWidth: settingsState.sidebarWidth,
    sidebarPosition: settingsState.sidebarPosition,
    sidebarBlur: settingsState.sidebarBlur,
    transparencyEffects: settingsState.transparencyEffects,
  };
}

export function applySidebarSettings(meta: ThemeCreatorSidebarMeta | undefined): void {
  if (!meta) return;
  if (meta.sidebarStyle !== undefined) settingsState.sidebarStyle = meta.sidebarStyle;
  if (meta.sidebarDensity !== undefined) settingsState.sidebarDensity = meta.sidebarDensity;
  if (meta.sidebarCornerRadius !== undefined) {
    settingsState.sidebarCornerRadius = meta.sidebarCornerRadius;
  }
  if (meta.sidebarActiveIndicator !== undefined) {
    settingsState.sidebarActiveIndicator = meta.sidebarActiveIndicator;
  }
  if (meta.sidebarWidth !== undefined) settingsState.sidebarWidth = meta.sidebarWidth;
  if (meta.sidebarPosition !== undefined) settingsState.sidebarPosition = meta.sidebarPosition;
  if (meta.sidebarBlur !== undefined) settingsState.sidebarBlur = meta.sidebarBlur;
  if (meta.transparencyEffects !== undefined) {
    settingsState.transparencyEffects = meta.transparencyEffects;
  }
}

export function composeThemeCustomCss(
  theme: Pick<LoadedCustomTheme, "defaultColour" | "CustomImages">,
  meta: ThemeCreatorMeta,
): string {
  const font = getFontPreset(meta.fontId ?? DEFAULT_FONT_ID);
  const backgroundVariables: string[] = [];
  if (meta.pageBackgroundImageId) {
    const image = theme.CustomImages.find((item) => item.id === meta.pageBackgroundImageId);
    if (image?.variableName) backgroundVariables.push(image.variableName);
  }

  const gradientEnd = (meta.gradientEnd || theme.defaultColour).trim();

  return buildThemeBuilderCss(font, backgroundVariables, {
    accentColor: theme.defaultColour,
    gradientEnd,
    gradientAngle: meta.gradientAngle ?? 135,
    backgroundBlurPx: meta.backgroundBlurPx ?? 0,
    overlayOpacity: meta.overlayOpacity ?? 0.35,
    customCssExtra: meta.userCustomCss ?? "",
  });
}

export function applyThemeCreatorMetaToSettings(meta: ThemeCreatorMeta | undefined): void {
  if (!meta) return;
  if (meta.fontId) {
    settingsState.selectedFont = meta.fontId;
    applySelectedFont(meta.fontId);
  }
  applySidebarSettings(meta.sidebar);
}

export function mergeThemeWithCreatorMeta(
  theme: LoadedCustomTheme,
  meta: ThemeCreatorMeta,
): LoadedCustomTheme {
  const sidebar = snapshotSidebarSettings();
  const mergedMeta: ThemeCreatorMeta = { ...meta, sidebar };
  const CustomCSS = composeThemeCustomCss(theme, mergedMeta);
  return { ...theme, creatorMeta: mergedMeta, CustomCSS };
}
