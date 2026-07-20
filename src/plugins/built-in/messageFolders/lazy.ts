import { defineLazyPlugin } from "../../core/dynamicLoader";
import { booleanSetting, defineSettings } from "../../core/settingsHelpers";
import styles from "./styles.css?inline";

const settings = defineSettings({
  showTagsInAllMessages: booleanSetting({
    default: true,
    title: "Show folder tags in All Messages",
    description:
      "When off, folder tags are not shown on the message list until you select a folder.",
  }),
  hideFolderedMessagesInAll: booleanSetting({
    default: true,
    title: "Hide foldered messages in All Messages",
    description:
      "When on, messages assigned to a custom folder are hidden from the inbox until you open that folder.",
  }),
});

export default defineLazyPlugin({
  id: "messageFolders",
  name: "Message Folders",
  description: "Organize direct messages into custom folders",
  version: "2.0.0",
  settings,
  disableToggle: true,
  defaultEnabled: true,
  styles,
  loader: () => import("./index"),
});
