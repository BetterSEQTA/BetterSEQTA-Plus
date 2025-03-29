import type { EventsAPI, Plugin, PluginAPI, PluginSettings, SEQTAAPI, SettingsAPI, StorageAPI } from './types';
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
  
  // Use SettingValue to properly type the listeners
  // This ensures callbacks get correctly typed parameters
  const listeners = new Map<keyof T, Set<(value: SettingValue<T[keyof T]>) => void>>();
  
  let settings: { [K in keyof T]: SettingValue<T[K]> };
  const storageListeners = new Set<(changes: { [key: string]: any }, area: string) => void>();

  // Initialize settings with defaults and proper typing
  settings = Object.entries(plugin.settings).reduce((acc, [key, setting]) => {
    // Extract the value from the default based on the setting type
    if (setting.type === 'boolean') {
      acc[key as keyof T] = setting.default as SettingValue<T[keyof T]>;
    } else if (setting.type === 'number') {
      acc[key as keyof T] = setting.default as SettingValue<T[keyof T]>;
    } else if (setting.type === 'string') {
      acc[key as keyof T] = setting.default as SettingValue<T[keyof T]>;
    } else if (setting.type === 'select') {
      acc[key as keyof T] = setting.default as SettingValue<T[keyof T]>;
    }
    return acc;
  }, {} as { [K in keyof T]: SettingValue<T[K]> });

  // Create a promise that resolves when settings are loaded
  const loaded = (async () => {
    try {
      const stored = await browser.storage.local.get(storageKey);
      if (stored[storageKey]) {
        Object.entries(stored[storageKey]).forEach(([key, value]) => {
          if (key in settings) {
            // Use proper type assertion based on the setting type
            const settingType = plugin.settings[key as keyof T].type;
            if (settingType === 'boolean' && typeof value === 'boolean') {
              settings[key as keyof T] = value as SettingValue<T[keyof T]>;
            } else if (settingType === 'number' && typeof value === 'number') {
              settings[key as keyof T] = value as SettingValue<T[keyof T]>;
            } else if (settingType === 'string' && typeof value === 'string') {
              settings[key as keyof T] = value as SettingValue<T[keyof T]>;
            } else if (settingType === 'select' && typeof value === 'string') {
              settings[key as keyof T] = value as SettingValue<T[keyof T]>;
            }
            
            // Notify any listeners that might have been registered already
            listeners.get(key as keyof T)?.forEach(callback => 
              callback(settings[key as keyof T] as SettingValue<T[keyof T]>)
            );
          }
        });
      }
    } catch (error) {
      console.error(`[BetterSEQTA+] Error loading settings for plugin ${plugin.id}:`, error);
    }
  })();

  // Listen for storage changes
  const handleStorageChange = (changes: { [key: string]: any }, area: string) => {
    if (area === 'local' && changes[storageKey]) {
      const newValue = changes[storageKey].newValue;
      if (newValue) {
        // Update settings and notify listeners
        Object.entries(newValue).forEach(([key, value]) => {
          if (key in settings) {
            // Use proper type assertion based on the setting type
            const settingType = plugin.settings[key as keyof T].type;
            if (settingType === 'boolean' && typeof value === 'boolean') {
              settings[key as keyof T] = value as SettingValue<T[keyof T]>;
            } else if (settingType === 'number' && typeof value === 'number') {
              settings[key as keyof T] = value as SettingValue<T[keyof T]>;
            } else if (settingType === 'string' && typeof value === 'string') {
              settings[key as keyof T] = value as SettingValue<T[keyof T]>;
            } else if (settingType === 'select' && typeof value === 'string') {
              settings[key as keyof T] = value as SettingValue<T[keyof T]>;
            }
            
            // Notify listeners with the correctly typed value
            listeners.get(key as keyof T)?.forEach(callback => 
              callback(settings[key as keyof T] as SettingValue<T[keyof T]>)
            );
          }
        });
      }
    }
  };
  browser.storage.onChanged.addListener(handleStorageChange);
  storageListeners.add(handleStorageChange);

  // Create a proxy to handle direct property access
  const proxy = new Proxy(settings, {
    get(target, prop: string) {
      if (prop === 'onChange') {
        return <K extends keyof T>(key: K, callback: (value: SettingValue<T[K]>) => void) => {
          if (!listeners.has(key)) {
            listeners.set(key, new Set());
          }
          listeners.get(key)!.add(callback as (value: SettingValue<T[keyof T]>) => void);
          return {
            unregister: () => {
              listeners.get(key)?.delete(callback as (value: SettingValue<T[keyof T]>) => void);
            }
          };
        };
      }      
      if (prop === 'loaded') {
        return loaded;
      }
      return target[prop as keyof T];
    },
    set(target, prop: string, value: any) {
      if (prop === 'onChange' || prop === 'offChange' || prop === 'loaded') return false;
      
      // Try to apply the right type based on the setting definition
      if (prop in plugin.settings) {
        const settingType = plugin.settings[prop as keyof T].type;
        if (settingType === 'boolean' && typeof value === 'boolean') {
          target[prop as keyof T] = value as SettingValue<T[keyof T]>;
        } else if (settingType === 'number' && typeof value === 'number') {
          target[prop as keyof T] = value as SettingValue<T[keyof T]>;
        } else if (settingType === 'string' && typeof value === 'string') {
          target[prop as keyof T] = value as SettingValue<T[keyof T]>;
        } else if (settingType === 'select' && typeof value === 'string') {
          target[prop as keyof T] = value as SettingValue<T[keyof T]>;
        }
      }
      
      // Store all settings under the plugin's settings key
      browser.storage.local.set({ 
        [storageKey]: target 
      });
      
      // Notify listeners
      listeners.get(prop as keyof T)?.forEach(callback => 
        callback(target[prop as keyof T] as SettingValue<T[keyof T]>)
      );
      return true;
    },
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