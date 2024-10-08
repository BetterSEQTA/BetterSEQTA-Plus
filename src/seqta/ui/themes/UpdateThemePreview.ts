import type { LoadedCustomTheme } from '@/types/CustomThemes';
import { applyCustomCSS, removeImageFromDocument } from './Themes';
import { settingsState } from '@/seqta/utils/listeners/SettingsState';

let previousImageVariableNames: string[] = [];
let originalColor: string | null = null;
let originalTheme: boolean | null = null;

export const UpdateThemePreview = async (updatedTheme: LoadedCustomTheme) => {
  const { CustomCSS, CustomImages, defaultColour, forceDark } = updatedTheme;

  // Update dark mode setting
  if (forceDark !== undefined) {
    // Store the original theme if it hasn't been stored yet
    if (originalTheme === null) {
      originalTheme = settingsState.DarkMode;
    }
    settingsState.DarkMode = forceDark;
  }

  // Get the new image variable names
  const newImageVariableNames = CustomImages.map(image => image.variableName);

  // Remove images that are no longer present
  previousImageVariableNames.forEach(variableName => {
    if (!newImageVariableNames.includes(variableName)) {
      removeImageFromDocument(variableName);
    }
  });

  // Update or add new images
  CustomImages.forEach((image: any) => {
    document.documentElement.style.setProperty(`--${image.variableName}`, `url(${image.url})`);
  });

  // Update the previousImageVariableNames for the next run
  previousImageVariableNames = newImageVariableNames;

  // Apply custom CSS
  applyCustomCSS(CustomCSS);

  // Apply default color
  if (defaultColour) {
    // Store the original color if it hasn't been stored yet
    if (originalColor === null) {
      originalColor = settingsState.selectedColor;
    }
    settingsState.selectedColor = defaultColour;
  }
};

export const ClearThemePreview = () => {
  previousImageVariableNames.forEach(variableName => {
    removeImageFromDocument(variableName);
  });

  previousImageVariableNames = [];

  let styleElement = document.getElementById('custom-theme');
  if (styleElement) {
    styleElement.remove();
  }

  // Reset the color to the original value
  if (originalColor !== null) {
    settingsState.selectedColor = originalColor;
    originalColor = null;
  }

  // Reset the theme (dark/light mode) to the original value
  if (originalTheme !== null) {
    settingsState.DarkMode = originalTheme;
    originalTheme = null;
  }
}