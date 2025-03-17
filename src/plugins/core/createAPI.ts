import type { Plugin, PluginAPI, PluginSettings, SEQTAAPI, SettingsAPI, StorageAPI, EventsAPI } from './types';
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

function createSettingsAPI<T extends PluginSettings>(plugin: Plugin<T>): SettingsAPI<T> {
  const storageKey = `plugin.${plugin.id}.settings`;
  const listeners = new Map<keyof T, Set<(value: any) => void>>();
  let settings: { [K in keyof T]: T[K]['default'] };

  // Initialize settings with defaults
  settings = Object.entries(plugin.settings).reduce((acc, [key, setting]) => {
    acc[key as keyof T] = setting.default;
    return acc;
  }, {} as { [K in keyof T]: T[K]['default'] });

  // Load saved settings
  browser.storage.local.get(storageKey).then((stored) => {
    if (stored[storageKey]) {
      Object.assign(settings, stored[storageKey]);
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
      return target[prop as keyof T];
    },
    set(target, prop: string, value: any) {
      if (prop === 'onChange') return false;
      target[prop as keyof T] = value;
      browser.storage.local.set({ [storageKey]: target });
      listeners.get(prop as keyof T)?.forEach(callback => callback(value));
      return true;
    },
  }) as SettingsAPI<T>;

  return proxy;
}

function createStorageAPI(pluginId: string): StorageAPI {
  const prefix = `plugin.${pluginId}.storage.`;
  
  return {
    get: async <T>(key: string) => {
      const result = await browser.storage.local.get(prefix + key);
      return result[prefix + key] as T || null;
    },
    set: async <T>(key: string, value: T) => {
      await browser.storage.local.set({ [prefix + key]: value });
    },
  };
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