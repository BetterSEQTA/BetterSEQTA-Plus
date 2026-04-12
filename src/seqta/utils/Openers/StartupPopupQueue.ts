import { settingsState } from "../listeners/SettingsState";
import { OpenWhatsNewPopup } from "./OpenWhatsNewPopup";
import {
  shouldShowPrivacyNotification,
  showPrivacyNotification,
} from "./OpenPrivacyNotification";
import {
  shouldShowEngageParentsAnnouncement,
  showEngageParentsAnnouncement,
} from "./OpenEngageParentsAnnouncement";

type QueueStep = (goNext: () => void) => void;

/**
 * Runs startup modals in order: What's New (if the extension just updated),
 * privacy statement (if required), then the SEQTA Engage announcement (once).
 */
export function runStartupPopupQueue() {
  const steps: QueueStep[] = [];

  if (settingsState.justupdated) {
    steps.push((goNext) => OpenWhatsNewPopup(goNext));
  }

  if (shouldShowPrivacyNotification()) {
    steps.push((goNext) => showPrivacyNotification(goNext));
  }

  if (shouldShowEngageParentsAnnouncement()) {
    steps.push((goNext) => showEngageParentsAnnouncement(goNext));
  }

  function runNext() {
    const step = steps.shift();
    if (step) step(runNext);
  }

  runNext();
}
