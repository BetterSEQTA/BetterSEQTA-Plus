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

  private getTargetOrigin(): string {
    return window.location.origin;
  }

  private isTrustedMessage(event: MessageEvent): boolean {
    return (
      event.source === window && event.origin === this.getTargetOrigin()
    );
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

      const listener = (response: MessageEvent) => {
        if (!this.isTrustedMessage(response)) return;
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
      window.postMessage(message, this.getTargetOrigin());
    });
  }

  async getState(key?: string | string[]): Promise<any> {
    return this.sendMessage("getState", {
      key,
    });
  }

  async setState(update: Record<string, unknown>): Promise<ReactFiber> {
    if (typeof update !== "object" || update === null || Array.isArray(update)) {
      throw new TypeError(
        "ReactFiber.setState only accepts plain JSON-serializable objects",
      );
    }

    await this.sendMessage("setState", { updateObject: update });
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
