// Define a type for the callback function to handle settings popup close event
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
  // Singleton instance of the SettingsPopup class
  private static instance: SettingsPopup;
  
  // Set to store all registered listeners for settings popup close events
  private listeners: Set<SettingsPopupCallback> = new Set();

  // Private constructor to prevent direct instantiation
  private constructor() {}

  // Public method to get the single instance of the SettingsPopup class
  public static getInstance(): SettingsPopup {
    if (!SettingsPopup.instance) {
      SettingsPopup.instance = new SettingsPopup(); // Create the instance if it doesn't exist
    }
    return SettingsPopup.instance; // Return the singleton instance
  }

  // Method to add a listener callback function to the listeners set
  public addListener(callback: SettingsPopupCallback): void {
    this.listeners.add(callback); // Add the callback to the set of listeners
  }

  // Method to remove a listener callback function from the listeners set
  public removeListener(callback: SettingsPopupCallback): void {
    this.listeners.delete(callback); // Remove the callback from the set of listeners
  }

  // Method to trigger all registered listener callbacks when the settings popup is closed
  public triggerClose(): void {
    this.listeners.forEach((callback) => callback()); // Call each listener callback
  }
}

// Export the singleton instance of the SettingsPopup class
export const settingsPopup = SettingsPopup.getInstance();
