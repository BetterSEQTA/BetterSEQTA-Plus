import React, { useState } from 'react';
import { CustomTheme, DownloadedTheme } from '../types/CustomThemes';
import browser from 'webextension-polyfill';
import { ArrowUpOnSquareIcon, PencilIcon } from '@heroicons/react/24/outline';
import { sendThemeUpdate } from '../hooks/ThemeManagment';

type ThemeCoverProps = {
  theme: Omit<CustomTheme, 'CustomImages'> | DownloadedTheme;
  isSelected: boolean;
  isEditMode: boolean;
  downloaded?: boolean;
  onThemeSelect: (themeId: string) => void;
  onThemeDelete: (themeId: string) => void;
};

export const ThemeCover: React.FC<ThemeCoverProps> = ({
  theme,
  downloaded,
  isSelected,
  isEditMode,
  onThemeSelect,
  onThemeDelete,
}) => {
  const [uploading, setUploading] = useState<boolean>(false);
  const handleThemeClick = async () => {
    if (isEditMode) return;
    if (downloaded) {
      await sendThemeUpdate(theme as DownloadedTheme, true)
      browser.runtime.sendMessage({
        type: 'DeleteDownloadedTheme',
        body: theme.id
      })
    } else {
      console.log(theme)
      onThemeSelect(theme.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onThemeDelete(theme.id);
  };

  const handleShareClick = (event: React.MouseEvent) => {
    event?.preventDefault();
    setUploading(true);
    browser.runtime.sendMessage({ type: 'currentTab', info: 'ShareTheme', body: { themeID: theme.id } }).then((response) => {
      setUploading(false);
      browser.tabs.create({ url: `https://share.betterseqta/theme?id=${response.id}&justCreated=true` });
    });
  };

  return (
    <button
      className={`relative group w-full aspect-theme flex justify-center items-center rounded-xl transition ring dark:ring-white ring-zinc-300 ${
        isSelected ? 'dark:ring-2 ring-4' : 'ring-0'
      }`}
      onClick={handleThemeClick}
    >
      {isEditMode && (
        <div
          className="absolute z-20 flex w-6 h-6 p-2 text-white transition-all rounded-full opacity-0 top-1 right-2 dark:bg-red-600 place-items-center group-hover:opacity-100 group-hover:top-2"
          onClick={handleDeleteClick}
        >
          <div className="w-4 h-0.5 bg-white"></div>
        </div>
      )}
      
      { isEditMode || !downloaded &&
      <>
        <div
          className="absolute z-20 flex w-8 h-8 p-2 text-white transition-all rounded-full delay-[20ms] opacity-0 top-1 right-2 dark:bg-black/50 place-items-center group-hover:opacity-100 group-hover:top-[1.25rem]"
          onClick={(event) => { event?.preventDefault(), browser.runtime.sendMessage({ type: 'currentTab', info: 'OpenThemeCreator', body: { themeID: theme.id } }) }}
        >
          <PencilIcon className="w-4 h-4" />
        </div>

        <div
          className="absolute z-20 flex w-8 h-8 p-2 text-white transition-all rounded-full opacity-0 top-1 right-12 dark:bg-black/50 place-items-center group-hover:opacity-100 group-hover:top-[1.25rem]"
          onClick={handleShareClick}
        >
          {uploading ? <LoadingSpinner size={16} /> : <ArrowUpOnSquareIcon className="w-4 h-4" />}
        </div>
      </>
      }

      <div className="relative top-0 z-10 flex justify-center w-full h-full overflow-hidden transition dark:text-white rounded-xl group place-items-center bg-zinc-100 dark:bg-zinc-900">
        {theme.coverImage &&
          <img
            src={(typeof theme.coverImage) == 'string' ? theme.coverImage as string : URL.createObjectURL(theme.coverImage as Blob)}
            alt={theme.name}
            className="absolute inset-0 z-0 object-cover"
          />
        }
        {
          theme.hideThemeName ? <></> :
          <div className="z-10">{theme.name}</div>
        }
      </div>
    </button>
  );
};

const LoadingSpinner = ({ size }: { size: number }) => {
  return <div style={{ width: `${size}px`, height: `${size}px` }} className={`animate-spin rounded-full border-2 border-white border-t-2 border-t-transparent`}></div>;
};

