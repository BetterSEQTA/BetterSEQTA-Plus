import React, { useEffect } from 'react';
import TabbedContainer from './components/TabbedContainer';
import Settings from './pages/Settings';
import logo from './assets/betterseqta-dark-full.png';
import logoDark from './assets/betterseqta-light-full.png';
import Shortcuts from './pages/Shortcuts';
import { useSettingsContext } from './SettingsContext';
import Picker from './components/Picker';
//import Themes from './pages/Themes';
import About from './pages/About';
//import About from './pages/About';

const App: React.FC = () => {

  const { standalone, setStandalone } = useSettingsContext();

  useEffect(() => {
    // if body has class standalone
    if (document.body.classList.contains('standalone')) {
      // set settingsContext standalone to true
      setStandalone(true);
    }
  })

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

  return (
    <div className={`flex flex-col w-[384px] shadow-2xl gap-2 bg-white ${ standalone ? '' : 'rounded-xl' } h-[610px] dark:bg-zinc-800 dark:text-white`}>
      <div className="grid border-b border-b-zinc-200/40 place-items-center">
        <img src={logo} className="w-4/5 dark:hidden" />
        <img src={logoDark} className="hidden w-4/5 dark:block" />
      </div>
      <Picker />
      <TabbedContainer tabs={tabs} />
    </div>
  );
};

export default App;