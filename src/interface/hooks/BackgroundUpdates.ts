type BackgroundUpdateCallback = () => void;

/**
 * A singleton class used to notify listeners about generic background updates or events.
 * These updates typically signify that UI components or other parts of the application
 * might need to refresh or re-evaluate background-related data (e.g., after a new background
 * image is added, removed, or changed).
 */
class BackgroundUpdates {
  private static instance: BackgroundUpdates;
  private listeners: Set<BackgroundUpdateCallback> = new Set();

  private constructor() {}

  /**
   * Gets the singleton instance of the BackgroundUpdates class.
   * @returns {BackgroundUpdates} The singleton instance.
   */
  public static getInstance(): BackgroundUpdates {
    if (!BackgroundUpdates.instance) {
      BackgroundUpdates.instance = new BackgroundUpdates();
    }
    return BackgroundUpdates.instance;
  }

  /**
   * Registers a callback function to be invoked when a background update is triggered.
   *
   * @param {BackgroundUpdateCallback} callback The function to call when a background update occurs.
   *                                            This callback takes no arguments and returns void.
   */
  public addListener(callback: BackgroundUpdateCallback): void {
    this.listeners.add(callback);
  }

  /**
   * Unregisters a previously added callback function.
   * After calling this method, the provided callback will no longer be invoked when a background update is triggered.
   *
   * @param {BackgroundUpdateCallback} callback The callback function to remove from the listeners.
   */
  public removeListener(callback: BackgroundUpdateCallback): void {
    this.listeners.delete(callback);
  }

  /**
   * Invokes all registered listener callbacks, signifying that a background update has occurred.
   * This method should be called whenever a change to background data happens that requires
   * other parts of the application to be notified.
   */
  public triggerUpdate(): void {
    this.listeners.forEach((callback) => callback());
  }
}

export const backgroundUpdates = BackgroundUpdates.getInstance();
