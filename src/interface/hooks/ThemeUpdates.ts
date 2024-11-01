type ThemeUpdateCallback = () => void;

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

  public triggerUpdate(): void {
    this.listeners.forEach(callback => callback());
  }
}

export const themeUpdates = ThemeUpdates.getInstance();
