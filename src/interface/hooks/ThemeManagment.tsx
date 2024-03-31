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
  // Send the updated theme to the content script for live preview
  browser.runtime.sendMessage({
    type: 'currentTab',
    info: 'UpdateThemePreview',
    body: updatedTheme,
  });
}, 100);