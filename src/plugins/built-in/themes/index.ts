import type { Plugin } from "../../core/types"; // Import Plugin type definition
import { ThemeManager } from "./theme-manager"; // Import ThemeManager singleton

// Define the themes plugin
const themesPlugin: Plugin = {
  id: "themes", // Unique identifier for the plugin
  name: "Themes", // Display name of the plugin
  description: "Adds a theme selector to the settings page", // Description of the plugin's functionality
  version: "1.0.0", // Plugin version
  settings: {}, // No user-configurable settings

  run: async (_) => {
    const themeManager = ThemeManager.getInstance(); // Get singleton instance of ThemeManager
    await themeManager.initialize(); // Initialize theme manager (e.g., load themes, apply default)
  },
};

export default themesPlugin; // Export the plugin for use
