class ReactFiber {
  private selector: string;
  private debug: boolean;
  private messageIdCounter: number = 0; // Counter for unique message IDs

  constructor(
    selector: string,
    options: {
      debug?: boolean;
    } = {},
  ) {
    this.selector = selector;
    this.debug = options.debug || false;
  }

  static find(
    selector: string,
    options: {
      debug?: boolean;
    } = {},
  ) {
    return new ReactFiber(selector, options);
  }

  private async sendMessage(action: string, payload: any = {}): Promise<any> {
    return new Promise((resolve, _) => {
      const messageId = this.messageIdCounter++;
      const message = {
        type: "reactFiberRequest",
        selector: this.selector,
        action,
        payload,
        debug: this.debug,
        messageId,
      };

      const listener = (response: any) => {
        if (
          response.data?.type === "reactFiberResponse" &&
          response.data?.messageId === messageId
        ) {
          if (this.debug) {
            console.log("Content Received Response:", response.data.response);
          }
          resolve(response.data.response);
          window.removeEventListener("message", listener);
        }
      };
      window.addEventListener("message", listener);
      window.postMessage(message, "*");
    });
  }

  async getState(key?: string | string[]): Promise<any> {
    return this.sendMessage("getState", {
      key,
    });
  }

  async setState(update: any | ((prevState: any) => any)): Promise<ReactFiber> {
    const updateFnString =
      typeof update === "function" ? update.toString() : null;
    const updateObject = typeof update !== "function" ? update : null;

    await this.sendMessage("setState", {
      updateFn: updateFnString,
      updateObject,
    });
    return this;
  }

  async getProps(propName?: string): Promise<any> {
    return this.sendMessage("getProp", {
      propName,
    });
  }

  async setProp(propName: string, value: any): Promise<ReactFiber> {
    await this.sendMessage("setProp", {
      propName,
      value,
    });
    return this;
  }

  async forceUpdate(): Promise<ReactFiber> {
    await this.sendMessage("forceUpdate");
    return this;
  }
}

export default ReactFiber;
