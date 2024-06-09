import { settingsState } from './SettingsState';
import { updateAllColors } from '../../ui/colors/Manager';
import {
  CreateBackground,
  CreateCustomShortcutDiv,
  RemoveBackground,
  RemoveShortcutDiv,
  addShortcuts,
  disableNotificationCollector,
  enableNotificationCollector,
} from '../../../SEQTA';
import { updateBgDurations } from '../../ui/Animation';
import browser from 'webextension-polyfill';

export class StorageChangeHandler {
  constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    console.log(settingsState.onoff);
    settingsState.register('selectedColor', this.handleSelectedColorChange.bind(this));
    settingsState.register('onoff', this.handleOnOffChange.bind(this));
    settingsState.register('shortcuts', this.handleShortcutsChange.bind(this));
    settingsState.register('customshortcuts', this.handleCustomShortcutsChange.bind(this));
    settingsState.register('notificationcollector', this.handleNotificationCollectorChange.bind(this));
    settingsState.register('bksliderinput', this.handleBksliderInputChange.bind(this));
    settingsState.register('animatedbk', this.handleAnimatedBkChange.bind(this));
    settingsState.register('transparencyEffects', this.handleTransparencyEffectsChange.bind(this));
  }

  private handleSelectedColorChange(newColor: any) {
    try {
      updateAllColors(newColor);
    } catch (err) {
      console.error(err);
    }
  }

  private handleOnOffChange() {
    browser.runtime.sendMessage({ type: 'reloadTabs' });
  }

  private handleNotificationCollectorChange(newValue: any) {
    if (newValue) {
      enableNotificationCollector();
    } else {
      disableNotificationCollector();
    }
  }

  private handleCustomShortcutsChange(oldValue: any, newValue: any) {
    if (newValue) {
      if (newValue.length > oldValue.length) {
        CreateCustomShortcutDiv(newValue[oldValue.length]);
      } else if (newValue.length < oldValue.length) {
        const removedElement = oldValue.find(
          (oldItem: any) => !newValue.some((newItem: any) => JSON.stringify(oldItem) === JSON.stringify(newItem))
        );

        if (removedElement) {
          RemoveShortcutDiv([removedElement]);
        }
      }
    }
  }

  private handleShortcutsChange(oldValue: any, newValue: any) {
    const addedShortcuts = newValue.filter((newItem: any) => {
      const isAdded = oldValue.some((oldItem: any) => {
        const match = oldItem.name === newItem.name;
        const wasDisabled = !oldItem.enabled;
        const isEnabled = newItem.enabled;
        return match && wasDisabled && isEnabled;
      });

      return isAdded;
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

  private handleBksliderInputChange(newValue: any) {
    updateBgDurations(newValue);
  }

  private handleAnimatedBkChange(newValue: boolean) {
    if (newValue) {
      CreateBackground();
    } else {
      RemoveBackground();
      document.getElementById('container')!.style.background = 'var(--background-secondary)';
    }
  }

  private handleTransparencyEffectsChange(newValue: boolean) {
    if (newValue) {
      document.documentElement.classList.add('transparencyEffects');
    } else {
      document.documentElement.classList.remove('transparencyEffects');
    }
  }
}