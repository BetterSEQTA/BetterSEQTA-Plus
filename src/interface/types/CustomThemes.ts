type CustomTheme = {
  id: string;
  name: string;
  description: string;
  defaultColour: string;
  CanChangeColour: boolean;
  CustomCSS: string;
  CustomImages: CustomImage[];
}

type CustomImage = {
  id: string;
  blob: Blob;
  variableName: string;
}