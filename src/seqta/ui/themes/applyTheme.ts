import type { CustomImage, CustomTheme } from '@/types/CustomThemes';
import { settingsState } from '@/seqta/utils/listeners/SettingsState';
import { applyCustomCSS } from './Themes';


export const applyTheme = async (theme: CustomTheme, reEnable?: boolean) => {
  let CustomCSS = '';
  let CustomImages: CustomImage[] = [];

  if (theme?.CustomCSS) CustomCSS = theme.CustomCSS;
  if (theme?.CustomImages) CustomImages = theme.CustomImages;
  if (theme?.forceDark != undefined) {
    if (!reEnable) settingsState.originalDarkMode = settingsState.DarkMode

    settingsState.DarkMode = theme.forceDark
  }

  // Apply custom CSS
  applyCustomCSS(CustomCSS);

  // Apply custom images
  CustomImages.forEach((image) => {
    const imageUrl = URL.createObjectURL(image.blob);
    document.documentElement.style.setProperty('--' + image.variableName, `url(${imageUrl})`);
  });
};
