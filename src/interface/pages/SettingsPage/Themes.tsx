import { createRef, FC, useState } from 'react';
import BackgroundSelector from '../../components/BackgroundSelector';
//import ThemeSelector from '../../components/ThemeSelector';
import { memo } from 'react';

type ThemeSelectorRef = {
  disableTheme: () => void;
};

const Themes: FC = () => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const themeSelectorRef = createRef<ThemeSelectorRef>();

  const disableTheme = async () => {
    themeSelectorRef?.current?.disableTheme();
  }


  return (
  <div className="">
      <button className="absolute top-12 z-20 right-0 p-2 text-[0.8rem] text-blue-500" onClick={() => setIsEditMode(!isEditMode)}>
        {isEditMode ? 'Done' : 'Edit'}
      </button>
    <BackgroundSelector disableTheme={disableTheme} isEditMode={isEditMode} />
    {/* <ThemeSelector ref={themeSelectorRef} isEditMode={isEditMode} /> */}
  </div>
  );
};

export default memo(Themes);
