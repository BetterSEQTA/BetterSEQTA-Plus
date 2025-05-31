type ThemeUpdateCallback = () => void;

/**
 * A singleton class used to notify listeners about theme-related updates.
 * These updates can include events like theme changes, custom theme modifications,
 * or any other event that might require UI components to refresh their appearance
 * or re-apply theme styles.
 */
class ThemeUpdates {
  private static instance: ThemeUpdates;
  private listeners: Set<ThemeUpdateCallback> = new Set();

  private constructor() {}

  /**
   * Gets the singleton instance of the ThemeUpdates class.
   * @returns {ThemeUpdates} The singleton instance.
   */
  public static getInstance(): ThemeUpdates {
    if (!ThemeUpdates.instance) {
      ThemeUpdates.instance = new ThemeUpdates();
    }
    return ThemeUpdates.instance;
  }

  /**
   * Registers a callback function to be invoked when a theme update is triggered.
   *
   * @param {ThemeUpdateCallback} callback The function to call when a theme update occurs.
   *                                       This callback takes no arguments and returns void.
   */
  public addListener(callback: ThemeUpdateCallback): void {
    this.listeners.add(callback);
  }

  /**
   * Unregisters a previously added callback function.
   * After calling this method, the provided callback will no longer be invoked when a theme update is triggered.
   *
   * @param {ThemeUpdateCallback} callback The callback function to remove from the listeners.
   */
  public removeListener(callback: ThemeUpdateCallback): void {
    this.listeners.delete(callback);
  }

  /**
   * Invokes all registered listener callbacks, signifying that a theme-related update has occurred.
   * This method should be called whenever a change related to themes happens that requires
   * other parts of the application to be notified.
   */
  public triggerUpdate(): void {
    this.listeners.forEach((callback) => callback());
  }
}

export const themeUpdates = ThemeUpdates.getInstance();
