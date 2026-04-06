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
  forceDark?: boolean;
  /** True if installed from the BetterSEQTA theme store (not file import). */
  installedFromStore?: boolean;
  /** Server `updated_at` (Unix seconds) when this copy was installed or last auto-updated. */
  storeSyncedAtSec?: number;
  /** User saved edits in theme creator or popup; blocks store auto-update. */
  userEdited?: boolean;
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
