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
  CustomImages: Array<{
    id: string;
    blob: Blob;
    variableName: string;
    url: string | null;
  }>;
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

export type CustomImageBase64 = {
  id: string;
  url: string;
  variableName: string;
}

export type CustomThemeBase64 = Omit<CustomTheme, 'CustomImages'> & {
  CustomImages: CustomImageBase64[];
  coverImage: string | null;
}

export type ThemeList = {
  themes: CustomTheme[];
  selectedTheme: string;
}