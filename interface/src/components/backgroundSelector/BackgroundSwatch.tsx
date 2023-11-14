import React from 'react';

interface BackgroundSwatchProps {
  background: {
    id: string;
    type: string;
    url: string;
    previewUrl: string;
    isPreset: boolean;
  };
  selectBackground: (fileId: string) => void;
  isEditMode: boolean;
  deleteBackground: (fileId: string) => Promise<void>;
  selectedBackground: string | null;
  selectedType: 'background' | 'theme';
}

export const BackgroundSwatch: React.FC<BackgroundSwatchProps> = ({ background, selectBackground, isEditMode, deleteBackground, selectedBackground, selectedType }) => {
  const { id, url, type } = background;
  const isSelected = selectedBackground === id && selectedType === "background";

  return (
    <div key={id} onClick={() => selectBackground(id)} className={`relative w-16 h-16 cursor-pointer rounded-xl transition ring dark:ring-white ring-zinc-300 ${isEditMode ? 'animate-shake' : ''} ${isSelected ? 'dark:ring-2 ring-4' : 'ring-0'}`}>
      {isEditMode && (
        <div className="absolute top-0 right-0 z-10 flex w-6 h-6 p-2 text-white translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full place-items-center"
            onClick={() => deleteBackground(id)}>
          <div className="w-4 h-0.5 bg-white"></div>
        </div>
      )}
      {type === 'image' ? 
        <img className="object-cover w-full h-full rounded-xl" src={url} alt="swatch" /> : 
        <video muted loop autoPlay src={url} className="object-cover w-full h-full rounded-xl" />
      }
    </div>
  );
};