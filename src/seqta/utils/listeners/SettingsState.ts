import browser from "webextension-polyfill";
import { SYNCABLE_PLUGIN_SETTING_DEFAULTS } from "@/plugins/syncablePluginDefaults";
import { getDefaultSettingsState } from "@/seqta/utils/defaultSettings";
import type { SettingsState } from "@/types/storage";
import type { Subscriber, Unsubscriber } from "svelte/store";

const PLUGIN_SETTINGS_KEYS = Object.keys(SYNCABLE_PLUGIN_SETTING_DEFAULTS).map(
  (id) => `plugin.${id}.settings`,
);

const PLUGIN_STORAGE_KEYS = [
  "plugin.assessments-average.storage.assessments",
  "plugin.assessments-average.storage.weightings",
  "plugin.assessments-average.storage.weightingOverrides",
  "plugin.notificationCollector.storage.lastNotificationCount",
  "plugin.notificationCollector.storage.lastCheckedTime",
  "plugin.notificationCollector.storage.consecutiveErrors",
  "plugin.notificationCollector.storage.archivesByUser",
  "plugin.timetableEdit.storage.timetableOverrides",
  "plugin.timetableEdit.storage.timetableOverridesBySubject",
  "plugin.messageFolders.storage.folders",
  "plugin.messageFolders.storage.messageAssignments",
] as const;

const SETTINGS_STORAGE_KEYS = [
  ...new Set([
    ...Object.keys(getDefaultSettingsState()),
    "justupdated",
    "devMode",
    "verboseLogging",
    "devGhReleaseVersionOverride",
    "lastSeenNightlyPublishedAt",
    "originalDarkMode",
    "mockNotices",
    "hideSensitiveContent",
    "privacyStatementLastUpdated",
    "themeOfTheMonthDismissedMonth",
    "themeOfTheMonthLastSeenId",
    ...PLUGIN_SETTINGS_KEYS,
    ...PLUGIN_STORAGE_KEYS,
  ]),
];

/** Auth/session keys live in `chrome.storage.local` only — not on the settingsState proxy. */
const EXCLUDED_FROM_SETTINGS_SURFACE = new Set([
  "bsplus_token",
  "bsplus_refresh_token",
  "bsplus_client_id",
  "bsplus_user",
  "cloudAccessToken",
  "cloudUsername",
]);

function isExcludedSettingsKey(key: string): boolean {
  return EXCLUDED_FROM_SETTINGS_SURFACE.has(key);
}

const SAVE_DEBOUNCE_MS = 200;

function storageChangeIsNoop(oldValue: unknown, newValue: unknown): boolean {
  if (oldValue === newValue) return true;
  if (
    oldValue === undefined ||
    newValue === undefined ||
    typeof oldValue !== "object" ||
    typeof newValue !== "object" ||
    oldValue === null ||
    newValue === null
  ) {
    return false;
  }
  return JSON.stringify(oldValue) === JSON.stringify(newValue);
}

type ChangeListener = (newValue: any, oldValue: any) => void;
type GlobalChangeListener = (newValue: any, oldValue: any, key: string) => void;

class StorageManager {
  private static instance: StorageManager;
  private data: SettingsState;
  private listeners: Map<string, Set<ChangeListener>>;
  private globalListeners: Set<GlobalChangeListener>;
  private subscribers: Set<Subscriber<SettingsState>> = new Set();
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingPatch: Record<string, unknown> = {};
  private initialized = false;
  private bootstrapping = false;
  private suppressWrites = false;

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
        if (typeof prop === "string" && isExcludedSettingsKey(prop)) {
          return undefined;
        }
        return Reflect.get(target.data, prop);
      },
      set: (target, prop: keyof SettingsState, value) => {
        if (typeof prop === "string" && isExcludedSettingsKey(prop)) {
          void browser.storage.local.set({ [prop]: value });
          return true;
        }
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
    if (typeof key === "string" && isExcludedSettingsKey(key)) {
      void browser.storage.local.set({ [key]: value });
      return;
    }
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
    const result = await browser.storage.local.get(SETTINGS_STORAGE_KEYS);
    Object.entries(result).forEach(([key, value]) => {
      if (isExcludedSettingsKey(key)) return;
      Reflect.set(this.data, key, value);
    });
  }
  
  public setSuppressWrites(suppress: boolean): void {
    this.suppressWrites = suppress;
    if (!suppress) {
      this.scheduleDebouncedSave();
    }
  }

  private queueStoragePatch(changedKeys?: string[]): void {
    const keys =
      changedKeys && changedKeys.length > 0
        ? changedKeys
        : Object.keys(this.data);

    for (const key of keys) {
      if (isExcludedSettingsKey(key)) continue;
      const value = (this.data as Record<string, unknown>)[key];
      if (value !== undefined) {
        this.pendingPatch[key] = value;
      }
    }
  }

  private scheduleDebouncedSave(): void {
    if (this.bootstrapping || this.suppressWrites) return;
    if (Object.keys(this.pendingPatch).length === 0) return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      void this.flushPendingPatch();
    }, SAVE_DEBOUNCE_MS);
  }

  private async flushPendingPatch(): Promise<void> {
    this.saveTimeout = null;
    if (this.bootstrapping || this.suppressWrites) return;

    const patch = { ...this.pendingPatch };
    this.pendingPatch = {};
    if (Object.keys(patch).length === 0) return;

    await browser.storage.local.set(patch);
    if (!this.bootstrapping) {
      this.notifySubscribers();
    }
  }

  public saveToStorage(changedKeys?: string[]): void {
    this.queueStoragePatch(changedKeys);
    this.scheduleDebouncedSave();
  }

  private async removeFromStorage(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }

  private initStorageListener(): void {
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;

      const actualChanges: string[] = [];

      for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (storageChangeIsNoop(oldValue, newValue)) continue;
        if (isExcludedSettingsKey(key)) continue;

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

export function setSettingsStateSuppressWrites(suppress: boolean): void {
  settingsState.setSuppressWrites(suppress);
}
