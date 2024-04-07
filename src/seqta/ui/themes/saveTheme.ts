import localforage from 'localforage';
import { CustomTheme, CustomThemeBase64 } from '../../../interface/types/CustomThemes';
import { disableTheme } from './disableTheme';


export const saveTheme = async (theme: CustomThemeBase64) => {
  try {
    const updatedTheme: CustomTheme = {
      ...theme,
      coverImage: theme.coverImage ? await fetch(theme.coverImage).then((res) => res.blob()) : null,
      CustomImages: await Promise.all(
        theme.CustomImages.map(async (image) => ({
          id: image.id,
          blob: await fetch(image.url).then((res) => res.blob()),
          variableName: image.variableName,
        }))
      ),
    };

    disableTheme();

    console.debug('Theme to save:', updatedTheme);

    await localforage.setItem(updatedTheme.id, updatedTheme);
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
