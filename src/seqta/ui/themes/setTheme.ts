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

    let originalSelectedColor = { selectedColor: '' };

    const styleElement = document.getElementById('custom-theme');

    // Remove the currently enabled theme
    if (enabledTheme.selectedTheme || styleElement) {
      const currentTheme = await localforage.getItem(enabledTheme.selectedTheme) as CustomTheme;
      if (currentTheme) {
        await removeTheme(currentTheme);
      }
      const color = await browser.storage.local.get('originalSelectedColor') as { originalSelectedColor: string; };
      originalSelectedColor = { selectedColor: color.originalSelectedColor };
    } else {
      originalSelectedColor = await browser.storage.local.get('selectedColor') as { selectedColor: string; };
    }

    await applyTheme(theme);

    await browser.storage.local.set({
      selectedTheme: themeId,
      selectedColor: theme.selectedColor ? theme.selectedColor : (theme.defaultColour !== '' ? theme.defaultColour : '#007bff'),
      originalSelectedColor: originalSelectedColor.selectedColor
    });

  } catch (error) {
    console.error('Error setting theme:', error);
  }
};
