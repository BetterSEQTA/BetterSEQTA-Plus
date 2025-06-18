import { PluginManager } from "./core/manager";

// plugins
import timetablePlugin from "./built-in/timetable";
import notificationCollectorPlugin from "./built-in/notificationCollector";
import themesPlugin from "./built-in/themes";
import animatedBackgroundPlugin from "./built-in/animatedBackground";
import assessmentsAveragePlugin from "./built-in/assessmentsAverage";
import globalSearchPlugin from "./built-in/globalSearch/src/core";
import profilePicturePlugin from "./built-in/profilePicture";
import assessmentsOverviewPlugin from "./built-in/assessmentsOverview";
import customMessageEditorPlugin from "./built-in/customMessageEditor";
//import testPlugin from './built-in/test';

// Initialize plugin manager
const pluginManager = PluginManager.getInstance();

// Register built-in plugins
pluginManager.registerPlugin(themesPlugin);
pluginManager.registerPlugin(animatedBackgroundPlugin);
pluginManager.registerPlugin(assessmentsAveragePlugin);
pluginManager.registerPlugin(notificationCollectorPlugin);
pluginManager.registerPlugin(timetablePlugin);
pluginManager.registerPlugin(globalSearchPlugin);
pluginManager.registerPlugin(profilePicturePlugin);
pluginManager.registerPlugin(assessmentsOverviewPlugin);
pluginManager.registerPlugin(customMessageEditorPlugin);
//pluginManager.registerPlugin(testPlugin);

export { init as Monofile } from "./monofile";

export async function initializePlugins(): Promise<void> {
  await pluginManager.startAllPlugins();
}

export { pluginManager };

export function getAllPluginSettings() {
  return pluginManager.getAllPluginSettings();
}
