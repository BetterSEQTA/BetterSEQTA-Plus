import { PluginManager } from './core/manager';

// plugins
import timetablePlugin from './built-in/timetable';
import notificationCollectorPlugin from './built-in/notificationCollector';
import themesPlugin from './built-in/themes';
import animatedBackgroundPlugin from './built-in/animatedBackground';
import assessmentsAveragePlugin from './built-in/assessmentsAverage';
// Initialize plugin manager
const pluginManager = PluginManager.getInstance();

// Register built-in plugins
pluginManager.registerPlugin(timetablePlugin);
pluginManager.registerPlugin(notificationCollectorPlugin);
pluginManager.registerPlugin(themesPlugin);
pluginManager.registerPlugin(animatedBackgroundPlugin);
pluginManager.registerPlugin(assessmentsAveragePlugin);
//pluginManager.registerPlugin(testPlugin);

export { init as Monofile } from './monofile';

export async function initializePlugins(): Promise<void> {
  await pluginManager.startAllPlugins();
}

export { pluginManager };

export function getAllPluginSettings() {
  return pluginManager.getAllPluginSettings();
}