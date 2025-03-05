type SettingsPopupCallback = () => void;

/** 
 * This is a singleton that triggers an update when the settings popup is closed.
 * This is used to close the colour picker.
 * Usage:
 *  settingsPopup.addListener(() => {
 *    console.log('Settings popup closed');
 *  });
*/ 
class SettingsPopup {
  private static instance: SettingsPopup;
  private listeners: Set<SettingsPopupCallback> = new Set();

  private constructor() {}

  public static getInstance(): SettingsPopup {
    if (!SettingsPopup.instance) {
      SettingsPopup.instance = new SettingsPopup();
    }
    return SettingsPopup.instance;
  }

  public addListener(callback: SettingsPopupCallback): void {
    this.listeners.add(callback);
  }

  public removeListener(callback: SettingsPopupCallback): void {
    this.listeners.delete(callback);
  }

  public triggerClose(): void {
    this.listeners.forEach(callback => callback());
  }
}

export const settingsPopup = SettingsPopup.getInstance();
