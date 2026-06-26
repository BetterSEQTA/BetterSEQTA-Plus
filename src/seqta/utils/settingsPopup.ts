type SettingsPopupCallback = () => void;

/**
 * Singleton that notifies listeners when the in-page settings popup closes.
 * Used by the colour picker and other overlays tied to ExtensionPopup.
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
    this.listeners.forEach((callback) => callback());
  }
}

export const settingsPopup = SettingsPopup.getInstance();
