import ReactFiber from "@/seqta/utils/ReactFiber";

export interface BooleanSetting {
  type: "boolean";
  default: boolean;
  title: string;
  description?: string;
}

export interface StringSetting {
  type: "string";
  default: string;
  title: string;
  description?: string;
  maxLength?: number;
  pattern?: string;
}

export interface NumberSetting {
  type: "number";
  default: number;
  title: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectSetting<T extends string> {
  type: "select";
  options: readonly T[];
  default: T;
  title: string;
  description?: string;
}

export interface ButtonSetting {
  type: "button";
  title: string;
  description?: string;
  trigger?: () => void | Promise<void>;
}

export interface HotkeySetting {
  type: "hotkey";
  default: string;
  title: string;
  description?: string;
}

export interface ComponentSetting {
  type: "component";
  title: string;
  description?: string;
  component: any;
}

export type PluginSetting =
  | BooleanSetting
  | StringSetting
  | NumberSetting
  | SelectSetting<string>
  | ButtonSetting
  | HotkeySetting
  | ComponentSetting;

export type PluginSettings = {
  [key: string]: PluginSetting;
};

// Helper type to extract the actual value type from a setting
export type SettingValue<T extends PluginSetting> = T extends BooleanSetting
  ? boolean
  : T extends StringSetting
    ? string
    : T extends NumberSetting
      ? number
      : T extends SelectSetting<infer O>
        ? O
        : T extends HotkeySetting
          ? string
          : T extends ComponentSetting
            ? never
            : never;

export type SettingsAPI<T extends PluginSettings> = {
  [K in keyof T]: SettingValue<T[K]>;
} & {
  onChange: <K extends keyof T>(
    key: K,
    callback: (value: SettingValue<T[K]>) => void,
  ) => { unregister: () => void };
  offChange: <K extends keyof T>(
    key: K,
    callback: (value: SettingValue<T[K]>) => void,
  ) => void;
  loaded: Promise<void>;
};

export interface SEQTAAPI {
  onMount: (
    selector: string,
    callback: (element: Element) => void,
  ) => { unregister: () => void };
  getFiber: (selector: string) => ReactFiber;
  getCurrentPage: () => string;
  onPageChange: (callback: (page: string) => void) => {
    unregister: () => void;
  };
}

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

export type TypedStorageAPI<T> = StorageAPI<T> & {
  [K in keyof T]: T[K];
};

export interface EventsAPI {
  on: (
    event: string,
    callback: (...args: any[]) => void,
  ) => { unregister: () => void };
  emit: (event: string, ...args: any[]) => void;
}

export interface PluginAPI<T extends PluginSettings, S = any> {
  seqta: SEQTAAPI;
  settings: SettingsAPI<T>;
  storage: TypedStorageAPI<S>;
  events: EventsAPI;
}

export interface Plugin<T extends PluginSettings = PluginSettings, S = any> {
  id: string;
  name: string;
  description: string;
  version: string;
  settings: T;
  styles?: string; // Optional CSS styles for the plugin
  disableToggle?: boolean; // Optional flag to show/hide the plugin's enable/disable toggle in settings
  defaultEnabled?: boolean; // Optional flag to set the plugin's default enabled state
  beta?: boolean; // Optional flag to mark the plugin as beta
  run: (
    api: PluginAPI<T, S>,
  ) => void | Promise<void> | (() => void) | Promise<() => void>;
}
