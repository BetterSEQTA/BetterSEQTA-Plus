/**
 * Serializable plugin setting defaults for cloud sync backfill.
 *
 * Kept separate from `@/plugins` so the service worker never imports Svelte UI or
 * Vite HMR clients. Values must match each plugin's non-component settings.
 */
function defaultSearchHotkey(): string {
  if (typeof navigator !== "undefined") {
    return navigator.platform.toUpperCase().includes("MAC") ? "cmd+k" : "ctrl+k";
  }
  return "ctrl+k";
}

/** `plugin.<id>.settings` defaults (component/button keys omitted). */
export const SYNCABLE_PLUGIN_SETTING_DEFAULTS: Record<
  string,
  Record<string, unknown>
> = {
  themes: {},
  "animated-background": { speed: 1 },
  "assessments-average": { lettergrade: false },
  notificationCollector: {},
  timetable: {},
  timetableEdit: {},
  "profile-picture": { useCloudPfp: false },
  "assessments-overview": {},
  "background-music": { volume: 0.5, pauseOnHidden: true },
  messageFolders: {
    showTagsInAllMessages: true,
    hideFolderedMessagesInAll: true,
  },
  "enhanced-navigation": { autoScrollOnClick: false },
  "global-search": {
    searchHotkey: defaultSearchHotkey(),
    showRecentFirst: true,
    transparencyEffects: true,
    runIndexingOnLoad: true,
    passiveIndexing: true,
  },
  "grade-analytics": { cacheTtlHours: 24 },
};
