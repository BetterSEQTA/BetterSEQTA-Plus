import localforage from 'localforage';
import { CustomTheme } from '@/interface/types/CustomThemes';
import { settingsState } from '@/seqta/utils/listeners/SettingsState';

export const removeTheme = async (theme: CustomTheme) => {
  // Remove custom CSS
  const styleElement = document.getElementById('custom-theme');
  if (styleElement) {
    styleElement.parentNode?.removeChild(styleElement);
  }

  const selectedTheme = await localforage.getItem(theme.id) as CustomTheme;
  localforage.setItem(theme.id, {
    ...selectedTheme,
    selectedColor: settingsState.selectedColor
  })
  
  // Reset default color
  if (settingsState.originalSelectedColor !== '') {
    settingsState.selectedColor = settingsState.originalSelectedColor
  }

  if (settingsState.originalDarkMode !== undefined) {
    settingsState.DarkMode = settingsState.originalDarkMode
    settingsState.originalDarkMode = undefined
  }
  
  // Remove custom images
  const customImageVariables = theme.CustomImages.map((image) => image.variableName);
  customImageVariables.forEach((variableName) => {
    const blobUrl = document.documentElement.style.getPropertyValue('--' + variableName);
    URL.revokeObjectURL(blobUrl);

    document.documentElement.style.removeProperty('--' + variableName);
  });
};
