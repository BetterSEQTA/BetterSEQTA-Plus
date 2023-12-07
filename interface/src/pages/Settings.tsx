import Switch from '../components/Switch';
import Slider from '../components/Slider';
import PickerSwatch from '../components/PickerSwatch';

import { SettingsList } from '../types/SettingsProps';
import { useSettingsContext } from '../SettingsContext';

import browser from 'webextension-polyfill'

const Settings: React.FC = () => {
  const { settingsState, setSettingsState } = useSettingsContext();

  const switchChange = (key: string, isOn: boolean) => {
    setSettingsState({
      ...settingsState,
      [key]: isOn,
    });
  };

  const sliderChange = (key: string, value: number) => {
    setSettingsState({
      ...settingsState,
      [key]: value,
    });
  };

  const settings: SettingsList[] = [
    {
      title: "Notification Collector",
      description: "Uncaps the 9+ limit for notifications, showing the real number.",
      modifyElement: <Switch state={settingsState.notificationCollector} onChange={(isOn: boolean) => switchChange('notificationCollector', isOn)} />
    },
    {
      title: "Lesson Alerts",
      description: "Sends a native browser notification ~5 minutes prior to lessons.",
      modifyElement: <Switch state={settingsState.lessonAlerts} onChange={(isOn: boolean) => switchChange('lessonAlerts', isOn)} />
    },
    {
      title: "Telemetry",
      description: "Enables/disables error collecting.",
      modifyElement: <Switch state={settingsState.telemetry} onChange={(isOn: boolean) => switchChange('telemetry', isOn)} />
    },
    {
      title: "Animated Background",
      description: "Adds an animated background to BetterSEQTA. (May impact battery life)",
      modifyElement: <Switch state={settingsState.animatedBackground} onChange={(isOn: boolean) => switchChange('animatedBackground', isOn)} />
    },
    {
      title: "Animated Background Speed",
      description: "Controls the speed of the animated background.",
      modifyElement: <Slider state={parseInt(settingsState.animatedBackgroundSpeed)} onChange={(value: number) => sliderChange('animatedBackgroundSpeed', value)} />
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
      title: "Transparency Effects",
      description: "Enables transparency effects on certain elements such as blur. (May impact battery life)",
      modifyElement: <Switch state={settingsState.transparencyEffects} onChange={(isOn: boolean) => switchChange('transparencyEffects', isOn)} />
    },
    {
      title: "BetterSEQTA+",
      description: "Enables BetterSEQTA+ features",
      modifyElement: <Switch state={settingsState.betterSEQTAPlus} onChange={(isOn: boolean) => switchChange('betterSEQTAPlus', isOn)} />
    }
  ];

  return (
    <div className="flex flex-col -mt-4 overflow-y-scroll divide-y divide-zinc-100 dark:divide-zinc-700">
      {settings.map((setting, index) => (
        <div className="flex items-center justify-between px-4 py-3" key={index}>
          <div className="pr-4">
            <h2 className="text-sm font-bold">{setting.title}</h2>
            <p className="text-xs">{setting.description}</p>
          </div>
          <div>
            {setting.modifyElement}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Settings;
