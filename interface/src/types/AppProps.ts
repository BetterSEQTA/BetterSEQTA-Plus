export interface SettingsState {
  notificationCollector: boolean;
  lessonAlerts: boolean;
  animatedBackground: boolean;
  animatedBackgroundSpeed: string;
  customThemeColor: string;
  betterSEQTAPlus: boolean;
}

// Define the ToggleItem interface for the nested objects in menuitems
interface ToggleItem {
  toggle: boolean;
}

// Define the Shortcut interface for the objects in the shortcuts array
interface Shortcut {
  enabled: boolean;
  name: string;
}

// Define the MainConfig interface for the top-level object
export interface MainConfig {
  DarkMode: boolean;
  animatedbk: boolean;
  bksliderinput: string;
  customshortcuts: any[];
  defaultmenuorder: any[];
  lessonalert: boolean;
  menuitems: {
    assessments: ToggleItem;
    courses: ToggleItem;
    dashboard: ToggleItem;
    documents: ToggleItem;
    forums: ToggleItem;
    goals: ToggleItem;
    home: ToggleItem;
    messages: ToggleItem;
    myed: ToggleItem;
    news: ToggleItem;
    notices: ToggleItem;
    portals: ToggleItem;
    reports: ToggleItem;
    settings: ToggleItem;
    timetable: ToggleItem;
    welcome: ToggleItem;
  };
  menuorder: any[];
  notificationcollector: boolean;
  onoff: boolean;
  selectedColor: string;
  shortcuts: Shortcut[];
  subjectfilters: Record<string, any>; // Could be more specific based on what types are allowed
}
