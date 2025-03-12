import { settingsState } from './SettingsState';
import { updateAllColors } from '@/seqta/ui/colors/Manager';


import { addShortcuts } from "@/seqta/utils/Adders/AddShortcuts";
import { CreateBackground } from "@/seqta/utils/CreateEnable/CreateBackground";
import { CreateCustomShortcutDiv } from "@/seqta/utils/CreateEnable/CreateCustomShortcutDiv";
import { disableNotificationCollector } from "@/seqta/utils/DisableRemove/DisableNotificationCollector";
import { enableNotificationCollector } from "@/seqta/utils/CreateEnable/EnableNotificationCollector";
import { FilterUpcomingAssessments } from "@/seqta/utils/FilterUpcomingAssessments";
import { RemoveBackground } from "@/seqta/utils/DisableRemove/RemoveBackground";
import { RemoveShortcutDiv } from "@/seqta/utils/DisableRemove/RemoveShortcutDiv";


import { updateBgDurations } from '@/seqta/ui/Animation';
import browser from 'webextension-polyfill';
import type { CustomShortcut } from '@/types/storage';

export class StorageChangeHandler {
  constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    settingsState.register('selectedColor', updateAllColors.bind(this));
    settingsState.register('DarkMode', this.handleDarkModeChange.bind(this));
    settingsState.register('onoff', this.handleOnOffChange.bind(this));
    settingsState.register('shortcuts', this.handleShortcutsChange.bind(this));
    settingsState.register('customshortcuts', this.handleCustomShortcutsChange.bind(this));
    settingsState.register('notificationcollector', this.handleNotificationCollectorChange.bind(this));
    settingsState.register('bksliderinput', updateBgDurations.bind(this));
    settingsState.register('animatedbk', this.handleAnimatedBkChange.bind(this));
    settingsState.register('transparencyEffects', this.handleTransparencyEffectsChange.bind(this));
    settingsState.register('subjectfilters', FilterUpcomingAssessments.bind(this));
  }

  private handleDarkModeChange() {
    updateAllColors();
  }

  private handleOnOffChange(newValue: boolean) {
    if (newValue) return;
    browser.runtime.sendMessage({ type: 'reloadTabs' });
  }

  private handleNotificationCollectorChange(newValue: boolean) {
    if (newValue) {
      enableNotificationCollector();
    } else {
      disableNotificationCollector();
    }
  }

  private handleCustomShortcutsChange(newValue: CustomShortcut[], oldValue: CustomShortcut[]) {
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

  private handleShortcutsChange(newValue: { enabled: boolean, name: string }[], oldValue: { enabled: boolean, name: string }[]) {
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