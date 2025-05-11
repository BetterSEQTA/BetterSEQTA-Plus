import { PluginManager } from "./core/manager"; // Imports the PluginManager singleton to manage plugins

// plugins
import timetablePlugin from "./built-in/timetable";
import notificationCollectorPlugin from "./built-in/notificationCollector";
import themesPlugin from "./built-in/themes";
import animatedBackgroundPlugin from "./built-in/animatedBackground";
import assessmentsAveragePlugin from "./built-in/assessmentsAverage";
import globalSearchPlugin from "./built-in/globalSearch/src/core";
//import testPlugin from './built-in/test';

// Initialize plugin manager
const pluginManager = PluginManager.getInstance(); // Creates or retrieves the single instance of PluginManager

// Register built-in plugins
pluginManager.registerPlugin(themesPlugin);
pluginManager.registerPlugin(animatedBackgroundPlugin);
pluginManager.registerPlugin(assessmentsAveragePlugin);
pluginManager.registerPlugin(notificationCollectorPlugin);
pluginManager.registerPlugin(timetablePlugin);
pluginManager.registerPlugin(globalSearchPlugin);
//pluginManager.registerPlugin(testPlugin);

export { init as Monofile } from "./monofile"; // Exports the 'init' function as 'Monofile' from the monofile module

/**
 * Initializes and starts all registered plugins.
 * @returns A promise that resolves once all plugins are started.
 */
export async function initializePlugins(): Promise<void> {
  await pluginManager.startAllPlugins(); // Starts all registered plugins asynchronously
}

export { pluginManager }; // Exports the instance of the plugin manager

/**
 * Retrieves all plugin settings.
 * @returns All plugin settings managed by the plugin manager
 */
export function getAllPluginSettings() {
  return pluginManager.getAllPluginSettings(); // Returns all settings of the registered plugins
}

