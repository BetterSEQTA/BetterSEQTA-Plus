import browser from 'webextension-polyfill'
import localforage from 'localforage';
import { CustomImage, CustomImageBase64, CustomTheme, CustomThemeBase64, ThemeList } from '../../interface/types/CustomThemes';

const imageData: Record<string, { url: string; variableName: string }> = {};

export const enableCurrentTheme = async () => {
  const themeId = await browser.storage.local.get('selectedTheme') as { selectedTheme: string };
  if (themeId.selectedTheme) {
    const theme = await localforage.getItem(themeId.selectedTheme) as CustomTheme;
    if (theme) {
      await applyTheme(theme);
    }
  }
}

export const deleteTheme = async (themeId: string) => {
  try {
    const theme = await localforage.getItem(themeId) as CustomTheme;
    removeTheme(theme);
    
    await localforage.removeItem(themeId);
    const themeIds = await localforage.getItem('customThemes') as string[] | null;
    if (themeIds) {
      const updatedThemeIds = themeIds.filter((id) => id !== themeId);
      await localforage.setItem('customThemes', updatedThemeIds);
    }

    await browser.storage.local.set({ selectedTheme: '' });
  } catch (error) {
    console.error('Error deleting theme:', error);
  }
};

export const getAvailableThemes = async (): Promise<ThemeList | {}> => {
  try {
    const themeIds = await localforage.getItem('customThemes') as string[] | null;
    console.log('Available themes:', themeIds);
    if (themeIds) {
      const themes = await Promise.all(
        themeIds.map(async (id) => {
          const theme = await localforage.getItem(id) as CustomTheme;
          const { CustomImages, ...themeWithoutImages } = theme;
          return themeWithoutImages;
        })
      );
      
      const selectedTheme = await browser.storage.local.get('selectedTheme') as { selectedTheme: string };

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

export const saveTheme = async (theme: CustomThemeBase64) => {
  try {
    const updatedTheme: CustomTheme = {
      ...theme,
      CustomImages: await Promise.all(
        theme.CustomImages.map(async (image) => ({
          id: image.id,
          blob: await fetch(image.url).then((res) => res.blob()),
          variableName: image.variableName,
        }))
      ),
    };

    console.log('Theme to save:', updatedTheme)

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
    console.log('Theme saved successfully!');
  } catch (error) {
    console.error('Error saving theme:', error);
  }
};

export const UpdateThemePreview = async (updatedTheme: CustomThemeBase64 /* Omit<CustomTheme, 'CustomImages'> & { CustomImages: Omit<CustomImage, 'blob'>[] } */) => {
  const { CustomCSS, CustomImages, defaultColour } = updatedTheme;

  // Update image data
  const currentImageIds = Object.keys(imageData);
  const updatedImageIds = CustomImages.map((image) => image.id);

  // Remove unused images from imageData and document
  currentImageIds.forEach((imageId) => {
    if (!updatedImageIds.includes(imageId)) {
      const { variableName } = imageData[imageId];
      removeImageFromDocument(variableName);
      delete imageData[imageId];
    }
  });

  // Update or add new images to imageData
  CustomImages.forEach((image) => {
    const existingImage = imageData[image.id];

    if (existingImage && existingImage.variableName !== image.variableName) {
      // Remove the previous variableName from the document
      removeImageFromDocument(existingImage.variableName);
    }

    if (image.url) {
      UpdateImageData({
        id: image.id,
        base64: image.url
      });
    }

    imageData[image.id] = {
      url: '',
      variableName: image.variableName,
    };
  });

  // Apply custom CSS
  applyCustomCSS(CustomCSS);

  // Apply default color
  if (defaultColour !== '') {
    browser.storage.local.set({ selectedColor: defaultColour });
  }
};

export const UpdateImageData = (imageData2: { id: string; base64: string }) => {
  const { id, base64 } = imageData2;

  if (imageData[id]) {
    imageData[id].url = updateImage({ id, url: base64, variableName: imageData[id].variableName });
    const { variableName } = imageData[id];
    document.documentElement.style.setProperty('--' + variableName, `url(${imageData[id].url})`);
  }
};

function applyCustomCSS(customCSS: string) {
  let styleElement = document.getElementById('custom-theme');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'custom-theme';
    document.head.appendChild(styleElement);
  }
  styleElement.textContent = customCSS;
}

function removeImageFromDocument(variableName: string) {
  document.documentElement.style.removeProperty('--' + variableName);
}

export function updateImage(image: CustomImageBase64) {
  // Extract base64 data from the data URI
  const base64Index = image.url.indexOf(',') + 1;
  const imageBase64 = image.url.substring(base64Index);

  // Convert base64 to blob
  const byteCharacters = atob(imageBase64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  // Convert blob to blob URL
  const imageUrl = URL.createObjectURL(blob);

  return imageUrl;
}

const applyTheme = async (theme: CustomTheme) => {
  let CustomCSS = '';
  let CustomImages: CustomImage[] = [];
  let defaultColour = '';

  if (theme?.CustomCSS) CustomCSS = theme.CustomCSS;
  if (theme?.CustomImages) CustomImages = theme.CustomImages;
  if (theme?.defaultColour) defaultColour = theme.defaultColour; 

  // Apply custom CSS
  applyCustomCSS(CustomCSS);

  // Apply default color
  if (defaultColour !== '') {
    browser.storage.local.set({ selectedColor: defaultColour });
  }

  // Apply custom images
  CustomImages.forEach((image) => {
    const imageUrl = URL.createObjectURL(image.blob);
    document.documentElement.style.setProperty('--' + image.variableName, `url(${imageUrl})`);
  });
};

const removeTheme = (theme: CustomTheme) => {
  // Remove custom CSS
  const styleElement = document.getElementById('custom-theme');
  if (styleElement) {
    styleElement.parentNode?.removeChild(styleElement);
  }

  // Reset default color
  //browser.storage.local.set({ selectedColor: '' });

  // Remove custom images
  const customImageVariables = theme.CustomImages.map((image) => image.variableName);
  customImageVariables.forEach((variableName) => {
    document.documentElement.style.removeProperty('--' + variableName);
  });
};

export const setTheme = async (themeId: string) => {
  try {
    const enabledTheme = await browser.storage.local.get('selectedTheme') as { selectedTheme: string };
    const theme = await localforage.getItem(themeId) as CustomTheme;

    // Remove the currently enabled theme
    if (enabledTheme.selectedTheme) {
      const currentTheme = await localforage.getItem(enabledTheme.selectedTheme) as CustomTheme;
      if (currentTheme) {
        removeTheme(currentTheme);
      }
    }

    await applyTheme(theme);
    await browser.storage.local.set({ selectedTheme: themeId });

  } catch (error) {
    console.error('Error setting theme:', error);
  }
}

export const disableTheme = async () => {
  try {
    const enabledTheme = await browser.storage.local.get('selectedTheme') as { selectedTheme: string };
    if (enabledTheme.selectedTheme) {
      const theme = await localforage.getItem(enabledTheme.selectedTheme) as CustomTheme;
      if (theme) {
        removeTheme(theme);
      }
    }
    await browser.storage.local.set({ selectedTheme: '' });
  } catch (error) {
    console.error('Error disabling theme:', error);
  }
}