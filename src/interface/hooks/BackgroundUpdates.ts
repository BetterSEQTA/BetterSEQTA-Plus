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

  public static getInstance(): BackgroundUpdates {
    if (!BackgroundUpdates.instance) {
      BackgroundUpdates.instance = new BackgroundUpdates();
    }
    return BackgroundUpdates.instance;
  }

  public addListener(callback: BackgroundUpdateCallback): void {
    this.listeners.add(callback);
  }

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
