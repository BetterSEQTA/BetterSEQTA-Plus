export interface SettingsState {
  DarkMode: boolean;
  selectedTheme: string;
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
  onoff: boolean;
  selectedColor: string;
  originalSelectedColor: string;
  shortcuts: Shortcut[];
  subjectfilters: Record<string, any>;
  transparencyEffects: boolean;
  justupdated?: boolean;
  timeFormat?: string;
  animations: boolean;
  defaultPage: string;
  devMode?: boolean;
  originalDarkMode?: boolean;
  newsSource?: string;
  mockNotices?: boolean;
  hideSensitiveContent?: boolean;

  // depreciated keys
  animatedbk: boolean;
  bksliderinput: string;
  lettergrade: boolean;
  assessmentsAverage?: boolean;
  notificationCollector?: boolean;
}

interface ToggleItem {
  toggle: boolean;
}

export interface Shortcut {
  enabled: boolean;
  name: string;
}

export interface CustomShortcut {
  name: string;
  url: string;
  icon: string;
}
