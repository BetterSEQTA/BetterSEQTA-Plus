# BetterSEQTA+ Settings System

BetterSEQTA+ includes a powerful, type-safe settings system that uses TypeScript decorators to create a seamless API for plugin developers. This document explains how the settings system works and how to extend it.

## Table of Contents

- [Overview](#overview)
- [Existing Setting Types](#existing-setting-types)
- [Using Settings in Plugins](#using-settings-in-plugins)
- [Adding New Setting Types](#adding-new-setting-types)
- [Rendering in the UI](#rendering-in-the-ui)

## Overview

The settings system is built around TypeScript decorators and uses TypeScript's type system to provide type safety for plugin settings. The system consists of a few key components:

1. **Setting Type Interfaces** in `src/plugins/core/types.ts` - Define the structure of the setting
2. **Setting Decorator Options** in `src/plugins/core/settings.ts` - Define the options for the decorator
3. **Setting Decorators** in `src/plugins/core/settings.ts` - Register the setting in the plugin
4. **BasePlugin Class** in `src/plugins/core/settings.ts` - Base class that handles the settings

## Existing Setting Types

BetterSEQTA+ currently supports the following setting types:

- **Boolean Settings** - Simple on/off toggle
- **String Settings** - Text input with optional validation
- **Number Settings** - Numeric input with optional min/max/step
- **Select Settings** - Dropdown selection from predefined options

Each setting type has a corresponding interface, options interface, and decorator.

## Using Settings in Plugins

Here's how to use the settings system in a plugin:

```typescript
import { BasePlugin, BooleanSetting, StringSetting } from '../../core/settings';

// Define the plugin settings class
class MyPluginClass extends BasePlugin {
  @BooleanSetting({
    default: true,
    title: "Enable Feature",
    description: "Enables the awesome feature."
  })
  enabled!: boolean;

  @StringSetting({
    default: "Default Value",
    title: "Custom Text",
    description: "Enter your custom text here.",
    maxLength: 100
  })
  customText!: string;
}

// Create an instance to extract settings
const settingsInstance = new MyPluginClass();

// Use in plugin definition
const myPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'Does awesome things',
  version: '1.0.0',
  settings: settingsInstance.settings,
  run: async (api) => {
    // Access settings via api.settings
    if (api.settings.enabled) {
      console.log(api.settings.customText);
    }
    
    // Listen for settings changes
    api.settings.onChange('enabled', (value) => {
      console.log(`Enabled changed to: ${value}`);
    });
  }
};
```

## Adding New Setting Types

To add a new setting type, you need to follow these steps:

### 1. Define the Setting Interface in `src/plugins/core/types.ts`

```typescript
export interface ColorSetting {
  type: 'color';
  default: string; // HEX color code
  title: string;
  description?: string;
  presets?: string[]; // Optional color presets
}

// Update the PluginSetting type to include the new setting type
export type PluginSetting = BooleanSetting | StringSetting | NumberSetting | 
  SelectSetting<string> | ColorSetting;

// Update the SettingValue type helper
type SettingValue<T extends PluginSetting> = T extends BooleanSetting ? boolean :
  T extends StringSetting ? string :
  T extends NumberSetting ? number :
  T extends SelectSetting<infer O> ? O :
  T extends ColorSetting ? string : // Add this line
  never;
```

### 2. Define the Options Interface in `src/plugins/core/settings.ts`

```typescript
interface ColorSettingOptions extends BaseSettingOptions {
  default: string; // HEX color
  presets?: string[];
}
```

### 3. Create the Decorator Function in `src/plugins/core/settings.ts`

```typescript
export function ColorSetting(options: ColorSettingOptions): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    // Ensure the settings property exists on the constructor's prototype
    const proto = target.constructor.prototype;
    if (!proto.hasOwnProperty('settings')) {
      proto.settings = {};
    }
    
    // Add the setting to the prototype's settings object
    proto.settings[propertyKey] = {
      type: 'color',
      ...options
    };
  };
}
```

### 4. Create a Corresponding UI Component (if needed)

If your setting type needs a custom UI component, create one in the `src/interface/components` directory.

For example, you might create a `ColorPicker.svelte` component.

### 5. Update the Settings UI in `src/interface/pages/settings/general.svelte`

Update the `getPluginSettingEntries` function to handle your new setting type:

```javascript
entries.push({
  title: setting.title || key,
  description: setting.description || '',
  id,
  Component: setting.type === 'boolean' ? Switch :
            setting.type === 'select' ? Select :
            setting.type === 'number' ? Slider : 
            setting.type === 'color' ? ColorPicker : // Add this line
            setting.type === 'string' ? (setting.options ? Select : null) : Switch,
  props: {
    state: pluginSettingsValues[plugin.pluginId]?.[key] ?? setting.default,
    onChange: (value: any) => {
      updatePluginSetting(plugin.pluginId, key, value);
    },
    options: setting.options,
    presets: setting.presets // Add this line if needed for your component
  }
});
```

## Rendering in the UI

The settings UI is handled in `src/interface/pages/settings/general.svelte`. This file does a few key things:

1. Loads settings for all plugins from storage
2. Maps setting types to UI components
3. Handles updating settings when users interact with the UI

For most setting types, you'll need to ensure there's a corresponding Svelte component in the `src/interface/components` directory that can render and edit the setting value.

## Example: Adding a Color Setting

Here's a complete example of adding a color setting type:

1. Define the setting interface in `types.ts`:

```typescript
export interface ColorSetting {
  type: 'color';
  default: string;
  title: string;
  description?: string;
  presets?: string[];
}

export type PluginSetting = BooleanSetting | StringSetting | NumberSetting | 
  SelectSetting<string> | ColorSetting;
  
type SettingValue<T extends PluginSetting> = T extends BooleanSetting ? boolean :
  T extends StringSetting ? string :
  T extends NumberSetting ? number :
  T extends SelectSetting<infer O> ? O :
  T extends ColorSetting ? string :
  never;
```

2. Create the options interface and decorator in `settings.ts`:

```typescript
interface ColorSettingOptions extends BaseSettingOptions {
  default: string;
  presets?: string[];
}

export function ColorSetting(options: ColorSettingOptions): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const proto = target.constructor.prototype;
    if (!proto.hasOwnProperty('settings')) {
      proto.settings = {};
    }
    
    proto.settings[propertyKey] = {
      type: 'color',
      ...options
    };
  };
}
```

3. Create a ColorPicker component in `src/interface/components/ColorPicker.svelte`:

```html
<script lang="ts">
  export let state = "#000000";
  export let onChange = (value: string) => {};
  export let presets: string[] = ["#ff0000", "#00ff00", "#0000ff"];
</script>

<div class="color-picker">
  <input 
    type="color" 
    value={state} 
    on:change={(e) => onChange(e.currentTarget.value)} 
  />
  <div class="presets">
    {#each presets as preset}
      <button 
        class="preset" 
        style="background-color: {preset}" 
        on:click={() => onChange(preset)}
      ></button>
    {/each}
  </div>
</div>

<style>
  .color-picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .presets {
    display: flex;
    gap: 0.25rem;
  }
  
  .preset {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    border: 1px solid #ccc;
    cursor: pointer;
  }
</style>
```

4. Update the UI renderer in `general.svelte`:

```javascript
Component: setting.type === 'boolean' ? Switch :
          setting.type === 'select' ? Select :
          setting.type === 'number' ? Slider : 
          setting.type === 'color' ? ColorPicker :
          setting.type === 'string' ? (setting.options ? Select : null) : Switch,
```

5. Use the new setting type in a plugin:

```typescript
class ThemePlugin extends BasePlugin {
  @ColorSetting({
    default: "#4285f4",
    title: "Primary Color",
    description: "The main color for the theme",
    presets: ["#4285f4", "#ea4335", "#fbbc05", "#34a853"]
  })
  primaryColor!: string;
}
```

With these steps, you've added a completely new setting type to the BetterSEQTA+ plugin system! 