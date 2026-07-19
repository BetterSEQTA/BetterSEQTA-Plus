import { settingsState } from "./SettingsState";
import { updateAllColors } from "@/seqta/ui/colors/Manager";
import { applySelectedFont } from "@/seqta/ui/fonts/Manager";

// Shortcuts rendering
import { renderShortcuts } from "@/seqta/utils/Render/renderShortcuts";
import { FilterUpcomingAssessments } from "@/seqta/utils/FilterUpcomingAssessments";
import { registerHomeUpcomingSettingsListeners } from "@/seqta/utils/Loaders/LoadHomePage";
import { applyMenuItemVisibility } from "@/seqta/utils/menuItemVisibility";
import { ChangeMenuItemPositions } from "@/seqta/utils/Openers/OpenMenuOptions";

import browser from "webextension-polyfill";
import type { CustomShortcut } from "@/types/storage";

export class StorageChangeHandler {
  constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    settingsState.register("selectedColor", () => void updateAllColors());
    settingsState.register("adaptiveThemeColour", () => void updateAllColors());
    settingsState.register("adaptiveThemeGradient", () => void updateAllColors());
    settingsState.register("adaptiveThemeColourTransition", () =>
      void updateAllColors(),
    );
    settingsState.register("selectedTheme", () => void updateAllColors());
    settingsState.register("DarkMode", this.handleDarkModeChange.bind(this));
    settingsState.register("onoff", this.handleOnOffChange.bind(this));
    settingsState.register("shortcuts", this.handleShortcutsChange.bind(this));
    settingsState.register(
      "customshortcuts",
      this.handleCustomShortcutsChange.bind(this),
    );
    settingsState.register(
      "transparencyEffects",
      this.handleTransparencyEffectsChange.bind(this),
    );
    settingsState.register(
      "subjectfilters",
      FilterUpcomingAssessments.bind(this),
    );
    registerHomeUpcomingSettingsListeners();
    settingsState.register(
      "iconOnlySidebar",
      this.handleIconOnlySidebarChange.bind(this),
    );
    settingsState.register("selectedFont", () => applySelectedFont());
    settingsState.register("menuitems", () => applyMenuItemVisibility());
    settingsState.register("menuorder", (order) => {
      if (Array.isArray(order) && order.length > 0) {
        ChangeMenuItemPositions(order);
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

  private handleOnOffChange(newValue: boolean) {
    if (newValue) return;
    browser.runtime.sendMessage({ type: "reloadTabs" });
  }

  private handleCustomShortcutsChange(newValue: CustomShortcut[] | undefined) {
    if (!Array.isArray(newValue)) return;
    renderShortcuts();
  }

  private handleShortcutsChange(
    newValue: { enabled: boolean; name: string }[] | undefined,
  ) {
    if (!Array.isArray(newValue)) return;
    renderShortcuts();
  }

  private handleTransparencyEffectsChange(newValue: boolean) {
    if (newValue) {
      document.documentElement.classList.add("transparencyEffects");
    } else {
      document.documentElement.classList.remove("transparencyEffects");
    }
  }
}
