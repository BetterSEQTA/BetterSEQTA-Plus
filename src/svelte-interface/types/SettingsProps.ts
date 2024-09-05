import type { SettingsState } from './AppProps';
export interface SettingsList {
  title: string;
  id: number;
  description: string;
  Component: any; /* TODO: Give this a type */
  props?: any;
}


export interface SettingsProps {
  settingsState: SettingsState;
  setSettingsState: React.Dispatch<React.SetStateAction<SettingsState>>;
}
