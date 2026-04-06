export type CustomTheme = {
  id: string;
  name: string;
  description: string;
  defaultColour: string;
  CanChangeColour: boolean;
  allowBackgrounds: boolean;
  CustomCSS: string;
  CustomImages: CustomImage[];
  coverImage: Blob | null;
  isEditable: boolean;
  hideThemeName: boolean;
  webURL?: string;
  selectedColor?: string;
  /**
   * When true, the theme forces light/dark via `forceDark` (`false` = light, `true` = dark).
   * When false/omitted, use legacy rule: `forceDark !== undefined` still means "force" for old JSON.
   */
  forceTheme?: boolean;
  forceDark?: boolean;
  /** CSS custom property names (e.g. `--my-accent`) that receive the same value as `--better-main` when adaptive colours apply. */
  adaptiveCssVariables?: string[];
};

export type LoadedCustomTheme = CustomTheme & {
  CustomImages: {
    id: string;
    blob: Blob;
    variableName: string;
  }[];
};

export type DownloadedTheme = CustomTheme & {
  webURL: string;
};

export type CustomImage = {
  id: string;
  blob: Blob;
  variableName: string;
};

export type ThemeList = {
  themes: CustomTheme[];
  selectedTheme: string;
};

/** Whether the theme forces appearance (light vs dark). */
export function shouldForceThemeAppearance(theme: {
  forceTheme?: boolean;
  forceDark?: boolean;
}): boolean {
  if (theme.forceTheme === true) return true;
  if (theme.forceTheme === false) return false;
  return theme.forceDark !== undefined;
}

/** Resolved forced dark mode when forcing is active. */
export function getForcedDarkMode(theme: { forceDark?: boolean }): boolean {
  return theme.forceDark === true;
}
