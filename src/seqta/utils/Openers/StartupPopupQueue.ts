import { settingsState } from "../listeners/SettingsState";
import { OpenWhatsNewPopup } from "./OpenWhatsNewPopup";
import {
  shouldShowEngageParentsAnnouncement,
  showEngageParentsToast,
} from "./OpenEngageParentsAnnouncement";
import {
  fetchThemeOfTheMonth,
  OpenThemeOfTheMonthPopup,
  shouldShowThemeOfTheMonth,
} from "./OpenThemeOfTheMonthPopup";
import { syncApiBaseToBackground } from "../DevApiBase";

type QueueStep = (goNext: () => void) => void;

/**
 * Runs startup modals in order: What's New (if the extension just updated),
 * Theme of the Month (when a new monthly entry hasn't been seen), then shows
 * the SEQTA Engage toast (once, non-blocking).
 */
export async function runStartupPopupQueue() {
  // Make sure the background script knows about any dev-mode API override
  // before we start firing requests.
  syncApiBaseToBackground();

  const steps: QueueStep[] = [];

  if (settingsState.justupdated) {
    steps.push((goNext) => OpenWhatsNewPopup(goNext));
  }

  // Fetch the Theme of the Month before queueing so we don't show an empty
  // popup if the network or server is unavailable.
  const themeOfTheMonth = await fetchThemeOfTheMonth();
  if (shouldShowThemeOfTheMonth(themeOfTheMonth)) {
    steps.push((goNext) => {
      void OpenThemeOfTheMonthPopup(themeOfTheMonth!, goNext);
    });
  }

  function runNext() {
    const step = steps.shift();
    if (step) step(runNext);
    else {
      if (shouldShowEngageParentsAnnouncement()) {
        showEngageParentsToast();
      }
    }
  }

  runNext();
}
