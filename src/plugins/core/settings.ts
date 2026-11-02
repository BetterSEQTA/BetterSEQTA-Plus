import type { PluginSettings } from "./types";

export abstract class BasePlugin<T extends PluginSettings = PluginSettings> {
  settings: T;

  constructor() {
    const proto = this.constructor.prototype;
    this.settings = { ...(Object.hasOwn(proto, "settings") ? proto.settings : {}) } as T;
  }
}
