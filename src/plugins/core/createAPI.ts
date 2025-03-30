import type { EventsAPI, Plugin, PluginAPI, PluginSettings, SEQTAAPI, SettingsAPI, SettingValue, StorageAPI } from './types';
import { eventManager } from '@/seqta/utils/listeners/EventManager';
import ReactFiber from '@/seqta/utils/ReactFiber';
import browser from 'webextension-polyfill';

function createSEQTAAPI(): SEQTAAPI {
  return {
    onMount: (selector, callback) => {
      return eventManager.register(
        `${selector}Added`,
        {
          customCheck: (element) => element.matches(selector),
        },
        callback
      );
    },
    getFiber: (selector) => {
      return ReactFiber.find(selector);
    },
    getCurrentPage: () => {
      const path = window.location.hash.split('?page=/')[1] || '';
      return path.split('/')[0];
    },
    onPageChange: (callback) => {
      const handler = () => {
        const page = window.location.hash.split('?page=/')[1] || '';
        callback(page.split('/')[0]);
      };
    
      window.addEventListener('hashchange', handler);
    
      // Return an unregister function
      return {
        unregister: () => {
          window.removeEventListener('hashchange', handler);
        }
      };
    }
  };
}

function createSettingsAPI<T extends PluginSettings>(plugin: Plugin<T>): SettingsAPI<T> & { loaded: Promise<void> } {
  const storageKey = `plugin.${plugin.id}.settings`;
  const listeners = new Map<keyof T, Set<(value: any) => void>>();

  // Initialize with default values
  const settingsWithMeta: any = {
    onChange: <K extends keyof T>(key: K, callback: (value: SettingValue<T[K]>) => void) => {
      if (!listeners.has(key)) {
        listeners.set(key, new Set());
      }
      listeners.get(key)!.add(callback);
      return {
        unregister: () => {
          listeners.get(key)!.delete(callback);
        }
      };
    },
    offChange: <K extends keyof T>(key: K, callback: (value: SettingValue<T[K]>) => void) => {
      listeners.get(key)?.delete(callback);
    },
    loaded: Promise.resolve() // will be replaced below
  };

  // Fill with defaults first
  for (const key in plugin.settings) {
    settingsWithMeta[key] = plugin.settings[key].default;
  }

  // Load stored settings and override defaults
  const loaded = (async () => {
    try {
      const stored = await browser.storage.local.get(storageKey);
      const storedSettings = stored[storageKey] as Partial<Record<keyof T, any>>;
      if (storedSettings) {
        for (const key in storedSettings) {
          if (key in settingsWithMeta) {
            settingsWithMeta[key] = storedSettings[key];
            listeners.get(key as keyof T)?.forEach(cb => cb(storedSettings[key]));
          }
        }
      }
    } catch (error) {
      console.error(`[BetterSEQTA+] Error loading settings for plugin ${plugin.id}:`, error);
    }
  })();

  settingsWithMeta.loaded = loaded;

  // Listen for storage changes and update settingsWithMeta
  const handleStorageChange = (changes: { [key: string]: browser.Storage.StorageChange }, area: string) => {
    if (area !== 'local' || !(storageKey in changes)) return;

    const newValue = changes[storageKey].newValue as Partial<Record<keyof T, any>> | undefined;
    if (!newValue) return;

    for (const key in newValue) {
      const typedKey = key as keyof T;
      settingsWithMeta[typedKey] = newValue[typedKey];
      listeners.get(typedKey)?.forEach(cb => cb(newValue[typedKey]));
    }
  };

  browser.storage.onChanged.addListener(handleStorageChange);

  const proxy = new Proxy(settingsWithMeta, {
    get(target, prop) {
      return target[prop];
    },
    set(target, prop, value) {
      if (['onChange', 'offChange', 'loaded'].includes(prop as string)) return false;

      target[prop] = value;

      // Reconstruct just the data keys for storage (excluding metadata methods)
      const dataToStore: any = {};
      for (const key in plugin.settings) {
        dataToStore[key] = target[key];
      }

      browser.storage.local.set({ [storageKey]: dataToStore });

      listeners.get(prop as keyof T)?.forEach(cb => cb(value));
      return true;
    }
  }) as SettingsAPI<T> & { loaded: Promise<void> };

  return proxy;
}

function createStorageAPI<T = any>(pluginId: string): StorageAPI<T> & { [K in keyof T]: T[K] } {
  const prefix = `plugin.${pluginId}.storage.`;
  const cache: Record<string, any> = {};
  const listeners = new Map<string, Set<(value: any) => void>>();
  const storageListeners = new Set<(changes: { [key: string]: any }, area: string) => void>();
  
  // Load all existing storage values for this plugin
  const loadStoragePromise = (async () => {
    try {
      const allStorage = await browser.storage.local.get(null);
      
      // Filter for this plugin's storage keys and populate cache
      Object.entries(allStorage).forEach(([key, value]) => {
        if (key.startsWith(prefix)) {
          const shortKey = key.slice(prefix.length);
          cache[shortKey] = value;
        }
      });
    } catch (error) {
      console.error(`[BetterSEQTA+] Error loading storage for plugin ${pluginId}:`, error);
    }
  })();
  
  // Listen for storage changes
  const handleStorageChange = (changes: { [key: string]: any }, area: string) => {
    if (area === 'local') {
      Object.entries(changes).forEach(([key, change]) => {
        if (key.startsWith(prefix)) {
          const shortKey = key.slice(prefix.length);
          cache[shortKey] = change.newValue;
          
          // Notify listeners
          listeners.get(shortKey)?.forEach(callback => callback(change.newValue));
        }
      });
    }
  };
  browser.storage.onChanged.addListener(handleStorageChange);
  storageListeners.add(handleStorageChange);
  
  // Create the proxy for direct property access
  return new Proxy(cache, {
    get(target, prop: string) {
      if (prop === 'onChange') {
        return (key: keyof T, callback: (value: T[keyof T]) => void) => {
          if (!listeners.has(key as string)) {
            listeners.set(key as string, new Set());
          }
          listeners.get(key as string)!.add(callback);
          return {
            unregister: () => {
              listeners.get(key as string)?.delete(callback);
            }
          };
        };
      }
      if (prop === 'offChange') {
        return (key: keyof T, callback: (value: T[keyof T]) => void) => {
          listeners.get(key as string)?.delete(callback);
        };
      }
      if (prop === 'loaded') {
        return loadStoragePromise;
      }
      
      // Direct property access
      return target[prop];
    },
    set(target, prop: string, value: any) {
      if (['onChange', 'offChange', 'loaded'].includes(prop)) {
        return false;
      }
      
      // Update cache and store in browser storage
      target[prop] = value;
      browser.storage.local.set({ [prefix + prop]: value });
      
      // Notify listeners
      listeners.get(prop)?.forEach(callback => callback(value));
      
      return true;
    }
  }) as StorageAPI<T> & { [K in keyof T]: T[K] };
}

function createEventsAPI(pluginId: string): EventsAPI {
  const prefix = `plugin.${pluginId}.`;
  const eventListeners = new Map<string, Set<{ callback: (...args: any[]) => void, listener: EventListener }>>();
  
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
        }
      };
    },
    emit: (event, ...args) => {
      document.dispatchEvent(
        new CustomEvent(prefix + event, {
          detail: args.length > 0 ? args : null
        })
      );
    },
  };
}

export function createPluginAPI<T extends PluginSettings, S = any>(plugin: Plugin<T, S>): PluginAPI<T, S> {
  return {
    seqta: createSEQTAAPI(),
    settings: createSettingsAPI(plugin),
    storage: createStorageAPI<S>(plugin.id),
    events: createEventsAPI(plugin.id),
  };
} 