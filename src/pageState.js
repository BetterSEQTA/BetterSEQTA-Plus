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
      
      // Debug fiber info
      this.fibers.forEach((fiber, index) => {
        if (fiber) {
          console.log(`Fiber ${index}:`, {
            tag: fiber.tag,
            type: fiber.type?.name || fiber.type,
            elementType: fiber.elementType,
            stateNode: fiber.stateNode,
            hasState: !!fiber.stateNode?.state,
            hasMemoizedState: !!fiber.memoizedState
          });
        }
      });
    }
  }

  static find(selector, options = {}) {
    return new ReactFiber(selector, options);
  }

  getFiberNode(node) {
    if (!node) return null;
    
    // Try multiple property name patterns for different React versions
    const possibleKeys = [
      '__reactFiber$',           // React 16+
      '__reactInternalFiber$',   // React 15
      '__reactInternalInstance$', // Older versions
      '__reactFiber',
      '__reactInternalInstance'
    ];
    
    // Check for exact matches first
    for (const key of possibleKeys) {
      if (node[key]) return node[key];
    }
    
    // Fall back to pattern matching
    const fiberKey = Object.getOwnPropertyNames(node).find(
      (name) =>
        name.startsWith("__reactFiber") ||
        name.startsWith("__reactInternalInstance") ||
        name.startsWith("__reactInternalFiber")
    );
    return fiberKey ? node[fiberKey] : null;
  }

  getOwnerComponent(fiberNode) {
    let current = fiberNode;
    while (current) {
      // Use React's internal tag system to identify component types
      // Based on React's WorkTags: ClassComponent = 1, FunctionComponent = 0
      if (current.tag === 1) { // ClassComponent
        return current.stateNode; // For class components, stateNode is the component instance
      }
      
      // For function components, look for hooks in memoizedState
      if (current.tag === 0 || current.tag === 15) { // FunctionComponent or MemoComponent
        // Function components don't have setState, but we can still track them
        if (current.memoizedState && current.type) {
          return {
            type: 'function',
            hooks: current.memoizedState,
            fiber: current,
            forceUpdate: () => {
              // Trigger re-render by updating fiber
              if (current.alternate) {
                current.alternate.expirationTime = 1;
              }
              current.expirationTime = 1;
            }
          };
        }
      }
      
      // Legacy fallback: check if stateNode has React component methods
      if (
        current.stateNode &&
        current.stateNode !== null &&
        typeof current.stateNode === 'object' &&
        (current.stateNode.setState || current.stateNode.forceUpdate)
      ) {
        return current.stateNode;
      }
      
      current = current.return;
    }
    return null;
  }

  getState(key) {
    if (!this.components.length && !this.fibers.length) return null;
    
    const component = this.components[0];
    const fiber = this.fibers[0];
    let state = null;
    
    // Handle class components
    if (component?.state) {
      state = component.state;
    }
    // Handle function components with hooks - look directly at fiber
    else if (fiber?.memoizedState) {
      if (this.debug) {
        console.log("🔍 Raw fiber.memoizedState:", fiber.memoizedState);
      }
      // Extract useState values from the hook chain
      const states = this.extractStateFromHooks(fiber.memoizedState);
      state = states.length === 1 ? states[0] : states;
    }
    // Fallback: try component hooks if available
    else if (component?.type === 'function' && component?.hooks) {
      const states = this.extractStateFromHooks(component.hooks);
      state = states.length === 1 ? states[0] : states;
    }

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

  extractStateFromHooks(hookChain) {
    const states = [];
    let mainStateFound = false;
    let currentHook = hookChain;
    let hookIndex = 0;
    
    if (this.debug) {
      console.log("🔍 Hook chain analysis:");
    }
    
    while (currentHook) {
      if (this.debug) {
        console.log(`Hook ${hookIndex}:`, {
          type: currentHook.tag || 'unknown',
          memoizedState: currentHook.memoizedState,
          queue: currentHook.queue,
          next: !!currentHook.next
        });
      }
      
      // Try different approaches to extract state
      if (currentHook.memoizedState !== undefined && currentHook.memoizedState !== null) {
        const state = currentHook.memoizedState;
        
        // Priority 1: Check for useRef hooks with complex state in .current
        if (!currentHook.queue && 
            typeof state === 'object' && 
            state !== null && 
            state.current !== undefined &&
            typeof state.current === 'object' &&
            state.current !== null) {
          
          // Check if this looks like a substantial state object (has multiple properties)
          const currentKeys = Object.keys(state.current);
          if (currentKeys.length > 2) {
            states.push(state.current);
            mainStateFound = true;
            if (this.debug) console.log(`  🎯 Found main state in useRef:`, state.current);
          }
        }
        // Priority 2: useState hooks with queue
        else if (currentHook.queue && typeof state !== 'function') {
          states.push(state);
          if (this.debug) console.log(`  ✅ Found useState state:`, state);
        }
        // Priority 3: Other potential state objects (only if we haven't found main state)
        else if (!mainStateFound && !currentHook.queue && typeof state === 'object' && state !== null) {
          // Skip useEffect hooks (they have tag 36)
          if (!(state.tag === 36 && state.create)) {
            states.push(state);
            if (this.debug) console.log(`  📦 Found potential state object:`, state);
          }
        }
        // Priority 4: Simple primitive state
        else if (typeof state !== 'function' && typeof state !== 'object') {
          states.push(state);
          if (this.debug) console.log(`  🔹 Found primitive state:`, state);
        }
      }
      
      currentHook = currentHook.next;
      hookIndex++;
    }
    
    if (this.debug) {
      console.log(`🎯 Extracted ${states.length} state values:`, states);
    }
    
    // If we found main state objects, prioritize and deduplicate them
    if (mainStateFound && states.length > 1) {
      const mainStates = states.filter(state => 
        typeof state === 'object' && 
        state !== null && 
        Object.keys(state).length > 2
      );
      
      if (mainStates.length > 1) {
        // If we have multiple main state objects, find the most comprehensive one
        // or merge them if they seem complementary
        const largestState = mainStates.reduce((largest, current) => {
          const largestKeys = Object.keys(largest).length;
          const currentKeys = Object.keys(current).length;
          
          // Prefer the one with more properties
          if (currentKeys > largestKeys) return current;
          
          // If same number of properties, prefer the one with more complex data
          if (currentKeys === largestKeys) {
            const largestComplexity = this.calculateStateComplexity(largest);
            const currentComplexity = this.calculateStateComplexity(current);
            return currentComplexity > largestComplexity ? current : largest;
          }
          
          return largest;
        });
        
        if (this.debug) {
          console.log(`🎯 Selected most comprehensive state from ${mainStates.length} candidates:`, largestState);
        }
        
        return [largestState];
      }
      
      return mainStates;
    }
    
    return states;
  }

  calculateStateComplexity(state) {
    if (!state || typeof state !== 'object') return 0;
    
    let complexity = 0;
    for (const [key, value] of Object.entries(state)) {
      complexity += 1; // Base point for each property
      
      if (Array.isArray(value)) {
        complexity += value.length * 0.1; // Arrays get points based on length
      } else if (typeof value === 'object' && value !== null) {
        complexity += Object.keys(value).length * 0.5; // Nested objects get points
      } else if (typeof value === 'function') {
        complexity += 2; // Functions are valuable
      }
    }
    
    return complexity;
  }

  setState(update) {
    this.components.forEach((component) => {
      // Handle class components
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
      // Handle function components - force re-render since we can't directly update hooks
      else if (component?.type === 'function' && component?.forceUpdate) {
        if (this.debug) {
          console.log("⚠️  Function component detected - triggering re-render. Direct state update not possible.");
        }
        component.forceUpdate();
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

  setProp(propName, value) {
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

function makeSerializable(obj, visited = new WeakSet(), depth = 0, maxDepth = 10) {
  // Handle primitives first
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Catch ALL functions early
  if (typeof obj === "function") {
    return `[Function: ${obj.name || 'anonymous'}]`;
  }
  
  if (typeof obj !== "object") {
    // Handle other primitives
    if (typeof obj === "symbol") return obj.toString();
    if (typeof obj === "bigint") return obj.toString() + "n";
    return obj;
  }

  // Prevent infinite recursion - depth limit
  if (depth > maxDepth) {
    return "[Max Depth Reached]";
  }

  // Prevent circular references
  if (visited.has(obj)) {
    return "[Circular Reference]";
  }
  visited.add(obj);

  try {
    // Handle special objects first
    if (obj instanceof HTMLElement) {
      return {
        type: "HTMLElement",
        tagName: obj.tagName,
        id: obj.id || null,
        className: obj.className || null,
        attributes: obj.attributes ? Array.from(obj.attributes).map(attr => ({ name: attr.name, value: attr.value })) : []
      };
    }

    if (obj instanceof Event) {
      return {
        type: "Event",
        eventType: obj.type,
        target: obj.target?.tagName || null
      };
    }

    if (obj instanceof Date) {
      return { type: "Date", value: obj.toISOString() };
    }

    if (obj instanceof RegExp) {
      return { type: "RegExp", source: obj.source, flags: obj.flags };
    }

    if (obj instanceof Error) {
      return { type: "Error", message: obj.message, name: obj.name };
    }

    // Handle React Fiber nodes - these are super circular
    if (obj.tag !== undefined && obj.elementType !== undefined) {
      return {
        type: "ReactFiber",
        tag: obj.tag,
        elementType: typeof obj.elementType === 'function' ? obj.elementType.name || 'AnonymousComponent' : String(obj.elementType),
        key: obj.key,
        hasState: !!obj.stateNode?.state,
        hasMemoizedState: !!obj.memoizedState,
        hasProps: !!obj.memoizedProps
      };
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.slice(0, 50).map((item, index) => {
        if (index >= 25) return "[...truncated]"; // Smaller limit
        return makeSerializable(item, visited, depth + 1, maxDepth);
      });
    }

    // Handle regular objects
    const serializableObj = {};
    
    // Get own enumerable properties only to avoid prototype pollution
    const ownKeys = Object.getOwnPropertyNames(obj).filter(key => {
      try {
        return obj.propertyIsEnumerable(key);
      } catch {
        return false;
      }
    });
    
    // Limit number of properties to avoid huge objects
    const maxKeys = 30; // Smaller limit for safety
    const processedKeys = ownKeys.slice(0, maxKeys);
    
    for (const key of processedKeys) {
      try {
        // Skip problematic keys early
        const dangerousKeys = [
          'parentNode', 'parentElement', 'ownerDocument', 'children', 'childNodes',
          'return', 'child', 'sibling', 'alternate', 'ref', // React Fiber circular refs
          '_owner', '_source', '_self', '_debugOwner', '_debugSource', // React internals
          'window', 'document', 'global', 'self', 'top', 'parent', // Global objects
          'constructor', 'prototype', '__proto__', // Constructor/prototype chains
          'addEventListener', 'removeEventListener', // Event handlers
          'setState', 'forceUpdate', 'render' // React methods that might be functions
        ];
        
        if (dangerousKeys.includes(key)) {
          serializableObj[key] = `[Skipped: ${key}]`;
          continue;
        }

        const descriptor = Object.getOwnPropertyDescriptor(obj, key);
        if (descriptor && (descriptor.get || descriptor.set)) {
          serializableObj[key] = "[Getter/Setter]";
          continue;
        }

        let value = obj[key];

        // Handle symbols specifically (React context symbols)
        if (typeof value === "symbol") {
          value = `[Symbol: ${value.description || 'anonymous'}]`;
        }
        // Extra function check
        else if (typeof value === "function") {
          value = `[Function: ${value.name || 'anonymous'}]`;
        } else if (value && typeof value === "object") {
          value = makeSerializable(value, visited, depth + 1, maxDepth);
        }

        serializableObj[key] = value;
      } catch (error) {
        serializableObj[key] = `[Error: ${error.message}]`;
      }
    }
    
    if (ownKeys.length > maxKeys) {
      serializableObj['...'] = `[${ownKeys.length - maxKeys} more properties]`;
    }

    return serializableObj;
  } catch (error) {
    return `[Serialization Error: ${error.message}]`;
  } finally {
    visited.delete(obj); // Clean up for potential reuse
  }
}

// Final safety check - recursively scan for any remaining functions
function deepFunctionCheck(obj, path = "") {
  if (typeof obj === "function") {
    throw new Error(`Found function at path: ${path}`);
  }
  
  if (obj && typeof obj === "object") {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        deepFunctionCheck(item, `${path}[${index}]`);
      });
    } else {
      Object.keys(obj).forEach(key => {
        deepFunctionCheck(obj[key], path ? `${path}.${key}` : key);
      });
    }
  }
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
          const updateFn = new Function('return ' + payload.updateFn)();
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

    // Final safety check before postMessage
    try {
      deepFunctionCheck(response);
    } catch (functionError) {
      console.warn("[pageState] Function detected in response, cleaning:", functionError.message);
      response = `[Cleaned Response - Function found at: ${functionError.message}]`;
    }

    // Additional structured clone test
    try {
      // Test if the object can be cloned (same algorithm as postMessage)
      if (typeof structuredClone === 'function') {
        structuredClone(response);
      } else {
        // Fallback for older browsers - try JSON round-trip
        JSON.parse(JSON.stringify(response));
      }
    } catch (cloneError) {
      console.warn("[pageState] Response not cloneable, fallback:", cloneError.message);
      response = `[Uncloneable Response: ${cloneError.message}]`;
    }

    window.postMessage(
      {
        type: "reactFiberResponse",
        response,
        messageId,
      },
      "*",
    );
  } else if (event.data.type === "triggerKeyboardEvent") {
    // Handle keyboard event triggering from content script
    const { key, code, altKey, ctrlKey, metaKey, shiftKey, keyCode } = event.data;
    
    const keyboardEvent = new KeyboardEvent('keydown', {
      key,
      code,
      keyCode: keyCode || 0,
      which: keyCode || 0,
      altKey: altKey || false,
      ctrlKey: ctrlKey || false,
      metaKey: metaKey || false,
      shiftKey: shiftKey || false,
      bubbles: true,
      cancelable: true
    });
    
    document.dispatchEvent(keyboardEvent);
  }
});
