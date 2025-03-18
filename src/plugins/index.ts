import { PluginManager } from './core/manager';

// plugins
import timetablePlugin from './built-in/timetable';
import notificationCollectorPlugin from './built-in/notificationCollector';
import testPlugin from './built-in/test';

// Initialize plugin manager
const pluginManager = PluginManager.getInstance();

// Register built-in plugins
pluginManager.registerPlugin(timetablePlugin);
pluginManager.registerPlugin(notificationCollectorPlugin);
pluginManager.registerPlugin(testPlugin);

// Legacy plugin exports
export { init as Monofile } from './monofile';
export { init as Themes } from './themes';

export async function initializePlugins(): Promise<void> {
  await pluginManager.startAllPlugins();
}

export { pluginManager };

export function getAllPluginSettings() {
  return pluginManager.getAllPluginSettings();
}