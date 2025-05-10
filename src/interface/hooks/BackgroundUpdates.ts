// Define a type for the callback function to handle background updates
type BackgroundUpdateCallback = () => void;

class BackgroundUpdates {
  // Singleton instance of the BackgroundUpdates class
  private static instance: BackgroundUpdates;
  
  // Set to store all registered listeners for background updates
  private listeners: Set<BackgroundUpdateCallback> = new Set();

  // Private constructor to prevent direct instantiation
  private constructor() {}

  // Public method to get the single instance of the BackgroundUpdates class
  public static getInstance(): BackgroundUpdates {
    if (!BackgroundUpdates.instance) {
      BackgroundUpdates.instance = new BackgroundUpdates(); // Create the instance if it doesn't exist
    }
    return BackgroundUpdates.instance; // Return the singleton instance
  }

  // Method to add a listener callback function to the listeners set
  public addListener(callback: BackgroundUpdateCallback): void {
    this.listeners.add(callback); // Add the callback to the set of listeners
  }

  // Method to remove a listener callback function from the listeners set
  public removeListener(callback: BackgroundUpdateCallback): void {
    this.listeners.delete(callback); // Remove the callback from the set of listeners
  }

  // Method to trigger all registered listener callbacks
  public triggerUpdate(): void {
    this.listeners.forEach((callback) => callback()); // Call each listener callback
  }
}

// Export the singleton instance of the BackgroundUpdates class
export const backgroundUpdates = BackgroundUpdates.getInstance();
