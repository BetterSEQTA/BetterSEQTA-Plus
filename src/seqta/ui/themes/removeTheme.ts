import { CustomTheme } from '../../../interface/types/CustomThemes';
import browser from 'webextension-polyfill';

export const removeTheme = async (theme: CustomTheme) => {
  // Remove custom CSS
  const styleElement = document.getElementById('custom-theme');
  if (styleElement) {
    styleElement.parentNode?.removeChild(styleElement);
  }

  // Reset default color
  const originalSelectedColor = await browser.storage.local.get('originalSelectedColor') as { originalSelectedColor: string; };
  if (originalSelectedColor.originalSelectedColor !== '') {
    await browser.storage.local.set({ selectedColor: originalSelectedColor.originalSelectedColor });
  }
  
  // Remove custom images
  const customImageVariables = theme.CustomImages.map((image) => image.variableName);
  customImageVariables.forEach((variableName) => {
    document.documentElement.style.removeProperty('--' + variableName);
  });
};
