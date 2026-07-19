import type { SettingsState } from "@/types/storage";

function detectLowEndDevice(): boolean {
  const lowCoreCount =
    navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
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
    animatedbk: true,
    bksliderinput: "50",
    transparencyEffects: false,
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
    selectedColor:
      "linear-gradient(40deg, rgba(201,61,0,1) 0%, RGBA(170, 5, 58, 1) 100%)",
    originalSelectedColor: "",
    DarkMode: true,
    animations: !isLowEndDevice,
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
    adaptiveThemeColour: false,
    adaptiveThemeGradient: false,
    adaptiveThemeColourTransition: true,
    themeOfTheMonthDisabled: false,
    autoCloudSettingsSync: true,
    selectedFont: "rubik",
    timeFormat: "24",
    privacyStatementShown: false,
    bsCloudAutoSyncAnnouncementShown: false,
    teachHomeWidgets: {
      shortcuts: { toggle: true },
      timetable: { toggle: true },
      upcomingAssessments: { toggle: true },
      messages: { toggle: true },
      notices: { toggle: true },
    },
  };
}
