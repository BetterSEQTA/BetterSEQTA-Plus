import browser from 'webextension-polyfill';
import type { SettingsState } from '@/types/storage';

type ChangeListener = (newValue: any, oldValue: any) => void;

class StorageManager {
  private static instance: StorageManager;
  private data: SettingsState;
  private listeners: { [key: string]: ChangeListener[] };

  private constructor() {
    this.data = {} as SettingsState;
    this.listeners = {};
    this.loadFromStorage();

    const handler: ProxyHandler<StorageManager> = {
      get: (target, prop: keyof SettingsState | 'register' | 'initialize') => {
        if (prop in target) {
          return (target as any)[prop];
        }
        return Reflect.get(target.data, prop);
      },
      set: (target, prop: keyof SettingsState, value) => {
        Reflect.set(target.data, prop, value);
        target.saveToStorage();
        return true;
      },
      deleteProperty: (target, prop: keyof SettingsState) => {
        const oldValue = target.data[prop];
        if (oldValue !== undefined) {
          delete target.data[prop];
          target.removeFromStorage(prop);
          if (target.listeners[prop]) {
            for (const listener of target.listeners[prop]) {
              listener(undefined, oldValue);
            }
          }
        }
        return true;
      }
    };

    this.initStorageListener();

    return new Proxy(this, handler) as StorageManager & SettingsState;
  }

  public static getInstance(): StorageManager & SettingsState {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance as StorageManager & SettingsState;
  }

  public static async initialize(): Promise<StorageManager & SettingsState> {
    const instance = StorageManager.getInstance();
    await instance.loadFromStorage();
    return instance;
  }

  private async loadFromStorage(): Promise<void> {
    const result = await browser.storage.local.get();
    this.data = { ...this.data, ...result };
  }

  private async saveToStorage(): Promise<void> {
    await browser.storage.local.set(this.data);
  }

  private async removeFromStorage(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }

  private initStorageListener(): void {
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
          if (newValue !== undefined) {
            (this.data as any)[key] = newValue;
          } else {
            delete (this.data as any)[key];
          }
          if (this.listeners[key]) {
            for (const listener of this.listeners[key]) {
              listener(newValue, oldValue);
            }
          }
        }
      }
    });
  }

  /**
   * Register a listener for a setting.
   * @param prop The setting to listen to.
   * @param listener The listener to call when the setting changes -> takes two arguments, (newValue, oldValue)
   */
  public register(prop: keyof SettingsState, listener: ChangeListener): void {
    if (!this.listeners[prop]) {
      this.listeners[prop] = [];
    }
    this.listeners[prop].push(listener);
  }
}

export const settingsState = StorageManager.getInstance();
export const initializeSettingsState = async () => await StorageManager.initialize();
