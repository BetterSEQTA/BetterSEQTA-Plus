import { PluginManager } from './core/manager';
import timetablePlugin from './built-in/timetable';
import notificationCollectorPlugin from './built-in/notificationCollector';

// Initialize plugin manager
const pluginManager = PluginManager.getInstance();

// Register built-in plugins
pluginManager.registerPlugin(timetablePlugin);
pluginManager.registerPlugin(notificationCollectorPlugin);

// Legacy plugin exports
export { init as Monofile } from './monofile';
export { init as Themes } from './themes';

// New plugin system initialization
export async function initializePlugins(): Promise<void> {
  await pluginManager.startAllPlugins();
}

// Re-export plugin manager for direct access if needed
export { pluginManager };