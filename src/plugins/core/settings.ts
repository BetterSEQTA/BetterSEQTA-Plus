import type { PluginSettings } from './types';

// Base interfaces for our settings
interface BaseSettingOptions {
  title: string;
  description?: string;
}

interface BooleanSettingOptions extends BaseSettingOptions {
  default: boolean;
}

interface StringSettingOptions extends BaseSettingOptions {
  default: string;
  maxLength?: number;
  pattern?: string;
}

interface NumberSettingOptions extends BaseSettingOptions {
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

interface SelectSettingOptions<T extends string> extends BaseSettingOptions {
  default: T;
  options: readonly T[];
}

// The actual decorators
export function BooleanSetting(options: BooleanSettingOptions): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    // Ensure the settings property exists on the constructor's prototype
    const proto = target.constructor.prototype;
    if (!proto.hasOwnProperty('settings')) {
      proto.settings = {};
    }
    
    // Add the setting to the prototype's settings object with const assertion
    proto.settings[propertyKey] = {
      type: 'boolean' as const,
      ...options
    };
  };
}

export function StringSetting(options: StringSettingOptions): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    // Ensure the settings property exists on the constructor's prototype
    const proto = target.constructor.prototype;
    if (!proto.hasOwnProperty('settings')) {
      proto.settings = {};
    }
    
    // Add the setting to the prototype's settings object with const assertion
    proto.settings[propertyKey] = {
      type: 'string' as const,
      ...options
    };
  };
}

export function NumberSetting(options: NumberSettingOptions): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    // Ensure the settings property exists on the constructor's prototype
    const proto = target.constructor.prototype;
    if (!proto.hasOwnProperty('settings')) {
      proto.settings = {};
    }
    
    // Add the setting to the prototype's settings object with const assertion
    proto.settings[propertyKey] = {
      type: 'number' as const,
      ...options
    };
  };
}

export function SelectSetting<T extends string>(options: SelectSettingOptions<T>): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    // Ensure the settings property exists on the constructor's prototype
    const proto = target.constructor.prototype;
    if (!proto.hasOwnProperty('settings')) {
      proto.settings = {};
    }
    
    // Add the setting to the prototype's settings object with const assertion
    proto.settings[propertyKey] = {
      type: 'select' as const,
      ...options
    };
  };
}

// Base plugin class that handles settings
export abstract class BasePlugin<T extends PluginSettings = PluginSettings> {
  // The settings property will be populated by decorators
  settings!: T;
  
  constructor() {
    // Copy settings from the prototype to the instance
    // This ensures that each instance has its own settings object
    if (this.constructor.prototype.settings) {
      this.settings = { ...this.constructor.prototype.settings } as T;
    }
  }
} 