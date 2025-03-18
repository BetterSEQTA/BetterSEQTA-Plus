import type { Plugin, PluginSettings } from './types';
import { createPluginAPI } from './createAPI';

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin<any>> = new Map();
  private runningPlugins: Map<string, boolean> = new Map();
  private eventBacklog: Map<string, any[]> = new Map();
  private cleanupFunctions: Map<string, () => void> = new Map();
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  private constructor() {}

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
      const [eventPluginId, event] = key.split(':');
      if (eventPluginId === pluginId) {
        for (const args of argsList) {
          this.dispatchPluginEvent(pluginId, event, args);
        }
        this.eventBacklog.delete(key);
      }
    }
  }

  public registerPlugin<T extends PluginSettings>(plugin: Plugin<T>): void {
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
      
      // Wait for both settings and storage to be loaded before starting the plugin
      await Promise.all([
        (api.settings as any).loaded,
        api.storage.loaded
      ]);
      
      const result = await plugin.run(api);
      if (typeof result === 'function') {
        this.cleanupFunctions.set(plugin.id, result);
      }
      this.runningPlugins.set(pluginId, true);
      console.info(`Plugin "${pluginId}" started successfully`);
      
      // Process any backlogged events
      await this.processBackloggedEvents(pluginId);
    } catch (error) {
      console.error(`[BetterSEQTA+] Failed to start plugin ${pluginId}:`, error);
      throw error;
    }
  }

  public async startAllPlugins(): Promise<void> {
    const startPromises = Array.from(this.plugins.keys()).map(id => 
      this.startPlugin(id).catch(error => {
        console.error(`Failed to start plugin "${id}":`, error);
        return Promise.reject(error);
      })
    );

    await Promise.allSettled(startPromises);
  }

  public async stopPlugin(pluginId: string): Promise<void> {
    const cleanup = this.cleanupFunctions.get(pluginId);
    if (cleanup) {
      cleanup();
      this.cleanupFunctions.delete(pluginId);
    }
    this.runningPlugins.set(pluginId, false);
    console.info(`Plugin "${pluginId}" stopped`);
    this.emit('plugin.stopped', pluginId);
  }

  public stopAllPlugins(): void {
    Array.from(this.plugins.keys()).forEach(id => this.stopPlugin(id));
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
    settings: {
      [key: string]: {
        id: string;
        title: string;
        description?: string;
        type: string;
        default: any;
      }
    }
  }> {
    return Array.from(this.plugins.entries()).map(([id, plugin]) => {
      const settingsEntries = Object.entries(plugin.settings).map(([key, setting]) => {
        return [key, {
          id: key,
          title: (setting as any).title || key,
          description: (setting as any).description || '',
          type: (setting as any).type,
          default: (setting as any).default
        }];
      });

      return {
        pluginId: id,
        name: plugin.name,
        settings: Object.fromEntries(settingsEntries)
      };
    });
  }

  public isPluginRunning(pluginId: string): boolean {
    return this.runningPlugins.get(pluginId) || false;
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
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
} 