// Importing necessary types and utility functions
import type {
  EventsAPI,
  Plugin,
  PluginAPI,
  PluginSettings,
  SEQTAAPI,
  SettingsAPI,
  SettingValue,
  StorageAPI,
} from "./types";
import { eventManager } from "@/seqta/utils/listeners/EventManager";
import ReactFiber from "@/seqta/utils/ReactFiber";
import browser from "webextension-polyfill";

// Function to create and return the SEQTA API
function createSEQTAAPI(): SEQTAAPI {
  return {
    // Registers a callback to be called when an element matching the selector is added to the DOM
    onMount: (selector, callback) => {
      return eventManager.register(
        `${selector}Added`,
        {
          customCheck: (element) => element.matches(selector),
        },
        callback,
      );
    },
    // Finds a React fiber node that matches the selector
    getFiber: (selector) => {
      return ReactFiber.find(selector);
    },
    // Retrieves the current page from the URL
    getCurrentPage: () => {
      const path = window.location.hash.split("?page=/")[1] || "";
      return path.split("/")[0];
    },
    // Registers a callback to be called when the page changes (based on the URL hash)
    onPageChange: (callback) => {
      const handler = () => {
        const page = window.location.hash.split("?page=/")[1] || "";
        callback(page.split("/")[0]);
      };

      // Add event listener for page changes
      window.addEventListener("hashchange", handler);

      // Return an unregister function to remove the event listener
      return {
        unregister: () => {
          window.removeEventListener("hashchange", handler);
        },
      };
    },
  };
}

// Function to create and return the settings API for a plugin
function createSettingsAPI<T extends PluginSettings>(
  plugin: Plugin<T>,
): SettingsAPI<T> & { loaded: Promise<void> } {
  const storageKey = `plugin.${plugin.id}.settings`;  // Storage key for plugin settings
  const listeners = new Map<keyof T, Set<(value: any) => void>>(); // Listeners for settings changes

  // Initialize settings with default values
  const settingsWithMeta: any = {
    onChange: <K extends keyof T>(
      key: K,
      callback: (value: SettingValue<T[K]>) => void,
    ) => {
      if (!listeners.has(key)) {
        listeners.set(key, new Set());
      }
      listeners.get(key)!.add(callback);
      return {
        unregister: () => {
          listeners.get(key)!.delete(callback);
        },
      };
    },
    offChange: <K extends keyof T>(
      key: K,
      callback: (value: SettingValue<T[K]>) => void,
    ) => {
      listeners.get(key)?.delete(callback);
    },
    loaded: Promise.resolve(), // will be replaced below
  };

  // Initialize with default settings
  for (const key in plugin.settings) {
    settingsWithMeta[key] = plugin.settings[key].default;
  }

  // Load stored settings and override defaults
  const loaded = (async () => {
    try {
      const stored = await browser.storage.local.get(storageKey);
      const storedSettings = stored[storageKey] as Partial<
        Record<keyof T, any>
      >;
      if (storedSettings) {
        for (const key in storedSettings) {
          if (key in settingsWithMeta) {
            settingsWithMeta[key] = storedSettings[key];
            listeners
              .get(key as keyof T)
              ?.forEach((cb) => cb(storedSettings[key]));
          }
        }
      }
    } catch (error) {
      console.error(
        `[BetterSEQTA+] Error loading settings for plugin ${plugin.id}:`,
        error,
      );
    }
  })();

  settingsWithMeta.loaded = loaded;

  // Listen for storage changes and update settingsWithMeta
  const handleStorageChange = (
    changes: { [key: string]: browser.Storage.StorageChange },
    area: string,
  ) => {
    if (area !== "local" || !(storageKey in changes)) return;

    const newValue = changes[storageKey].newValue as
      | Partial<Record<keyof T, any>>
      | undefined;
    if (!newValue) return;

    for (const key in newValue) {
      const typedKey = key as keyof T;
      settingsWithMeta[typedKey] = newValue[typedKey];
      listeners.get(typedKey)?.forEach((cb) => cb(newValue[typedKey]));
    }
  };

  browser.storage.onChanged.addListener(handleStorageChange);

  // Return a proxy to handle direct access to settings and syncing with storage
  const proxy = new Proxy(settingsWithMeta, {
    get(target, prop) {
      return target[prop];
    },
    set(target, prop, value) {
      if (["onChange", "offChange", "loaded"].includes(prop as string))
        return false;

      target[prop] = value;

      // Prepare data for storage (excluding metadata methods)
      const dataToStore: any = {};
      for (const key in plugin.settings) {
        dataToStore[key] = target[key];
      }

      // Save updated settings to storage
      browser.storage.local.set({ [storageKey]: dataToStore });

      listeners.get(prop as keyof T)?.forEach((cb) => cb(value));
      return true;
    },
  }) as SettingsAPI<T> & { loaded: Promise<void> };

  return proxy;
}

// Function to create and return the storage API for a plugin
function createStorageAPI<T = any>(
  pluginId: string,
): StorageAPI<T> & { [K in keyof T]: T[K] } {
  const prefix = `plugin.${pluginId}.storage.`;  // Prefix for storage keys
  const cache: Record<string, any> = {}; // In-memory cache of stored data
  const listeners = new Map<string, Set<(value: any) => void>>(); // Listeners for storage changes
  const storageListeners = new Set<
    (changes: { [key: string]: any }, area: string) => void
  >();

  // Load existing storage values into cache
  const loadStoragePromise = (async () => {
    try {
      const allStorage = await browser.storage.local.get(null);

      // Filter for plugin-specific keys and populate cache
      Object.entries(allStorage).forEach(([key, value]) => {
        if (key.startsWith(prefix)) {
          const shortKey = key.slice(prefix.length);
          cache[shortKey] = value;
        }
      });
    } catch (error) {
      console.error(
        `[BetterSEQTA+] Error loading storage for plugin ${pluginId}:`,
        error,
      );
    }
  })();

  // Listen for changes to storage
  const handleStorageChange = (
    changes: { [key: string]: any },
    area: string,
  ) => {
    if (area === "local") {
      Object.entries(changes).forEach(([key, change]) => {
        if (key.startsWith(prefix)) {
          const shortKey = key.slice(prefix.length);
          cache[shortKey] = change.newValue;

          // Notify listeners of the updated value
          listeners
            .get(shortKey)
            ?.forEach((callback) => callback(change.newValue));
        }
      });
    }
  };
  browser.storage.onChanged.addListener(handleStorageChange);
  storageListeners.add(handleStorageChange);

  // Return a proxy for direct access to storage values and syncing with browser storage
  return new Proxy(cache, {
    get(target, prop: string) {
      if (prop === "onChange") {
        return (key: keyof T, callback: (value: T[keyof T]) => void) => {
          if (!listeners.has(key as string)) {
            listeners.set(key as string, new Set());
          }
          listeners.get(key as string)!.add(callback);
          return {
            unregister: () => {
              listeners.get(key as string)?.delete(callback);
            },
          };
        };
      }
      if (prop === "offChange") {
        return (key: keyof T, callback: (value: T[keyof T]) => void) => {
          listeners.get(key as string)?.delete(callback);
        };
      }
      if (prop === "loaded") {
        return loadStoragePromise;
      }

      // Return the value from cache for direct property access
      return target[prop];
    },
    set(target, prop: string, value: any) {
      if (["onChange", "offChange", "loaded"].includes(prop)) {
        return false;
      }

      // Update cache and store in browser storage
      target[prop] = value;
      browser.storage.local.set({ [prefix + prop]: value });

      // Notify listeners of the updated value
      listeners.get(prop)?.forEach((callback) => callback(value));

      return true;
    },
  }) as StorageAPI<T> & { [K in keyof T]: T[K] };
}

// Function to create and return the events API for a plugin
function createEventsAPI(pluginId: string): EventsAPI {
  const prefix = `plugin.${pluginId}.`;  // Prefix for event names
  const eventListeners = new Map<
    string,
    Set<{ callback: (...args: any[]) => void; listener: EventListener }>
  >();

  return {
    // Register an event listener for a custom event
    on: (event, callback) => {
      const fullEventName = prefix + event;
      const listener = ((e: CustomEvent) => {
        callback(...(e.detail || []));
      }) as EventListener;

      document.addEventListener(fullEventName, listener);

      // Store the listener for potential removal later
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event)!.add({ callback, listener });

      return {
        unregister: () => {
          document.removeEventListener(fullEventName, listener);
          eventListeners.get(event)?.delete({ callback, listener });
        },
      };
    },
    // Emit a custom event with specified arguments
    emit: (event, ...args) => {
      document.dispatchEvent(
        new CustomEvent(prefix + event, {
          detail: args.length > 0 ? args : null,
        }),
      );
    },
  };
}

// Function to create and return the plugin API
export function createPluginAPI<T extends PluginSettings, S = any>(
  plugin: Plugin<T, S>,
): PluginAPI<T, S> {
  return {
    seqta: createSEQTAAPI(), // SEQTA API
    settings: createSettingsAPI(plugin), // Settings API
    storage: createStorageAPI<S>(plugin.id), // Storage API
    events: createEventsAPI(plugin.id), // Events API
  };
}
