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
import {
  shouldShowBsCloudAutoSyncAnnouncement,
  showBsCloudAutoSyncAnnouncement,
} from "./OpenBsCloudAutoSyncAnnouncement";

type QueueStep = (goNext: () => void) => void;

/**
 * Runs startup modals in order: What's New (if the extension just updated),
 * privacy statement (if required), SEQTA Engage announcement (once), then BS Cloud
 * auto-sync (once, last).
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

  if (shouldShowBsCloudAutoSyncAnnouncement()) {
    steps.push((goNext) => showBsCloudAutoSyncAnnouncement(goNext));
  }

  function runNext() {
    const step = steps.shift();
    if (step) step(runNext);
  }

  runNext();
}
