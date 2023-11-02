interface ThemeList {
  themes: string[];
  selectedTheme: string;
}

export const downloadTheme = async (themeName: string, themeURL: string) => {
  // send message to the background script
  const response = await chrome.runtime.sendMessage({
    type: 'currentTab',
    info: 'DownloadTheme',
    body: {
      themeName: themeName,
      themeURL: themeURL
    }
  });

  console.log("Response: ", response);
}

export const setTheme = async (themeName: string, themeURL: string) => {
  // send message to the background script
  const response = await chrome.runtime.sendMessage({
    type: 'currentTab',
    info: 'SetTheme',
    body: {
      themeName: themeName,
      themeURL: themeURL
    }
  });

  console.log("Response: ", response);
}

export const listThemes = async () => {
  // send message to the background script
  const response: ThemeList = await chrome.runtime.sendMessage({
    type: 'currentTab',
    info: 'ListThemes'
  });

  // response.themes is an array of strings that are identical to the theme names that we loop over. Use this list to see which ones are downloaded and which ones need to see the download icon.
  console.log("Response: ", response);

  return response;
}

export const disableTheme = async () => {
  await chrome.runtime.sendMessage({
    type: 'currentTab',
    info: 'DisableTheme',
  });
};

export const deleteTheme = async (themeName: string) => {
  await chrome.runtime.sendMessage({
    type: 'currentTab',
    info: 'DeleteTheme',
    body: {
      themeName: themeName
    }
  });
}