export interface SettingsState {
  DarkMode: boolean;
  animatedbk: boolean;
  bksliderinput: string;
  customshortcuts: CustomShortcut[];
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
  telemetry: boolean;
  onoff: boolean;
  selectedColor: string;
  shortcuts: Shortcut[];
  subjectfilters: Record<string, any>;
  transparencyEffects: boolean;
}

interface ToggleItem {
  toggle: boolean;
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
