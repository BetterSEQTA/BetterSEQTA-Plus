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
  private bootstrapping = false;

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

        // Only save if the reference actually changed
        if (oldValue !== value) {
          Reflect.set(target.data, prop, value);
          void target.saveToStorage([prop as string]);
          target.notifySettingChange(prop as string, value, oldValue);
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
      instance.bootstrapping = true;
      try {
        // Must run in the service worker — dynamic import() in content scripts
        // resolves chunk URLs against the SEQTA page origin on Firefox.
        try {
          await browser.runtime.sendMessage({ type: "ensureStorageDefaults" });
        } catch (e) {
          console.warn(
            "[BetterSEQTA+] ensureStorageDefaults message failed:",
            e,
          );
        }
        await instance.loadFromStorage();
        instance.initialized = true;
      } finally {
        instance.bootstrapping = false;
      }
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
      void this.saveToStorage([key as string]);
      this.notifySettingChange(key as string, value, oldValue);
    }
  }

  private notifySettingChange(
    key: string,
    newValue: unknown,
    oldValue: unknown,
  ): void {
    if (this.bootstrapping) return;
    const listeners = this.listeners.get(key);
    if (listeners) {
      for (const listener of listeners) {
        listener(newValue, oldValue);
      }
    }
    this.notifySubscribers();
  }

  private async loadFromStorage(): Promise<void> {
    const result = await browser.storage.local.get();
    Object.entries(result).forEach(([key, value]) => {
      Reflect.set(this.data, key, value);
    });
  }
  
  public async saveToStorage(changedKeys?: string[]): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    const payload: Record<string, unknown> = {};
    const keys =
      changedKeys && changedKeys.length > 0
        ? changedKeys
        : Object.keys(this.data);

    for (const key of keys) {
      const value = (this.data as Record<string, unknown>)[key];
      if (value !== undefined) {
        payload[key] = value;
      }
    }

    if (Object.keys(payload).length === 0) return;

    await browser.storage.local.set(payload);
    if (!this.bootstrapping) {
      this.notifySubscribers();
    }
  }

  private async removeFromStorage(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }

  private initStorageListener(): void {
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;

      const actualChanges: string[] = [];

      for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;

        if (newValue !== undefined) {
          (this.data as Record<string, unknown>)[key] = newValue;
        } else {
          delete (this.data as Record<string, unknown>)[key];
        }
        actualChanges.push(key);

        if (this.bootstrapping) continue;

        const listeners = this.listeners.get(key);
        if (listeners) {
          for (const listener of listeners) {
            listener(newValue, oldValue);
          }
        }
      }

      if (
        !this.bootstrapping &&
        actualChanges.length > 0 &&
        this.globalListeners.size > 0
      ) {
        for (const listener of this.globalListeners) {
          for (const key of actualChanges) {
            const { oldValue, newValue } = changes[key];
            listener(newValue, oldValue, key);
          }
        }
      }

      if (!this.bootstrapping && actualChanges.length > 0) {
        this.notifySubscribers();
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
