/* global chrome */

import {
  CreateBackground,
  CreateCustomShortcutDiv,
  RemoveBackground,
  RemoveShortcutDiv,
  addShortcuts,
  disableNotificationCollector,
  enableNotificationCollector,
} from "../../SEQTA.js";
import { updateBgDurations } from "../ui/Animation.js";
import { updateAllColors } from "../ui/Colors.js";

export default class StorageListener {
  constructor() {
    chrome.storage.onChanged.addListener(this.handleStorageChanges.bind(this));
  }

  handleStorageChanges(changes) {
    if (changes.selectedColor) {
      this.handleSelectedColorChange(changes.selectedColor.newValue);
    }

    if (changes.shortcuts) {
      this.handleShortcutsChange(
        changes.shortcuts.oldValue,
        changes.shortcuts.newValue
      );
    }

    if (changes?.customshortcuts?.newValue) {
      this.handleCustomShortcutsChange(
        changes.customshortcuts.oldValue,
        changes.customshortcuts.newValue
      );
    }

    if (changes.notificationcollector) {
      this.handleNotificationCollectorChange(changes.notificationcollector);
    }

    if (changes.bksliderinput) {
      updateBgDurations(changes.bksliderinput.newValue);
    }

    if (changes.animatedbk !== undefined) {
      if (changes.animatedbk.newValue) {
        CreateBackground();
      } else {
        RemoveBackground();
        document.getElementById("container").style.background = "var(--background-secondary)";
      }
    }
  }

  handleSelectedColorChange(newColor) {
    try {
      updateAllColors(null, newColor);
    } catch (err) {
      console.error(err);
    }
  }

  handleNotificationCollectorChange(details) {
    if (details.newValue) {
      enableNotificationCollector();
    } else {
      disableNotificationCollector();
    }
  }

  handleCustomShortcutsChange(oldValue, newValue) {
    // Check for addition
    if (newValue.length > oldValue.length) {
      CreateCustomShortcutDiv(newValue[oldValue.length]);
    }
    // Check for removal
    else if (newValue.length < oldValue.length) {
      const removedElement = oldValue.find(
        (oldItem) =>
          !newValue.some(
            (newItem) => JSON.stringify(oldItem) === JSON.stringify(newItem)
          )
      );

      if (removedElement) {
        RemoveShortcutDiv(removedElement);
      }
    }
  }

  handleShortcutsChange(oldValue, newValue) {
    // Find Added Shortcuts
    const addedShortcuts = newValue.filter(newItem => {
      const isAdded = oldValue.some(oldItem => {
        const match = oldItem.name === newItem.name;
        const wasDisabled = !oldItem.enabled;
        const isEnabled = newItem.enabled;        
        return match && wasDisabled && isEnabled;
      });
    
      return isAdded;
    });
  
    // Find Removed Shortcuts
    const removedShortcuts = newValue.filter(newItem => {
      const isRemoved = oldValue.some(oldItem => {
        const match = oldItem.name === newItem.name;
        const wasEnabled = oldItem.enabled;  // Was enabled in the old array
        const isDisabled = !newItem.enabled;  // Is disabled in the new array
        
        return match && wasEnabled && isDisabled;
      });
    
      return isRemoved;
    });

    // Add new shortcuts to the UI
    addShortcuts(addedShortcuts);
  
    // Remove deleted shortcuts from the UI
    RemoveShortcutDiv(removedShortcuts);
  }  
}