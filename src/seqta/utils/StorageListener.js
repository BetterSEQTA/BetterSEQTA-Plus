/* global chrome */

import {
  CreateCustomShortcutDiv,
  RemoveCustomShortcutDiv,
} from "../../SEQTA.js";
import { updateAllColors } from "../ui/Colors.js";

export default class StorageListener {
  constructor() {
    chrome.storage.onChanged.addListener(this.handleStorageChanges.bind(this));
  }

  handleStorageChanges(changes) {
    if (changes.selectedColor) {
      this.handleSelectedColorChange(changes.selectedColor.newValue);
    }

    if (changes?.customshortcuts?.newValue) {
      this.handleCustomShortcutsChange(
        changes.customshortcuts.oldValue,
        changes.customshortcuts.newValue
      );
    }
  }

  handleSelectedColorChange(newColor) {
    try {
      updateAllColors(null, newColor);
    } catch (err) {
      console.error(err);
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
        RemoveCustomShortcutDiv(removedElement);
      }
    }
  }
}