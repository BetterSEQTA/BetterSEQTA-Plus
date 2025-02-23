class ReactFiber {
  constructor(selector, options = {}) {
    this.selector = selector;
    this.debug = options.debug || false;
    this.nodes = [...document.querySelectorAll(selector)]; // Support multiple elements
    this.fibers = this.nodes.map(node => this.getFiberNode(node));
    this.components = this.fibers.map(fiber => this.getOwnerComponent(fiber));

    if (this.debug) {
      console.log("Selected Nodes:", this.nodes);
      console.log("🔍 Found Fibers:", this.fibers);
      console.log("🛠 Found Components:", this.components);
    }
  }

  static find(selector, options = {}) {
    return new ReactFiber(selector, options);
  }

  getFiberNode(node) {
    if (!node) return null;
    const fiberKey = Object.getOwnPropertyNames(node).find(name =>
      name.startsWith('__reactFiber') || name.startsWith('__reactInternalInstance')
    );
    return fiberKey ? node[fiberKey] : null;
  }

  getOwnerComponent(fiberNode) {
    let current = fiberNode;
    while (current) {
      if (current.stateNode && (current.stateNode.setState || current.stateNode.forceUpdate)) {
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
    } else if (typeof key === 'string') {
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
    this.components.forEach(component => {
      if (component?.setState) {
        if (typeof update === 'function') {
          // Functional update
          component.setState(prevState => {
            const newState = update(prevState);
            if (this.debug) console.log("✅ Updated State (Functional):", newState);
            return newState;
          });
        } else {
          // Object update (merge with existing state)
          component.setState(prevState => {
            const newState = {
              ...prevState,
              ...update
            };
            if (this.debug) console.log("✅ Updated State (Object Merge):", newState);
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
    this.fibers.forEach(fiber => {
      if (fiber?.memoizedProps) {
        fiber.memoizedProps[propName] = value;
      }
    });
    return this; // Enable chaining
  }

  forceUpdate() {
    this.components.forEach(component => {
      if (component?.forceUpdate) {
        component.forceUpdate();
        if (this.debug) console.log("🔄 Forced React Re-render");
      }
    });
    return this; // Enable chaining
  }
}

function makeSerializable(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => makeSerializable(item));
  }

  const serializableObj = {};
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      let value = obj[key];

      if (typeof value === 'function') {
        value = '[Function]';
      } else if (value instanceof HTMLElement) {
        value = {
          type: 'HTMLElement',
          id: value.id,
          tagName: value.tagName
        }; // Replace DOM node with ID/tag info
      } else if (typeof value === 'symbol') {
        value = value.toString();
      } else if (typeof value === 'object' && value !== null) {
        value = makeSerializable(value);
      }

      serializableObj[key] = value;
    }
  }
  return serializableObj;
}

window.addEventListener('message', (event) => {
  if (event.data.type === "reactFiberRequest") {
    const {
      selector,
      action,
      payload,
      debug,
      messageId
    } = event.data;
    const fiberInstance = ReactFiber.find(selector, {
      debug
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

    if (response !== null && typeof response === 'object') {
      response = makeSerializable(response);
    }

    window.postMessage({
      type: "reactFiberResponse",
      response,
      messageId,
    }, "*");
  }
});