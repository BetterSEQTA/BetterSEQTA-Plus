import localforage from 'localforage';
import type { LoadedCustomTheme } from '@/types/CustomThemes';


export const getTheme = async (themeId: string): Promise<LoadedCustomTheme | null> => {
  try {
    const theme = await localforage.getItem(themeId) as LoadedCustomTheme;

    return theme;
  } catch (error) {
    console.error('Error getting theme:', error);
    return null;
  }
};
