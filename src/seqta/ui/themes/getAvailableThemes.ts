import browser from 'webextension-polyfill';
import localforage from 'localforage';
import { CustomTheme, ThemeList } from '../../../interface/types/CustomThemes';
import { blobToBase64 } from '../../utils/blobToBase64';


export const getAvailableThemes = async (): Promise<ThemeList | {}> => {
  try {
    const themeIds = await localforage.getItem('customThemes') as string[] | null;
    console.log('Available themes:', themeIds);
    if (themeIds) {
      const themes = await Promise.all(
        themeIds.map(async (id) => {
          const theme = await localforage.getItem(id) as CustomTheme;
          console.log('CoverImage: ', theme.coverImage)
          const { CustomImages, ...themeWithoutImages } = theme;
          return {
            ...themeWithoutImages,
            coverImage: theme.coverImage ? await blobToBase64(theme.coverImage as Blob) : '',
          };
        })
      );

      const selectedTheme = await browser.storage.local.get('selectedTheme') as { selectedTheme: string; };

      return { themes, selectedTheme: selectedTheme.selectedTheme ? selectedTheme.selectedTheme : '' };
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
