type BackgroundUpdateCallback = () => void;

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

  public triggerUpdate(): void {
    this.listeners.forEach(callback => callback());
  }
}

export const backgroundUpdates = BackgroundUpdates.getInstance();
