import { debounce } from 'lodash';
import browser from 'webextension-polyfill'
interface ThemeList {
  themes: string[];
  selectedTheme: string;
}

export const downloadTheme = async (themeName: string, themeURL: string) => {
  // send message to the background script
  await browser.runtime.sendMessage({
    type: 'currentTab',
    info: 'DownloadTheme',
    body: {
      themeName: themeName,
      themeURL: themeURL
    }
  });
}

export const setTheme = async (themeName: string, themeURL: string) => {
  // send message to the background script
  await browser.runtime.sendMessage({
    type: 'currentTab',
    info: 'SetTheme',
    body: {
      themeName: themeName,
      themeURL: themeURL
    }
  });
}

export const listThemes = async () => {
  // send message to the background script
  const response: ThemeList = await browser.runtime.sendMessage({
    type: 'currentTab',
    info: 'ListThemes'
  });

  return response;
}

export const disableTheme = async () => {
  await browser.runtime.sendMessage({
    type: 'currentTab',
    info: 'DisableTheme',
  });
};

export const deleteTheme = async (themeName: string) => {
  await browser.runtime.sendMessage({
    type: 'currentTab',
    info: 'DeleteTheme',
    body: {
      themeName: themeName
    }
  });
}

export const sendThemeUpdate = debounce((updatedTheme: CustomTheme) => {
  // Create a copy of the updatedTheme object
  const updatedThemeCopy: CustomTheme = { ...updatedTheme };

  // Convert image blobs to base64
  const base64ConversionPromises = updatedThemeCopy.CustomImages.map(async (image) => {
    const base64 = await blobToBase64(image.blob);
    return { ...image, base64 };
  });

  Promise.all(base64ConversionPromises)
    .then((convertedImages) => {
      // Update the CustomImages array with the converted base64 images
      updatedThemeCopy.CustomImages = convertedImages;

      // Send the updated theme to the content script for live preview
      browser.runtime.sendMessage({
        type: 'currentTab',
        info: 'UpdateThemePreview',
        body: updatedThemeCopy,
      });
    })
    .catch((error) => {
      console.error('Error converting image blobs to base64:', error);
    });
}, 100);

// Helper function to convert a Blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
};