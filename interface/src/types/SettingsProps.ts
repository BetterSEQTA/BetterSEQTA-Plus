import type { SettingsState } from './AppProps';

export interface SettingsList {
  title: string;
  description: string;
  modifyElement: JSX.Element;
}
export interface SettingsProps {
  settingsState: SettingsState;
  setSettingsState: React.Dispatch<React.SetStateAction<SettingsState>>;
}
