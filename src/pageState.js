class ReactFiber {
    constructor(selector, options = {}) {
        this.selector = selector;
        this.debug = options.debug || false;
        this.nodes = [...document.querySelectorAll(selector)]; // Support multiple elements
        this.fibers = this.nodes.map(node => this.getFiberNode(node));
        this.components = this.fibers.map(fiber => this.getOwnerComponent(fiber));

        if (this.debug) {
            console.log("📌 Selected Nodes:", this.nodes);
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

    getState(key = null) {
        if (!this.components.length) return null;
        const state = this.components[0]?.state || null;
        return key ? state?.[key] : state;
    }

    setState(updateFn) {
        this.components.forEach(component => {
            if (component?.setState) {
                component.setState(prevState => {
                    const newState = updateFn(prevState);
                    if (this.debug) console.log("✅ Updated State:", newState);
                    return newState;
                });
            }
        });
        return this; // Enable chaining
    }

    getProp(propName) {
        if (!this.fibers.length) return null;
        return this.fibers[0]?.memoizedProps?.[propName] || null;
    }

    setProp(propName, value) {
        this.fibers.forEach(fiber => {
            if (fiber?.memoizedProps) {
                fiber.memoizedProps[propName] = value;
            }
        });
        return this.forceUpdate(); // Apply the change and return this for chaining
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

// Message listener for communication with the background script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "reactFiberAction") {
    const { selector, action, payload, debug } = request;
    const fiberInstance = ReactFiber.find(selector, {debug}); // Use the class

    switch (action) {
      case "getState":
        sendResponse(fiberInstance.getState(payload.key));
        break;
      case "setState":
        // Very important:  Eval the function string in the context of the page
        const updateFn = eval(`(${payload.updateFn})`);
        fiberInstance.setState(updateFn);
        sendResponse({}); // Send acknowledgement
        break;
      case "getProp":
        sendResponse(fiberInstance.getProp(payload.propName));
        break;
      case "setProp":
        fiberInstance.setProp(payload.propName, payload.value);
        sendResponse({}); // Send acknowledgement
        break;
      case "forceUpdate":
        fiberInstance.forceUpdate();
        sendResponse({});  // Send acknowledgement
        break;
      default:
        console.warn(`[pageState] Unknown action: ${action}`);
        sendResponse(null);
    }
    return true; // Keep message channel open (for consistency, even if not always needed)
  }
});