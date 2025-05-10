import type {
  BooleanSetting,
  NumberSetting,
  SelectSetting,
  StringSetting,
} from "./types";

// Function to create a NumberSetting object with provided options
export function numberSetting(
  options: Omit<NumberSetting, "type">,
): NumberSetting {
  return {
    type: "number", // Set the type to "number"
    ...options, // Spread the provided options
  };
}

// Function to create a BooleanSetting object with provided options
export function booleanSetting(
  options: Omit<BooleanSetting, "type">,
): BooleanSetting {
  return {
    type: "boolean", // Set the type to "boolean"
    ...options, // Spread the provided options
  };
}

// Function to create a StringSetting object with provided options
export function stringSetting(
  options: Omit<StringSetting, "type">,
): StringSetting {
  return {
    type: "string", // Set the type to "string"
    ...options, // Spread the provided options
  };
}

// Function to create a SelectSetting object with provided options
export function selectSetting<T extends string>(
  options: Omit<SelectSetting<T>, "type">,
): SelectSetting<T> {
  return {
    type: "select", // Set the type to "select"
    ...options, // Spread the provided options
  };
}

// Function to define settings as a record of key-value pairs
export function defineSettings<T extends Record<string, any>>(settings: T): T {
  return settings; // Return the provided settings as-is
}

// Decorator function to define a setting on a class property
export function Setting(settingDef: any): PropertyDecorator {
  return (target, propertyKey) => {
    const proto = target.constructor.prototype; // Get the prototype of the target class
    if (!proto.hasOwnProperty("settings")) {
      // If the "settings" property does not exist on the prototype, define it
      Object.defineProperty(proto, "settings", {
        value: {}, // Initialize settings as an empty object
        writable: true, // Allow the "settings" object to be written to
        configurable: true, // Allow the "settings" property to be reconfigured
        enumerable: true, // Make the "settings" property enumerable
      });
    }

    proto.settings[propertyKey] = settingDef; // Add the setting definition to the settings object
  };
}
