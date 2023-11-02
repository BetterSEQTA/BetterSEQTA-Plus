import { useEffect, useState } from "react";
import themesList from '../assets/themes';
import { listThemes, disableTheme, downloadTheme, setTheme } from "../hooks/ThemeManagment";

interface Theme {
  name: string;
  url: string;
  isDownloaded: boolean;
  isLoading: boolean;
  coverImage: JSX.Element;
}

const ThemeSelector = () => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [enabledThemeName, setEnabledThemeName] = useState<string>('');

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
    // Start loading for the selected theme.
    const startLoading = (name: string) => (
      setThemes(prevThemes => prevThemes.map(theme => 
        theme.name === name ? { ...theme, isLoading: true } : theme
      ))
    );
  
    // Stop loading for the selected theme.
    const stopLoading = (name: string) => (
      setThemes(prevThemes => prevThemes.map(theme => 
        theme.name === name ? { ...theme, isLoading: false } : theme
      ))
    );
  
    // Update the theme as downloaded.
    const markAsDownloaded = (name: string) => (
      setThemes(prevThemes => prevThemes.map(theme => 
        theme.name === name ? { ...theme, isDownloaded: true } : theme
      ))
    );
  
    startLoading(themeName);
  
    // Early return if theme is not found.
    const theme = themes.find(t => t.name === themeName);
    if (!theme) {
      stopLoading(themeName);
      return;
    }
  
    // If theme is downloaded and is the currently enabled theme, disable it.
    if (theme.isDownloaded && themeName === enabledThemeName) {
      await disableTheme();
      setEnabledThemeName('');
      stopLoading(themeName);
      return;
    }
  
    // If theme is downloaded but not enabled, enable it.
    if (theme.isDownloaded && themeName !== enabledThemeName) {
      await setTheme(themeName, themeURL);
      setEnabledThemeName(themeName);
      stopLoading(themeName);
      return;
    }
  
    // If theme is not downloaded, download and enable it.
    if (!theme.isDownloaded) {
      await downloadTheme(themeName, themeURL);
      markAsDownloaded(themeName);
      setEnabledThemeName(themeName);
    }
  
    stopLoading(themeName);
  };  

  return (
    <div className="my-2">
      <h2 className="pb-2 text-lg font-bold">Themes</h2>
      <div className="flex flex-col gap-4">
        {themes.map((theme) => (
          <button
            key={theme.name}
            className={`relative w-full h-16 flex justify-center items-center rounded-lg overflow-hidden bg-zinc-700 transition ring dark:ring-white ring-zinc-300 ${enabledThemeName == theme.name ? 'dark:ring-2 ring-4' : 'ring-0'} ${theme.isLoading ? 'cursor-not-allowed' : ''}`}
            onClick={() => handleThemeAction(theme.name, theme.url)}
            disabled={theme.isLoading}
          >
            <div className={`relative transition top-0 z-10 flex justify-center w-full h-full text-white group place-items-center ${ theme.isDownloaded ? '' : 'hover:bg-black/20'}`}>
              <span className="absolute z-10 text-3xl transition opacity-0 font-IconFamily group-hover:opacity-100">
                { theme.isDownloaded || theme.isLoading ? '' : ''}
              </span>
              
              { theme.isLoading &&
              <div className="z-10 inline-block w-6 h-6 border-4 border-current rounded-full animate-spin border-t-transparent" role="status">
                <span className="sr-only">Loading...</span>
              </div> }

            </div>
            <div className="absolute inset-0 z-0">
              {theme.coverImage}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector;