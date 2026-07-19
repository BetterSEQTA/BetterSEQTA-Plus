import type { Plugin } from "../../core/types";
import { booleanSetting } from "@/plugins/core/settingsHelpers";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import { verboseInfo } from "@/utils/verboseLog";
import {
  type ArchivesByUser,
  fetchAllNotifications,
  mergeNotificationsIntoArchive,
  resolveNotificationUserKey,
} from "./archive";
import {
  injectArchivedForUser,
  mountArchivedNotificationInjection,
} from "./injectArchivedNotifications";
import styles from "./styles.css?inline";

const BUBBLE_SELECTOR = "[class*='notifications__bubble___']";
const LIST_SELECTOR = '[class*="notifications__list___"]';

const notificationCollectorSettings = {
  saveLocally: booleanSetting({
    default: true,
    title: "Save notification history locally",
    description:
      "Saves notifications per account in extension storage and restores missing ones into the SEQTA list",
  }),
} as const;

interface NotificationCollectorStorage {
  lastNotificationCount: number;
  lastCheckedTime: string;
  consecutiveErrors: number;
  archivesByUser: ArchivesByUser;
}

const notificationCollectorPlugin: Plugin<
  typeof notificationCollectorSettings,
  NotificationCollectorStorage
> = {
  id: "notificationCollector",
  name: "Notification Collector",
  description:
    "Tracks notifications and saves a local per-account archive that outlasts SEQTA's server retention",
  version: "1.2.0",
  settings: notificationCollectorSettings,
  disableToggle: true,

  run: async (api) => {
    if (isSeqtaEngageExperience()) {
      return () => {};
    }

    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    await api.storage.loaded;
    await api.settings.loaded;

    let pollInterval: number | null = null;
    let isVisible = !document.hidden;
    let archiveSyncInFlight = false;
    const baseInterval = 30000;
    const maxInterval = 300000;

    api.storage.lastNotificationCount ||= 0;
    api.storage.consecutiveErrors ||= 0;
    api.storage.archivesByUser ||= {};

    const syncArchive = async () => {
      if (!api.settings.saveLocally || archiveSyncInFlight) return;

      archiveSyncInFlight = true;
      try {
        const userKey = await resolveNotificationUserKey();
        if (!userKey) return;

        const notifications = await fetchAllNotifications();
        const archivesByUser = { ...(api.storage.archivesByUser ?? {}) };
        const existing = archivesByUser[userKey] ?? {};
        const { archive: merged, changed } = mergeNotificationsIntoArchive(
          existing,
          notifications,
        );

        if (changed) {
          archivesByUser[userKey] = merged;
          api.storage.archivesByUser = archivesByUser;
        } else if (document.querySelector(LIST_SELECTOR)) {
          await injectArchivedForUser(merged);
        }
      } catch (error) {
        console.warn("[BetterSEQTA+] Notification archive sync failed:", error);
      } finally {
        archiveSyncInFlight = false;
      }
    };

    const checkNotifications = async () => {
      if (!isVisible) return;

      try {
        const alertDiv = document.querySelector(BUBBLE_SELECTOR) as HTMLElement;

        if (alertDiv && api.storage.lastNotificationCount !== 0) {
          alertDiv.textContent = api.storage.lastNotificationCount.toString();
        }

        const notifications = await fetchAllNotifications();
        const notificationCount = notifications.length;

        api.storage.lastNotificationCount = notificationCount;
        api.storage.lastCheckedTime = new Date().toISOString();
        api.storage.consecutiveErrors = 0;

        if (api.settings.saveLocally) {
          await syncArchive();
        }

        if (alertDiv) {
          alertDiv.textContent = notificationCount.toString();
        } else {
          verboseInfo("[BetterSEQTA+] No notifications currently");
        }
      } catch (error) {
        console.error("[BetterSEQTA+] Error fetching notifications:", error);
        api.storage.consecutiveErrors =
          (api.storage.consecutiveErrors || 0) + 1;
      }
    };

    const getNextInterval = () => {
      const errorMultiplier = Math.min(
        Math.pow(2, api.storage.consecutiveErrors || 0),
        10,
      );
      return Math.min(baseInterval * errorMultiplier, maxInterval);
    };

    const startPolling = () => {
      if (pollInterval) return;
      checkNotifications();

      const scheduleNext = () => {
        const interval = getNextInterval();
        pollInterval = window.setTimeout(() => {
          checkNotifications().then(() => {
            if (pollInterval) scheduleNext();
          });
        }, interval);
      };

      scheduleNext();
    };

    const stopPolling = () => {
      if (pollInterval) {
        window.clearTimeout(pollInterval);
        pollInterval = null;
        const alertDiv = document.querySelector(BUBBLE_SELECTOR) as HTMLElement;
        if (alertDiv) {
          if (api.storage.lastNotificationCount > 9) {
            alertDiv.textContent = "9+";
          } else {
            alertDiv.textContent = api.storage.lastNotificationCount.toString();
          }
        }
      }
    };

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible && !pollInterval) {
        if (document.querySelector(BUBBLE_SELECTOR)) startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const pageChangeUnregister = api.seqta.onPageChange((page) => {
      if (page === "notifications" && api.settings.saveLocally) {
        void syncArchive();
      }
    });

    const teardownInjection = mountArchivedNotificationInjection(
      api,
      resolveNotificationUserKey,
    );

    const onBubbleMount = () => {
      startPolling();
      if (api.settings.saveLocally) void syncArchive();
    };
    const onListMount = () => {
      if (api.settings.saveLocally) void syncArchive();
    };

    api.seqta.onMount(BUBBLE_SELECTOR, onBubbleMount);
    api.seqta.onMount(LIST_SELECTOR, onListMount);

    return () => {
      stopPolling();
      teardownInjection();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      pageChangeUnregister.unregister();
      styleEl.remove();
    };
  },
};

export default notificationCollectorPlugin;
