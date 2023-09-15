// App.tsx
import { useState } from 'react';
import TabbedContainer from './components/TabbedContainer';
import Settings from './pages/Settings';
import logo from './assets/betterseqta-dark-full.png';
import logoDark from './assets/betterseqta-light-full.png';
import Shortcuts from './pages/Shortcuts';
import About from './pages/About';

export interface SettingsState {
  notificationCollector: boolean;
  lessonAlerts: boolean;
  animatedBackground: boolean;
  animatedBackgroundSpeed: boolean;
  customThemeColor: string;
  betterSEQTAPlus: boolean;
}

const App: React.FC = () => {
  const [settingsState, setSettingsState] = useState<SettingsState>({
    notificationCollector: false,
    lessonAlerts: false,
    animatedBackground: false,
    animatedBackgroundSpeed: false,
    customThemeColor: "#db6969",
    betterSEQTAPlus: true
  });

  // Handler for Switches
  const switchChange = (key: string, isOn: boolean) => {
    setSettingsState({
      ...settingsState,
      [key]: isOn,
    });
  };

  // Handler for ColorPicker
  const colorChange = (color: string) => {
    setSettingsState({
      ...settingsState,
      customThemeColor: color,
    });
  };

  const tabs = [
    {
      title: 'Settings',
      content: <Settings settingsState={settingsState} switchChange={switchChange} colorChange={colorChange} />
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
    <div className="flex justify-center w-screen h-screen pt-4 overflow-hidden" style={{ background: settingsState.customThemeColor }}>

      <div className="flex flex-col w-[24rem] shadow-2xl gap-2 bg-white rounded-xl h-4/6 dark:bg-zinc-800 dark:text-white">
        <div className="grid border-b border-b-zinc-200/40 place-items-center">
          <img src={logo} className="w-4/5 dark:hidden" />
          <img src={logoDark} className="hidden w-4/5 dark:block" />
        </div>
        <TabbedContainer themeColor={settingsState.customThemeColor} tabs={tabs} />
      </div>

    </div>
  );
}

export default App;