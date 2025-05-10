// Define the structure of a custom theme
export type CustomTheme = {
  id: string; // Unique identifier for the theme
  name: string; // Name of the theme
  description: string; // Description of the theme
  defaultColour: string; // Default color for the theme
  CanChangeColour: boolean; // Flag indicating if the color can be changed
  allowBackgrounds: boolean; // Flag indicating if custom backgrounds are allowed
  CustomCSS: string; // Custom CSS applied to the theme
  CustomImages: CustomImage[]; // List of custom images used in the theme
  coverImage: Blob | null; // Optional cover image for the theme
  isEditable: boolean; // Flag indicating if the theme is editable
  hideThemeName: boolean; // Flag indicating if the theme name is hidden
  webURL?: string; // Optional URL where the theme can be viewed or downloaded
  selectedColor?: string; // Optional selected color for the theme
