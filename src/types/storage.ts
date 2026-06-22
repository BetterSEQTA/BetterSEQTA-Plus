export interface SettingsState {
  DarkMode: boolean;
  selectedTheme: string;
  customshortcuts: CustomShortcut[];
  defaultmenuorder: any[];
  lessonalert: boolean;
  menuitems: {
    assessments: ToggleItem;
    analytics: ToggleItem;
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
    [key: string]: ToggleItem;
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
  /** One-time announcement: BS Cloud automatic settings sync (last in startup popup queue). */
  bsCloudAutoSyncAnnouncementShown?: boolean;
  /**
   * Calendar month (`YYYY-MM`) for which the user closed the Theme of the Month popup.
   * Cleared automatically when a new month's entry is fetched (different `month`).
   */
  themeOfTheMonthDismissedMonth?: string;
  /** @deprecated Migrated away; no longer read. */
  themeOfTheMonthLastSeenId?: string;
  /** Permanently disables Theme of the Month startup prompts. */
  themeOfTheMonthDisabled?: boolean;
  timeFormat?: string;
  animations: boolean;
  defaultPage: string;
  devMode?: boolean;
  /** Dev-only: pretend this is the latest GitHub release version for update badge testing. */
  devGhReleaseVersionOverride?: string;
  /** ISO timestamp of the last acknowledged nightly release publish time. */
  lastSeenNightlyPublishedAt?: string;
  originalDarkMode?: boolean;
  newsSource?: string;
  mockNotices?: boolean;
  hideSensitiveContent?: boolean;
  iconOnlySidebar?: boolean;
  adaptiveThemeColour?: boolean;
  adaptiveThemeGradient?: boolean;
  adaptiveThemeColourTransition?: boolean;
  /** Google Font preset id for SEQTA interface typography (`rubik` default). */
  selectedFont?: string;

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
  bsplus_user?: { id: string; email?: string; username?: string; displayName?: string; pfpUrl?: string; pfpHash?: string | null; admin_level?: number };
  /** When not `false`, automatic cloud settings sync is enabled (default-on). */
  autoCloudSettingsSync?: boolean;
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
