import browser from 'webextension-polyfill'
import { CustomTheme, ThemeList } from '../types/CustomThemes';

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

export const setTheme = async (themeID: string) => {
  // send message to the background script
  await browser.runtime.sendMessage({
    type: 'currentTab',
    info: 'SetTheme',
    body: {
      themeID: themeID
    }
  });
}

export const listThemes = async (): Promise<ThemeList> => {
  // send message to the background script
  const response: ThemeList = await new Promise((resolve, reject) => {
    browser.runtime.sendMessage({
      type: 'currentTab',
      info: 'ListThemes'
    }).then(async (response) => {
      if (response) {
        // convert the response themes coverImage to a bloburl
        response.themes = await Promise.all(
          response.themes.map(async (theme: Omit<CustomTheme, 'CustomImages'>) => {
            if (theme.coverImage) {
              const blob = await fetch(theme.coverImage as string).then((res) => res.blob());
              theme.coverImage = URL.createObjectURL(blob);
            }
            return theme;
          })
        );

        resolve(response);
      } else {
        reject(new Error('Failed to get response'));
      }
    }).catch((error: any) => {
      reject(error);
    });
  });

  return response;
}

export const disableTheme = async () => {
  await browser.runtime.sendMessage({
    type: 'currentTab',
    info: 'DisableTheme',
  });
};

export const deleteTheme = async (themeID: string) => {
  await browser.runtime.sendMessage({
    type: 'currentTab',
    info: 'DeleteTheme',
    body: {
      themeID: themeID
    }
  });
}

export const sendThemeUpdate = (updatedTheme: CustomTheme, saveTheme?: boolean, updateImages?: boolean) => {
  saveTheme = saveTheme || false;

  const imageDataPromises = updatedTheme.CustomImages.map(async (image) => {
    if (saveTheme || updateImages) {
      const base64 = await blobToBase64(image.blob);
      return {
        id: image.id,
        variableName: image.variableName,
        url: base64,
      };
    }
    return {
      id: image.id,
      variableName: image.variableName,
      url: ''
    };
  });

  Promise.all(imageDataPromises).then(async (imageData) => {
    const themeData = {
      ...updatedTheme,
      CustomImages: imageData,
    };

    if (saveTheme && updatedTheme.coverImage instanceof Blob) {
      themeData.coverImage = await blobToBase64(updatedTheme.coverImage as Blob);
    } else {
      themeData.coverImage = null;
    }

    browser.runtime.sendMessage({
      type: 'currentTab',
      info: 'UpdateThemePreview',
      body: themeData,
      save: saveTheme,
    });

    if (saveTheme) {
      browser.runtime.sendMessage({ type: 'currentTab', info: 'CloseThemeCreator' });
    }
  });
};

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

export const enableCurrentTheme = async () => {
  await browser.runtime.sendMessage({
    type: 'currentTab',
    info: 'EnableCurrentTheme',
  });
};

export const saveUpdatedTheme = async (updatedTheme: CustomTheme) => {
  await browser.runtime.sendMessage({
    type: 'currentTab',
    info: 'SaveTheme',
    body: updatedTheme,
  });
};