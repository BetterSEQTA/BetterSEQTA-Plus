import type { Plugin, PluginSettings } from "./types";

/**
 * Interface for lazy-loaded plugin definitions
 */
export interface LazyPlugin<T extends PluginSettings = PluginSettings, S = any> {
  id: string;
  name: string;
  description: string;
  version: string;
  settings: T;
  styles?: string;
  disableToggle?: boolean;
  defaultEnabled?: boolean;
  beta?: boolean;
  
  // Instead of a run function, we have a loader that imports the actual plugin
  loader: () => Promise<{ default: Plugin<T, S> }>;
}

/**
 * Converts a lazy plugin into a regular plugin by wrapping the run function
 * with dynamic import logic
 */
export function createLazyPlugin<T extends PluginSettings = PluginSettings, S = any>(
  lazyPlugin: LazyPlugin<T, S>
): Plugin<T, S> {
  return {
    id: lazyPlugin.id,
    name: lazyPlugin.name,
    description: lazyPlugin.description,
    version: lazyPlugin.version,
    settings: lazyPlugin.settings,
    styles: lazyPlugin.styles,
    disableToggle: lazyPlugin.disableToggle,
    defaultEnabled: lazyPlugin.defaultEnabled,
    beta: lazyPlugin.beta,
    
    run: async (api) => {
      console.info(`[BetterSEQTA+] Dynamically loading plugin "${lazyPlugin.id}"...`);
      
      try {
        // Dynamically import the actual plugin implementation
        const { default: actualPlugin } = await lazyPlugin.loader();
        
        console.info(`[BetterSEQTA+] Successfully loaded plugin "${lazyPlugin.id}"`);
        
        // Execute the actual plugin's run function
        return await actualPlugin.run(api);
      } catch (error) {
        console.error(`[BetterSEQTA+] Failed to dynamically load plugin "${lazyPlugin.id}":`, error);
        throw error;
      }
    }
  };
}

/**
 * Helper function to create a lazy plugin definition
 */
export function defineLazyPlugin<T extends PluginSettings = PluginSettings, S = any>(
  config: LazyPlugin<T, S>
): Plugin<T, S> {
  return createLazyPlugin(config);
}

