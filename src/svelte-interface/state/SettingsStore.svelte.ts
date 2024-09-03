import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import type { SettingsState } from '@/types/storage';

export function createSettingsState() {
  let settings = $state<SettingsState>(settingsState);

  const subscribers = new Set<(value: SettingsState) => void>();

  // Register a global listener to notify subscribers on any change
  settingsState.registerGlobal((newValue, oldValue, key) => {
    console.log('Global listener triggered:', { newValue, oldValue, key });
    if (newValue !== undefined) {
      settings = { ...settings, [key]: newValue };
      notifySubscribers(settings);
    }
  });

  function notifySubscribers(newValue: SettingsState) {
    console.log('Notifying subscribers with:', newValue);
    subscribers.forEach(subscriber => subscriber(newValue));
  }

  return {
    get settings() { return settings; },
    set(newSettings: SettingsState) {
      settings = newSettings;
      notifySubscribers(settings);
    },
    setKey<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
      settings[key] = value;
      settingsState.setKey(key, value);
      notifySubscribers(settings);
    },
    subscribe(callback: (value: SettingsState) => void) {
      subscribers.add(callback);
      // Immediately call the callback with the current value
      callback(settings);
      
      // Return an unsubscribe function
      return () => {
        subscribers.delete(callback);
      };
    }
  };
}