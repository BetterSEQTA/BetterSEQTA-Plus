import { settingsState } from "./SettingsState";
import { updateAllColors } from "@/seqta/ui/colors/Manager";

// Shortcuts rendering
import { renderShortcuts } from "@/seqta/utils/Render/renderShortcuts";
import { FilterUpcomingAssessments } from "@/seqta/utils/FilterUpcomingAssessments";

import browser from "webextension-polyfill";
import type { CustomShortcut } from "@/types/storage";

export class StorageChangeHandler {
  constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    settingsState.register("selectedColor", updateAllColors.bind(this));
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
  }

  private handleDarkModeChange() {
    updateAllColors();
  }

  private handleOnOffChange(newValue: boolean) {
    if (newValue) return;
    browser.runtime.sendMessage({ type: "reloadTabs" });
  }

  private handleCustomShortcutsChange(
    newValue: CustomShortcut[],
    oldValue: CustomShortcut[],
  ) {
    if (!newValue || !oldValue) return;
    renderShortcuts();
  }

  private handleShortcutsChange(
    newValue: { enabled: boolean; name: string }[],
    oldValue: { enabled: boolean; name: string }[],
  ) {
    if (!newValue || !oldValue) return;
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
