import localforage from 'localforage';
import type { LoadedCustomTheme } from '@/types/CustomThemes';
import { disableTheme } from './disableTheme';


export const saveTheme = async (theme: LoadedCustomTheme) => {
  try {
    disableTheme();

    console.debug('Theme to save:', theme);

    /* remove blob urls from theme */
    const updatedTheme = { ...theme, CustomImages: theme.CustomImages.map((image) => ({ ...image, blob: null })) }
   
    await localforage.setItem(theme.id, updatedTheme);
    await localforage.getItem('customThemes').then((themes: unknown) => {
      const themeList = themes as string[] | null;
      if (themeList) {
        if (!themeList.includes(updatedTheme.id)) {
          themeList.push(updatedTheme.id);
          localforage.setItem('customThemes', themeList);
        }
      } else {
        localforage.setItem('customThemes', [updatedTheme.id]);
      }
    });
    console.debug('Theme saved successfully!');
  } catch (error) {
    console.error('Error saving theme:', error);
  }
};
