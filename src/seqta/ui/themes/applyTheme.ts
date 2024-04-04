import browser from 'webextension-polyfill';
import { CustomImage, CustomTheme } from '../../../interface/types/CustomThemes';
import { applyCustomCSS } from './Themes';


export const applyTheme = async (theme: CustomTheme) => {
  let CustomCSS = '';
  let CustomImages: CustomImage[] = [];
  let defaultColour = '';

  if (theme?.CustomCSS) CustomCSS = theme.CustomCSS;
  if (theme?.CustomImages) CustomImages = theme.CustomImages;
  if (theme?.defaultColour) defaultColour = theme.defaultColour;

  // Apply custom CSS
  applyCustomCSS(CustomCSS);

  // Apply default color
  if (defaultColour !== '') {
    browser.storage.local.set({ selectedColor: defaultColour });
  }

  // Apply custom images
  CustomImages.forEach((image) => {
    const imageUrl = URL.createObjectURL(image.blob);
    document.documentElement.style.setProperty('--' + image.variableName, `url(${imageUrl})`);
  });
};
