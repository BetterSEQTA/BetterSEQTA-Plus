import React from 'react';
import { BackgroundSwatch } from './BackgroundSwatch';
import { Background } from '../BackgroundSelector'; // Import the Background interface

interface BackgroundListProps {
  backgrounds: Background[];
  selectBackground: (fileId: string) => void;
  isEditMode: boolean;
  deleteBackground: (fileId: string) => Promise<void>;
  selectedBackground: string | null;
  selectedType: 'background' | 'theme';
}

export const BackgroundList: React.FC<BackgroundListProps> = ({ backgrounds, selectBackground, isEditMode, deleteBackground, selectedBackground, selectedType }) => {
  return (
    <>
      {backgrounds.map(bg => (
        <BackgroundSwatch
          key={bg.id}
          background={bg}
          selectBackground={selectBackground}
          isEditMode={isEditMode}
          deleteBackground={deleteBackground}
          selectedBackground={selectedBackground}
          selectedType={selectedType}
        />
      ))}
    </>
  );
};
