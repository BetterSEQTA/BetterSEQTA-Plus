import { useEffect, useState } from "react";
import themesList from '../assets/themes';

interface Theme {
  name: string;
  url: string;
  isDownloaded: boolean;
  isLoading: boolean;
  coverImage: JSX.Element;
}

interface ThemeList {
  themes: string[];
}

const downloadTheme = async (themeName: string, themeURL: string) => {
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

const setTheme = async (themeName: string, themeURL: string) => {
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

const listThemes = async () => {
  // send message to the background script
  const response: ThemeList = await chrome.runtime.sendMessage({
    type: 'currentTab',
    info: 'ListThemes',
    body: {}
  });

  // response.themes is an array of strings that are identical to the theme names that we loop over. Use this list to see which ones are downloaded and which ones need to see the download icon.
  console.log("Response: ", response);

  return response.themes;
}

const ThemeSelector = () => {
  const [themes, setThemes] = useState<Theme[]>([]);

  useEffect(() => {
    const initializeThemes = async () => {
      const downloaded = await listThemes();

      const initializedThemes = themesList.map(theme => ({
        ...theme,
        isDownloaded: downloaded.includes(theme.name),
        isLoading: false
      }));

      setThemes(initializedThemes);
    };

    initializeThemes();
  }, []);

  const handleThemeAction = async (themeName: string, themeURL: string) => {
    // Find the theme in the state and set its loading property to true
    setThemes(prevThemes => prevThemes.map(theme => 
      theme.name === themeName ? { ...theme, isLoading: true } : theme
    ));

    // Call the appropriate method based on whether the theme is downloaded
    const theme = themes.find(t => t.name === themeName);
    if (theme && theme.isDownloaded) {
      await setTheme(themeName, themeURL);
    } else {
      await downloadTheme(themeName, themeURL);
      // After downloading, update the theme to be marked as downloaded
      setThemes(prevThemes => prevThemes.map(t => 
        t.name === themeName ? { ...t, isDownloaded: true } : t
      ));
    }

    // Once the action is complete, set the theme's loading property to false
    setThemes(prevThemes => prevThemes.map(theme => 
      theme.name === themeName ? { ...theme, isLoading: false } : theme
    ));
  };

  return (
    <div className="flex flex-col gap-4">
      {themes.map((theme) => (
        <button
          key={theme.name}
          className={`relative w-full h-16 flex justify-center items-center rounded-md overflow-hidden ${theme.isDownloaded ? 'bg-blue-500' : 'bg-green-500'} ${theme.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => handleThemeAction(theme.name, theme.url)}
          disabled={theme.isLoading}
        >
          {/* Position the cover image absolutely so that it doesn't affect the button's content layout */}
          <div className="absolute inset-0 z-0">
            {theme.coverImage}
          </div>

          {/* Content */}
          {theme.isLoading ? (
            <div className="z-10 inline-block w-6 h-6 border-4 border-current rounded-full animate-spin border-t-transparent" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          ) : (
            <span className="z-10 text-lg font-bold text-white">{theme.name}</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;