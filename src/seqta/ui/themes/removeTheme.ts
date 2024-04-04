import { CustomTheme } from '../../../interface/types/CustomThemes';


export const removeTheme = (theme: CustomTheme) => {
  // Remove custom CSS
  const styleElement = document.getElementById('custom-theme');
  if (styleElement) {
    styleElement.parentNode?.removeChild(styleElement);
  }

  // Reset default color
  //browser.storage.local.set({ selectedColor: '' });
  // Remove custom images
  const customImageVariables = theme.CustomImages.map((image) => image.variableName);
  customImageVariables.forEach((variableName) => {
    document.documentElement.style.removeProperty('--' + variableName);
  });
};
