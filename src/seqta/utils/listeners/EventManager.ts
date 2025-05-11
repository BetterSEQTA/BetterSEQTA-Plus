interface EventListenerOptions {
  elementType?: string; // The type of HTML element (e.g., "div", "button")
  textContent?: string; // The text content of the element
  className?: string; // The class name of the element
  id?: string; // The id of the element
  customCheck?: (element: Element) => boolean; // A custom function to further validate the element
  once?: boolean; // Whether to trigger the event only once
  parentElement?: Element; // The parent element to observe for mutations
}

interface EventListener {
  id: string; // Unique identifier for each event listener
  options: EventListenerOptions; // The options to match elements for the event listener
  callback: (element: Element) => void; // The function to call when an element matches the options
  unregister: () => void; // The function to remove the event listener
}

class EventManager {
  private static instance: EventManager; // Singleton instance of EventManager
  private listeners: Map<string, EventListener[]> = new Map(); // Map of event types to their respective listeners
  private mutationObservers: Map<Element, MutationObserver> = new Map(); // Map of parent elements to MutationObservers
  private pendingElements: Set<Element> = new Set(); // Set of elements pending to be checked
  private throttleTimeout: number = 5; // Throttle timeout in milliseconds
  private throttleTimer: number | undefined; // Timer for throttling the processing of elements
  private chunkSize: number = 50; // Number of elements to process in each chunk

  private constructor() {}

  // Singleton pattern to ensure only one instance of EventManager is created
  public static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  // Initialize EventManager and start observing for mutations
  public static async initialize(): Promise<EventManager> {
    const instance = EventManager.getInstance();
    await instance.startObserving();
    return instance;
  }

  // Register a new event listener for a specific event type
  public register(
    event: string,
    options: EventListenerOptions,
    callback: (element: Element) => void,
  ): { unregister: () => void } {
    const id = this.generateUniqueId(); // Generate a unique ID for the listener
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []); // Initialize the event listener array if it doesn't exist
    }
    const unregister = () => this.unregisterById(event, id); // Function to unregister the listener
    this.listeners.get(event)!.push({ id, options, callback, unregister });

    // Check existing elements that match the listener's options
    this.scanExistingElements(options, callback);

    // Start observing the parent element for mutations
    this.startObserving(options.parentElement);
    return { unregister }; // Return an unregister function to remove the listener
  }

  // Scan existing elements that match the listener's options and trigger the callback
  private async scanExistingElements(
    options: EventListenerOptions,
    callback: (element: Element) => void,
  ): Promise<void> {
    const root = options.parentElement || document.documentElement; // Root element to scan
    const elements = Array.from(root.getElementsByTagName("*")); // Get all elements inside the root
    elements.unshift(root); // Include the root element itself

    // Process elements in chunks to improve performance
    for (let i = 0; i < elements.length; i += this.chunkSize) {
      const chunk = elements.slice(i, i + this.chunkSize); // Slice elements into chunks
      const filteredChunk = chunk.filter((element) =>
        this.matchesOptions(element, options), // Filter elements that match the listener's options
      );
      for (const element of filteredChunk) {
        callback(element); // Call the callback for each matching element
      }
    }
  }

  // Unregister all listeners for a specific event
  public unregister(event: string): void {
    if (this.listeners.has(event)) {
      this.listeners.delete(event); // Remove the event from the listener map
    }
  }

  // Unregister a specific listener by its ID
  private unregisterById(event: string, id: string): void {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event)!;
      this.listeners.set(
        event,
        listeners.filter((listener) => listener.id !== id), // Remove the listener by its ID
      );
    }
  }

  // Start observing mutations for a parent element
  private async startObserving(parentElement?: Element): Promise<void> {
    const elementToObserve = parentElement || document.documentElement; // Default to observing the document root
    if (!this.mutationObservers.has(elementToObserve)) {
      const observer = new MutationObserver(this.handleMutations.bind(this)); // Create a MutationObserver to handle DOM changes
      observer.observe(elementToObserve, {
        childList: true, // Observe for added or removed child elements
        subtree: true, // Observe all descendants
      });
      this.mutationObservers.set(elementToObserve, observer); // Store the observer for the element
    }
  }

  // Handle mutations and process added nodes
  private handleMutations(mutations: MutationRecord[]): void {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.pendingElements.add(node as Element); // Add added elements to the pending set
          }
        });
      }
    });

    this.throttleCheckElements(); // Throttle the processing of pending elements
  }

  // Throttle the processing of pending elements to avoid excessive function calls
  private throttleCheckElements(): void {
    if (this.throttleTimer) return; // If throttling is already in progress, return
    this.throttleTimer = window.setTimeout(() => {
      this.processPendingElements(); // Process pending elements after the throttle timeout
      this.throttleTimer = undefined; // Reset the throttle timer
    }, this.throttleTimeout);
  }

  // Process all pending elements in chunks
  private async processPendingElements(): Promise<void> {
    const elements = Array.from(this.pendingElements); // Convert the pending set to an array
    this.pendingElements.clear(); // Clear the pending elements set
    for (let i = 0; i < elements.length; i += this.chunkSize) {
      const chunk = elements.slice(i, i + this.chunkSize); // Slice elements into chunks
      await this.processChunk(chunk); // Process each chunk
    }
  }

  // Process a chunk of elements using requestAnimationFrame for performance
  private async processChunk(chunk: Element[]): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(async () => {
        for (const element of chunk) {
          await this.checkElement(element); // Check each element in the chunk
        }
        resolve(); // Resolve the promise once all elements are processed
      });
    });
  }

  // Check an element against all event listeners and trigger the callback if it matches
  private async checkElement(element: Element): Promise<void> {
    for (const [event, listeners] of this.listeners.entries()) {
      for (const { id, options, callback } of listeners) {
        if (this.matchesOptions(element, options)) {
          callback(element); // Call the listener's callback if the element matches
          if (options.once) {
            this.unregisterById(event, id); // Unregister the listener if "once" is set to true
          }
        }
      }
    }
  }

  // Check if an element matches the listener's options
  private matchesOptions(
    element: Element,
    options: EventListenerOptions,
  ): boolean {
    if (
      options.elementType &&
      element.tagName.toLowerCase() !== options.elementType.toLowerCase()
    )
      return false; // Check element type
    if (options.textContent && element.textContent !== options.textContent)
      return false; // Check element text content
    if (options.className && !element.classList.contains(options.className))
      return false; // Check element class name
    if (options.id && element.id !== options.id) return false; // Check element ID
    if (options.customCheck && !options.customCheck(element)) return false; // Custom check if provided
    return true; // Return true if all checks pass
  }

  // Generate a unique ID for each listener
  private generateUniqueId(): string {
    return "_" + Math.random().toString(36).substr(2, 9); // Generate a random string as a unique ID
  }
}

// Export an instance of the EventManager singleton
export const eventManager = EventManager.getInstance();
// Export an async function to initialize the EventManager
export const initializeEventManager = async () =>
  await EventManager.initialize();
