import { settingsState } from "./SettingsState";
import { updateAllColors } from "@/seqta/ui/colors/Manager";

import { addShortcuts } from "@/seqta/utils/Adders/AddShortcuts";
import { CreateCustomShortcutDiv } from "@/seqta/utils/CreateEnable/CreateCustomShortcutDiv";
import { FilterUpcomingAssessments } from "@/seqta/utils/FilterUpcomingAssessments";
import { RemoveShortcutDiv } from "@/seqta/utils/DisableRemove/RemoveShortcutDiv";

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
    
    if (newValue.length > oldValue.length) {
      // New shortcut added - add the last one
      CreateCustomShortcutDiv(newValue[oldValue.length]);
    } else if (newValue.length < oldValue.length) {
      // Shortcut removed - find which one was removed
      const newSet = new Set(newValue.map(item => JSON.stringify(item)));
      const removedElement = oldValue.find(
        (oldItem) => !newSet.has(JSON.stringify(oldItem))
      );

      if (removedElement) {
        RemoveShortcutDiv([removedElement]);
      }
    }
  }

  private handleShortcutsChange(
    newValue: { enabled: boolean; name: string }[],
    oldValue: { enabled: boolean; name: string }[],
  ) {
    if (!newValue || !oldValue) return;
    
    // Create map for faster lookup
    const oldMap = new Map(oldValue.map(item => [item.name, item.enabled]));
    
    const addedShortcuts: { enabled: boolean; name: string }[] = [];
    const removedShortcuts: { enabled: boolean; name: string }[] = [];
    
    // Check for changes in shortcuts
    for (const newItem of newValue) {
      const oldEnabled = oldMap.get(newItem.name);
      
      // Newly enabled shortcuts
      if (newItem.enabled && (oldEnabled === undefined || !oldEnabled)) {
        addedShortcuts.push(newItem);
      }
      
      // Newly disabled shortcuts
      if (!newItem.enabled && oldEnabled === true) {
        removedShortcuts.push(newItem);
      }
    }

    if (addedShortcuts.length > 0) {
      addShortcuts(addedShortcuts);
    }
    if (removedShortcuts.length > 0) {
      RemoveShortcutDiv(removedShortcuts);
    }
  }

  private handleTransparencyEffectsChange(newValue: boolean) {
    if (newValue) {
      document.documentElement.classList.add("transparencyEffects");
    } else {
      document.documentElement.classList.remove("transparencyEffects");
    }
  }
}
