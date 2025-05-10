import browser from "webextension-polyfill";
import type { SettingsState } from "@/types/storage";
import type { Subscriber, Unsubscriber } from "svelte/store";

// Type for setting change listeners
type ChangeListener = (newValue: any, oldValue: any) => void;
// Type for global change listeners that monitor all settings
type GlobalChangeListener = (newValue: any, oldValue: any, key: string) => void;

class StorageManager {
  private static instance: StorageManager; // Singleton instance of StorageManager
  private data: SettingsState; // Object to store the settings data
  private listeners: { [key: string]: ChangeListener[] }; // List of listeners for each setting
  private globalListeners: GlobalChangeListener[]; // List of global listeners for all settings
  private subscribers: Set<Subscriber<SettingsState>> = new Set(); // Subscribers for settings updates

  private constructor() {
    this.data = {} as SettingsState;
    this.listeners = {};
    this.globalListeners = [];
    this.loadFromStorage(); // Load settings from storage on initialization

    const handler: ProxyHandler<StorageManager> = {
      // Proxy handler for getting and setting properties
      get: (target, prop: keyof SettingsState | "register" | "initialize") => {
        if (prop in target) {
          return (target as any)[prop];
        }
        return Reflect.get(target.data, prop); // Get the property from the settings data
      },
      set: (target, prop: keyof SettingsState, value) => {
        Reflect.set(target.data, prop, value); // Set the property in the settings data
        target.saveToStorage(); // Save the updated settings to storage
        return true;
      },
      deleteProperty: (target, prop: keyof SettingsState) => {
        const oldValue = target.data[prop];
        if (oldValue !== undefined) {
          delete target.data[prop]; // Delete the property from the settings data
          target.removeFromStorage(prop); // Remove the property from storage
          if (target.listeners[prop]) {
            for (const listener of target.listeners[prop]) {
              listener(undefined, oldValue); // Notify listeners about the deletion
            }
          }
        }
        return true;
      },
    };

    this.initStorageListener(); // Initialize the listener for storage changes

    return new Proxy(this, handler) as StorageManager & SettingsState;
  }

  // Singleton pattern to get the single instance of StorageManager
  public static getInstance(): StorageManager & SettingsState {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager(); // Create the instance if it doesn't exist
    }
    return StorageManager.instance as StorageManager & SettingsState;
  }

  // Initialize the StorageManager asynchronously
  public static async initialize(): Promise<StorageManager & SettingsState> {
    const instance = StorageManager.getInstance();
    await instance.loadFromStorage(); // Load settings from storage
    return instance;
  }

  // Set a key in the settings and save it to storage
  public setKey<K extends keyof SettingsState>(key: K, value: SettingsState[K]): void {
    this.data[key] = value;
    this.saveToStorage(); // Save the updated settings to storage
  }

  // Load settings from the local storage
  private async loadFromStorage(): Promise<void> {
    const result = await browser.storage.local.get();
    Object.entries(result).forEach(([key, value]) => {
      Reflect.set(this.data, key, value); // Update settings data with loaded values
    });
  }

  // Save the current settings data to local storage
  private async saveToStorage(): Promise<void> {
    // @ts-expect-error: Allow direct save of settings object
    await browser.storage.local.set(this.data);
    this.notifySubscribers(); // Notify subscribers that the settings have been updated
  }

  // Remove a specific setting from local storage
  private async removeFromStorage(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }

  // Initialize the listener for changes in local storage
  private initStorageListener(): void {
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local") {
        for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
          if (newValue !== undefined) {
            (this.data as any)[key] = newValue; // Update setting data with new value
          } else {
            delete (this.data as any)[key]; // Delete the setting from data
          }
          if (this.listeners[key]) {
            for (const listener of this.listeners[key]) {
              listener(newValue, oldValue); // Notify specific setting listeners
            }
          }
          for (const listener of this.globalListeners) {
            listener(newValue, oldValue, key); // Notify global listeners
          }
        }
      }
    });
  }

  /**
   * Register a listener for a specific setting.
   * @param prop The setting to listen to.
   * @param listener The listener to call when the setting changes -> takes two arguments, (newValue, oldValue)
   */
  public register(prop: keyof SettingsState, listener: ChangeListener): void {
    if (!this.listeners[prop]) {
      this.listeners[prop] = [];
    }
    this.listeners[prop].push(listener); // Add listener for the specific setting
  }

  /**
   * Register a global listener for any setting.
   * @param listener The listener to call when any setting changes -> takes three arguments, (newValue, oldValue, key)
   */
  public registerGlobal(listener: GlobalChangeListener): void {
    this.globalListeners.push(listener); // Add global listener
  }

  /**
   * Get all the settings.
   * @returns All settings.
   */
  public getAll(): SettingsState {
    return this.data; // Return all settings data
  }

  // Subscribe to settings updates
  public subscribe(run: Subscriber<SettingsState>): Unsubscriber {
    this.subscribers.add(run); // Add subscriber
    run(this.data); // Send the current settings data to the subscriber
    return () => {
      this.subscribers.delete(run); // Unsubscribe when returned function is called
    };
  }

  // Notify all subscribers of settings changes
  private notifySubscribers(): void {
    for (const subscriber of this.subscribers) {
      subscriber(this.data); // Notify each subscriber with the updated settings
    }
  }
}

// Export the instance of StorageManager
export const settingsState = StorageManager.getInstance();
// Export an async initialization function for StorageManager
export const initializeSettingsState = async () =>
  await StorageManager.initialize();
