import type { Plugin, PluginSettings } from '../../core/types';

interface NotificationCollectorSettings extends PluginSettings {
  enabled: {
    type: 'boolean';
    default: boolean;
    title: string;
    description: string;
  };
}

const notificationCollectorPlugin: Plugin<NotificationCollectorSettings> = {
  id: 'notificationCollector',
  name: 'Notification Collector',
  description: 'Collects and displays SEQTA notifications',
  version: '1.0.0',
  settings: {
    enabled: {
      type: 'boolean',
      default: true,
      title: 'Notification Collector',
      description: 'Uncaps the 9+ limit for notifications, showing the real number.',
    }
  },

  run: async (api) => {
    let pollInterval: number | null = null;

    const checkNotifications = async () => {
      try {
        const response = await fetch(`${location.origin}/seqta/student/heartbeat?`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({
            timestamp: "1970-01-01 00:00:00.0",
            hash: "#?page=/home",
          })
        });

        const data = await response.json();
        const alertDiv = document.querySelector(".notifications__bubble___1EkSQ") as HTMLElement;
        
        if (alertDiv) {
          alertDiv.textContent = data.payload.notifications.length.toString();
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
        const alertDiv = document.querySelector(".notifications__bubble___1EkSQ") as HTMLElement;
        if (alertDiv) {
          alertDiv.textContent = "9+";
        }
      }
    };

    if (api.settings.enabled) {
      api.seqta.onMount(".notifications__bubble___1EkSQ", (_) => {
        startPolling();
      });
    }

    const enabledCallback = (enabled: boolean) => {
      if (enabled) {
        startPolling();
      } else {
        stopPolling();
      }
    };

    api.settings.onChange('enabled', enabledCallback);

    return () => {
      stopPolling();
      api.settings.offChange('enabled', enabledCallback);
    };
  }
};

export default notificationCollectorPlugin;