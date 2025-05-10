class ReactFiber {
  constructor(selector, options = {}) {
    this.selector = selector;
    this.debug = options.debug || false;
    this.nodes = [...document.querySelectorAll(selector)]; // Support multiple elements
    this.fibers = this.nodes.map((node) => this.getFiberNode(node));
    this.components = this.fibers.map((fiber) => this.getOwnerComponent(fiber));

    if (this.debug) {
      console.log("Selected Nodes:", this.nodes);
      console.log("🔍 Found Fibers:", this.fibers);
      console.log("🛠 Found Components:", this.components);
    }
  }

  static find(selector, options = {}) {
    return new ReactFiber(selector, options);class ReactFiber {
  // Constructor for initializing the ReactFiber instance
  constructor(selector, options = {}) {
    this.selector = selector; // CSS selector to identify the nodes
    this.debug = options.debug || false; // Debugging flag for logging
    this.nodes = [...document.querySelectorAll(selector)]; // Support multiple elements
    this.fibers = this.nodes.map((node) => this.getFiberNode(node)); // Get the fiber nodes associated with the elements
    this.components = this.fibers.map((fiber) => this.getOwnerComponent(fiber)); // Get the owner components for each fiber node

    // If debugging is enabled, log selected nodes, fibers, and components
    if (this.debug) {
      console.log("Selected Nodes:", this.nodes);
      console.log("🔍 Found Fibers:", this.fibers);
      console.log("🛠 Found Components:", this.components);
    }
  }

  // Static method to create a new ReactFiber instance
  static find(selector, options = {}) {
    return new ReactFiber(selector, options);
  }

  // Method to retrieve the fiber node associated with an element
  getFiberNode(node) {
    if (!node) return null;
    const fiberKey = Object.getOwnPropertyNames(node).find(
      (name) =>
        name.startsWith("__reactFiber") ||
        name.startsWith("__reactInternalInstance"),
    );
    return fiberKey ? node[fiberKey] : null;
  }

  // Method to retrieve the owner component for a given fiber node
  getOwnerComponent(fiberNode) {
    let current = fiberNode;
    while (current) {
      if (
        current.stateNode &&
        (current.stateNode.setState || current.stateNode.forceUpdate)
      ) {
        return current.stateNode;
      }
      current = current.return; // Traverse the fiber tree
    }
    return null;
  }

  // Method to get the state of the component
  getState(key) {
    if (!this.components.length) return null; // Return null if no components
    const state = this.components[0]?.state || null; // Retrieve the state of the first component

    // Return the entire state, specific state key, or filtered state based on the provided key(s)
    if (key === undefined) {
      return state;
    } else if (typeof key === "string") {
      return state?.[key];
    } else if (Array.isArray(key)) {
      const filteredState = {};
      for (const k of key) {
        if (state && Object.hasOwn(state, k)) {
          filteredState[k] = state[k];
        }
      }
      return filteredState;
    }
    return null;
  }

  // Method to update the state of the component(s)
  setState(update) {
    this.components.forEach((component) => {
      if (component?.setState) {
        if (typeof update === "function") {
          // Functional update
          component.setState((prevState) => {
            const newState = update(prevState);
            if (this.debug)
              console.log("✅ Updated State (Functional):", newState);
            return newState;
          });
        } else {
          // Object update (merge with existing state)
          component.setState((prevState) => {
            const newState = {
              ...prevState,
              ...update,
            };
            if (this.debug)
              console.log("✅ Updated State (Object Merge):", newState);
            return newState;
          });
        }
      }
    });
    return this; // Enable chaining
  }

  // Method to get the properties of the component
  getProp(propName) {
    if (!this.fibers.length) return null; // Return null if no fibers

    if (propName === undefined) {
      return this.fibers[0]?.memoizedProps;
    }

    return this.fibers[0]?.memoizedProps?.[propName];
  }

  // Method to set a property of the component
  setProp(propName, value) {
    this.fibers.forEach((fiber) => {
      if (fiber?.memoizedProps) {
        fiber.memoizedProps[propName] = value;
      }
    });
    return this; // Enable chaining
  }

  // Method to force the component(s) to re-render
  forceUpdate() {
    this.components.forEach((component) => {
      if (component?.forceUpdate) {
        component.forceUpdate();
        if (this.debug) console.log("🔄 Forced React Re-render");
      }
    });
    return this; // Enable chaining
  }
}

// Utility function to serialize non-serializable objects like DOM nodes or functions
function makeSerializable(obj) {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => makeSerializable(item)); // Handle arrays
  }

  const serializableObj = {};
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      let value = obj[key];

      // Serialize functions as "[Function]" string
      if (typeof value === "function") {
        value = "[Function]";
      } 
      // Serialize DOM elements to their ID and tagName
      else if (value instanceof HTMLElement) {
        value = {
          type: "HTMLElement",
          id: value.id,
          tagName: value.tagName,
        }; // Replace DOM node with ID/tag info
      } 
      // Serialize symbols to their string representation
      else if (typeof value === "symbol") {
        value = value.toString();
      } 
      // Recursively serialize nested objects
      else if (typeof value === "object" && value !== null) {
        value = makeSerializable(value);
      }

      serializableObj[key] = value;
    }
  }
  return serializableObj;
}

// Listen for messages to perform actions related to React fibers
window.addEventListener("message", (event) => {
  if (event.data.type === "reactFiberRequest") {
    const { selector, action, payload, debug, messageId } = event.data;
    const fiberInstance = ReactFiber.find(selector, {
      debug,
    });

    let response;
    switch (action) {
      case "getState":
        response = fiberInstance.getState(payload.key); // Get state for specified key
        break;
      case "setState":
        // Handle both function and object updates for state
        if (payload.updateFn) {
          const updateFn = eval(`(${payload.updateFn})`); // Convert string to function
          fiberInstance.setState(updateFn);
        } else {
          fiberInstance.setState(payload.updateObject); // Object update
        }
        response = {};
        break;

      case "getProp":
        response = fiberInstance.getProp(payload.propName); // Get property value
        break;
      case "setProp":
        fiberInstance.setProp(payload.propName, payload.value); // Set property value
        response = {};
        break;
      case "forceUpdate":
        fiberInstance.forceUpdate(); // Force re-render
        response = {};
        break;
      default:
        console.warn(`[pageState] Unknown action: ${action}`);
        response = null;
    }

    // Serialize response if it's an object before sending back
    if (response !== null && typeof response === "object") {
      response = makeSerializable(response);
    }

    window.postMessage(
      {
        type: "reactFiberResponse",
        response,
        messageId,
      },
      "*", // Send the response back
    );
  }
});

  }

  getFiberNode(node) {
    if (!node) return null;
    const fiberKey = Object.getOwnPropertyNames(node).find(
      (name) =>
        name.startsWith("__reactFiber") ||
        name.startsWith("__reactInternalInstance"),
    );
    return fiberKey ? node[fiberKey] : null;
  }

  getOwnerComponent(fiberNode) {
    let current = fiberNode;
    while (current) {
      if (
        current.stateNode &&
        (current.stateNode.setState || current.stateNode.forceUpdate)
      ) {
        return current.stateNode;
      }
      current = current.return;
    }
    return null;
  }

  getState(key) {
    if (!this.components.length) return null;
    const state = this.components[0]?.state || null;

    if (key === undefined) {
      return state;
    } else if (typeof key === "string") {
      return state?.[key];
    } else if (Array.isArray(key)) {
      const filteredState = {};
      for (const k of key) {
        if (state && Object.hasOwn(state, k)) {
          filteredState[k] = state[k];
        }
      }
      return filteredState;
    }
    return null;
  }

  setState(update) {
    this.components.forEach((component) => {
      if (component?.setState) {
        if (typeof update === "function") {
          // Functional update
          component.setState((prevState) => {
            const newState = update(prevState);
            if (this.debug)
              console.log("✅ Updated State (Functional):", newState);
            return newState;
          });
        } else {
          // Object update (merge with existing state)
          component.setState((prevState) => {
            const newState = {
              ...prevState,
              ...update,
            };
            if (this.debug)
              console.log("✅ Updated State (Object Merge):", newState);
            return newState;
          });
        }
      }
    });
    return this;
  }

  getProp(propName) {
    if (!this.fibers.length) return null;

    if (propName === undefined) {
      return this.fibers[0]?.memoizedProps;
    }

    return this.fibers[0]?.memoizedProps?.[propName];
  }

  setProp(propName) {
    this.fibers.forEach((fiber) => {
      if (fiber?.memoizedProps) {
        fiber.memoizedProps[propName] = value;
      }
    });
    return this; // Enable chaining
  }

  forceUpdate() {
    this.components.forEach((component) => {
      if (component?.forceUpdate) {
        component.forceUpdate();
        if (this.debug) console.log("🔄 Forced React Re-render");
      }
    });
    return this; // Enable chaining
  }
}

function makeSerializable(obj) {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => makeSerializable(item));
  }

  const serializableObj = {};
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      let value = obj[key];

      if (typeof value === "function") {
        value = "[Function]";
      } else if (value instanceof HTMLElement) {
        value = {
          type: "HTMLElement",
          id: value.id,
          tagName: value.tagName,
        }; // Replace DOM node with ID/tag info
      } else if (typeof value === "symbol") {
        value = value.toString();
      } else if (typeof value === "object" && value !== null) {
        value = makeSerializable(value);
      }

      serializableObj[key] = value;
    }
  }
  return serializableObj;
}

window.addEventListener("message", (event) => {
  if (event.data.type === "reactFiberRequest") {
    const { selector, action, payload, debug, messageId } = event.data;
    const fiberInstance = ReactFiber.find(selector, {
      debug,
    });

    let response;
    switch (action) {
      case "getState":
        response = fiberInstance.getState(payload.key);
        break;
      case "setState":
        // Handle both function and object updates
        if (payload.updateFn) {
          const updateFn = eval(`(${payload.updateFn})`);
          fiberInstance.setState(updateFn);
        } else {
          fiberInstance.setState(payload.updateObject);
        }
        response = {};
        break;

      case "getProp":
        response = fiberInstance.getProp(payload.propName);
        break;
      case "setProp":
        fiberInstance.setProp(payload.propName, payload.value);
        response = {};
        break;
      case "forceUpdate":
        fiberInstance.forceUpdate();
        response = {};
        break;
      default:
        console.warn(`[pageState] Unknown action: ${action}`);
        response = null;
    }

    if (response !== null && typeof response === "object") {
      response = makeSerializable(response);
    }

    window.postMessage(
      {
        type: "reactFiberResponse",
        response,
        messageId,
      },
      "*",
    );
  }
});
