import { PluginManager } from "./core/manager";

// Lightweight plugins (load immediately)
import timetablePlugin from "./built-in/timetable";
import notificationCollectorPlugin from "./built-in/notificationCollector";
import themesPlugin from "./built-in/themes";
import animatedBackgroundPlugin from "./built-in/animatedBackground";
import assessmentsAveragePlugin from "./built-in/assessmentsAverage";
import profilePicturePlugin from "./built-in/profilePicture";
import assessmentsOverviewPlugin from "./built-in/assessmentsOverview";
//import testPlugin from './built-in/test';

// Heavy plugins (lazy-loaded only when enabled)
import globalSearchPluginLazy from "./built-in/globalSearch/lazy";

// Initialize plugin manager
const pluginManager = PluginManager.getInstance();

// Register built-in plugins
pluginManager.registerPlugin(themesPlugin);
pluginManager.registerPlugin(animatedBackgroundPlugin);
pluginManager.registerPlugin(assessmentsAveragePlugin);
pluginManager.registerPlugin(notificationCollectorPlugin);
pluginManager.registerPlugin(timetablePlugin);
pluginManager.registerPlugin(profilePicturePlugin);
pluginManager.registerPlugin(assessmentsOverviewPlugin);
//pluginManager.registerPlugin(testPlugin);

// Register heavy plugins with lazy loading
pluginManager.registerPlugin(globalSearchPluginLazy);

export { init as Monofile } from "./monofile";

export async function initializePlugins(): Promise<void> {
  await pluginManager.startAllPlugins();
}

export { pluginManager };

export function getAllPluginSettings() {
  return pluginManager.getAllPluginSettings();
}
