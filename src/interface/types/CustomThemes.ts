export type CustomTheme = {
  id: string;
  name: string;
  description: string;
  defaultColour: string;
  CanChangeColour: boolean;
  allowBackgrounds: boolean;
  CustomCSS: string;
  CustomImages: CustomImage[];
  coverImage: Blob | string | null;
  isEditable: boolean;
  hideThemeName: boolean;
}

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
  themes: Omit<CustomTheme, 'CustomImages'>[];
  selectedTheme: string;
}