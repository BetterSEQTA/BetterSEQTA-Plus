import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle, ForwardRefExoticComponent, RefAttributes } from 'react';
import { listThemes, deleteTheme, setTheme, disableTheme, getDownloadedThemes, sendThemeUpdate } from '../hooks/ThemeManagment';
import { DeleteDownloadedTheme } from '../pages/Store';
import { ThemeCover } from './ThemeCover';
import browser from 'webextension-polyfill';
import { CustomTheme, DownloadedTheme } from '../types/CustomThemes';
import { useSettingsContext } from '../SettingsContext';
import { SettingsState } from '../types/AppProps';
import { InstallTheme } from '../../seqta/ui/themes/downloadTheme';
import SpinnerIcon from './LoadingSpinner';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useVisibility from './useVisibility';
import { debounce, throttle } from 'lodash';
import { Mutex } from '../../seqta/utils/mutex';

interface ThemeSelectorProps {
  isEditMode: boolean;
  ref: React.Ref<any>;
}

const ThemeSelector: ForwardRefExoticComponent<Omit<ThemeSelectorProps, "ref"> & RefAttributes<any>> = forwardRef(({ isEditMode = false }, ref) => {
  const [themes, setThemes] = useState<Omit<CustomTheme, 'CustomImages'>[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [tempTheme, setTempTheme] = useState<any>(null);
  const { settingsState, setSettingsState } = useSettingsContext();
  const [elementRef, isVisible] = useVisibility({
    root: null, // Use the viewport as the root
    rootMargin: '0px',
    threshold: 0.1, // 10% of the element needs to be visible
  });

  const mutex = new Mutex();

  const setSelectedTheme = (themeId: string) => {
    setSettingsState((prevState: SettingsState) => ({
      ...prevState,
      selectedTheme: themeId,
    }));
  }

  useImperativeHandle(ref, () => ({
    disableTheme: async () => {
      await disableTheme();
      setSelectedTheme('');
    }
  }));

  useEffect(() => {
    const handleThemeChange = async () => {
      //await new Promise((resolve) => setTimeout(resolve, 500));
      fetchThemes();
    };

    window.addEventListener('message', (message) => {
      if (message.data.type === 'themeChanged') {
        handleThemeChange();
      }
    });

    return () => {
      window.removeEventListener('message', (message) => {
        if (message.data.type === 'themeChanged') {
          handleThemeChange();
        }
      });
    };
  }, []);

  useEffect(() => {
    let intervalId: any;
    if (isVisible) {
      intervalId = setInterval(fetchThemes, 2000);
    } else {
      clearInterval(intervalId);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [isVisible]);

  const fetchThemes = async () => {
    try {
      const { themes, selectedTheme } = await listThemes();
      let tempDownloadedThemes = await getDownloadedThemes();
      
      setThemes(themes);
      setSelectedTheme(selectedTheme ? selectedTheme : '');
            
      const matchingThemes = themes.filter(theme => 
        tempDownloadedThemes.some(downloadedTheme => downloadedTheme.id === theme.id)
      );

      if (matchingThemes.length > 0) {
        matchingThemes.forEach((theme) => {
          DeleteDownloadedTheme(theme.id);
          tempDownloadedThemes = tempDownloadedThemes.filter(downloadedTheme => downloadedTheme.id !== theme.id);
        })
      }

      tempDownloadedThemes.forEach(async (theme) => {
        await sendThemeUpdate(theme as DownloadedTheme, true, false)
        DeleteDownloadedTheme(theme.id);
      });
    } catch (error) {
      console.error('Error fetching themes:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchThemes();
  }, []);

  const handleThemeSelect = useCallback(
    async (themeId: string) => {
      const unlock = await mutex.lock();
      try {
        if (themeId === settingsState.selectedTheme) {
          await disableTheme();
          setSelectedTheme('');
        } else {
          const selectedTheme = themes.find((theme) => theme.id === themeId);
          if (selectedTheme) {
            await setTheme(selectedTheme.id);
            setSelectedTheme(themeId);
          }
        }
      } finally {
        unlock();
      }
    },
    [settingsState.selectedTheme, themes]
  );

  const handleThemeSelectDebounced = useCallback(
    debounce(handleThemeSelect, 100),
    [handleThemeSelect]
  );

  const handleThemeDelete = useCallback(
    async (themeId: string) => {
      try {
        await deleteTheme(themeId);
        setThemes((prevThemes) => prevThemes.filter((theme) => theme.id !== themeId));
        if (themeId === settingsState.selectedTheme) {
          setSelectedTheme('')
          disableTheme();
        }
      } catch (error) {
        console.error('Error deleting theme:', error);
      }
    },
    [settingsState.selectedTheme]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file: File = e.dataTransfer.files[0];
    const reader: FileReader = new FileReader();

    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        const result: any = JSON.parse(event.target!.result as string);
        try {
          setTempTheme(result);
          await InstallTheme(result);
          await fetchThemes();
          setTempTheme(null);
        } catch(error) {
          toast.error('Invalid file type. Please upload a valid theme file.');
          setTempTheme(null);
        }
      } catch (error) {
        toast.error('Error parsing file. Please upload a valid JSON theme file.');
        setTempTheme(null);
      }
    };

    reader.readAsText(file);
  };

  if (isLoading) {
    return <div className='text-center'>Loading themes...</div>;
  }

  return (
    <div
      ref={elementRef}
      className={`my-3 w-full ${isDragging ? '' : ''}`}
      onDragOver={handleDragOver} 
      onDragLeave={handleDragLeave} 
      onDrop={handleDrop}
      >
      <div className={`${isDragging ? 'opacity-100' : 'opacity-0'} transition pointer-events-none absolute w-full p-2 z-50`}>
        <div className='sticky w-full h-64 bg-white shadow-xl dark:bg-zinc-900 top-5 dark:text-white rounded-xl outline-dashed outline-4 outline-zinc-200 dark:outline-zinc-700'>
          <div className='flex items-center justify-center h-full'>
            <div className='flex flex-col items-center justify-center'>
              <svg height="48" width="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <g fill="currentColor">
                  <path d="M44,31a1,1,0,0,0-1,1v8a3,3,0,0,1-3,3H8a3,3,0,0,1-3-3V32a1,1,0,0,0-2,0v8a5.006,5.006,0,0,0,5,5H40a5.006,5.006,0,0,0,5-5V32A1,1,0,0,0,44,31Z" fill="currentColor"/>
                  <path d="M23.2,33.6a1,1,0,0,0,1.6,0l9-12A1,1,0,0,0,33,20H26V5a2,2,0,0,0-4,0V20H15a1,1,0,0,0-.8,1.6Z" fill="currentColor"/>
                </g>
              </svg>
              <span className='text-lg'>Import Theme</span>
            </div>
          </div>
        </div>
      </div>
      <h2 className="pb-2 text-lg font-bold">Themes</h2>
      <div className="flex flex-col gap-2 px-1">

        {themes.map((theme) => (
          <ThemeCover
            key={theme.id}
            theme={theme}
            isSelected={theme.id === settingsState.selectedTheme}
            isEditMode={isEditMode}
            onThemeSelect={handleThemeSelectDebounced}
            onThemeDelete={handleThemeDelete}
          />
        ))}

        {tempTheme && (
          <div className="flex justify-center w-full bg-gray-200 rounded-xl dark:bg-zinc-700/50 place-items-center aspect-theme animate-pulse">
            <SpinnerIcon className='opacity-50' />
          </div>
        )}

        { themes.length > 0 && <div
          id="divider"
          className="w-full h-[1px] my-2 bg-zinc-100 dark:bg-zinc-600"
        ></div>}

        <button
          onClick={() => browser.tabs.create({ url: browser.runtime.getURL('src/interface/index.html#store')})}
          className="flex items-center justify-center w-full transition aspect-theme rounded-xl bg-zinc-100 dark:bg-zinc-900 dark:text-white"
        >
          <span className="text-xl font-IconFamily">{'\uecc5'}</span>
          <span className="ml-2">Theme Store</span>
        </button>

        <button
          onClick={() => browser.runtime.sendMessage({ type: 'currentTab', info: 'OpenThemeCreator' })}
          className="flex items-center justify-center w-full transition aspect-theme rounded-xl bg-zinc-100 dark:bg-zinc-900 dark:text-white"
        >
          <span className="text-xl font-IconFamily">{'\uec60'}</span>
          <span className="ml-2">Create your own</span>
        </button>
      </div>
    </div>
  );
});

export default ThemeSelector;