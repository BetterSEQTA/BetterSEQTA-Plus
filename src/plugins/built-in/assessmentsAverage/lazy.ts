import { defineLazyPlugin } from "../../core/dynamicLoader";
import { booleanSetting, defineSettings } from "../../core/settingsHelpers";

const settings = defineSettings({
  lettergrade: booleanSetting({
    default: false,
    title: "Letter Grades",
    description: "Display the average as a letter instead of a percentage",
  }),
});

export default defineLazyPlugin({
  id: "assessments-average",
  name: "Assessment Averages",
  description: "Adds an average grade to the Assessments page",
  version: "1.0.0",
  disableToggle: true,
  settings,
  loader: () => import("./index"),
});
