import browser from 'webextension-polyfill';
import localforage from 'localforage';
import { CustomTheme } from '../../../interface/types/CustomThemes';
import { removeTheme } from './removeTheme';


export const disableTheme = async () => {
  try {
    const enabledTheme = await browser.storage.local.get('selectedTheme') as { selectedTheme: string; };
    if (enabledTheme.selectedTheme) {
      const theme = await localforage.getItem(enabledTheme.selectedTheme) as CustomTheme;
      if (theme) {
        removeTheme(theme);
      }
    }
    await browser.storage.local.set({ selectedTheme: '' });
  } catch (error) {
    console.error('Error disabling theme:', error);
  }
};
