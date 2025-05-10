import type { Plugin } from "../../core/types";

// Define the structure of the plugin's storage
interface NotificationCollectorStorage {
  lastNotificationCount: number; // Stores the number of notifications from the last check
  lastCheckedTime: string; // Timestamp of the last check
}

// Define the notification collector plugin
const notificationCollectorPlugin: Plugin<{}, NotificationCollectorStorage> = {
  id: "notificationCollector", // Unique identifier for the plugin
  name: "Notification Collector", // Display name for the plugin
  description: "Collects and displays SEQTA notifications", // Description of the plugin's purpose
  version: "1.0.0", // Version number
  settings: {}, // No configurable settings
  disableToggle: true, // Plugin cannot be toggled off by the user

  run: async (api) => {
    let pollInterval: number | null = null; // Used to store the interval ID for polling

    // Initialize storage if not already set
    if (!api.storage.lastNotificationCount) {
      api.storage.lastNotificationCount = 0;
    }

    // Function to check for new notifications
    const checkNotifications = async () => {
      try {
        // Attempt to select the notification bubble element
        const alertDiv = document.querySelector(
          "[class*='notifications__bubble___']",
        ) as HTMLElement;

        // If a previous count exists, display it
        if (api.storage.lastNotificationCount !== 0) {
          alertDiv.textContent = api.storage.lastNotificationCount.toString();
        }

        // Send a request to fetch current notifications
        const response = await fetch(
          `${location.origin}/seqta/student/heartbeat?`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
              timestamp: "1970-01-01 00:00:00.0", // Static timestamp for fetching
              hash: "#?page=/home", // Static hash parameter
            }),
          },
        );

        const data = await response.json();

        // Extract the number of notifications from the response
        const notificationCount = data.payload.notifications.length;

        // Update storage with the new count and timestamp
        api.storage.lastNotificationCount = notificationCount;
        api.storage.lastCheckedTime = new Date().toISOString();

        // Update the UI with the new notification count
        if (alertDiv) {
          alertDiv.textContent = notificationCount.toString();
        } else {
          console.info("[BetterSEQTA+] No notifications currently");
        }
      } catch (error) {
        console.error("[BetterSEQTA+] Error fetching notifications:", error);
      }
    };

    // Start polling the server for notifications every 30 seconds
    const startPolling = () => {
      if (pollInterval) return; // Avoid multiple intervals
      checkNotifications(); // Perform an initial check immediately
      pollInterval = window.setInterval(checkNotifications, 30000); // Set interval for subsequent checks
    };

    // Stop polling and update the UI with the latest known count
    const stopPolling = () => {
      if (pollInterval) {
        window.clearInterval(pollInterval); // Clear the interval
        pollInterval = null;
        const alertDiv = document.querySelector(
          "[class*='notifications__bubble___']",
        ) as HTMLElement;
        if (alertDiv) {
          if (api.storage.lastNotificationCount > 9) {
            alertDiv.textContent = "9+"; // Display "9+" if count exceeds 9
          } else {
            alertDiv.textContent = api.storage.lastNotificationCount.toString(); // Otherwise, show exact count
          }
        }
      }
    };

    // Begin polling when the notification bubble appears in the DOM
    api.seqta.onMount("[class*='notifications__bubble___']", (_) => {
      startPolling();
    });

    // Return a cleanup function to stop polling when the plugin is unloaded
    return () => {
      stopPolling();
    };
  },
};

export default notificationCollectorPlugin; // Export the plugin for use
