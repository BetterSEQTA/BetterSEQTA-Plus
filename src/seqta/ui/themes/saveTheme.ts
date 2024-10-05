import localforage from 'localforage';
import type { LoadedCustomTheme } from '@/types/CustomThemes';
import { disableTheme } from './disableTheme';


export const saveTheme = async (theme: LoadedCustomTheme) => {
  try {
    disableTheme();

    console.debug('Theme to save:', theme);
   
    console.log('stage 1')
    await localforage.setItem(theme.id, theme);
    console.log('stage 2')
    await localforage.getItem('customThemes').then((themes: unknown) => {
      const themeList = themes as string[] | null;
      if (themeList) {
        if (!themeList.includes(theme.id)) {
          themeList.push(theme.id);
          localforage.setItem('customThemes', themeList);
        }
      } else {
        localforage.setItem('customThemes', [theme.id]);
      }
    });
    console.debug('Theme saved successfully!');
  } catch (error) {
    console.error('Error saving theme:', error);
  }
};
