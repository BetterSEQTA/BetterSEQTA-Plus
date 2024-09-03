import type { SettingsState } from './AppProps';
import type { Component } from 'svelte';

export interface SettingsList {
  title: string;
  id: number;
  description: string;
  Component: Component;
  props?: any;
}
export interface SettingsProps {
  settingsState: SettingsState;
  setSettingsState: React.Dispatch<React.SetStateAction<SettingsState>>;
}
