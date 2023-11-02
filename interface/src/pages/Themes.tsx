import { FC } from 'react';
import BackgroundSelector from '../components/BackgroundSelector';
import ThemeSelector from '../components/ThemeSelector';

const Themes: FC = () => {

  return (
  <div>
    <BackgroundSelector />
    <ThemeSelector />
  </div>
  );
};

export default Themes;
