import localforage from 'localforage';
import type { LoadedCustomTheme } from '@/types/CustomThemes';
import { disableTheme } from './disableTheme';
import { themeUpdates } from '@/interface/hooks/ThemeUpdates';


export const saveTheme = async (theme: LoadedCustomTheme) => {
  try {
    disableTheme();

    console.debug('Theme to save:', theme);
   
    await localforage.setItem(theme.id, theme);
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
    themeUpdates.triggerUpdate();
  } catch (error) {
    console.error('Error saving theme:', error);
  }
};
