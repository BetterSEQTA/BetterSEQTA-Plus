import { settingsState } from "./listeners/SettingsState";
import hideSensitiveContent from "@/seqta/ui/dev/hideSensitiveContent";

function maybeHide() {
  if (settingsState.hideSensitiveContent) {
    hideSensitiveContent();
  }
}

export function initializeHideSensitiveToggle() {
  maybeHide();
  window.addEventListener("hashchange", maybeHide);
  settingsState.register("hideSensitiveContent", (val) => {
    if (val) {
      maybeHide();
    }
  });
}
