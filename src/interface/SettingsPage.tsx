import TabbedContainer from './components/TabbedContainer';
import Settings from './pages/Settings';
import logo from './assets/betterseqta-dark-full.png';
import logoDark from './assets/betterseqta-light-full.png';
import Shortcuts from './pages/Shortcuts';
import Picker from './components/Picker';
import Themes from './pages/Themes';
import { memo } from 'react';

interface SettingsPage {
  standalone: boolean;
}

const SettingsPage = ({ standalone }: SettingsPage) => {
  const tabs = [
    {
      title: 'Settings',
      content: <Settings />
    },
    {
      title: 'Shortcuts',
      content: <Shortcuts />
    },
    {
      title: 'Themes',
      content: <Themes />
    }
  ];  

  return (
    <div className={`flex flex-col w-[384px] shadow-2xl gap-2 bg-white ${ standalone ? '' : 'rounded-xl' } h-[600px] overflow-clip dark:bg-zinc-800 dark:text-white`}>
      <div className="grid border-b border-b-zinc-200/40 place-items-center">
        <img src={logo} className="w-4/5 dark:hidden" />
        <img src={logoDark} className="hidden w-4/5 dark:block" />
      </div>
      <Picker />
      <TabbedContainer tabs={tabs} />
    </div>
  );
};

export default memo(SettingsPage);