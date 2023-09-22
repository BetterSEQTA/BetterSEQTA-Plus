// App.tsx
import React, { useState } from 'react';
import TabbedContainer from './components/TabbedContainer';
import Settings from './pages/Settings';
import logo from './assets/betterseqta-dark-full.png';
import logoDark from './assets/betterseqta-light-full.png';
import Shortcuts from './pages/Shortcuts';
import About from './pages/About';

import type { SettingsState } from './types/AppProps';
import useSettingsState from './hooks/settingsState';

const App: React.FC = () => {
  const [settingsState, setSettingsState] = useState<SettingsState>({
    notificationCollector: false,
    lessonAlerts: false,
    animatedBackground: false,
    animatedBackgroundSpeed: "0",
    customThemeColor: "#db6969",
    betterSEQTAPlus: true
  });

  useSettingsState({ settingsState, setSettingsState });

  const tabs = [
    {
      title: 'Settings',
      content: <Settings settingsState={settingsState} setSettingsState={setSettingsState} />
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
    <div className="flex flex-col w-[384px] shadow-2xl gap-2 bg-white rounded-xl h-[590px] dark:bg-zinc-800 dark:text-white">
      <div className="grid border-b border-b-zinc-200/40 place-items-center">
        <img src={logo} className="w-4/5 dark:hidden" />
        <img src={logoDark} className="hidden w-4/5 dark:block" />
      </div>
      <TabbedContainer themeColor={settingsState.customThemeColor} tabs={tabs} />
    </div>
  );
};

export default App;