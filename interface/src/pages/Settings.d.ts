import { SettingsState } from '../App';
interface SettingsProps {
    settingsState: SettingsState;
    switchChange: (key: string, isOn: boolean) => void;
    colorChange: (color: string) => void;
}
declare const Settings: React.FC<SettingsProps>;
export default Settings;
