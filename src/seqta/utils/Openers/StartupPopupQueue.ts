import { settingsState } from "../listeners/SettingsState";
import { OpenWhatsNewPopup } from "./OpenWhatsNewPopup";
import {
  shouldShowEngageParentsAnnouncement,
  showEngageParentsToast,
} from "./OpenEngageParentsAnnouncement";

type QueueStep = (goNext: () => void) => void;

/**
 * Runs startup modals in order: What's New (if the extension just updated),
 * then shows the SEQTA Engage toast (once, non-blocking).
 */
export function runStartupPopupQueue() {
  const steps: QueueStep[] = [];

  if (settingsState.justupdated) {
    steps.push((goNext) => OpenWhatsNewPopup(goNext));
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
