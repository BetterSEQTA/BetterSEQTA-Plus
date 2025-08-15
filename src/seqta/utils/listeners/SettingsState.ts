import browser from "webextension-polyfill";
import type { SettingsState } from "@/types/storage";
import type { Subscriber, Unsubscriber } from "svelte/store";

type ChangeListener = (newValue: any, oldValue: any) => void;
type GlobalChangeListener = (newValue: any, oldValue: any, key: string) => void;

class StorageManager {
  private static instance: StorageManager;
  private data: SettingsState;
  private listeners: Map<string, Set<ChangeListener>>;
  private globalListeners: Set<GlobalChangeListener>;
  private subscribers: Set<Subscriber<SettingsState>> = new Set();
  private saveTimeout: NodeJS.Timeout | null = null;
  private initialized = false;

  private constructor() {
    this.data = {} as SettingsState;
    this.listeners = new Map();
    this.globalListeners = new Set();
    // Don't call async loadFromStorage in constructor

    const handler: ProxyHandler<StorageManager> = {
      get: (target, prop: keyof SettingsState | "register" | "initialize") => {
        if (prop in target) {
          return (target as any)[prop];
        }
        return Reflect.get(target.data, prop);
      },
      set: (target, prop: keyof SettingsState, value) => {
        const oldValue = target.data[prop];
        
        // Only save if the value actually changed
        if (oldValue !== value) {
          Reflect.set(target.data, prop, value);
          target.saveToStorage();
          
          // Notify listeners immediately for responsiveness
          const listeners = target.listeners.get(prop as string);
          if (listeners) {
            for (const listener of listeners) {
              listener(value, oldValue);
            }
          }
        }
        return true;
      },
      deleteProperty: (target, prop: keyof SettingsState) => {
        const oldValue = target.data[prop];
        if (oldValue !== undefined) {
          delete target.data[prop];
          target.removeFromStorage(prop);
          const listeners = target.listeners.get(prop as string);
          if (listeners) {
            for (const listener of listeners) {
              listener(undefined, oldValue);
            }
          }
        }
        return true;
      },
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
    if (!instance.initialized) {
      await instance.loadFromStorage();
      instance.initialized = true;
    }
    return instance;
  }

  public setKey<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ): void {
    const oldValue = this.data[key];
    if (oldValue !== value) {
      this.data[key] = value;
      this.saveToStorage();

      // Notify listeners
      const listeners = this.listeners.get(key as string);
      if (listeners) {
        for (const listener of listeners) {
          listener(value, oldValue);
        }
      }
    }
  }

  private async loadFromStorage(): Promise<void> {
    const result = await browser.storage.local.get();
    Object.entries(result).forEach(([key, value]) => {
      Reflect.set(this.data, key, value);
    });
  }
  
  public async saveToStorage(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    // @ts-expect-error
    await browser.storage.local.set(this.data);
    this.notifySubscribers();
  }

  private async removeFromStorage(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }

  private initStorageListener(): void {
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local") {
        const actualChanges: string[] = [];
        
        for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
          // Only process if value actually changed
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            if (newValue !== undefined) {
              (this.data as any)[key] = newValue;
            } else {
              delete (this.data as any)[key];
            }
            actualChanges.push(key);
            
            // Notify specific listeners
            const listeners = this.listeners.get(key);
            if (listeners) {
              for (const listener of listeners) {
                listener(newValue, oldValue);
              }
            }
          }
        }
        
        // Only notify global listeners if there were actual changes
        if (actualChanges.length > 0 && this.globalListeners.size > 0) {
          for (const listener of this.globalListeners) {
            for (const key of actualChanges) {
              const { oldValue, newValue } = changes[key];
              listener(newValue, oldValue, key);
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
    const key = prop as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);
  }
  
  /**
   * Unregister a listener for a setting.
   * @param prop The setting to stop listening to.
   * @param listener The listener to remove.
   */
  public unregister(prop: keyof SettingsState, listener: ChangeListener): void {
    this.listeners.get(prop as string)?.delete(listener);
  }

  /**
   * Register a listener for any setting.
   * @param listener The listener to call when any setting changes -> takes three arguments, (newValue, oldValue, key)
   */
  public registerGlobal(listener: GlobalChangeListener): void {
    this.globalListeners.add(listener);
  }
  
  /**
   * Unregister a global listener.
   * @param listener The listener to remove.
   */
  public unregisterGlobal(listener: GlobalChangeListener): void {
    this.globalListeners.delete(listener);
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
export const initializeSettingsState = async () =>
  await StorageManager.initialize();
