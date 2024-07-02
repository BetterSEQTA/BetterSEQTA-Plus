import Switch from '../../components/Switch';
import Slider from '../../components/Slider';
import PickerSwatch from '../../components/PickerSwatch';
import Select from '../../components/Select';

import { SettingsList } from '../../types/SettingsProps';
import { useSettingsContext } from '../../SettingsContext';

import browser from 'webextension-polyfill';
import { memo, useCallback } from 'react';

const Settings: React.FC = () => {
  const { settingsState, setSettingsState } = useSettingsContext();

  const handleDevModeToggle = useCallback(() => {
    const secretSequence = 'dev';
    let typedSequence = '';
    let timeoutId: NodeJS.Timeout;

    const handleKeyDown = (event: KeyboardEvent) => {
      typedSequence += event.key.toLowerCase();
      
      if (typedSequence.includes(secretSequence)) {
        document.removeEventListener('keydown', handleKeyDown);
        clearTimeout(timeoutId);

        setSettingsState(prevState => ({
          ...prevState,
          devMode: !prevState.devMode
        }));

        alert(`Dev mode is now ${!settingsState.devMode ? 'enabled' : 'disabled'}`);
      }

      // Clear the sequence after 2 seconds of inactivity
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        typedSequence = '';
      }, 2000);
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutId);
    };
  }, [setSettingsState, settingsState.devMode]);

  const handleSettingChange = useCallback((key: string, value: boolean | string | number) => {
    setSettingsState(prevState => ({
      ...prevState,
      [key]: value,
    }));
  }, [setSettingsState]);

  const settings: SettingsList[] = [
    {
      title: "Transparency Effects",
      description: "Enables transparency effects on certain elements such as blur. (May impact battery life)",
      modifyElement: <Switch state={settingsState.transparencyEffects} onChange={(isOn: boolean) => handleSettingChange('transparencyEffects', isOn)} />
    },
    {
      title: "Animated Background",
      description: "Adds an animated background to BetterSEQTA. (May impact battery life)",
      modifyElement: <Switch state={settingsState.animatedBackground} onChange={(isOn: boolean) => handleSettingChange('animatedBackground', isOn)} />
    },
    {
      title: "Animated Background Speed",
      description: "Controls the speed of the animated background.",
      modifyElement: <Slider state={parseInt(settingsState.animatedBackgroundSpeed)} onChange={(value: number) => handleSettingChange('animatedBackgroundSpeed', value)} />
    },
    {
      title: "Custom Theme Colour",
      description: "Customise the overall theme colour of SEQTA Learn.",
      modifyElement: <PickerSwatch />
    },
    {
      title: "Edit Sidebar Layout",
      description: "Customise the sidebar layout.",
      modifyElement: <button onClick={() => browser.runtime.sendMessage({ type: 'currentTab', info: 'EditSidebar' })} className='px-4 py-1 text-[0.75rem] dark:bg-[#38373D] bg-[#DDDDDD] dark:text-white rounded-md'>Edit</button>
    },
    {
      title: "Animations",
      description: "Enables animations on certain pages.",
      modifyElement: <Switch state={settingsState.animations} onChange={(isOn: boolean) => handleSettingChange('animations', isOn)} />
    },
    {
      title: "Notification Collector",
      description: "Uncaps the 9+ limit for notifications, showing the real number.",
      modifyElement: <Switch state={settingsState.notificationCollector} onChange={(isOn: boolean) => handleSettingChange('notificationCollector', isOn)} />
    },
    {
      title: "Lesson Alerts",
      description: "Sends a native browser notification ~5 minutes prior to lessons.",
      modifyElement: <Switch state={settingsState.lessonAlerts} onChange={(isOn: boolean) => handleSettingChange('lessonAlerts', isOn)} />
    },
    {
      title: "12 Hour Time",
      description: "Prefer 12 hour time format for SEQTA",
      modifyElement: <Switch state={settingsState.timeFormat == "12"} onChange={(isOn: boolean) => handleSettingChange('timeFormat', isOn ? "12" : "24")} />
    },
    {
      title: "Default Page",
      description: "The page to load when SEQTA Learn is opened.",
      modifyElement: <Select state={settingsState.defaultPage} onChange={(value: string) => handleSettingChange('defaultPage', value)} options={[
        { value: 'home', label: 'Home' },
        { value: 'dashboard', label: 'Dashboard' },
        { value: 'timetable', label: 'Timetable' },
        { value: 'welcome', label: 'Welcome' },
        { value: 'messages', label: 'Messages' },
        { value: 'documents', label: 'Documents' },
        { value: 'reports', label: 'Reports' },
      ]} />
    },
    {
      title: "BetterSEQTA+",
      description: "Enables BetterSEQTA+ features",
      modifyElement: <Switch state={settingsState.betterSEQTAPlus} onChange={(isOn: boolean) => handleSettingChange('betterSEQTAPlus', isOn)} />
    }
  ];

  return (
    <div className="flex flex-col -mt-4 overflow-y-scroll divide-y divide-zinc-100 dark:divide-zinc-700">
      {settings.map((setting, index) => (
        <div className="flex items-center justify-between px-4 py-3" key={index}>
          <div className="pr-4">
            <h2 onClick={setting.title.includes('BetterSEQTA+') ? handleDevModeToggle : undefined} className="text-sm font-bold">{setting.title}</h2>
            <p className="text-xs">{setting.description}</p>
          </div>
          <div>
            {setting.modifyElement}
          </div>
        </div>
      ))}

      {settingsState.devMode && (
        <>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="pr-4">
              <h2 className="text-sm font-bold">Dev Mode</h2>
              <p className="text-xs">Enables dev mode</p>
            </div>
            <Switch state={settingsState.devMode} onChange={(isOn: boolean) => handleSettingChange('devMode', isOn)} />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="pr-4">
              <h2 className="text-sm font-bold">Sensitive Hider</h2>
              <p className="text-xs">Replace sensitive content with mock data</p>
            </div>
            <button onClick={() => browser.runtime.sendMessage({ type: 'currentTab', info: 'HideSensitive' })} className='px-4 py-1 text-[0.75rem] dark:bg-[#38373D] bg-[#DDDDDD] dark:text-white rounded-md'>Hide</button>
          </div>
        </>
      )}
    </div>
  );
};

export default memo(Settings);