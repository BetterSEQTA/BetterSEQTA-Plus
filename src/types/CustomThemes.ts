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
}

export type LoadedCustomTheme = CustomTheme & {
  CustomImages: {
    id: string;
    blob: Blob;
    variableName: string;
    url: string | null;
  }[];
  coverImageUrl?: string;
};

export type DownloadedTheme = CustomTheme & {
  webURL: string;
}

export type CustomImage = {
  id: string;
  blob: Blob;
  variableName: string;
}

export type ThemeList = {
  themes: CustomTheme[];
  selectedTheme: string;
}