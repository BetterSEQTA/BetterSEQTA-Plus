import type { SettingsState } from './AppProps';
import { ComponentType } from 'svelte';

export interface SettingsList {
  title: string;
  id: number;
  description: string;
  component: ComponentType;
  props?: any;
}
export interface SettingsProps {
  settingsState: SettingsState;
  setSettingsState: React.Dispatch<React.SetStateAction<SettingsState>>;
}
