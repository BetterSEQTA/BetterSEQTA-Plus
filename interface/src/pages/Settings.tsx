import Switch from '../components/Switch';
import ColorPicker from '../components/ColorPicker';
import { SettingsList } from '../types/SettingsProps';
import { useSettingsContext } from '../SettingsContext';

const Settings: React.FC = () => {
  const { settingsState, setSettingsState } = useSettingsContext();

  const switchChange = (key: string, isOn: boolean) => {
    setSettingsState({
      ...settingsState,
      [key]: isOn,
    });
  };

  const colorChange = (color: string) => {
    setSettingsState({
      ...settingsState,
      customThemeColor: color,
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
      title: "Animated Background",
      description: "Adds an animated background to BetterSEQTA. (May impact battery life)",
      modifyElement: <Switch state={settingsState.animatedBackground} onChange={(isOn: boolean) => switchChange('animatedBackground', isOn)} />
    },
    {
      title: "Animated Background Speed",
      description: "Controls the speed of the animated background.",
      modifyElement: <div>Insert Slider Please</div>
    },
    {
      title: "Custom Theme Colour",
      description: "Customise the overall theme colour of SEQTA Learn.",
      modifyElement: <ColorPicker color={settingsState.customThemeColor} onChange={(color: string) => colorChange(color)} />
    },
    {
      title: "BetterSEQTA+",
      description: "Enables BetterSEQTA+ features",
      modifyElement: <Switch state={settingsState.betterSEQTAPlus} onChange={(isOn: boolean) => switchChange('betterSEQTAPlus', isOn)} />
    }
  ];

  return (
    <div className="flex flex-col -mt-4 overflow-y-scroll divide-y divide-zinc-100">
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
