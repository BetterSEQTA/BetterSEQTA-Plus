import type { Plugin } from "../../core/types";

interface NotificationCollectorStorage {
  lastNotificationCount: number;
  lastCheckedTime: string;
  consecutiveErrors: number;
}

const notificationCollectorPlugin: Plugin<{}, NotificationCollectorStorage> = {
  id: "notificationCollector",
  name: "Notification Collector",
  description: "Collects and displays SEQTA notifications",
  version: "1.0.0",
  settings: {},
  disableToggle: true,

  run: async (api) => {
    let pollInterval: number | null = null;
    let isVisible = !document.hidden;
    let baseInterval = 30000; // 30 seconds
    const maxInterval = 300000; // 5 minutes max

    // Store last notification count in storage
    if (!api.storage.lastNotificationCount) {
      api.storage.lastNotificationCount = 0;
    }
    if (!api.storage.consecutiveErrors) {
      api.storage.consecutiveErrors = 0;
    }

    const checkNotifications = async () => {
      // Skip if tab is not visible to save battery
      if (!isVisible) {
        return;
      }

      try {
        const alertDiv = document.querySelector(
          "[class*='notifications__bubble___']",
        ) as HTMLElement;

        if (api.storage.lastNotificationCount !== 0) {
          alertDiv.textContent = api.storage.lastNotificationCount.toString();
        }

        const response = await fetch(
          `${location.origin}/seqta/student/heartbeat?`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
              timestamp: "1970-01-01 00:00:00.0",
              hash: "#?page=/home",
            }),
          },
        );

        const data = await response.json();

        // Store notification count for history
        const notificationCount = data.payload.notifications.length;
        api.storage.lastNotificationCount = notificationCount;
        api.storage.lastCheckedTime = new Date().toISOString();
        
        // Reset error count on success
        api.storage.consecutiveErrors = 0;

        if (alertDiv) {
          alertDiv.textContent = notificationCount.toString();
        } else {
          console.info("[BetterSEQTA+] No notifications currently");
        }
      } catch (error) {
        console.error("[BetterSEQTA+] Error fetching notifications:", error);
        api.storage.consecutiveErrors = (api.storage.consecutiveErrors || 0) + 1;
      }
    };

    const getNextInterval = () => {
      // Exponential backoff on errors, max 5 minutes
      const errorMultiplier = Math.min(Math.pow(2, api.storage.consecutiveErrors || 0), 10);
      return Math.min(baseInterval * errorMultiplier, maxInterval);
    };

    const startPolling = () => {
      if (pollInterval) return; // Already polling
      checkNotifications();
      
      const scheduleNext = () => {
        const interval = getNextInterval();
        pollInterval = window.setTimeout(() => {
          checkNotifications().then(() => {
            if (pollInterval) { // Only continue if not stopped
              scheduleNext();
            }
          });
        }, interval);
      };
      
      scheduleNext();
    };

    const stopPolling = () => {
      if (pollInterval) {
        window.clearTimeout(pollInterval);
        pollInterval = null;
        const alertDiv = document.querySelector(
          "[class*='notifications__bubble___']",
        ) as HTMLElement;
        if (alertDiv) {
          if (api.storage.lastNotificationCount > 9) {
            alertDiv.textContent = "9+";
          } else {
            alertDiv.textContent = api.storage.lastNotificationCount.toString();
          }
        }
      }
    };

    // Listen for visibility changes to pause/resume polling
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible && !pollInterval) {
        // Resume polling when tab becomes visible
        const alertDiv = document.querySelector("[class*='notifications__bubble___']");
        if (alertDiv) {
          startPolling();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    api.seqta.onMount("[class*='notifications__bubble___']", (_) => {
      startPolling();
    });

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  },
};

export default notificationCollectorPlugin;
