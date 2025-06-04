import type {
  BooleanSetting,
  ButtonSetting,
  NumberSetting,
  SelectSetting,
  StringSetting,
  HotkeySetting,
  PluginSettings,
  ComponentSetting,
} from "./types";

/**
 * Creates a complete `NumberSetting` object from its options.
 * This helper function ensures the `type` property is correctly set to "number".
 * It's used for defining a numeric setting for a plugin.
 * This function itself does not handle storage or persistence; it defines the setting's structure.
 *
 * @param {Omit<NumberSetting, "type">} options The configuration options for the number setting,
 *                                              excluding the `type` property (e.g., `title`, `default`, `min`, `max`).
 * @returns {NumberSetting} A complete number setting object with `type: "number"`.
 */
export function numberSetting(
  options: Omit<NumberSetting, "type">,
): NumberSetting {
  return {
    type: "number",
    ...options,
  };
}

/**
 * Creates a complete `BooleanSetting` object from its options.
 * This helper function ensures the `type` property is correctly set to "boolean".
 * It's used for defining a boolean (true/false) setting for a plugin.
 * This function itself does not handle storage or persistence; it defines the setting's structure.
 *
 * @param {Omit<BooleanSetting, "type">} options The configuration options for the boolean setting,
 *                                               excluding the `type` property (e.g., `title`, `default`).
 * @returns {BooleanSetting} A complete boolean setting object with `type: "boolean"`.
 */
export function booleanSetting(
  options: Omit<BooleanSetting, "type">,
): BooleanSetting {
  return {
    type: "boolean",
    ...options,
  };
}

/**
 * Creates a complete `StringSetting` object from its options.
 * This helper function ensures the `type` property is correctly set to "string".
 * It's used for defining a text-based setting for a plugin.
 * This function itself does not handle storage or persistence; it defines the setting's structure.
 *
 * @param {Omit<StringSetting, "type">} options The configuration options for the string setting,
 *                                              excluding the `type` property (e.g., `title`, `default`, `placeholder`).
 * @returns {StringSetting} A complete string setting object with `type: "string"`.
 */
export function stringSetting(
  options: Omit<StringSetting, "type">,
): StringSetting {
  return {
    type: "string",
    ...options,
  };
}

/**
 * Creates a complete `SelectSetting` object from its options.
 * This helper function ensures the `type` property is correctly set to "select".
 * It's used for defining a setting where the user can choose from a predefined list of options.
 * This function itself does not handle storage or persistence; it defines the setting's structure.
 *
 * @template TValue - The type of the value for each option in the select list (extends string).
 * @param {Omit<SelectSetting<TValue>, "type">} options The configuration options for the select setting,
 *                                                     excluding the `type` property (e.g., `title`, `default`, `options` array).
 * @returns {SelectSetting<TValue>} A complete select setting object with `type: "select"`.
 */
export function selectSetting<TValue extends string>(
  options: Omit<SelectSetting<TValue>, "type">,
): SelectSetting<TValue> {
  return {
    type: "select",
    ...options,
  };
}

/**
 * Creates a complete `ButtonSetting` object from its options.
 * This helper function ensures the `type` property is correctly set to "button".
 * It's used for defining a button in the plugin's settings UI, which can trigger an action.
 * This function itself does not handle storage or persistence; it defines the button's structure and action.
 *
 * @param {Omit<ButtonSetting, "type">} options The configuration options for the button setting,
 *                                              excluding the `type` property (e.g., `title`, `label`, `trigger` function).
 * @returns {ButtonSetting} A complete button setting object with `type: "button"`.
 */
export function buttonSetting(
  options: Omit<ButtonSetting, "type">,
): ButtonSetting {
  return {
    type: "button",
    ...options,
  };
}

/**
 * Creates a complete `HotkeySetting` object from its options.
 * This helper function ensures the `type` property is correctly set to "hotkey".
 * It's used for defining a setting where the user can configure a keyboard shortcut.
 * This function itself does not handle storage or persistence; it defines the hotkey setting's structure.
 *
 * @param {Omit<HotkeySetting, "type">} options The configuration options for the hotkey setting,
 *                                              excluding the `type` property (e.g., `title`, `default` hotkey string).
 * @returns {HotkeySetting} A complete hotkey setting object with `type: "hotkey"`.
 */

export function componentSetting(
  options: Omit<ComponentSetting, "type">,
): ComponentSetting {
  return {
    type: "component",
    ...options,
  };
}

export function hotkeySetting(
  options: Omit<HotkeySetting, "type">,
): HotkeySetting {
  return {
    type: "hotkey",
    ...options,
  };
}

/**
 * Defines a collection of settings for a plugin.
 * This function currently acts as an identity function, returning the settings object as is.
 * Its primary purpose is to provide type inference and a structured way to define
 * the entire settings configuration for a plugin, ensuring it conforms to the expected type.
 * This function itself does not handle storage or persistence; it's for structural definition.
 *
 * @template TSettings - A record type where keys are setting names and values are setting definition objects
 *                       (e.g., `NumberSetting`, `BooleanSetting`).
 * @param {TSettings} settings The complete settings configuration object for the plugin.
 * @returns {TSettings} The same settings configuration object, primarily for type checking/inference.
 */
export function defineSettings<TSettings extends Record<string, any>>(settings: TSettings): TSettings {
  return settings;
}

/**
 * A property decorator for declaratively defining a plugin setting on a class property.
 * When a class property is decorated with `@Setting({...})`, this decorator adds the
 * provided setting definition (`settingDef`) to a static `settings` object on the
 * class's prototype. This allows settings to be defined alongside their related class logic.
 * This decorator itself does not handle runtime storage or persistence of setting *values*;
 * it is for defining the *structure* and *metadata* of a setting.
 *
 * Example:
 * ```typescript
 * class MyPlugin extends BasePlugin {
 *   @Setting(numberSetting({ title: "My Number", default: 10 }))
 *   myNumberSetting: number; // Type annotation for the setting's value
 * }
 * ```
 *
 * @param {any} settingDef The setting definition object, typically created by one of the
 *                         helper functions like `numberSetting(...)`, `booleanSetting(...)`, etc.
 * @returns {PropertyDecorator} A property decorator function.
 */
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
