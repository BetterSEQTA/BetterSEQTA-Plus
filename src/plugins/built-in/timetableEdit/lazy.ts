import { defineLazyPlugin } from "../../core/dynamicLoader";
import styles from "./styles.css?inline";

export default defineLazyPlugin({
  id: "timetableEdit",
  name: "Edit Rooms & Teachers",
  description: "Edit room and teacher names in timetable classes",
  version: "1.0.0",
  settings: {},
  disableToggle: true,
  defaultEnabled: true,
  styles,
  loader: () => import("./index"),
});
