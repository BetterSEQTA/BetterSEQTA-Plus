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
import { settingsState } from "@/seqta/utils/listeners/SettingsState";

function createSEQTAAPI(): SEQTAAPI {
  return {
    onMount: (selector, callback) => {
      return eventManager.register(
        `${selector}Added`,
        {
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

      // Return an unregister function
      return {
        unregister: () => {
          window.removeEventListener("hashchange", handler);
        },
      };
    },
  };
}

/**
 * Creates a reactive and persistent settings store for a given plugin.
 * This store is a Svelte-like store, providing reactivity, persistence
 * via `browser.storage.local`, and default value handling.
 *
 * @template T - Represents the structure of the plugin's settings, extending `PluginSettings`.
 * @param {Plugin<T, any>} plugin The plugin instance for which the settings store is being created.
 *                                `plugin.id` is used for namespacing the settings in storage,
 *                                and `plugin.settings` provides the definitions and default values for each setting.
 * @returns {SettingsAPI<T> & { loaded: Promise<void> }} An object that functions as a Svelte store,
 *                                                       enhanced with specific methods for settings management.
 *                                                       The object includes:
 *    - Reactivity: Changes to settings can be subscribed to using Svelte's store subscription pattern
 *                  (though not explicitly a Svelte store, it behaves similarly for direct property access and updates).
 *                  The `onChange` method provides a more direct way to listen for specific key changes.
 *    - Persistence: Settings are automatically loaded from `browser.storage.local` when the store is created
 *                   and saved back whenever a setting is changed via the proxy's setter.
 *    - Default Values: Uses default values from the `plugin.settings` definition if no stored value exists for a setting.
 *    - `loaded`: A Promise that resolves when the settings have been successfully loaded from storage,
 *                allowing operations to be deferred until settings are ready.
 *    - Direct property access for getting values (e.g., `settingsStore.mySettingKey`).
 *    - Direct property assignment for setting values (e.g., `settingsStore.mySettingKey = newValue`), which also persists the change.
 *    - `onChange(key, callback)`: Method to listen for changes to a specific setting. (Note: The prompt mentioned `listen`, this is `onChange`).
 *                                 Returns an object with an `unregister` method.
 *    - `offChange(key, callback)`: Method to stop listening for changes to a specific setting.
 *    The following methods are not explicitly present on the returned proxy from `createSettingsAPI` but are typically
 *    expected in a full "Svelte store" settings manager. The current implementation relies on direct property
 *    manipulation for get/set, and re-initialization for reset-like behavior or would require external implementation
 *    of reset logic if needed:
 *    - `get(key)`: (Achieved by direct property access: `settingsStore.key`)
 *    - `set(key, value)`: (Achieved by direct property assignment: `settingsStore.key = value`)
 *    - `reset(key)`: (Would require manual re-application of `plugin.settings[key].default` and then setting it)
 *    - `resetAll()`: (Would require iterating through all `plugin.settings` and applying defaults, then setting them)
 */
function createSettingsAPI<T extends PluginSettings>(
  plugin: Plugin<T>,
): SettingsAPI<T> & { loaded: Promise<void> } {
  const storageKey = `plugin.${plugin.id}.settings`;
  const listeners = new Map<keyof T, Set<(value: any) => void>>();

  // Initialize with default values
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

  // Fill with defaults first
  for (const key in plugin.settings) {
    if (plugin.settings[key].type !== 'component' && plugin.settings[key].type !== 'button') {
      settingsWithMeta[key] = plugin.settings[key].default;
    }
  }

  // Load stored settings and override defaults
  const loaded = (async () => {
    try {
      const allSettings = settingsState.getAll() as unknown as Record<string, unknown>;
      const storedSettings = allSettings[storageKey] as Partial<Record<keyof T, any>>;
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

  const proxy = new Proxy(settingsWithMeta, {
    get(target, prop) {
      return target[prop];
    },
    set(target, prop, value) {
      if (["onChange", "offChange", "loaded"].includes(prop as string))
        return false;

      target[prop] = value;

      // Reconstruct just the data keys for storage (excluding metadata methods)
      const dataToStore: any = {};
      for (const key in plugin.settings) {
        dataToStore[key] = target[key];
      }

      browser.storage.local.set({ [storageKey]: dataToStore });

      listeners.get(prop as keyof T)?.forEach((cb) => cb(value));
      return true;
    },
  }) as SettingsAPI<T> & { loaded: Promise<void> };

  return proxy;
}

function createStorageAPI<T = any>(
  pluginId: string,
): StorageAPI<T> & { [K in keyof T]: T[K] } {
  const prefix = `plugin.${pluginId}.storage.`;
  const cache: Record<string, any> = {};
  const listeners = new Map<string, Set<(value: any) => void>>();
  const storageListeners = new Set<
    (changes: { [key: string]: any }, area: string) => void
  >();

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
      console.error(
        `[BetterSEQTA+] Error loading storage for plugin ${pluginId}:`,
        error,
      );
    }
  })();

  // Listen for storage changes
  const handleStorageChange = (
    changes: { [key: string]: any },
    area: string,
  ) => {
    if (area === "local") {
      Object.entries(changes).forEach(([key, change]) => {
        if (key.startsWith(prefix)) {
          const shortKey = key.slice(prefix.length);
          cache[shortKey] = change.newValue;

          // Notify listeners
          listeners
            .get(shortKey)
            ?.forEach((callback) => callback(change.newValue));
        }
      });
    }
  };
  browser.storage.onChanged.addListener(handleStorageChange);
  storageListeners.add(handleStorageChange);

  // Create the proxy for direct property access
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

      // Direct property access
      return target[prop];
    },
    set(target, prop: string, value: any) {
      if (["onChange", "offChange", "loaded"].includes(prop)) {
        return false;
      }

      // Update cache and store in browser storage
      target[prop] = value;
      browser.storage.local.set({ [prefix + prop]: value });

      // Notify listeners
      listeners.get(prop)?.forEach((callback) => callback(value));

      return true;
    },
  }) as StorageAPI<T> & { [K in keyof T]: T[K] };
}

function createEventsAPI(pluginId: string): EventsAPI {
  const prefix = `plugin.${pluginId}.`;
  const eventListeners = new Map<
    string,
    Set<{ callback: (...args: any[]) => void; listener: EventListener }>
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

/**
 * Creates and returns a tailored API object for a specific plugin.
 * This API object provides the plugin with various functionalities such as
 * managing settings, accessing namespaced storage, interacting with SEQTA-specific features,
 * and handling plugin-specific events.
 *
 * @template T - The type of the plugin's settings, extending `PluginSettings`.
 * @template S - The type of the data the plugin will store in its namespaced storage.
 * @param {Plugin<T, S>} plugin The plugin instance for which the API is being created.
 *                              The plugin's `id` and `name` are used internally by the API
 *                              for namespacing and identification but are accessed from the `plugin` object directly.
 * @returns {PluginAPI<T, S>} An API object containing the following key properties:
 *    - `seqta`: An API for interacting with SEQTA-specific functionalities, created by `createSEQTAAPI()`.
 *               This includes methods like `onMount` for DOM element appearance, `getFiber` for React component inspection,
 *               `getCurrentPage` for getting the current SEQTA page, and `onPageChange` for listening to page navigations.
 *    - `settings`: An API for managing plugin-specific settings, created by `createSettingsAPI(plugin)`.
 *                  It allows getting, setting, and listening to changes in the plugin's settings,
 *                  which are stored persistently and namespaced to the plugin. Includes a `loaded` promise.
 *    - `storage`: An API for providing namespaced storage for the plugin, created by `createStorageAPI<S>(plugin.id)`.
 *                 It allows the plugin to store and retrieve arbitrary data, namespaced to prevent conflicts
 *                 with other plugins or parts of the extension. Includes a `loaded` promise and `onChange` listeners.
 *    - `events`: An API for allowing the plugin to dispatch and listen for custom events within its own scope,
 *                created by `createEventsAPI(plugin.id)`. It provides `on(event, callback)` to listen for
 *                plugin-specific events and `emit(event, ...args)` to dispatch them. These events are namespaced
 *                to the plugin.
 */
export function createPluginAPI<T extends PluginSettings, S = any>(
  plugin: Plugin<T, S>,
): PluginAPI<T, S> {
  return {
    seqta: createSEQTAAPI(),
    settings: createSettingsAPI(plugin),
    storage: createStorageAPI<S>(plugin.id),
    events: createEventsAPI(plugin.id),
  };
}
