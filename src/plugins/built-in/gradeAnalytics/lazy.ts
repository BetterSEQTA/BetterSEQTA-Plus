import { defineLazyPlugin } from "../../core/dynamicLoader";
import { defineSettings, numberSetting } from "../../core/settingsHelpers";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
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

const gradeAnalyticsPluginLazy = defineLazyPlugin({
  id: "grade-analytics",
  name: "Grade Analytics",
  description:
    "Grade trends, distribution charts, and assessment history synced from SEQTA",
  version: "1.0.0",
  settings,
  disableToggle: true,
  defaultEnabled: true,
  styles,
  loader: () => import("./core/index"),
});

const runGradeAnalytics = gradeAnalyticsPluginLazy.run!;

gradeAnalyticsPluginLazy.run = async (api) => {
  if (isSeqtaEngageExperience()) {
    return () => {};
  }
  return runGradeAnalytics(api);
};

export default gradeAnalyticsPluginLazy;
