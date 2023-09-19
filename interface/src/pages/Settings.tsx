import Switch from '../components/Switch';
import ColorPicker from '../components/ColorPicker';
import { SettingsState } from '../../../src/popup/App';

interface ISetting {
  title: string;
  description: string;
  modifyElement: JSX.Element;
}

interface SettingsProps {
  settingsState: SettingsState;
  switchChange: (key: string, isOn: boolean) => void;
  colorChange: (color: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ settingsState, switchChange, colorChange }) => {
  const settings: ISetting[] = [
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
      modifyElement: <Switch state={settingsState.animatedBackgroundSpeed} onChange={(isOn: boolean) => switchChange('animatedBackgroundSpeed', isOn)} />
    },
    {
      title: "Custom Theme Colour",
      description: "Customise the overall theme colour of SEQTA Learn.",
      modifyElement: <ColorPicker color={settingsState.customThemeColor} onChange={(color: string) => colorChange(color)} />
    },
    {
      title: "BetterSEQTA+",
      description: "Unlocks premium features.",
      modifyElement: <Switch state={settingsState.betterSEQTAPlus} onChange={(isOn: boolean) => switchChange('betterSEQTAPlus', isOn)} />
    }
  ];

  return (
    <div className="flex flex-col overflow-y-scroll divide-y divide-zinc-100">
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
