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
  privacyStatementShown?: boolean;
  privacyStatementLastUpdated?: string;
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

  // BetterSEQTA Cloud (accounts.betterseqta.org)
  bsplus_client_id?: string;
  bsplus_token?: string;
  bsplus_refresh_token?: string;
  bsplus_user?: { id: string; email?: string; username?: string; displayName?: string; pfpUrl?: string; admin_level?: number };
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
