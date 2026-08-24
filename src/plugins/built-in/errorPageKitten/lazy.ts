import { defineLazyPlugin } from "../../core/dynamicLoader";
import styles from "./styles.css?inline";

export default defineLazyPlugin({
  id: "error-page-kitten",
  name: "Classic 404 Page",
  description: "Brings back SEQTA's old kitten 404 page",
  version: "1.0.0",
  settings: {},
  disableToggle: true,
  defaultEnabled: true,
  styles,
  loader: () => import("./index"),
});
