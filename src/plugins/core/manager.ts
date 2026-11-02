import type {
  BooleanSetting,
  ButtonSetting,
  ComponentSetting,
  HotkeySetting,
  NumberSetting,
  Plugin,
  PluginSetting,
  PluginSettings,
  SelectSetting,
  StringSetting,
} from "./types";
import { createPluginAPI } from "./createAPI";
import browser from "@/lib/browser";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { verboseInfo } from "@/utils/verboseLog";
import { isRemotePluginStartAllowed } from "@/seqta/utils/remoteConfig/runtime";
import {
  isRemoteRouteEnhancementsStripped,
  ROUTE_STRIP_KEEP_PLUGINS,
} from "@/seqta/utils/remoteConfig/routeGate";
import { isPluginAllowedInPerformanceMode } from "@/seqta/utils/performanceMode";

interface PluginSettingsStorage {
  enabled?: boolean;
  [key: string]: unknown;
}

interface StorageChange<T = unknown> {
  oldValue?: T;
  newValue?: T;
}

/** Phased plugin startup: critical UI first, light DOM next, heavy plugins last. */
const PLUGIN_START_PHASES: readonly string[][] = [
  ["themes", "animated-background"],
  [
    "timetable",
    "timetableEdit",
    "notificationCollector",
    "enhanced-navigation",
    "assessments-overview",
    "assessments-average",
    "messageFolders",
    "timetable-classmates",
    "profile-picture",
    "background-music",
    // Menu icon is eager; page UI still loads on demand via dynamic import.
    "grade-analytics",
  ],
  ["global-search"],
];

/** Booted only from SEQTA.ts on standalone 404 documents — never auto-start in the SPA. */
const PLUGIN_BOOT_ONLY_IDS = new Set(["error-page-kitten"]);

/**
 * Singleton class responsible for the entire lifecycle of plugins.
 * This includes registration, starting, stopping, event dispatching,
 * managing plugin-specific styles, and listening for plugin setting changes
 * to automatically start or stop plugins.
 */
export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private runningPlugins: Map<string, boolean> = new Map();
  private startingPlugins: Map<string, Promise<void>> = new Map();
  private pendingStops: Map<string, symbol> = new Map();
  private eventBacklog: Map<string, unknown[]> = new Map();
  private cleanupFunctions: Map<string, () => void> = new Map();
  private apiDisposers: Map<string, () => void> = new Map();
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private styleElements: Map<string, HTMLStyleElement> = new Map();

  /**
   * Private constructor to enforce singleton pattern.
   * Initializes the listener for plugin state changes from storage.
   */
  private constructor() {
    this.setupPluginStateListener();
  }

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  public dispatchPluginEvent(pluginId: string, event: string, args?: unknown) {
    const fullEventName = `plugin.${pluginId}.${event}`;

    // Dispatch plugin event if it's running otherwise queue it
    if (this.runningPlugins.get(pluginId)) {
      document.dispatchEvent(new CustomEvent(fullEventName, { detail: args }));
    } else {
      const key = `${pluginId}:${event}`;
      if (!this.eventBacklog.has(key)) {
        this.eventBacklog.set(key, []);
      }
      this.eventBacklog.get(key)!.push(args);
    }
  }

  private async processBackloggedEvents(pluginId: string) {
    for (const [key, argsList] of this.eventBacklog.entries()) {
      const [eventPluginId, event] = key.split(":");
      if (eventPluginId === pluginId) {
        for (const args of argsList) {
          this.dispatchPluginEvent(pluginId, event, args);
        }
        this.eventBacklog.delete(key);
      }
    }
  }

  public registerPlugin<T extends PluginSettings, S>(plugin: Plugin<T, S>): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with id "${plugin.id}" is already registered`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  public async startPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin && !this.shouldStartPlugin(plugin)) return;
    this.pendingStops.delete(pluginId);
    const starting = this.startingPlugins.get(pluginId);
    if (starting) return starting;

    const promise = this.startPluginOnce(pluginId);
    this.startingPlugins.set(pluginId, promise);
    try {
      await promise;
    } finally {
      this.startingPlugins.delete(pluginId);
    }
  }

  private async startPluginOnce(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found`);
    }

    if (this.runningPlugins.get(pluginId)) {
      console.warn("Plugin is already running:", pluginId);
      return;
    }

    try {
      const api = createPluginAPI(plugin);
      this.apiDisposers.set(pluginId, api.dispose);

      if (plugin.styles) {
        const styleElement = document.createElement("style");
        styleElement.textContent = plugin.styles;
        document.head.appendChild(styleElement);
        this.styleElements.set(pluginId, styleElement);
      }

      // Wait for both settings and storage to be loaded before starting the plugin
      await Promise.all([api.settings.loaded, api.storage.loaded]);

      if (!this.shouldStartPlugin(plugin)) {
        this.removePluginStyles(pluginId);
        this.disposePluginAPI(pluginId);
        return;
      }

      const result = await plugin.run(api);
      if (!this.shouldStartPlugin(plugin)) {
        if (typeof result === "function") result();
        this.removePluginStyles(pluginId);
        this.disposePluginAPI(pluginId);
        return;
      }
      if (typeof result === "function") {
        this.cleanupFunctions.set(plugin.id, result);
      }
      this.runningPlugins.set(pluginId, true);
      verboseInfo(`Plugin "${pluginId}" started successfully`);

      await this.processBackloggedEvents(pluginId);
    } catch (error) {
      this.removePluginStyles(pluginId);
      this.disposePluginAPI(pluginId);
      console.error("[BetterSEQTA+] Failed to start plugin:", pluginId, error);
      throw error;
    }
  }

  private shouldStartPlugin(plugin: Plugin): boolean {
    if (settingsState.onoff === false || !isPluginAllowedInPerformanceMode(plugin.id)) {
      return false;
    }
    if (!isRemotePluginStartAllowed(plugin.id)) {
      return false;
    }
    if (isRemoteRouteEnhancementsStripped() && !ROUTE_STRIP_KEEP_PLUGINS.has(plugin.id)) {
      return false;
    }
    if (!plugin.disableToggle) return true;
    const all = settingsState.getAll() as unknown as Record<string, unknown>;
    const stored = all[`plugin.${plugin.id}.settings`] as PluginSettingsStorage | undefined;
    return stored?.enabled ?? plugin.defaultEnabled ?? true;
  }

  private removePluginStyles(pluginId: string): void {
    const styleElement = this.styleElements.get(pluginId);
    if (styleElement) {
      styleElement.remove();
      this.styleElements.delete(pluginId);
    }
  }

  private disposePluginAPI(pluginId: string): void {
    const dispose = this.apiDisposers.get(pluginId);
    if (dispose) {
      dispose();
      this.apiDisposers.delete(pluginId);
    }
  }

  private async startPluginPhase(pluginIds: string[]): Promise<void> {
    const registeredIds = new Set(this.plugins.keys());
    const idsToStart = pluginIds.filter((id) => registeredIds.has(id));

    const startPromises = idsToStart.map((id) =>
      this.startPlugin(id).catch((error) => {
        console.error("Failed to start plugin:", id, error);
        return Promise.reject(error);
      }),
    );

    await Promise.allSettled(startPromises);
  }

  public async startAllPlugins(): Promise<void> {
    for (const phase of PLUGIN_START_PHASES) {
      await this.startPluginPhase(phase);
    }

    const phasedIds = new Set(PLUGIN_START_PHASES.flat());
    const remainingIds = Array.from(this.plugins.keys()).filter(
      (id) => !phasedIds.has(id) && !PLUGIN_BOOT_ONLY_IDS.has(id),
    );
    if (remainingIds.length > 0) {
      await this.startPluginPhase(remainingIds);
    }
  }

  public async stopPlugin(pluginId: string): Promise<void> {
    const stopRequest = Symbol();
    this.pendingStops.set(pluginId, stopRequest);
    await this.startingPlugins.get(pluginId)?.catch(() => {});
    if (this.pendingStops.get(pluginId) !== stopRequest) return;
    this.pendingStops.delete(pluginId);
    this.removePluginStyles(pluginId);
    this.disposePluginAPI(pluginId);

    const cleanup = this.cleanupFunctions.get(pluginId);
    if (cleanup) {
      cleanup();
      this.cleanupFunctions.delete(pluginId);
    }
    this.runningPlugins.set(pluginId, false);
    verboseInfo(`Plugin "${pluginId}" stopped`);
    this.emit("plugin.stopped", pluginId);
  }

  /**
   * Stops all currently running plugins.
   * Iterates through all registered plugins and calls `stopPlugin` for each.
   */
  public stopAllPlugins(): void {
    Array.from(this.plugins.keys()).forEach((id) => this.stopPlugin(id));
  }

  public async stopPluginsExcept(keepIds: ReadonlySet<string>): Promise<void> {
    const stops = Array.from(this.plugins.keys())
      .filter((id) => !keepIds.has(id))
      .map((id) => this.stopPlugin(id));
    await Promise.allSettled(stops);
  }

  public getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  public getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  public getAllPluginSettings(): Array<{
    pluginId: string;
    name: string;
    description: string;
    beta?: boolean;
    settings: {
      [key: string]:
        | (Omit<BooleanSetting, "type"> & { type: "boolean"; id: string })
        | (Omit<StringSetting, "type"> & { type: "string"; id: string })
        | (Omit<NumberSetting, "type"> & { type: "number"; id: string })
        | (Omit<SelectSetting<string>, "type"> & {
            type: "select";
            id: string;
            options: Array<{ value: string; label: string }>;
          })
        | (Omit<ButtonSetting, "type"> & {
            type: "button";
            id: string;
            trigger?: () => void | Promise<void>;
          })
        | (Omit<HotkeySetting, "type"> & { type: "hotkey"; id: string })
        | (Omit<ComponentSetting, "type"> & {
            type: "component";
            id: string;
            component: ComponentSetting["component"];
          });
    };
    // Actual type is more complex, see original code, but this gives the gist for the JSDoc.
    // Array<{ pluginId: string; name: string; description: string; beta?: boolean; settings: Record<string, ProcessedSetting>; disableToggle?: boolean; }>
  }> {
    return Array.from(this.plugins.entries()).map(([id, plugin]) => {
      const settingsEntries = Object.entries(plugin.settings).map(([key, setting]) => {
        const settingObj = setting as PluginSetting;
        let result: Record<string, unknown>;
        if (settingObj.type === "button" || settingObj.type === "component") {
          // For button or component, keep the functions
          result = { ...(settingObj as Record<string, unknown>) };
        } else {
          result = Object.fromEntries(
            Object.entries(settingObj as Record<string, unknown>).filter(
              ([, value]) => typeof value !== "function",
            ),
          );
        }
        result.id = key;
        result.title = result.title || key;
        result.description = result.description || "";
        result.defaultEnabled = plugin.defaultEnabled ?? true;
        return [key, result];
      });

      if (plugin.disableToggle) {
        settingsEntries.push([
          "enabled",
          {
            id: "enabled",
            title: plugin.name,
            description: plugin.description,
            type: "boolean",
            default: plugin.defaultEnabled ?? true,
          },
        ]);
      }
      return {
        pluginId: id,
        name: plugin.name,
        description: plugin.description,
        beta: plugin.beta,
        settings: Object.fromEntries(settingsEntries),
        disableToggle: plugin.disableToggle,
      };
    });
  }

  public isPluginRunning(pluginId: string): boolean {
    return this.runningPlugins.get(pluginId) || false;
  }

  private emit(event: string, ...args: unknown[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(...args));
    }
  }

  public on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: (...args: unknown[]) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private async handlePluginStateChange(pluginId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      await this.startPlugin(pluginId);
    } else {
      await this.stopPlugin(pluginId);
    }
  }

  /**
   * Sets up a listener for browser storage changes.
   * This listener monitors changes to plugin settings (specifically the `enabled` property
   * for plugins with `disableToggle: true`) and calls `handlePluginStateChange`
   * to automatically start or stop plugins accordingly.
   *
   * @private
   */
  private setupPluginStateListener(): void {
    browser.storage.onChanged.addListener(
      (changes: { [key: string]: StorageChange }, area: string) => {
        if (area !== "local") return;

        for (const [key, change] of Object.entries(changes)) {
          const match = key.match(/^plugin\.(.+)\.settings$/);
          if (!match) continue;

          const pluginId = match[1];
          const plugin = this.plugins.get(pluginId);
          if (!plugin?.disableToggle) continue;

          const enabled =
            (change.newValue as PluginSettingsStorage)?.enabled ?? plugin.defaultEnabled ?? true;
          const wasEnabled =
            (change.oldValue as PluginSettingsStorage)?.enabled ?? plugin.defaultEnabled ?? true;

          if (enabled !== wasEnabled) {
            this.handlePluginStateChange(pluginId, enabled);
          }
        }
      },
    );
  }
}
