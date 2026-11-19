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
import { eventManager } from "@/seqta/utils/listeners/eventManager";
import ReactFiber from "@/seqta/utils/ReactFiber";
import browser from "@/lib/browser";
import { settingsState } from "@/seqta/utils/listeners/settingsState";
import type { SettingsState } from "@/types/storage";

function createSEQTAAPI(): SEQTAAPI {
  return {
    onMount: (selector, callback) => {
      return eventManager.register(
        `${selector}Added`,
        {
          selector,
          customCheck: (element) => element.matches(selector),
        },
        callback,
      );
    },
    getFiber: (selector) => {
      return ReactFiber.find(selector);
    },
    getCurrentPage: () => {
      const path = window.location.hash.split("?page=/")[1] || "";
      return path.split("/")[0];
    },
    onPageChange: (callback) => {
      const handler = () => {
        const page = window.location.hash.split("?page=/")[1] || "";
        callback(page.split("/")[0]);
      };

      window.addEventListener("hashchange", handler);

      return {
        unregister: () => {
          window.removeEventListener("hashchange", handler);
        },
      };
    },
  };
}

function createSettingsAPI<T extends PluginSettings>(
  plugin: Pick<Plugin<T>, "id" | "settings" | "disableToggle">,
): {
  settings: SettingsAPI<T> & { loaded: Promise<void> };
  dispose: () => void;
} {
  const storageKey = `plugin.${plugin.id}.settings`;
  const listeners = new Map<keyof T, Set<(value: SettingValue<T[keyof T]>) => void>>();

  const backing: Record<string, unknown> = {
    onChange: <K extends keyof T>(key: K, callback: (value: SettingValue<T[K]>) => void) => {
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
    offChange: <K extends keyof T>(key: K, callback: (value: SettingValue<T[K]>) => void) => {
      listeners.get(key)?.delete(callback);
    },
    loaded: Promise.resolve(),
  };

  for (const key in plugin.settings) {
    if (plugin.settings[key].type !== "component" && plugin.settings[key].type !== "button") {
      backing[key] = plugin.settings[key].default;
    }
  }

  const loaded = (async () => {
    try {
      const allSettings = settingsState.getAll() as unknown as Record<string, unknown>;
      const storedSettings = allSettings[storageKey] as Partial<
        Record<keyof T, SettingValue<T[keyof T]>>
      >;
      if (storedSettings) {
        for (const key in storedSettings) {
          if (!(key in backing)) continue;
          const value = storedSettings[key as keyof T];
          if (value === undefined) continue;
          backing[key] = value;
          listeners.get(key as keyof T)?.forEach((cb) => cb(value));
        }
      }
    } catch (error) {
      console.error("[BetterSEQTA+] Error loading settings for plugin:", plugin.id, error);
    }
  })();

  backing.loaded = loaded;

  const handleSettingsChange = (newValue: unknown) => {
    if (!newValue || typeof newValue !== "object") return;

    const newSettings = newValue as Partial<Record<keyof T, SettingValue<T[keyof T]>>>;
    for (const key in newSettings) {
      const typedKey = key as keyof T;
      const value = newSettings[typedKey];
      if (value === undefined) continue;
      backing[key] = value;
      listeners.get(typedKey)?.forEach((cb) => cb(value));
    }
  };

  settingsState.register(storageKey as keyof SettingsState, handleSettingsChange);

  const dispose = () => {
    settingsState.unregister(storageKey as keyof SettingsState, handleSettingsChange);
  };

  const proxy = new Proxy(backing, {
    get(target, prop) {
      if (typeof prop === "symbol") return undefined;
      return target[prop as string];
    },
    set(target, prop, value) {
      if (typeof prop === "symbol") return false;
      const key = prop as string;
      if (["onChange", "offChange", "loaded"].includes(key)) return false;

      target[key] = value;

      const dataToStore: Record<string, unknown> = {};
      for (const settingKey in plugin.settings) {
        dataToStore[settingKey] = target[settingKey];
      }

      if (plugin.disableToggle) {
        const allSettings = settingsState.getAll() as Record<string, unknown>;
        const existing = allSettings[storageKey] as { enabled?: boolean } | undefined;
        if (existing?.enabled !== undefined) {
          dataToStore.enabled = existing.enabled;
        }
      }

      browser.storage.local.set({ [storageKey]: dataToStore });

      listeners.get(key as keyof T)?.forEach((cb) => cb(value as SettingValue<T[keyof T]>));
      return true;
    },
  }) as SettingsAPI<T> & { loaded: Promise<void> };

  return { settings: proxy, dispose };
}

function createStorageAPI<T extends Record<string, unknown> = Record<string, unknown>>(
  pluginId: string,
): {
  storage: StorageAPI<T> & { [K in keyof T]: T[K] };
  dispose: () => void;
} {
  const prefix = `plugin.${pluginId}.storage.`;
  const cache: Record<string, unknown> = {};
  const listeners = new Map<string, Set<(value: unknown) => void>>();

  // Load all existing storage values for this plugin
  const loadStoragePromise = (async () => {
    try {
      const allStorage = settingsState.getAll();

      // Filter for this plugin's storage keys and populate cache
      Object.entries(allStorage).forEach(([key, value]) => {
        if (key.startsWith(prefix)) {
          const shortKey = key.slice(prefix.length);
          cache[shortKey] = value;
        }
      });
    } catch (error) {
      console.error("[BetterSEQTA+] Error loading storage for plugin:", pluginId, error);
    }
  })();

  const handleStorageChange = (newValue: unknown, _oldValue: unknown, key: string) => {
    if (!key.startsWith(prefix)) return;

    const shortKey = key.slice(prefix.length);
    cache[shortKey] = newValue;
    listeners.get(shortKey)?.forEach((callback) => callback(newValue));
  };

  settingsState.registerGlobal(handleStorageChange);

  const dispose = () => {
    settingsState.unregisterGlobal(handleStorageChange);
  };

  // Create the proxy for direct property access
  const storage = new Proxy(cache, {
    get(target, prop: string) {
      if (prop === "onChange") {
        return (key: keyof T, callback: (value: T[keyof T]) => void) => {
          if (!listeners.has(key as string)) {
            listeners.set(key as string, new Set());
          }
          listeners.get(key as string)!.add(callback as (value: unknown) => void);
          return {
            unregister: () => {
              listeners.get(key as string)?.delete(callback as (value: unknown) => void);
            },
          };
        };
      }
      if (prop === "offChange") {
        return (key: keyof T, callback: (value: T[keyof T]) => void) => {
          listeners.get(key as string)?.delete(callback as (value: unknown) => void);
        };
      }
      if (prop === "loaded") {
        return loadStoragePromise;
      }

      return target[prop];
    },
    set(target, prop: string, value: unknown) {
      if (["onChange", "offChange", "loaded"].includes(prop)) {
        return false;
      }

      // Update cache and store in browser storage
      target[prop] = value;
      browser.storage.local.set({ [prefix + prop]: value });

      listeners.get(prop)?.forEach((callback) => callback(value));

      return true;
    },
  }) as StorageAPI<T> & { [K in keyof T]: T[K] };

  return { storage, dispose };
}

function createEventsAPI(pluginId: string): EventsAPI {
  const prefix = `plugin.${pluginId}.`;
  const eventListeners = new Map<
    string,
    Set<{ callback: (...args: unknown[]) => void; listener: EventListener }>
  >();

  return {
    on: (event, callback) => {
      const fullEventName = prefix + event;
      const listener = ((e: CustomEvent) => {
        callback(...(e.detail || []));
      }) as EventListener;

      document.addEventListener(fullEventName, listener);

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
    emit: (event, ...args) => {
      document.dispatchEvent(
        new CustomEvent(prefix + event, {
          detail: args.length > 0 ? args : null,
        }),
      );
    },
  };
}

export function createPluginAPI<
  T extends PluginSettings,
  S extends Record<string, unknown> = Record<string, unknown>,
>(plugin: Plugin<T, S>): PluginAPI<T, S> {
  const { settings, dispose: disposeSettings } = createSettingsAPI(plugin);
  const { storage, dispose: disposeStorage } = createStorageAPI<S>(plugin.id);

  return {
    seqta: createSEQTAAPI(),
    settings,
    storage,
    events: createEventsAPI(plugin.id),
    dispose: () => {
      disposeSettings();
      disposeStorage();
    },
  };
}
