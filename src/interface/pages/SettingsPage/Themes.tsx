import { FC, useEffect, useState } from 'react';
import BackgroundSelector from '../../components/BackgroundSelector';
import ThemeSelector from '../../components/ThemeSelector';
import { listThemes } from '../../hooks/ThemeManagment';

const Themes: FC = () => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<'background' | 'theme'>('background');

  useEffect(() => {
    listThemes().then(themes => {
      if (themes?.selectedTheme) {
        setSelectedType('theme');
      } else {
        setSelectedType('background');
      }
    });
  }, [])

  return (
  <div className="px-0.5">
      <button className="absolute top-12 z-20 right-0 p-2 text-[0.8rem] text-blue-500" onClick={() => setIsEditMode(!isEditMode)}>
        {isEditMode ? 'Done' : 'Edit'}
      </button>
    <BackgroundSelector setSelectedType={setSelectedType} selectedType={selectedType} isEditMode={isEditMode} />
    <ThemeSelector selectedType={selectedType} setSelectedType={setSelectedType} isEditMode={isEditMode} />
  </div>
  );
};

export default Themes;
