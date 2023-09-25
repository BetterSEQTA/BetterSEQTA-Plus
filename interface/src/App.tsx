import React from 'react';
import TabbedContainer from './components/TabbedContainer';
import Settings from './pages/Settings';
import logo from './assets/betterseqta-dark-full.png';
import logoDark from './assets/betterseqta-light-full.png';
import Shortcuts from './pages/Shortcuts';
import About from './pages/About';
import { SettingsContextProvider } from './SettingsContext';

const App: React.FC = () => {

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
      title: 'About',
      content: <About />
    }
  ];

  {/* <div className="flex justify-center w-screen h-screen pt-4 overflow-hidden" style={{ background: settingsState.customThemeColor }}> */}
  return (
    <SettingsContextProvider>
      <div className="flex flex-col w-[384px] shadow-2xl gap-2 bg-white rounded-xl h-[590px] dark:bg-zinc-800 dark:text-white">
        <div className="grid border-b border-b-zinc-200/40 place-items-center">
          <img src={logo} className="w-4/5 dark:hidden" />
          <img src={logoDark} className="hidden w-4/5 dark:block" />
        </div>
        <TabbedContainer tabs={tabs} />
      </div>
    </SettingsContextProvider>
  );
};

export default App;