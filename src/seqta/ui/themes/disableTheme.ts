import browser from 'webextension-polyfill';
import localforage from 'localforage';
import { CustomTheme } from '../../../interface/types/CustomThemes';
import { removeTheme } from './removeTheme';
import { Mutex } from '../../utils/mutex';

const mutex = new Mutex();
let isDisabling = false;

export const disableTheme = async () => {
  if (isDisabling) return;

  const { selectedTheme } = await browser.storage.local.get('selectedTheme') as { selectedTheme: string; };
  if (!selectedTheme || selectedTheme === '') {
    // Theme is already disabled, exit early
    return;
  }
  isDisabling = true;
  const unlock = await mutex.lock();
  try {
    await browser.storage.local.set({ selectedTheme: '' });

    if (selectedTheme) {
      const theme = await localforage.getItem(selectedTheme) as CustomTheme;
      if (theme) {
        await removeTheme(theme);
      }
    }
    await browser.storage.local.set({ selectedTheme: '' });
  } catch (error) {
    console.error('Error disabling theme:', error);
  } finally {
    unlock();
    isDisabling = false;
  }
};