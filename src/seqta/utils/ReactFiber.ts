import browser from 'webextension-polyfill';

class ReactFiber {
private selector: string;
  private debug: boolean;

  constructor(selector: string, options: { debug?: boolean } = {}) {
    this.selector = selector;
    this.debug = options.debug || false;
  }

  static find(selector: string, options: { debug?: boolean } = {}) {
    return new ReactFiber(selector, options);
  }

    private async sendMessage(action: string, payload: any = {}): Promise<any> {
        const message = {
          type: "reactFiberRequest",
          selector: this.selector,
          action,
          payload,
          debug: this.debug
        };

        try {
            const response = await browser.runtime.sendMessage(message);

            if (this.debug) {
              console.log("Content Received Response:", response);
            }
            return response;
        } catch (error) {
            console.error("Error sending message:", error);
            return null; // or throw error, depending on desired behavior
        }
    }


  async getState(key?: string): Promise<any> {
    return this.sendMessage("getState", { key });
  }

  async setState(updateFn: (prevState: any) => any): Promise<ReactFiber> {
    // Serialize the update function to a string.  This is the tricky part.
    // We can only send strings/JSON-serializable data through messages.
    const updateFnString = updateFn.toString();
    await this.sendMessage("setState", { updateFn: updateFnString });
    return this;
  }

  async getProp(propName: string): Promise<any> {
    return this.sendMessage("getProp", { propName });
  }

  async setProp(propName: string, value: any): Promise<ReactFiber> {
    await this.sendMessage("setProp", { propName, value });
    return this;
  }

  async forceUpdate(): Promise<ReactFiber> {
    await this.sendMessage("forceUpdate");
    return this;
  }
}


export default ReactFiber