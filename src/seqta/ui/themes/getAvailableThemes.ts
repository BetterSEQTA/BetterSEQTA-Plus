import localforage from 'localforage';
import type { CustomTheme, ThemeList } from '@/types/CustomThemes';
import { settingsState } from '@/seqta/utils/listeners/SettingsState';

export const getAvailableThemes = async (): Promise<ThemeList> => {
  try {
    const themeIds = await localforage.getItem('customThemes') as string[] | null;
    if (themeIds) {
      const themes = await Promise.all(
        themeIds.map(async (id) => {
          const theme = await localforage.getItem(id) as CustomTheme;
          return theme;
        })
      );

      return { themes, selectedTheme: settingsState.selectedTheme ? settingsState.selectedTheme : '' };
    }
    return {
      themes: [],
      selectedTheme: '',
    };
  } catch (error) {
    console.error('Error getting available themes:', error);
    return {
      themes: [],
      selectedTheme: ''
    };
  }
};
