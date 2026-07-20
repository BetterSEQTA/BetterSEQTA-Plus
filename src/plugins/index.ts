import { PluginManager } from "./core/manager";

// Lightweight plugins (load immediately)
import timetablePlugin from "./built-in/timetable";
import notificationCollectorPlugin from "./built-in/notificationCollector";
import themesPlugin from "./built-in/themes";
import animatedBackgroundPlugin from "./built-in/animatedBackground";
import profilePicturePlugin from "./built-in/profilePicture";
import assessmentsOverviewPlugin from "./built-in/assessmentsOverview";
import backgroundMusicPlugin from "./built-in/backgroundMusic";

import assessmentsAveragePluginLazy from "./built-in/assessmentsAverage/lazy";
import timetableEditPluginLazy from "./built-in/timetableEdit/lazy";
import messageFoldersPluginLazy from "./built-in/messageFolders/lazy";
import enhancedNavigationPluginLazy from "./built-in/enhancedNavigation/lazy";
import globalSearchPluginLazy from "./built-in/globalSearch/lazy";
import gradeAnalyticsPluginLazy from "./built-in/gradeAnalytics/lazy";

// Initialize plugin manager
const pluginManager = PluginManager.getInstance();

// Register built-in plugins
pluginManager.registerPlugin(themesPlugin);
pluginManager.registerPlugin(animatedBackgroundPlugin);
pluginManager.registerPlugin(notificationCollectorPlugin);
pluginManager.registerPlugin(timetablePlugin);
pluginManager.registerPlugin(profilePicturePlugin);
pluginManager.registerPlugin(assessmentsOverviewPlugin);
pluginManager.registerPlugin(backgroundMusicPlugin);

pluginManager.registerPlugin(assessmentsAveragePluginLazy);
pluginManager.registerPlugin(timetableEditPluginLazy);
pluginManager.registerPlugin(messageFoldersPluginLazy);
pluginManager.registerPlugin(enhancedNavigationPluginLazy);
pluginManager.registerPlugin(globalSearchPluginLazy);
pluginManager.registerPlugin(gradeAnalyticsPluginLazy);

export async function initializePlugins(): Promise<void> {
  await pluginManager.startAllPlugins();
}

export { pluginManager };

export function getAllPluginSettings() {
  return pluginManager.getAllPluginSettings();
}
