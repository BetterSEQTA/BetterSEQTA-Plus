import { PluginManager } from "./core/manager"; // Imports the PluginManager singleton to manage plugins

// plugins
import timetablePlugin from "./built-in/timetable"; // Imports the timetable plugin
import notificationCollectorPlugin from "./built-in/notificationCollector"; // Imports the notification collector plugin
import themesPlugin from "./built-in/themes"; // Imports the themes plugin
import animatedBackgroundPlugin from "./built-in/animatedBackground"; // Imports the animated background plugin
import assessmentsAveragePlugin from "./built-in/assessmentsAverage"; // Imports the assessments average plugin
import globalSearchPlugin from "./built-in/globalSearch/src/core"; // Imports the global search plugin
//import testPlugin from './built-in/test'; // (Commented out) Imports the test plugin

// Initialize plugin manager
const pluginManager = PluginManager.getInstance(); // Creates or retrieves the single instance of PluginManager

// Register built-in plugins
pluginManager.registerPlugin(themesPlugin); // Registers the themes plugin with the plugin manager
pluginManager.registerPlugin(animatedBackgroundPlugin); // Registers the animated background plugin
pluginManager.registerPlugin(assessmentsAveragePlugin); // Registers the assessments average plugin
pluginManager.registerPlugin(notificationCollectorPlugin); // Registers the notification collector plugin
pluginManager.registerPlugin(timetablePlugin); // Registers the timetable plugin
pluginManager.registerPlugin(globalSearchPlugin); // Registers the global search plugin
//pluginManager.registerPlugin(testPlugin); // (Commented out) Registers the test plugin (currently disabled)

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

