import type { NumberSetting, BooleanSetting, StringSetting, SelectSetting } from './types';

export function numberSetting(options: Omit<NumberSetting, 'type'>): NumberSetting {
  return {
    type: 'number',
    ...options
  };
}

export function booleanSetting(options: Omit<BooleanSetting, 'type'>): BooleanSetting {
  return {
    type: 'boolean',
    ...options
  };
}

export function stringSetting(options: Omit<StringSetting, 'type'>): StringSetting {
  return {
    type: 'string',
    ...options
  };
}

export function selectSetting<T extends string>(options: Omit<SelectSetting<T>, 'type'>): SelectSetting<T> {
  return {
    type: 'select',
    ...options
  };
}

export function defineSettings<T extends Record<string, any>>(settings: T): T {
  return settings;
}

export function Setting(settingDef: any): PropertyDecorator {
  return (target, propertyKey) => {
    const proto = target.constructor.prototype;
    if (!proto.hasOwnProperty('settings')) {
      Object.defineProperty(proto, 'settings', {
        value: {},
        writable: true,
        configurable: true,
        enumerable: true
      });
    }

    proto.settings[propertyKey] = settingDef;
  };
}
  