import localforage from 'localforage';
import { CustomTheme, ThemeList } from '@/interface/types/CustomThemes';
import { blobToBase64 } from '@/seqta/utils/blobToBase64';
import { settingsState } from '@/seqta/utils/listeners/SettingsState';

export const getAvailableThemes = async (): Promise<ThemeList | {}> => {
  try {
    const themeIds = await localforage.getItem('customThemes') as string[] | null;
    if (themeIds) {
      const themes = await Promise.all(
        themeIds.map(async (id) => {
          const theme = await localforage.getItem(id) as CustomTheme;
          const { CustomImages, ...themeWithoutImages } = theme;
          return {
            ...themeWithoutImages,
            coverImage: theme.coverImage ? await blobToBase64(theme.coverImage as Blob) : '',
          };
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
