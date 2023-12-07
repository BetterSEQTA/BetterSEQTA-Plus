import browser from 'webextension-polyfill'

import {
  CreateBackground,
  CreateCustomShortcutDiv,
  RemoveBackground,
  RemoveShortcutDiv,
  addShortcuts,
  disableNotificationCollector,
  enableNotificationCollector,
} from '../../SEQTA';
import { updateBgDurations } from '../ui/Animation';
import { getDarkMode, updateAllColors } from '../ui/colors/Manager';


export default class StorageListener {
  darkMode: any;
  constructor() {
    this.darkMode = getDarkMode();
    browser.storage.onChanged.addListener(this.handleStorageChanges.bind(this));
  }

  handleStorageChanges(changes: any) {
    Object.keys(changes).forEach((changeKey) => {
      switch (changeKey) {

      case 'selectedColor':
        this.handleSelectedColorChange(changes.selectedColor.newValue);
        break;

      case 'telemetry':
        this.handleTelemetryChange();
        break;

      case 'onoff':
        this.handleOnOffChange();
        break;

      case 'shortcuts':
        this.handleShortcutsChange(
          changes.shortcuts.oldValue,
          changes.shortcuts.newValue
        );
        break;

      case 'DarkMode':
        this.darkMode = changes.DarkMode.newValue;
        console.log(this.darkMode);
        break;

      case 'customshortcuts':
        if (changes.customshortcuts.newValue) {
          this.handleCustomShortcutsChange(
            changes.customshortcuts.oldValue,
            changes.customshortcuts.newValue
          );
        }
        break;

      case 'notificationcollector':
        this.handleNotificationCollectorChange(changes.notificationcollector);
        break;

      case 'bksliderinput':
        updateBgDurations(changes.bksliderinput.newValue);
        break;

      case 'animatedbk':
        if (changes.animatedbk.newValue) {
          CreateBackground();
        } else {
          RemoveBackground();
          document.getElementById('container')!.style.background = 'var(--background-secondary)';
        }
        break;

      case 'transparencyEffects':
        if (changes.transparencyEffects.newValue) {
          document.documentElement.classList.add('transparencyEffects');
        } else {
          document.documentElement.classList.remove('transparencyEffects');
        }
        break;

      // Add default case if you need to handle a case where changeKey does not match any case
      default:
        // Handle unknown changeKey if necessary
        break;
      }
    });
  }  

  handleSelectedColorChange(newColor: any) {
    try {
      updateAllColors(this.darkMode, newColor);
    } catch (err) {
      console.error(err);
    }
  }

  handleTelemetryChange() {
    browser.runtime.sendMessage({ type: 'reloadTabs' })
  }

  handleOnOffChange() {
    browser.runtime.sendMessage({ type: 'reloadTabs' })
  }

  handleNotificationCollectorChange(details: any) {
    if (details.newValue) {
      enableNotificationCollector();
    } else {
      disableNotificationCollector();
    }
  }

  handleCustomShortcutsChange(oldValue: any, newValue: any) {
    // Check for addition
    if (newValue.length > oldValue.length) {
      CreateCustomShortcutDiv(newValue[oldValue.length]);
    }
    // Check for removal
    else if (newValue.length < oldValue.length) {
      const removedElement = oldValue.find(
        (oldItem: any) =>
          !newValue.some(
            (newItem: any) => JSON.stringify(oldItem) === JSON.stringify(newItem)
          )
      );

      if (removedElement) {
        RemoveShortcutDiv(removedElement);
      }
    }
  }

  handleShortcutsChange(oldValue: any, newValue: any) {
    // Find Added Shortcuts
    const addedShortcuts = newValue.filter((newItem: any) => {
      const isAdded = oldValue.some((oldItem: any) => {
        const match = oldItem.name === newItem.name;
        const wasDisabled = !oldItem.enabled;
        const isEnabled = newItem.enabled;        
        return match && wasDisabled && isEnabled;
      });
    
      return isAdded;
    });
  
    // Find Removed Shortcuts
    const removedShortcuts = newValue.filter((newItem: any) => {
      const isRemoved = oldValue.some((oldItem: any) => {
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