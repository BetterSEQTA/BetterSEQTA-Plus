import browser from 'webextension-polyfill';
import localforage from 'localforage';
import { CustomTheme } from '../../../interface/types/CustomThemes';
import { applyTheme } from './applyTheme';


export const enableCurrentTheme = async () => {
  const themeId = await browser.storage.local.get('selectedTheme') as { selectedTheme: string; };
  if (themeId.selectedTheme) {
    const theme = await localforage.getItem(themeId.selectedTheme) as CustomTheme;
    if (theme) {
      await applyTheme(theme);
    }
  }
};
