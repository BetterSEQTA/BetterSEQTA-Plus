import React from 'react';
import { CustomTheme } from '../types/CustomThemes';

type ThemeCoverProps = {
  theme: Omit<CustomTheme, 'CustomImages'>;
  isSelected: boolean;
  isEditMode: boolean;
  onThemeSelect: (themeId: string) => void;
  onThemeDelete: (themeId: string) => void;
};

export const ThemeCover: React.FC<ThemeCoverProps> = ({
  theme,
  isSelected,
  isEditMode,
  onThemeSelect,
  onThemeDelete,
}) => {
  const handleThemeClick = () => {
    onThemeSelect(theme.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onThemeDelete(theme.id);
  };

  return (
    <button
      className={`relative w-full h-16 flex justify-center items-center rounded-xl transition ring dark:ring-white ring-zinc-300 ${
        isSelected ? 'dark:ring-2 ring-4' : 'ring-0'
      }`}
      onClick={handleThemeClick}
    >
      {isEditMode && (
        <div
          className="absolute top-0 right-0 z-10 flex w-6 h-6 p-2 text-white translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full place-items-center"
          onClick={handleDeleteClick}
        >
          <div className="w-4 h-0.5 bg-white"></div>
        </div>
      )}
      <div className="relative top-0 z-10 flex justify-center w-full h-full overflow-hidden transition dark:text-white rounded-xl group place-items-center bg-zinc-100 dark:bg-zinc-900">
        {/* Render theme cover image or placeholder */}
        {/* {theme.CustomImages.length > 0 ? (
          <img
            src={URL.createObjectURL(theme.CustomImages[0].blob)}
            alt={theme.name}
            className="absolute inset-0 z-0 object-cover"
          />
        ) : (
          <div className="absolute inset-0 z-0 bg-gray-300 rounded-lg"></div>
        )} */}
        <div className="z-10">{theme.name}</div>
      </div>
    </button>
  );
};