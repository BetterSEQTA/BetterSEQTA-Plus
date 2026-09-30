import { defineLazyPlugin } from "../../core/dynamicLoader";
import { timetableClassmatesSettings } from "./settings";
import styles from "./styles.css?inline";

export default defineLazyPlugin({
  id: "timetable-classmates",
  name: "Timetable Classmates",
  description: "Show opted-in classmates on your timetable via private sync",
  version: "1.0.0",
  settings: timetableClassmatesSettings,
  defaultEnabled: false,
  styles,
  loader: () => import("./index"),
});
