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

export interface StorageAPI<T = any> {
  /**
   * Register a callback to be called when a storage value changes
   */
  onChange: <K extends keyof T>(key: K, callback: (value: T[K]) => void) => void;
  
  /**
   * Remove a previously registered callback
   */
  offChange: <K extends keyof T>(key: K, callback: (value: T[K]) => void) => void;
  
  /**
   * Promise that resolves when storage values are loaded
   */
  loaded: Promise<void>;
}

export type TypedStorageAPI<T> = StorageAPI<T> & {
  [K in keyof T]: T[K];
}

export interface EventsAPI {
  on: (event: string, callback: (...args: any[]) => void) => void;
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
  run: (api: PluginAPI<T, S>) => void | Promise<void> | (() => void) | Promise<() => void>;
}