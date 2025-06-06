import type {
  BooleanSetting,
  NumberSetting,
  Plugin,
  PluginSettings,
  SelectSetting,
  StringSetting,
  ButtonSetting,
  HotkeySetting,
  ComponentSetting,
} from "./types";
import { createPluginAPI } from "./createAPI";
import browser from "webextension-polyfill";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";

interface PluginSettingsStorage {
  enabled?: boolean;
  [key: string]: any;
}

interface StorageChange<T = any> {
  oldValue?: T;
  newValue?: T;
}

/**
 * Singleton class responsible for the entire lifecycle of plugins.
 * This includes registration, starting, stopping, event dispatching,
 * managing plugin-specific styles, and listening for plugin setting changes
 * to automatically start or stop plugins.
 */
export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin<any, any>> = new Map();
  private runningPlugins: Map<string, boolean> = new Map();
  private eventBacklog: Map<string, any[]> = new Map();
  private cleanupFunctions: Map<string, () => void> = new Map();
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private styleElements: Map<string, HTMLStyleElement> = new Map();

  /**
   * Private constructor to enforce singleton pattern.
   * Initializes the listener for plugin state changes from storage.
   */
  private constructor() {
    this.setupPluginStateListener();
  }

  /**
   * Gets the singleton instance of the PluginManager.
   * @returns {PluginManager} The singleton instance.
   */
  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * Dispatches an event to a specific plugin.
   * If the plugin is currently running, the event is dispatched immediately via a DOM CustomEvent.
   * If the plugin is not running, the event is added to a backlog to be processed when the plugin starts.
   *
   * @param {string} pluginId The ID of the target plugin.
   * @param {string} event The name of the event to dispatch (e.g., "update").
   * @param {any} [args] Optional arguments to pass with the event.
   */
  public dispatchPluginEvent(pluginId: string, event: string, args?: any) {
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

  /**
   * Processes and dispatches any events that were backlogged for a plugin.
   * This is typically called after a plugin has successfully started.
   *
   * @private
   * @param {string} pluginId The ID of the plugin for which to process backlogged events.
   * @returns {Promise<void>}
   */
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

  /**
   * Registers a plugin with the manager.
   * Plugins must have a unique ID.
   *
   * @template T - The type of settings the plugin uses.
   * @template S - The type of storage the plugin uses.
   * @param {Plugin<T, S>} plugin The plugin object to register.
   * @throws {Error} If a plugin with the same ID is already registered.
   */
  public registerPlugin<T extends PluginSettings, S>(
    plugin: Plugin<T, S>,
  ): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with id "${plugin.id}" is already registered`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Starts a specific plugin by its ID.
   * This involves:
   * - Checking if the plugin exists and isn't already running.
   * - Creating and providing the plugin API (settings, storage, etc.).
   * - Checking if the plugin is enabled (if `disableToggle` is true), respecting its `defaultEnabled` status.
   * - Injecting any CSS styles defined by the plugin into the document head.
   * - Waiting for the plugin's settings and storage to be loaded.
   * - Executing the plugin's `run` method.
   * - Storing any cleanup function returned by `run` for later use in `stopPlugin`.
   * - Marking the plugin as running and processing any backlogged events for it.
   *
   * @param {string} pluginId The ID of the plugin to start.
   * @returns {Promise<void>} A promise that resolves when the plugin has started or is determined not to start (e.g., disabled).
   * @throws {Error} If the plugin is not found, or if an error occurs during plugin initialization or execution.
   */
  public async startPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found`);
    }

    if (this.runningPlugins.get(pluginId)) {
      console.warn(`Plugin "${pluginId}" is already running`);
      return;
    }

    try {
      const api = createPluginAPI(plugin);

      // Check if plugin is enabled before starting
      if (plugin.disableToggle) {
        const all = settingsState.getAll() as unknown as Record<string, unknown>;
        const pluginSettings = all[`plugin.${pluginId}.settings`] as
          | PluginSettingsStorage
          | undefined;
        const enabled =
          pluginSettings?.enabled ?? plugin.defaultEnabled ?? true;
        if (!enabled) {
          console.info(
            `Plugin "${pluginId}" is disabled, skipping initialization`,
          );
          return;
        }
      }

      // Inject plugin styles if provided
      if (plugin.styles) {
        const styleElement = document.createElement("style");
        styleElement.textContent = plugin.styles;
        document.head.appendChild(styleElement);
        this.styleElements.set(pluginId, styleElement);
      }

      // Wait for both settings and storage to be loaded before starting the plugin
      await Promise.all([(api.settings as any).loaded, api.storage.loaded]);

      const result = await plugin.run(api);
      if (typeof result === "function") {
        this.cleanupFunctions.set(plugin.id, result);
      }
      this.runningPlugins.set(pluginId, true);
      console.info(`Plugin "${pluginId}" started successfully`);

      // Process any backlogged events
      await this.processBackloggedEvents(pluginId);
    } catch (error) {
      console.error(
        `[BetterSEQTA+] Failed to start plugin ${pluginId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Attempts to start all registered plugins.
   * Errors during the start of individual plugins are caught and logged,
   * allowing other plugins to attempt to start.
   *
   * @returns {Promise<void>} A promise that resolves when all plugins have attempted to start.
   *                          It uses `Promise.allSettled` to wait for all start operations.
   */
  public async startAllPlugins(): Promise<void> {
    const startPromises = Array.from(this.plugins.keys()).map((id) =>
      this.startPlugin(id).catch((error) => {
        console.error(`Failed to start plugin "${id}":`, error);
        return Promise.reject(error); // Still reject to indicate failure for this specific plugin if needed by caller
      }),
    );

    await Promise.allSettled(startPromises);
  }

  /**
   * Stops a specific plugin by its ID.
   * This involves:
   * - Removing any CSS styles injected by the plugin.
   * - Executing the cleanup function that was returned by the plugin's `run` method (if any).
   * - Marking the plugin as not running.
   * - Emitting a "plugin.stopped" event with the pluginId.
   *
   * @param {string} pluginId The ID of the plugin to stop.
   * @returns {Promise<void>} A promise that resolves when the plugin has been stopped.
   */
  public async stopPlugin(pluginId: string): Promise<void> {
    // Remove plugin styles
    const styleElement = this.styleElements.get(pluginId);
    if (styleElement) {
      styleElement.remove();
      this.styleElements.delete(pluginId);
    }

    const cleanup = this.cleanupFunctions.get(pluginId);
    if (cleanup) {
      cleanup();
      this.cleanupFunctions.delete(pluginId);
    }
    this.runningPlugins.set(pluginId, false);
    console.info(`Plugin "${pluginId}" stopped`);
    this.emit("plugin.stopped", pluginId);
  }

  /**
   * Stops all currently running plugins.
   * Iterates through all registered plugins and calls `stopPlugin` for each.
   */
  public stopAllPlugins(): void {
    Array.from(this.plugins.keys()).forEach((id) => this.stopPlugin(id));
  }

  /**
   * Retrieves a registered plugin by its ID.
   *
   * @param {string} pluginId The ID of the plugin to retrieve.
   * @returns {Plugin | undefined} The plugin object if found, otherwise undefined.
   */
  public getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Retrieves an array of all registered plugin objects.
   *
   * @returns {Plugin[]} An array containing all registered plugin objects.
   */
  public getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Retrieves a structured list of settings for all registered plugins.
   * This is primarily used for building user interfaces for plugin configuration.
   * It processes each plugin's defined settings, adding IDs, titles, descriptions,
   * and default enabled states. For plugins with `disableToggle`, an "enabled"
   * boolean setting is automatically included.
   *
   * @returns {Array<object>} An array of objects, where each object represents a plugin
   *                          and contains its ID, name, description, beta status,
   *                          and a processed `settings` object. The `settings` object
   *                          maps setting keys to their detailed configuration (type, title, etc.).
   *                          The specific structure of each setting object within `settings`
   *                          depends on its type (boolean, string, number, select, button, hotkey).
   */
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
        | (Omit<ButtonSetting, "type"> & { type: "button"; id: string; trigger?: () => void | Promise<void> })
        | (Omit<HotkeySetting, "type"> & { type: "hotkey"; id: string })
        | (Omit<ComponentSetting, "type"> & { type: "component"; id: string; component: any });
    };
    // Actual type is more complex, see original code, but this gives the gist for the JSDoc.
    // Array<{ pluginId: string; name: string; description: string; beta?: boolean; settings: Record<string, ProcessedSetting>; disableToggle?: boolean; }>
  }> {
    return Array.from(this.plugins.entries()).map(([id, plugin]) => {
      const settingsEntries = Object.entries(plugin.settings).map(
        ([key, setting]) => {
          const settingObj = setting as any;
          let result: any;
          if (settingObj.type === "button" || settingObj.type === "component") {
            // For button or component, keep the functions
            result = { ...settingObj };
          } else {
            // For others, strip functions
            result = Object.fromEntries(
              Object.entries(settingObj).filter(
                ([_, value]) => typeof value !== "function",
              ),
            );
          }
          result.id = key;
          result.title = result.title || key;
          result.description = result.description || "";
          result.defaultEnabled = plugin.defaultEnabled ?? true;
          return [key, result];
        },
      );

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

  /**
   * Checks if a specific plugin is currently running.
   *
   * @param {string} pluginId The ID of the plugin to check.
   * @returns {boolean} True if the plugin is running, false otherwise.
   */
  public isPluginRunning(pluginId: string): boolean {
    return this.runningPlugins.get(pluginId) || false;
  }

  /**
   * Emits an event to all registered listeners for that event.
   * This is an internal event bus for the PluginManager itself.
   *
   * @private
   * @param {string} event The name of the event to emit.
   * @param {any[]} args Arguments to pass to the event listeners.
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(...args));
    }
  }

  /**
   * Registers an event listener for PluginManager's internal events.
   *
   * @param {string} event The name of the event to listen for (e.g., "plugin.stopped").
   * @param {(...args: any[]) => void} callback The function to call when the event is emitted.
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unregisters an event listener for PluginManager's internal events.
   *
   * @param {string} event The name of the event.
   * @param {(...args: any[]) => void} callback The callback function to remove.
   */
  public off(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Handles the change in a plugin's enabled state.
   * Starts or stops the plugin based on the new `enabled` value.
   * This is typically called by `setupPluginStateListener` when a relevant storage change is detected.
   *
   * @private
   * @param {string} pluginId The ID of the plugin whose state has changed.
   * @param {boolean} enabled The new enabled state of the plugin.
   * @returns {Promise<void>}
   */
  private async handlePluginStateChange(
    pluginId: string,
    enabled: boolean,
  ): Promise<void> {
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
            (change.newValue as PluginSettingsStorage)?.enabled ?? true;
          const wasEnabled =
            (change.oldValue as PluginSettingsStorage)?.enabled ??
            plugin.defaultEnabled ??
            true;

          if (enabled !== wasEnabled) {
            this.handlePluginStateChange(pluginId, enabled);
          }
        }
      },
    );
  }
}
