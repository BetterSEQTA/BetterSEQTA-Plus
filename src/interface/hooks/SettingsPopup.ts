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

  /**
   * Registers a callback function to be invoked when the settings popup is closed.
   *
   * @param {SettingsPopupCallback} callback The function to call when the settings popup closes.
   *                                         This callback takes no arguments and returns void.
   */
  public addListener(callback: SettingsPopupCallback): void {
    this.listeners.add(callback);
  }

  /**
   * Unregisters a previously added callback function.
   * After calling this method, the provided callback will no longer be invoked when the settings popup closes.
   *
   * @param {SettingsPopupCallback} callback The callback function to remove from the listeners.
   */
  public removeListener(callback: SettingsPopupCallback): void {
    this.listeners.delete(callback);
  }

  /**
   * Invokes all registered listener callbacks.
   * This method should be called when the settings popup is closed to notify all subscribed components or services.
   */
  public triggerClose(): void {
    this.listeners.forEach((callback) => callback());
  }
}

export const settingsPopup = SettingsPopup.getInstance();
