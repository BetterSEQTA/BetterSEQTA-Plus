// Interface representing the settings state for an application
export interface SettingsState {
  DarkMode: boolean; // Flag indicating if dark mode is enabled
  selectedTheme: string; // ID of the selected theme
  customshortcuts: CustomShortcut[]; // List of custom shortcuts
  defaultmenuorder: any[]; // Default order of menu items
  lessonalert: boolean; // Flag to enable/disable lesson alerts
  menuitems: { // Settings for individual menu items
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
  menuorder: any[]; // Custom order of menu items
  onoff: boolean; // Flag to enable/disable the settings state
  selectedColor: string; // Color selected by the user
  originalSelectedColor: string; // Original color before changes
  shortcuts: Shortcut[]; // List of shortcuts
  subjectfilters: Record<string, any>; // Filters applied to subjects
  transparencyEffects: boolean; // Flag to enable/disable transparency effects
  justupdated?: boolean; // Flag indicating if the settings were just updated
  timeFormat?: string; // Selected time format (e.g., 12-hour or 24-hour)
  animations: boolean; // Flag to enable/disable animations
  defaultPage: string; // Default page to load on start
  devMode?: boolean; // Flag to enable developer mode
  originalDarkMode?: boolean; // Original dark mode setting before changes
  newsSource?: string; // Source of news for the application

  // Deprecated keys (legacy settings)
  animatedbk: boolean; // Flag for animated backgrounds
  bksliderinput: string; // Background slider input value
  lettergrade: boolean; // Flag to enable letter grade display
  assessmentsAverage?: boolean; // Flag to show assessments average
  notificationCollector?: boolean; // Flag for notification collection
}

// Interface representing a toggleable menu item
interface ToggleItem {
  toggle: boolean; // Whether the menu item is toggled on or off
}

// Interface for a single shortcut in the settings
export interface Shortcut {
  enabled: boolean; // Flag indicating if the shortcut is enabled
  name: string; // Name of the shortcut
}

// Interface for a custom user-defined shortcut
export interface CustomShortcut {
  name: string; // Name of the shortcut
  url: string; // URL associated with the shortcut
  icon: string; // Icon for the shortcut
}
