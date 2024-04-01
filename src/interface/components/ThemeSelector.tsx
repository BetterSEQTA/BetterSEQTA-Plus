import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle, ForwardRefExoticComponent, RefAttributes } from 'react';
import { listThemes, deleteTheme, setTheme, disableTheme } from '../hooks/ThemeManagment';
import { ThemeCover } from './ThemeCover';
import Browser from 'webextension-polyfill';
import { CustomTheme } from '../types/CustomThemes';

interface ThemeSelectorProps {
  isEditMode: boolean;
  ref: React.Ref<any>;
}

const ThemeSelector: ForwardRefExoticComponent<Omit<ThemeSelectorProps, "ref"> & RefAttributes<any>> = forwardRef(({ isEditMode = false }, ref) => {
  const [themes, setThemes] = useState<Omit<CustomTheme, 'CustomImages'>[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    disableTheme: async () => {
      await disableTheme();
      setSelectedThemeId(null);
    }
  }));

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const { themes, selectedTheme } = await listThemes();

        console.log(await listThemes());

        setThemes(themes);
        setSelectedThemeId(selectedTheme ? selectedTheme : null);
      } catch (error) {
        console.error('Error fetching themes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThemes();
  }, []);

  const handleThemeSelect = useCallback(
    async (themeId: string) => {
      if (themeId === selectedThemeId) {
        await disableTheme();
        setSelectedThemeId(null);
      } else {
        const selectedTheme = themes.find((theme) => theme.id === themeId);
        if (selectedTheme) {
          await setTheme(selectedTheme.id);
          setSelectedThemeId(themeId);
        }
      }
    },
    [selectedThemeId, themes]
  );

  const handleThemeDelete = useCallback(
    async (themeId: string) => {
      try {
        await deleteTheme(themeId);
        setThemes((prevThemes) => prevThemes.filter((theme) => theme.id !== themeId));
        if (themeId === selectedThemeId) {
          setSelectedThemeId(null);
        }
      } catch (error) {
        console.error('Error deleting theme:', error);
      }
    },
    [selectedThemeId]
  );

  if (isLoading) {
    return <div>Loading themes...</div>;
  }

  return (
    <div className="my-3">
      <h2 className="pb-2 text-lg font-bold">Themes</h2>
      <div className="flex flex-col gap-2">
        {themes.map((theme) => (
          <ThemeCover
            key={theme.id}
            theme={theme}
            isSelected={theme.id === selectedThemeId}
            isEditMode={isEditMode}
            onThemeSelect={handleThemeSelect}
            onThemeDelete={handleThemeDelete}
          />
        ))}

        <button
          onClick={() => Browser.runtime.sendMessage({ type: 'currentTab', info: 'OpenThemeCreator' })}
          className="flex items-center justify-center w-full h-16 transition rounded-xl bg-zinc-100 dark:bg-zinc-900 dark:text-white"
        >
          <span className="text-xl font-IconFamily">{'\uec60'}</span>
          <span className="ml-2">Create Theme</span>
        </button>
      </div>
    </div>
  );
});

export default ThemeSelector;