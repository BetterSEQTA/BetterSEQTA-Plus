import type { EventsAPI, Plugin, PluginAPI, PluginSettings, SEQTAAPI, SettingsAPI, StorageAPI } from './types';
import { eventManager } from '@/seqta/utils/listeners/EventManager';
import ReactFiber from '@/seqta/utils/ReactFiber';
import browser from 'webextension-polyfill';

function createSEQTAAPI(): SEQTAAPI {
  return {
    onMount: (selector, callback) => {
      eventManager.register(
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
      window.addEventListener('hashchange', () => {
        const page = window.location.hash.split('?page=/')[1] || '';
        callback(page.split('/')[0]);
      });
    },
  };
}

function createSettingsAPI<T extends PluginSettings>(plugin: Plugin<T>): SettingsAPI<T> & { loaded: Promise<void> } {
  const storageKey = `plugin.${plugin.id}.settings`;
  const listeners = new Map<keyof T, Set<(value: any) => void>>();
  let settings: { [K in keyof T]: T[K]['default'] };

  // Initialize settings with defaults
  settings = Object.entries(plugin.settings).reduce((acc, [key, setting]) => {
    acc[key as keyof T] = setting.default;
    return acc;
  }, {} as { [K in keyof T]: T[K]['default'] });

  // Create a promise that resolves when settings are loaded
  const loaded = (async () => {
    try {
      const stored = await browser.storage.local.get(storageKey);
      if (stored[storageKey]) {
        Object.entries(stored[storageKey]).forEach(([key, value]) => {
          if (key in settings) {
            settings[key as keyof T] = value as any;
            // Notify any listeners that might have been registered already
            listeners.get(key as keyof T)?.forEach(callback => callback(value));
          }
        });
      }
    } catch (error) {
      console.error(`[BetterSEQTA+] Error loading settings for plugin ${plugin.id}:`, error);
    }
  })();

  // Listen for storage changes
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[storageKey]) {
      const newValue = changes[storageKey].newValue;
      if (newValue) {
        // Update settings and notify listeners
        Object.entries(newValue).forEach(([key, value]) => {
          settings[key as keyof T] = value as any;
          listeners.get(key as keyof T)?.forEach(callback => callback(value));
        });
      }
    }
  });

  // Create a proxy to handle direct property access
  const proxy = new Proxy(settings, {
    get(target, prop: string) {
      if (prop === 'onChange') {
        return (key: keyof T, callback: (value: any) => void) => {
          if (!listeners.has(key)) {
            listeners.set(key, new Set());
          }
          listeners.get(key)!.add(callback);
        };
      }
      if (prop === 'offChange') {
        return (key: keyof T, callback: (value: any) => void) => {
          listeners.get(key)?.delete(callback);
        };
      }
      if (prop === 'loaded') {
        return loaded;
      }
      return target[prop as keyof T];
    },
    set(target, prop: string, value: any) {
      if (prop === 'onChange' || prop === 'offChange' || prop === 'loaded') return false;
      target[prop as keyof T] = value;
      
      // Store all settings under the plugin's settings key
      browser.storage.local.set({ 
        [storageKey]: target 
      });
      
      // Notify listeners
      listeners.get(prop as keyof T)?.forEach(callback => callback(value));
      return true;
    },
  }) as SettingsAPI<T> & { loaded: Promise<void> };

  return proxy;
}

function createStorageAPI(pluginId: string): StorageAPI {
  const prefix = `plugin.${pluginId}.storage.`;
  const cache: Record<string, any> = {};
  const listeners = new Map<string, Set<(value: any) => void>>();
  
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
  browser.storage.onChanged.addListener((changes, area) => {
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
  });
  
  // Create the proxy for direct property access
  return new Proxy(cache, {
    get(target, prop: string) {
      if (prop === 'get') {
        return async <T>(key: string) => {
          return target[key] as T || null;
        };
      }
      if (prop === 'set') {
        return async <T>(key: string, value: T) => {
          target[key] = value;
          await browser.storage.local.set({ [prefix + key]: value });
        };
      }
      if (prop === 'onChange') {
        return (key: string, callback: (value: any) => void) => {
          if (!listeners.has(key)) {
            listeners.set(key, new Set());
          }
          listeners.get(key)!.add(callback);
        };
      }
      if (prop === 'offChange') {
        return (key: string, callback: (value: any) => void) => {
          listeners.get(key)?.delete(callback);
        };
      }
      if (prop === 'loaded') {
        return loadStoragePromise;
      }
      
      // Direct property access
      return target[prop];
    },
    set(target, prop: string, value: any) {
      if (['get', 'set', 'onChange', 'offChange', 'loaded'].includes(prop)) {
        return false;
      }
      
      // Update cache and store in browser storage
      target[prop] = value;
      browser.storage.local.set({ [prefix + prop]: value });
      
      // Notify listeners
      listeners.get(prop)?.forEach(callback => callback(value));
      
      return true;
    }
  }) as StorageAPI;
}

function createEventsAPI(pluginId: string): EventsAPI {
  const prefix = `plugin.${pluginId}.`;
  
  return {
    on: (event, callback) => {
      document.addEventListener(prefix + event, ((e: CustomEvent) => {
        callback(...(e.detail || []));
      }) as EventListener);
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

export function createPluginAPI<T extends PluginSettings>(plugin: Plugin<T>): PluginAPI<T> {
  return {
    seqta: createSEQTAAPI(),
    settings: createSettingsAPI(plugin),
    storage: createStorageAPI(plugin.id),
    events: createEventsAPI(plugin.id),
  };
} 