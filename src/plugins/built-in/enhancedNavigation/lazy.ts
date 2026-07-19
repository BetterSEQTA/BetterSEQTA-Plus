import { defineLazyPlugin } from "../../core/dynamicLoader";
import { booleanSetting, defineSettings } from "../../core/settingsHelpers";

const settings = defineSettings({
  autoScrollOnClick: booleanSetting({
    default: false,
    title: "Auto-scroll navigator on click",
    description:
      "When you click a lesson directly in the side panel, automatically scroll it to the centre. The prev/next arrows always centre the selected lesson regardless of this setting.",
  }),
});

export default defineLazyPlugin({
  id: "enhanced-navigation",
  name: "Enhanced Navigation",
  description:
    "Keeps the course navigator focused on the current lesson and adds prev/next lesson arrows.",
  version: "1.0.0",
  disableToggle: true,
  settings,
  beta: false,
  loader: () => import("./index"),
});
