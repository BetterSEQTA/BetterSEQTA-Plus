import localforage from 'localforage';
import type { CustomTheme } from '@/types/CustomThemes';


export const getTheme = async (themeId: string): Promise<CustomTheme | null> => {
  try {
    const theme = await localforage.getItem(themeId) as CustomTheme;

    return theme;
  } catch (error) {
    console.error('Error getting theme:', error);
    return null;
  }
};
