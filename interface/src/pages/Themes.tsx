import { FC, useEffect, useState } from 'react';
import BackgroundSelector from '../components/BackgroundSelector';
import ThemeSelector from '../components/ThemeSelector';

const Themes: FC = () => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<'background' | 'theme'>('background');

  useEffect(() => {
    setSelectedType('background');
  }, [])

  return (
  <div>
      <button className="absolute top-0 right-0 p-2 text-[0.8rem] text-blue-500" onClick={() => setIsEditMode(!isEditMode)}>
        {isEditMode ? 'Done' : 'Edit'}
      </button>
    <BackgroundSelector selectedType={selectedType} isEditMode={isEditMode} />
    <ThemeSelector selectedType={selectedType} isEditMode={isEditMode} />
  </div>
  );
};

export default Themes;
