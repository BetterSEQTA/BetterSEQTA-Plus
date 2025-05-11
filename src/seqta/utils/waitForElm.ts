import { eventManager } from "@/seqta/utils/listeners/EventManager"; // Import event manager for custom event handling
import { delay } from "@/seqta/utils/delay"; // Import delay function

// Function to wait for an element to appear in the DOM
export async function waitForElm(
  selector: string, // The CSS selector of the element to find
  usePolling: boolean = false, // Flag to determine if polling should be used (default: false)
  interval: number = 100, // Interval time for polling (in milliseconds, default: 100)
  maxIterations?: number, // Optional maximum number of polling iterations before giving up
): Promise<Element> { // Returns a Promise that resolves with the found element

  // If polling is enabled, check for the element at regular intervals
  if (usePolling) {
    return new Promise((resolve, reject) => {
      let iterations = 0; // Counter for the number of polling iterations
      if (maxIterations) {
        iterations = 0; // Initialize iterations to 0
      }

      const checkForElement = () => {
        const element = document.querySelector(selector); // Try to find the element using the selector
        if (element) {
          resolve(element); // Resolve if element is found
        } else {
          if (maxIterations) {
            iterations++;
            if (iterations >= maxIterations) {
              reject(new Error("Element not found")); // Reject if maximum iterations are reached
            }
          }
          setTimeout(checkForElement, interval); // Retry after the specified interval
        }
      };

      // Wait for the DOM to be fully loaded before starting to check for the element
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", checkForElement);
      } else {
        checkForElement(); // If already loaded, start checking immediately
      }
    });
  } else {
    // If polling is not used, listen for custom events to detect the element
    return new Promise((resolve) => {
      const registerObserver = () => {
        const { unregister } = eventManager.register(
          `${selector}`, // Register an event listener for the selector
          {
            customCheck: (element) => element.matches(selector), // Check if the element matches the selector
          },
          async (element) => {
            resolve(element); // Resolve when the element is found
            await delay(1); // Optionally add a delay
            unregister(); // Unregister the event listener once the element is found
          },
        );
        return unregister; // Return the unregister function
      };

      let unregister = null;

      // If the DOM is still loading, wait for it to be ready before registering the observer
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          unregister = registerObserver(); // Register the observer after the DOM is ready
        });
      } else {
        unregister = registerObserver(); // Register the observer if DOM is already ready
      }

      // Try to find the element immediately
      const querySelector = () => document.querySelector(selector);
      const element = querySelector();

      if (element) {
        if (unregister) unregister(); // Unregister observer if element is already found
        resolve(element); // Resolve with the found element
        return; // Exit early if element is found
      }
    });
  }
}
