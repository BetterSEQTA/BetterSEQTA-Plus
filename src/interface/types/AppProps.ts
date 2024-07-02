export interface SettingsState {
  notificationCollector: boolean;
  selectedTheme: string;
  lessonAlerts: boolean;
  animatedBackground: boolean;
  animatedBackgroundSpeed: string;
  customThemeColor: string;
  betterSEQTAPlus: boolean;
  shortcuts: Shortcut[];
  customshortcuts: CustomShortcut[];
  transparencyEffects: boolean;
  timeFormat?: string;
  animations: boolean;
  defaultPage: string;
  devMode: boolean;
}

interface Shortcut {
  enabled: boolean;
  name: string;
}

export interface CustomShortcut {
  name: string;
  url: string;
  icon: string;
}