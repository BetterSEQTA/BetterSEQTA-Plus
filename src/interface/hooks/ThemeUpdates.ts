// Define a type for the callback function to handle theme update events
type ThemeUpdateCallback = () => void;

class ThemeUpdates {
  // Singleton instance of the ThemeUpdates class
  private static instance: ThemeUpdates;
  
  // Set to store all registered listeners for theme update events
  private listeners: Set<ThemeUpdateCallback> = new Set();

  // Private constructor to prevent direct instantiation
  private constructor() {}

  // Public method to get the single instance of the ThemeUpdates class
  public static getInstance(): ThemeUpdates {
    if (!ThemeUpdates.instance) {
      ThemeUpdates.instance = new ThemeUpdates(); // Create the instance if it doesn't exist
    }
    return ThemeUpdates.instance; // Return the singleton instance
  }

  // Method to add a listener callback function to the listeners set
  public addListener(callback: ThemeUpdateCallback): void {
    this.listeners.add(callback); // Add the callback to the set of listeners
  }

  // Method to remove a listener callback function from the listeners set
  public removeListener(callback: ThemeUpdateCallback): void {
    this.listeners.delete(callback); // Remove the callback from the set of listeners
  }

  // Method to trigger all registered listener callbacks for a theme update
  public triggerUpdate(): void {
    this.listeners.forEach((callback) => callback()); // Call each listener callback
  }
}

// Export the singleton instance of the ThemeUpdates class
export const themeUpdates = ThemeUpdates.getInstance();
