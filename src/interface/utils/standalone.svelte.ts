import type { Subscriber, Unsubscriber } from "svelte/store"; // Import types for Svelte store subscriptions

// Define a singleton class to manage a "standalone" state across the app
export class Standalone {
  private static instance: Standalone; // Holds the single instance of Standalone
  private _standalone = $state(false); // Reactive state initialized to false
  private subscribers = new Set<Subscriber<boolean>>(); // Set of subscribed listeners for state changes

  private constructor() {} // Private constructor to prevent direct instantiation

  // Returns the singleton instance of the Standalone class
  public static getInstance(): Standalone {
    if (!Standalone.instance) {
      Standalone.instance = new Standalone(); // Create the instance if it doesn't exist
    }
    return Standalone.instance;
  }

  // Updates the standalone state and notifies all subscribers
  public setStandalone(value: boolean) {
    this._standalone = value;
    this.subscribers.forEach((subscriber) => subscriber(value)); // Notify each subscriber with the new value
  }

  // Getter for the current standalone state
  public get standalone() {
    return this._standalone;
  }

  // Adds a new subscriber and immediately invokes it with the current state
  public subscribe(run: Subscriber<boolean>): Unsubscriber {
    this.subscribers.add(run);
    run(this._standalone); // Invoke the subscriber with the current state

    return () => {
      this.subscribers.delete(run); // Returns a function to unsubscribe
    };
  }
}

// Export the singleton instance for use elsewhere
export const standalone = Standalone.getInstance();
