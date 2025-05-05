import type { Plugin } from "../../core/types";

interface NotificationCollectorStorage {
  lastNotificationCount: number;
  lastCheckedTime: string;
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

    // Store last notification count in storage
    if (!api.storage.lastNotificationCount) {
      api.storage.lastNotificationCount = 0;
    }

    const checkNotifications = async () => {
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

        if (alertDiv) {
          alertDiv.textContent = notificationCount.toString();
        } else {
          console.info("[BetterSEQTA+] No notifications currently");
        }
      } catch (error) {
        console.error("[BetterSEQTA+] Error fetching notifications:", error);
      }
    };

    const startPolling = () => {
      if (pollInterval) return; // Already polling
      checkNotifications();
      pollInterval = window.setInterval(checkNotifications, 30000);
    };

    const stopPolling = () => {
      if (pollInterval) {
        window.clearInterval(pollInterval);
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

    api.seqta.onMount("[class*='notifications__bubble___']", (_) => {
      startPolling();
    });

    return () => {
      stopPolling();
    };
  },
};

export default notificationCollectorPlugin;
