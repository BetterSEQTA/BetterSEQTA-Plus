import browser from 'webextension-polyfill';
import localforage from 'localforage';
import { CustomTheme } from '../../../interface/types/CustomThemes';
import { applyTheme } from './applyTheme';


export const enableCurrentTheme = async () => {
  const { selectedTheme } = await browser.storage.local.get('selectedTheme') as { selectedTheme: string; };
  if (selectedTheme) {
    const theme = await localforage.getItem(selectedTheme) as CustomTheme;
    if (theme) {
      await applyTheme(theme);
    }
  }
};
