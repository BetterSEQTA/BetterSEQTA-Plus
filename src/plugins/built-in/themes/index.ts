import type { Plugin } from "../../core/types";
import { ThemeManager } from "./theme-manager";

const themesPlugin: Plugin = {
  id: "themes",
  name: "Themes",
  description: "Adds a theme selector to the settings page",
  version: "1.0.0",
  settings: {},

  run: async (_) => {
    const themeManager = ThemeManager.getInstance();
    await themeManager.initialize();
  },
};

export default themesPlugin;
