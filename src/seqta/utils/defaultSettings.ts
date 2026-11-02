import type { SettingsState } from "@/types/storage";

function detectLowEndDevice(): boolean {
  const lowCoreCount = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
  const lowMemory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory != null &&
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 2;

  return !!(lowCoreCount || lowMemory);
}

/** Default core settings for a fresh profile (`SettingsState` shape). */
export function getDefaultSettingsState(): SettingsState {
  const isLowEndDevice = detectLowEndDevice();

  return {
    onoff: true,
    settingsPopupExpanded: false,
    animatedbk: true,
    bksliderinput: "50",
    transparencyEffects: true,
    lessonalert: true,
    defaultmenuorder: [],
    menuitems: {
      assessments: { toggle: true },
      courses: { toggle: true },
      dashboard: { toggle: true },
      documents: { toggle: true },
      forums: { toggle: true },
      goals: { toggle: true },
      home: { toggle: true },
      messages: { toggle: true },
      myed: { toggle: true },
      news: { toggle: true },
      notices: { toggle: true },
      portals: { toggle: true },
      reports: { toggle: true },
      settings: { toggle: true },
      timetable: { toggle: true },
      welcome: { toggle: true },
      analytics: { toggle: true },
    },
    menuorder: [],
    subjectfilters: {},
    selectedTheme: "",
    selectedColor: "linear-gradient(45deg, rgba(17,88,131,1) 0%, rgba(18,106,98,1) 100%)",
    originalSelectedColor: "",
    DarkMode: true,
    animations: !isLowEndDevice,
    performanceMode: isLowEndDevice,
    performanceModePluginOverrides: {},
    assessmentsAverage: false,
    defaultPage: "home",
    homeUpcomingSubjectsMax: 5,
    homeUpcomingAssessmentsPerSubjectMax: 0,
    homeUpcomingIncludePast: true,
    shortcuts: [
      { name: "Outlook", enabled: true },
      { name: "Office", enabled: true },
      { name: "Google", enabled: true },
    ],
    customshortcuts: [],
    lettergrade: false,
    notificationCollector: false,
    newsSource: "australia",
    iconOnlySidebar: false,
    sidebarStyle: "classic",
    sidebarDensity: "comfortable",
    sidebarCornerRadius: 12,
    sidebarActiveIndicator: "fill",
    sidebarWidth: "default",
    sidebarPosition: "left",
    sidebarBlur: 50,
    adaptiveThemeColour: false,
    adaptiveThemeGradient: false,
    adaptiveThemeColourTransition: true,
    themeOfTheMonthDisabled: false,
    autoCloudSettingsSync: true,
    showTitlebarFounderBadge: true,
    selectedFont: "rubik",
    timeFormat: "24",
    privacyStatementShown: false,
    bsCloudAutoSyncAnnouncementShown: false,
    coursesAssessmentsFixPopupShown: false,
  };
}
