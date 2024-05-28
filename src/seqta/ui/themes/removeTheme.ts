import localforage from 'localforage';
import { CustomTheme } from '../../../interface/types/CustomThemes';
import browser from 'webextension-polyfill';

export const removeTheme = async (theme: CustomTheme) => {
  // Remove custom CSS
  const styleElement = document.getElementById('custom-theme');
  if (styleElement) {
    styleElement.parentNode?.removeChild(styleElement);
  }

  const themeSelectedColor = await browser.storage.local.get('selectedColor') as { selectedColor: string; };

  const selectedTheme = await localforage.getItem(theme.id) as CustomTheme;
  localforage.setItem(theme.id, {
    ...selectedTheme,
    selectedColor: themeSelectedColor.selectedColor
  })
  
  // Reset default color
  const originalSelectedColor = await browser.storage.local.get('originalSelectedColor') as { originalSelectedColor: string; };
  if (originalSelectedColor.originalSelectedColor !== '') {
    await browser.storage.local.set({ selectedColor: originalSelectedColor.originalSelectedColor });
  }
  
  // Remove custom images
  const customImageVariables = theme.CustomImages.map((image) => image.variableName);
  customImageVariables.forEach((variableName) => {
    const blobUrl = document.documentElement.style.getPropertyValue('--' + variableName);
    URL.revokeObjectURL(blobUrl);

    document.documentElement.style.removeProperty('--' + variableName);
  });
};
