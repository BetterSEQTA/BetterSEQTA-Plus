export const ALL_SETTINGS_SECTIONS = [
  "account",
  "general",
  "appearance",
  "timetable",
  "assessments",
  "features",
  "advanced",
] as const;

export type SettingsSectionId = (typeof ALL_SETTINGS_SECTIONS)[number];

export type SettingsSectionSharedProps = {
  showColourPicker: () => void;
  showFontPicker: () => void;
  showDisclaimer: (
    onConfirm: () => void,
    onCancel: () => void,
    title?: string,
    message?: string,
  ) => void;
  showCloudPanel: () => void;
  searchQuery?: string;
};

export function matchesSearch(
  searchQuery: string,
  ...parts: Array<string | undefined>
): boolean {
  const q = searchQuery.trim().toLowerCase();
  return !q || parts.some((part) => part?.toLowerCase().includes(q));
}

export const PLUGIN_SECTION_BY_ID: Record<string, SettingsSectionId> = {
  "profile-picture": "account",
  "animated-background": "appearance",
  "background-music": "appearance",
  timetable: "timetable",
  timetableEdit: "timetable",
  "assessments-overview": "assessments",
  "assessments-average": "assessments",
  "grade-analytics": "assessments",
  "global-search": "features",
  "enhanced-navigation": "features",
  messageFolders: "features",
  notificationCollector: "features",
};
