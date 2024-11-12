import browser from 'webextension-polyfill';
import type { SettingsState } from '@/types/storage';
import type { Subscriber, Unsubscriber } from 'svelte/store';

type ChangeListener = (newValue: any, oldValue: any) => void;
type GlobalChangeListener = (newValue: any, oldValue: any, key: string) => void;

class StorageManager {
  private static instance: StorageManager;
  private data: SettingsState;
  private listeners: { [key: string]: ChangeListener[] };
  private globalListeners: GlobalChangeListener[];
  private subscribers: Set<Subscriber<SettingsState>> = new Set();

  private constructor() {
    this.data = {} as SettingsState;
    this.listeners = {};
    this.globalListeners = [];
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

  public setKey<K extends keyof SettingsState>(key: K, value: SettingsState[K]): void {
    this.data[key] = value;
    this.saveToStorage();
  }

  private async loadFromStorage(): Promise<void> {
    const result = await browser.storage.local.get();
    this.data = { ...this.data, ...result };
  }

  private async saveToStorage(): Promise<void> {
    await browser.storage.local.set(this.data);
    this.notifySubscribers();
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
          for (const listener of this.globalListeners) {
            listener(newValue, oldValue, key);
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

  /**
   * Register a listener for any setting.
   * @param listener The listener to call when any setting changes -> takes two arguments, (newValue, oldValue)
   */
  public registerGlobal(listener: GlobalChangeListener): void {
    this.globalListeners.push(listener);
  }

  /**
   * Get all settings.
   * @returns All settings.
   */
  public getAll(): SettingsState {
    return this.data;
  }

  public subscribe(run: Subscriber<SettingsState>): Unsubscriber {
    this.subscribers.add(run);
    run(this.data);
    return () => {
      this.subscribers.delete(run);
    };
  }

  private notifySubscribers(): void {
    for (const subscriber of this.subscribers) {
      subscriber(this.data);
    }
  }
}

export const settingsState = StorageManager.getInstance();
export const initializeSettingsState = async () => await StorageManager.initialize();
