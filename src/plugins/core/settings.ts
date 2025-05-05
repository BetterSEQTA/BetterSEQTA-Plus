import type { PluginSettings } from "./types";

export function Setting(settingDef: any): PropertyDecorator {
  return (target, propertyKey) => {
    const proto = target.constructor.prototype;
    if (!proto.hasOwnProperty("settings")) {
      Object.defineProperty(proto, "settings", {
        value: {},
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    proto.settings[propertyKey] = settingDef;
  };
}

// Base plugin class that handles settings
export abstract class BasePlugin<T extends PluginSettings = PluginSettings> {
  // The settings property will be populated by decorators
  // Keep the instance property and constructor logic as is,
  // as changing it would require changing animated-background/index.ts
  settings!: T; // Use definite assignment assertion

  constructor() {
    // Copy settings from the prototype to the instance
    // This ensures that each instance has its own settings object
    // IMPORTANT: Ensure the prototype actually HAS settings before copying
    if (this.constructor.prototype.hasOwnProperty("settings")) {
      // Deep clone might be safer if settings objects become complex,
      // but a shallow clone is usually fine for this structure.
      this.settings = { ...this.constructor.prototype.settings } as T;
    } else {
      // Fallback if decorators somehow didn't run or add the property
      this.settings = {} as T;
    }
  }
}
