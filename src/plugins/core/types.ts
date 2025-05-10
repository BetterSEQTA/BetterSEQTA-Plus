import ReactFiber from "@/seqta/utils/ReactFiber";

// Define the structure of a BooleanSetting
export interface BooleanSetting {
  type: "boolean"; // Setting type is boolean
  default: boolean; // Default value of the setting
  title: string; // Title for the setting
  description?: string; // Optional description of the setting
}

// Define the structure of a StringSetting
export interface StringSetting {
  type: "string"; // Setting type is string
  default: string; // Default value of the setting
  title: string; // Title for the setting
  description?: string; // Optional description of the setting
  maxLength?: number; // Optional maximum length for the string
  pattern?: string; // Optional regex pattern for validation
}

// Define the structure of a NumberSetting
export interface NumberSetting {
  type: "number"; // Setting type is number
  default: number; // Default value of the setting
  title: string; // Title for the setting
  description?: string; // Optional description of the setting
  min?: number; // Optional minimum value for the number
  max?: number; // Optional maximum value for the number
  step?: number; // Optional step size for the number
}

// Define the structure of a SelectSetting with generic options
export interface SelectSetting<T extends string> {
  type: "select"; // Setting type is select
  options: readonly T[]; // Available options in the select dropdown
  default: T; // Default selected option
  title: string; // Title for the setting
  description?: string; // Optional description of the setting
}

// Type alias for all possible plugin settings
export type PluginSetting =
  | BooleanSetting
  | StringSetting
  | NumberSetting
  | SelectSetting<string>;

// Define a mapping of setting keys to their respective PluginSetting types
export type PluginSettings = {
  [key: string]: PluginSetting;
};

// Helper type to extract the value type of a given setting
export type SettingValue<T extends PluginSetting> = T extends BooleanSetting
  ? boolean
  : T extends StringSetting
    ? string
    : T extends NumberSetting
      ? number
      : T extends SelectSetting<infer O>
        ? O
        : never;

// API for interacting with settings of a plugin
export type SettingsAPI<T extends PluginSettings> = {
  [K in keyof T]: SettingValue<T[K]>; // Map each setting key to its value type
} & {
  // Method to register a callback for setting value changes
  onChange: <K extends keyof T>(
    key: K,
    callback: (value: SettingValue<T[K]>) => void,
  ) => { unregister: () => void };
  
  // Method to unregister the callback for setting value changes
  offChange: <K extends keyof T>(
    key: K,
    callback: (value: SettingValue<T[K]>) => void,
  ) => void;

  loaded: Promise<void>; // Promise that resolves when settings are loaded
};

// Interface for interacting with the SEQTA API
export interface SEQTAAPI {
  // Method to register a callback when an element is mounted
  onMount: (
    selector: string,
    callback: (element: Element) => void,
  ) => { unregister: () => void };

  // Method to get the ReactFiber associated with a given selector
  getFiber: (selector: string) => ReactFiber;

  // Method to get the current page
  getCurrentPage: () => string;

  // Method to register a callback when the page changes
  onPageChange: (callback: (page: string) => void) => {
    unregister: () => void;
  };
}

// Interface for interacting with the storage API
export interface StorageAPI<T = any> {
  /**
   * Register a callback to be called when a storage value changes
   */
  onChange: <K extends keyof T>(
    key: K,
    callback: (value: T[K]) => void,
  ) => { unregister: () => void };

  /**
   * Promise that resolves when storage values are loaded
   */
  loaded: Promise<void>;
}

// Type for a strongly-typed StorageAPI
export type TypedStorageAPI<T> = StorageAPI<T> & {
  [K in keyof T]: T[K]; // Ensure the API includes all keys of the provided type
};

// Interface for interacting with events API
export interface EventsAPI {
  // Method to register an event listener for a specific event
  on: (
    event: string,
    callback: (...args: any[]) => void,
  ) => { unregister: () => void };

  // Method to emit an event with optional arguments
  emit: (event: string, ...args: any[]) => void;
}

// Interface for Plugin API, combining various APIs required by plugins
export interface PluginAPI<T extends PluginSettings, S = any> {
  seqta: SEQTAAPI; // SEQTA API interface
  settings: SettingsAPI<T>; // Settings API interface
  storage: TypedStorageAPI<S>; // Storage API interface
  events: EventsAPI; // Events API interface
}

// Interface for defining a plugin
export interface Plugin<T extends PluginSettings = PluginSettings, S = any> {
  id: string; // Unique identifier for the plugin
  name: string; // Name of the plugin
  description: string; // Description of the plugin
  version: string; // Version of the plugin
  settings: T; // Settings of the plugin
  styles?: string; // Optional CSS styles for the plugin
  disableToggle?: boolean; // Flag to show/hide the plugin's enable/disable toggle in settings
  defaultEnabled?: boolean; // Default enabled state of the plugin
  run: (
    api: PluginAPI<T, S>,
  ) => void | Promise<void> | (() => void) | Promise<() => void>; // Function to run the plugin
}
