import type { Plugin } from "../../core/types";
import { defineSettings, numberSetting } from "../../core/settingsHelpers";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import { injectAnalyticsMenuItem } from "./injectAnalyticsMenuItem";
import styles from "./styles.css?inline";

const settings = defineSettings({
  cacheTtlHours: numberSetting({
    default: 24,
    title: "Cache duration (hours)",
    description: "How long to keep synced analytics before refreshing from SEQTA",
    min: 1,
    max: 168,
  }),
});

/**
 * Shell loads immediately so the sidebar Analytics icon can mount.
 * The page UI (`loadAnalyticsPage` / charts) stays in a separate lazy chunk.
 */
const gradeAnalyticsPlugin: Plugin<typeof settings> = {
  id: "grade-analytics",
  name: "Grade Analytics",
  description: "Grade trends, distribution charts, and assessment history synced from SEQTA",
  version: "1.0.0",
  settings,
  disableToggle: true,
  defaultEnabled: true,
  styles,
  run: async () => {
    if (isSeqtaEngageExperience()) return () => {};
    return injectAnalyticsMenuItem();
  },
};

export default gradeAnalyticsPlugin;
