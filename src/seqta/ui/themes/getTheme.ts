import localforage from 'localforage';
import type { CustomImageBase64, CustomTheme, CustomThemeBase64 } from '@/old-interface/types/CustomThemes';
import { blobToBase64 } from '@/seqta/utils/blobToBase64'; 


export const getTheme = async (themeId: string): Promise<CustomThemeBase64 | null> => {
  try {
    const theme = await localforage.getItem(themeId) as CustomTheme;

    const CustomImages: CustomImageBase64[] = await Promise.all(
      theme.CustomImages.map(async (image) => {
        const base64 = await blobToBase64(image.blob);
        return {
          id: image.id,
          variableName: image.variableName,
          url: base64,
        };
      })
    );

    return {
      ...theme,
      coverImage: theme.coverImage ? await blobToBase64(theme.coverImage as Blob) : null,
      CustomImages,
    };
  } catch (error) {
    console.error('Error getting theme:', error);
    return null;
  }
};
