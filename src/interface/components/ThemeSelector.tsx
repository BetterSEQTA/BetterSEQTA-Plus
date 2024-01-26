import { useEffect, useState } from "react";
import themesList from '../assets/themes';
import { listThemes, disableTheme, downloadTheme, setTheme, deleteTheme } from "../hooks/ThemeManagment";

interface Theme {
  name: string;
  url: string;
  isDownloaded: boolean;
  isLoading: boolean;
  coverImage: JSX.Element;
}

interface ThemeSelectorProps {
  selectedType: "background" | "theme";
  setSelectedType: (type: "background" | "theme") => void;
  isEditMode: boolean;
}

const ThemeSelector = ({ selectedType, setSelectedType, isEditMode }: ThemeSelectorProps) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [enabledThemeName, setEnabledThemeName] = useState<string>('');

  useEffect(() => {
    const initializeThemes = async () => {
      const downloaded = (await listThemes());
      const initializedThemes = themesList.map(theme => ({
        ...theme,
        isDownloaded: downloaded.themes.includes(theme.name),
        isLoading: false
      }));

      if (downloaded.selectedTheme !== '') {
        setEnabledThemeName(downloaded.selectedTheme);
      }

      initializedThemes.sort((a, b) => Number(b.isDownloaded) - Number(a.isDownloaded));

      setThemes(initializedThemes);
    };

    initializeThemes();
  }, []);

  const handleDeleteTheme = async (themeName: string) => {
    await deleteTheme(themeName);
    setThemes(prevThemes => {
      // Update the theme's isDownloaded property to false
      const updatedThemes = prevThemes.map(theme => {
        if (theme.name === themeName) {
          return { ...theme, isDownloaded: false };
        }
        return theme;
      });
  
      // Sort themes so non-downloaded ones appear last
      updatedThemes.sort((a, b) => Number(b.isDownloaded) - Number(a.isDownloaded));
  
      return updatedThemes;
    });
  
    // Reset the enabled theme name if the deleted theme was the currently enabled one
    if (enabledThemeName === themeName) {
      setEnabledThemeName('');
      setSelectedType('background');
    }
  };
  
  const handleThemeAction = async (themeName: string, themeURL: string) => {
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
      setSelectedType('background');
      stopLoading(themeName);
      return;
    }
  
    // If theme is downloaded but not enabled, enable it.
    if (theme.isDownloaded && themeName !== enabledThemeName) {
      await setTheme(themeName, themeURL);
      setEnabledThemeName(themeName);
      setSelectedType('theme');
      stopLoading(themeName);
      return;
    }
  
    // If theme is not downloaded, download and enable it.
    if (!theme.isDownloaded) {
      await downloadTheme(themeName, themeURL);
      markAsDownloaded(themeName);
      setSelectedType('theme');
      setEnabledThemeName(themeName);
    }
  
    stopLoading(themeName);
  };

  useEffect(() => {
    if (selectedType === 'background') {
      setEnabledThemeName('');
    }
  }, [selectedType]);

  return (
    <div className="my-2">
      {(isEditMode ? themes.some(theme => theme.isDownloaded) : themes.length > 0) && (
        <h2 className="pb-2 text-lg font-bold">Themes</h2>)}
      <div className="flex flex-col gap-4">
        {themes
          .filter(theme => !isEditMode || theme.isDownloaded) // Only show downloaded themes in edit mode
          .map((theme) => (
            <button
              key={theme.name}
              className={`relative w-full h-16 flex justify-center items-center rounded-lg bg-zinc-700 transition ring dark:ring-white ring-zinc-300 ${enabledThemeName == theme.name && selectedType == "theme" ? 'dark:ring-2 ring-4' : 'ring-0'}`}
              onClick={() => handleThemeAction(theme.name, theme.url)}
              disabled={theme.isLoading}
            >
              {isEditMode && (
                <div className="absolute top-0 right-0 z-10 flex w-6 h-6 p-2 text-white translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full place-items-center"
                  onClick={(e) => { e.stopPropagation(); handleDeleteTheme(theme.name); }}>
                  <div className="w-4 h-0.5 bg-white"></div>
                </div>
              )}
              <div className={`relative transition rounded-lg overflow-hidden top-0 z-10 flex justify-center w-full h-full text-white group place-items-center ${ theme.isDownloaded ? '' : 'hover:bg-black/20'}`}>
                <span className="absolute z-10 text-3xl transition opacity-0 font-IconFamily group-hover:opacity-100">
                  { theme.isDownloaded || theme.isLoading ? '' : ''}
                </span>
                
                { theme.isLoading &&
                <div className="z-10 inline-block w-6 h-6 border-4 border-current rounded-full animate-spin border-t-transparent" role="status">
                  <span className="sr-only">Loading...</span>
                </div> }

              </div>
              <div className="absolute inset-0 z-0 overflow-hidden rounded-lg">
                {theme.coverImage}
              </div>
            </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector;