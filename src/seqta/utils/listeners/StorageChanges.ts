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
    if (newValue) {
      if (newValue.length > oldValue.length) {
        CreateCustomShortcutDiv(newValue[oldValue.length]);
      } else if (newValue.length < oldValue.length) {
        const removedElement = oldValue.find(
          (oldItem: any) =>
            !newValue.some(
              (newItem: any) =>
                JSON.stringify(oldItem) === JSON.stringify(newItem),
            ),
        );

        if (removedElement) {
          RemoveShortcutDiv([removedElement]);
        }
      }
    }
  }

  private handleShortcutsChange(
    newValue: { enabled: boolean; name: string }[],
    oldValue: { enabled: boolean; name: string }[],
  ) {
    const addedShortcuts = newValue.filter((newItem: any) => {
      const wasDisabledAndNowEnabled = oldValue.some((oldItem: any) => {
        return oldItem.name === newItem.name && !oldItem.enabled && newItem.enabled;
      });

      const isNewShortcut = !oldValue.some((oldItem: any) => oldItem.name === newItem.name);

      return (wasDisabledAndNowEnabled || isNewShortcut) && newItem.enabled;
    });

    const removedShortcuts = newValue.filter((newItem: any) => {
      const isRemoved = oldValue.some((oldItem: any) => {
        const match = oldItem.name === newItem.name;
        const wasEnabled = oldItem.enabled;
        const isDisabled = !newItem.enabled;
        return match && wasEnabled && isDisabled;
      });

      return isRemoved;
    });

    addShortcuts(addedShortcuts);
    RemoveShortcutDiv(removedShortcuts);
  }

  private handleTransparencyEffectsChange(newValue: boolean) {
    if (newValue) {
      document.documentElement.classList.add("transparencyEffects");
    } else {
      document.documentElement.classList.remove("transparencyEffects");
    }
  }
}
