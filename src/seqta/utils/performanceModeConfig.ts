/** Heavy plugins paused while Performance Mode is on (unless force-enabled). */
export type PerformanceHeavyPlugin = {
  id: string;
  name: string;
  description: string;
};

export const PERFORMANCE_HEAVY_PLUGINS: readonly PerformanceHeavyPlugin[] = [
  {
    id: "global-search",
    name: "Global Search",
    description: "Background indexing, vector search, and fetch capture",
  },
  {
    id: "assessments-average",
    name: "Assessment Averages",
    description: "Weight extraction, overrides, and live grade calculations",
  },
  {
    id: "grade-analytics",
    name: "Grade Analytics",
    description: "Chart rendering and analytics sync",
  },
  {
    id: "notificationCollector",
    name: "Notification Collector",
    description: "Background notification polling",
  },
  {
    id: "enhanced-navigation",
    name: "Enhanced Navigation",
    description: "Extra scroll and navigation observers",
  },
  {
    id: "animated-background",
    name: "Animated Background",
    description: "Continuous CSS background animation layers",
  },
  {
    id: "background-music",
    name: "Background Music",
    description: "Audio playback and gesture unlock listeners",
  },
  {
    id: "messageFolders",
    name: "Message Folders",
    description: "Message DOM tagging and folder indexing",
  },
] as const;

export const PERFORMANCE_HEAVY_PLUGIN_IDS = new Set(
  PERFORMANCE_HEAVY_PLUGINS.map((p) => p.id),
);
