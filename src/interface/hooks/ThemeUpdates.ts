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

  public static getInstance(): ThemeUpdates {
    if (!ThemeUpdates.instance) {
      ThemeUpdates.instance = new ThemeUpdates();
    }
    return ThemeUpdates.instance;
  }

  public addListener(callback: ThemeUpdateCallback): void {
    this.listeners.add(callback);
  }

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
