import { settingsState } from "./settingsState";
import { updateAllColors } from "@/seqta/ui/colors/colorManager";
import { applySelectedFont } from "@/seqta/ui/fonts/fontManager";

import { renderShortcuts } from "@/seqta/utils/render/renderShortcuts";
import { registerHomeUpcomingSettingsListeners } from "@/seqta/utils/loaders/loadHomePage";
import { scheduleMenuItemVisibility } from "@/seqta/utils/menuItemVisibility";
import { changeMenuItemPositions } from "@/seqta/utils/openers/menuOrder";
import { syncPerformanceModeEffects } from "@/seqta/utils/performanceMode";

import type { CustomShortcut } from "@/types/storage";

export class StorageChangeHandler {
  constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    settingsState.register("selectedColor", () => void updateAllColors());
    settingsState.register("adaptiveThemeColour", () => void updateAllColors());
    settingsState.register("adaptiveThemeGradient", () => void updateAllColors());
    settingsState.register("adaptiveThemeColourTransition", () => void updateAllColors());
    settingsState.register("selectedTheme", () => void updateAllColors());
    settingsState.register("DarkMode", () => this.handleDarkModeChange());
    settingsState.register("shortcuts", (newValue) =>
      this.handleShortcutsChange(newValue as { enabled: boolean; name: string }[] | undefined),
    );
    settingsState.register("customshortcuts", (newValue) =>
      this.handleCustomShortcutsChange(newValue as CustomShortcut[] | undefined),
    );
    settingsState.register("transparencyEffects", (newValue) =>
      this.handleTransparencyEffectsChange(newValue as boolean),
    );
    settingsState.register("performanceMode", () => syncPerformanceModeEffects());
    settingsState.register("performanceModePluginOverrides", () => syncPerformanceModeEffects());
    registerHomeUpcomingSettingsListeners();
    settingsState.register("iconOnlySidebar", (newValue) =>
      this.handleIconOnlySidebarChange(newValue as boolean | undefined),
    );
    settingsState.register("selectedFont", () => applySelectedFont());
    settingsState.register("menuitems", () => scheduleMenuItemVisibility());
    settingsState.register("menuorder", (order) => {
      if (Array.isArray(order) && order.length > 0) {
        changeMenuItemPositions(order);
      }
    });
  }

  private handleIconOnlySidebarChange(newValue: boolean | undefined) {
    if (!document.body) return;
    if (newValue) {
      document.body.classList.add("icon-only-sidebar");
    } else {
      document.body.classList.remove("icon-only-sidebar");
    }
  }

  private handleDarkModeChange() {
    void updateAllColors();
  }

  private handleCustomShortcutsChange(newValue: CustomShortcut[] | undefined) {
    if (!Array.isArray(newValue)) return;
    renderShortcuts();
  }

  private handleShortcutsChange(newValue: { enabled: boolean; name: string }[] | undefined) {
    if (!Array.isArray(newValue)) return;
    renderShortcuts();
  }

  private handleTransparencyEffectsChange(newValue: boolean) {
    if (newValue && !settingsState.performanceMode) {
      document.documentElement.classList.add("transparencyEffects");
    } else {
      document.documentElement.classList.remove("transparencyEffects");
    }
  }
}
