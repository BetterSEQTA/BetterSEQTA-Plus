class ReactFiber {
  private selector: string; // The selector used to identify the React component
  private debug: boolean; // Flag to enable debug logs
  private messageIdCounter: number = 0; // Counter for unique message IDs

  // Constructor initializes the ReactFiber instance with a selector and options (optional debug flag)
  constructor(
    selector: string,
    options: {
      debug?: boolean; // Optional debug flag
    } = {},
  ) {
    this.selector = selector;
    this.debug = options.debug || false; // Default debug is false if not provided
  }

  // Static method to create a new ReactFiber instance with given selector and options
  static find(
    selector: string,
    options: {
      debug?: boolean; // Optional debug flag
    } = {},
  ) {
    return new ReactFiber(selector, options);
  }

  // Private method to send messages to the window with an action and payload, and wait for a response
  private async sendMessage(action: string, payload: any = {}): Promise<any> {
    return new Promise((resolve, _) => {
      const messageId = this.messageIdCounter++; // Increment the message ID for uniqueness
      const message = {
        type: "reactFiberRequest",
        selector: this.selector,
        action,
        payload,
        debug: this.debug,
        messageId,
      };

      // Listener to process the response from the window
      const listener = (response: any) => {
        if (
          response.data?.type === "reactFiberResponse" && // Ensure it's the correct response type
          response.data?.messageId === messageId // Ensure the response matches the sent message ID
        ) {
          if (this.debug) {
            console.log("Content Received Response:", response.data.response); // Log response if debugging
          }
          resolve(response.data.response); // Resolve with the response data
          window.removeEventListener("message", listener); // Clean up the listener after receiving the response
        }
      };

      window.addEventListener("message", listener); // Add event listener for incoming messages
      window.postMessage(message, "*"); // Send the message to the window
    });
  }

  // Method to get the state of the React component (optionally by key)
  async getState(key?: string | string[]): Promise<any> {
    return this.sendMessage("getState", {
      key, // Key to retrieve specific state (optional)
    });
  }

  // Method to set the state of the React component (either as a direct object or a function)
  async setState(update: any | ((prevState: any) => any)): Promise<ReactFiber> {
    const updateFnString =
      typeof update === "function" ? update.toString() : null; // Convert function to string if necessary
    const updateObject = typeof update !== "function" ? update : null; // Direct object update if not a function

    await this.sendMessage("setState", {
      updateFn: updateFnString, // Send the update function string (if available)
      updateObject, // Send the update object (if available)
    });
    return this; // Return the instance for method chaining
  }

  // Method to get the props of the React component (optionally by prop name)
  async getProps(propName?: string): Promise<any> {
    return this.sendMessage("getProp", {
      propName, // Prop name to retrieve (optional)
    });
  }

  // Method to set a specific prop on the React component
  async setProp(propName: string, value: any): Promise<ReactFiber> {
    await this.sendMessage("setProp", {
      propName, // The prop name to set
      value, // The value to set for the prop
    });
    return this; // Return the instance for method chaining
  }

  // Method to trigger a forced update on the React component
  async forceUpdate(): Promise<ReactFiber> {
    await this.sendMessage("forceUpdate"); // Send the force update action
    return this; // Return the instance for method chaining
  }
}

export default ReactFiber; // Export the ReactFiber class as the default export
