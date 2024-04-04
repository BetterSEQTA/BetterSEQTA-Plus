import browser from 'webextension-polyfill';
import localforage from 'localforage';
import { CustomTheme } from '../../../interface/types/CustomThemes';
import { applyTheme } from './applyTheme';
import { removeTheme } from './removeTheme';


export const setTheme = async (themeId: string) => {
  try {
    const enabledTheme = await browser.storage.local.get('selectedTheme') as { selectedTheme: string; };
    const theme = await localforage.getItem(themeId) as CustomTheme;

    console.debug('Loading theme', theme);

    // Remove the currently enabled theme
    if (enabledTheme.selectedTheme) {
      const currentTheme = await localforage.getItem(enabledTheme.selectedTheme) as CustomTheme;
      if (currentTheme) {
        removeTheme(currentTheme);
      }
    }

    await applyTheme(theme);
    await browser.storage.local.set({ selectedTheme: themeId });

  } catch (error) {
    console.error('Error setting theme:', error);
  }
};
