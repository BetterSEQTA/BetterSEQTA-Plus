import localforage from 'localforage';
import { CustomTheme } from '@/interface/types/CustomThemes';
import { applyTheme } from './applyTheme';
import { removeTheme } from './removeTheme';
import { settingsState } from '@/seqta/utils/listeners/SettingsState';


export const setTheme = async (themeId: string) => {
  try {
    const theme = await localforage.getItem(themeId) as CustomTheme;

    console.debug('Loading theme', theme);

    let originalSelectedColor = { selectedColor: '' };

    const styleElement = document.getElementById('custom-theme');

    // Remove the currently enabled theme
    if (settingsState.selectedTheme || styleElement) {
      const currentTheme = await localforage.getItem(settingsState.selectedTheme) as CustomTheme;
      if (currentTheme) {
        await removeTheme(currentTheme);
      }
      originalSelectedColor = { selectedColor: settingsState.originalSelectedColor };
    } else {
      originalSelectedColor = { selectedColor: settingsState.selectedColor };
    }

    await applyTheme(theme);

    settingsState.selectedTheme = themeId
    settingsState.selectedColor = theme.selectedColor ? theme.selectedColor : (theme.defaultColour !== '' ? theme.defaultColour : '#007bff')
    settingsState.originalSelectedColor = originalSelectedColor.selectedColor
  } catch (error) {
    console.error('Error setting theme:', error);
  }
};
