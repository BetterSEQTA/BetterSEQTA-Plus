import { settingsState } from "./SettingsState";
import { updateAllColors } from "@/seqta/ui/colors/Manager";

import { addShortcuts } from "@/seqta/utils/Adders/AddShortcuts";
import { CreateCustomShortcutDiv } from "@/seqta/utils/CreateEnable/CreateCustomShortcutDiv";
import { FilterUpcomingAssessments } from "@/seqta/utils/FilterUpcomingAssessments";
import { RemoveShortcutDiv } from "@/seqta/utils/DisableRemove/RemoveShortcutDiv";

import browser from "webextension-polyfill"; // Import webextension polyfill to interact with the browser
import type { CustomShortcut } from "@/types/storage"; // Type definition for custom shortcuts

// Class to handle changes in settings and trigger appropriate actions
export class StorageChangeHandler {
  constructor() {
    this.registerHandlers(); // Registers handlers for changes in settings
  }

  // Registers handlers for various settings changes
  private registerHandlers() {
    settingsState.register("selectedColor", updateAllColors.bind(this));
    settingsState.register("DarkMode", this.handleDarkModeChange.bind(this));
    settingsState.register("onoff", this.handleOnOffChange.bind(this));
    settingsState.register("shortcuts", this.handleShortcutsChange.bind(this));
    settingsState.register(
      "customshortcuts",
      this.handleCustomShortcutsChange.bind(this), // Register custom shortcuts change handler
    );
    settingsState.register(
      "transparencyEffects",
      this.handleTransparencyEffectsChange.bind(this), // Register transparency effects change handler
    );
    settingsState.register(
      "subjectfilters",
      FilterUpcomingAssessments.bind(this), // Register filter for upcoming assessments
    );
  }

  // Handles dark mode change and updates the colors
  private handleDarkModeChange() {
    updateAllColors(); // Updates colors based on dark mode setting
  }

  // Handles the on/off toggle change; reloads tabs when turned off
  private handleOnOffChange(newValue: boolean) {
    if (newValue) return; // If on, do nothing
    browser.runtime.sendMessage({ type: "reloadTabs" }); // Reloads tabs when off
  }

  // Handles custom shortcuts change, adds or removes custom shortcuts
  private handleCustomShortcutsChange(
    newValue: CustomShortcut[], // New value for custom shortcuts
    oldValue: CustomShortcut[], // Previous value for custom shortcuts
  ) {
    if (newValue) {
      if (newValue.length > oldValue.length) {
        CreateCustomShortcutDiv(newValue[oldValue.length]); // Creates a new shortcut div if a new custom shortcut is added
      } else if (newValue.length < oldValue.length) {
        const removedElement = oldValue.find(
          (oldItem: any) =>
            !newValue.some(
              (newItem: any) =>
                JSON.stringify(oldItem) === JSON.stringify(newItem), // Identifies removed shortcut by comparing old and new values
            ),
        );

        if (removedElement) {
          RemoveShortcutDiv([removedElement]); // Removes the shortcut div for the removed custom shortcut
        }
      }
    }
  }

  // Handles shortcuts change, adds or removes enabled shortcuts
  private handleShortcutsChange(
    newValue: { enabled: boolean; name: string }[], // New value for shortcuts
    oldValue: { enabled: boolean; name: string }[], // Previous value for shortcuts
  ) {
    const addedShortcuts = newValue.filter((newItem: any) => {
      const wasDisabledAndNowEnabled = oldValue.some((oldItem: any) => {
        return oldItem.name === newItem.name && !oldItem.enabled && newItem.enabled; // Identifies new enabled shortcuts
      });

      const isNewShortcut = !oldValue.some((oldItem: any) => oldItem.name === newItem.name); // Identifies newly added shortcuts

      return (wasDisabledAndNowEnabled || isNewShortcut) && newItem.enabled;
    });

    const removedShortcuts = newValue.filter((newItem: any) => {
      const isRemoved = oldValue.some((oldItem: any) => {
        const match = oldItem.name === newItem.name;
        const wasEnabled = oldItem.enabled;
        const isDisabled = !newItem.enabled;
        return match && wasEnabled && isDisabled; // Identifies removed enabled shortcuts
      });

      return isRemoved;
    });

    addShortcuts(addedShortcuts); // Adds the newly enabled shortcuts
    RemoveShortcutDiv(removedShortcuts); // Removes the disabled shortcuts
  }

  // Handles transparency effects change and toggles the class on the document
  private handleTransparencyEffectsChange(newValue: boolean) {
    if (newValue) {
      document.documentElement.classList.add("transparencyEffects"); // Adds transparency effects class if enabled
    } else {
      document.documentElement.classList.remove("transparencyEffects"); // Removes transparency effects class if disabled
    }
  }
}
