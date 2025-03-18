import ReactFiber from '@/seqta/utils/ReactFiber';

interface BooleanSetting {
  type: 'boolean';
  default: boolean;
  title: string;
  description?: string;
}

interface StringSetting {
  type: 'string';
  default: string;
  title: string;
  description?: string;
}

interface NumberSetting {
  type: 'number';
  default: number;
  title: string;
  description?: string;
}

interface SelectSetting<T extends string> {
  type: 'select';
  options: readonly T[];
  default: T;
  title: string;
  description?: string;
}

type PluginSetting = BooleanSetting | StringSetting | NumberSetting | SelectSetting<string>;

export type PluginSettings = {
  [key: string]: PluginSetting;
}

// Helper type to extract the actual value type from a setting
type SettingValue<T extends PluginSetting> = T extends BooleanSetting ? boolean :
  T extends StringSetting ? string :
  T extends NumberSetting ? number :
  T extends SelectSetting<infer O> ? O :
  never;

export type SettingsAPI<T extends PluginSettings> = {
  [K in keyof T]: SettingValue<T[K]>;
} & {
  onChange: <K extends keyof T>(key: K, callback: (value: SettingValue<T[K]>) => void) => void;
  offChange: <K extends keyof T>(key: K, callback: (value: SettingValue<T[K]>) => void) => void;
  loaded: Promise<void>; // Promise that resolves when settings are loaded
}

export interface SEQTAAPI {
  onMount: (selector: string, callback: (element: Element) => void) => void;
  getFiber: (selector: string) => ReactFiber;
  getCurrentPage: () => string;
  onPageChange: (callback: (page: string) => void) => void;
}

export interface StorageAPI {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
  onChange: (key: string, callback: (value: any) => void) => void;
  offChange: (key: string, callback: (value: any) => void) => void;
  loaded: Promise<void>;
  [key: string]: any;
}

export interface EventsAPI {
  on: (event: string, callback: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
}

export interface PluginAPI<T extends PluginSettings> {
  seqta: SEQTAAPI;
  settings: SettingsAPI<T>;
  storage: StorageAPI;
  events: EventsAPI;
}

export interface Plugin<T extends PluginSettings = PluginSettings> {
  id: string;
  name: string;
  description: string;
  version: string;
  settings: T;
  run: (api: PluginAPI<T>) => void | Promise<void> | (() => void) | Promise<() => void>;
}