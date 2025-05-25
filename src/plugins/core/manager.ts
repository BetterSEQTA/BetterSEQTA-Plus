import type {
  BooleanSetting,
  NumberSetting,
  Plugin,
  PluginSettings,
  SelectSetting,
  StringSetting,
  ButtonSetting,
  HotkeySetting,
} from "./types";
import { createPluginAPI } from "./createAPI";
import browser from "webextension-polyfill";

interface PluginSettingsStorage {
  enabled?: boolean;
  [key: string]: any;
}

interface StorageChange<T = any> {
  oldValue?: T;
  newValue?: T;
}

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin<any, any>> = new Map();
  private runningPlugins: Map<string, boolean> = new Map();
  private eventBacklog: Map<string, any[]> = new Map();
  private cleanupFunctions: Map<string, () => void> = new Map();
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private styleElements: Map<string, HTMLStyleElement> = new Map();

  private constructor() {
    this.setupPluginStateListener();
  }

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

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

  public registerPlugin<T extends PluginSettings, S>(
    plugin: Plugin<T, S>,
  ): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with id "${plugin.id}" is already registered`);
    }
    this.plugins.set(plugin.id, plugin);
  }

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
        const settings = await browser.storage.local.get(
          `plugin.${pluginId}.settings`,
        );
        const pluginSettings = settings[`plugin.${pluginId}.settings`] as
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

  public async startAllPlugins(): Promise<void> {
    const startPromises = Array.from(this.plugins.keys()).map((id) =>
      this.startPlugin(id).catch((error) => {
        console.error(`Failed to start plugin "${id}":`, error);
        return Promise.reject(error);
      }),
    );

    await Promise.allSettled(startPromises);
  }

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

  public stopAllPlugins(): void {
    Array.from(this.plugins.keys()).forEach((id) => this.stopPlugin(id));
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
        | (Omit<ButtonSetting, "type"> & { type: "button"; id: string; trigger?: () => void | Promise<void> })
        | (Omit<HotkeySetting, "type"> & { type: "hotkey"; id: string });
    };
  }> {
    return Array.from(this.plugins.entries()).map(([id, plugin]) => {
      const settingsEntries = Object.entries(plugin.settings).map(
        ([key, setting]) => {
          const settingObj = setting as any;
          let result: any;
          if (settingObj.type === "button") {
            // For button, keep the trigger function
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

  public isPluginRunning(pluginId: string): boolean {
    return this.runningPlugins.get(pluginId) || false;
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(...args));
    }
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  // Add handler for plugin enable/disable state changes
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

  // Add listener for plugin settings changes
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
