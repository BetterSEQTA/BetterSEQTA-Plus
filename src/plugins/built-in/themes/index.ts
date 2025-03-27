import type { Plugin } from '../../core/types';
import { BasePlugin, BooleanSetting } from '../../core/settings';
import { ThemeManager } from './theme-manager';

// Define only the typed settings - no need for redundant interface
class ThemePluginClass extends BasePlugin {
  @BooleanSetting({
    default: true,
    title: "Themes",
    description: "Adds a theme selector to the settings page"
  })
  enabled!: boolean;
}

// Create an instance to extract settings
const settingsInstance = new ThemePluginClass();

const themesPlugin: Plugin<typeof settingsInstance.settings> = {
  id: 'themes',
  name: 'Themes',
  description: 'Adds a theme selector to the settings page',
  version: '1.0.0',
  settings: settingsInstance.settings,
  run: async (api) => {
    console.debug('[ThemesPlugin] Starting plugin');
    const themeManager = ThemeManager.getInstance();

    if (api.settings.enabled) {
      console.debug('[ThemesPlugin] Plugin enabled, initializing theme manager');
      await themeManager.initialize();
    }
    
    const enabledCallback = (value: string | number | boolean) => {
      console.debug('[ThemesPlugin] Enabled setting changed:', value);
      if (value === true) {
        console.debug('[ThemesPlugin] Plugin enabled, initializing theme manager');
        void themeManager.initialize();
      } else if (value === false) {
        console.debug('[ThemesPlugin] Plugin disabled, cleaning up theme manager');
        void themeManager.cleanup();
      }
    }
    
    api.settings.onChange('enabled', enabledCallback);
    
    return () => {
      console.debug('[ThemesPlugin] Plugin cleanup');
      api.settings.offChange('enabled', enabledCallback);
      void themeManager.cleanup();
    }
  }
};

export default themesPlugin; 
