# Creating Plugins with Decorator-Based Settings

This guide will walk you through creating a BetterSEQTA+ plugin using the new decorator-based settings system.

## Prerequisites

- Understand basic TypeScript concepts (classes, interfaces, decorators)
- Familiarity with the BetterSEQTA+ plugin system

## Plugin Structure

A typical plugin consists of:

1. A settings class that defines the plugin's settings using decorators
2. The plugin definition object
3. The actual plugin functionality

## Step by Step Guide

### 1. Create a Plugin File

Start by creating a new file in the `src/plugins/built-in` directory. For example, `myFeature/index.ts`.

### 2. Define Storage Type (Optional)

If your plugin needs to store data, define a storage interface:

```typescript
interface MyFeatureStorage {
  lastUsed: string;
  favoriteItems: string[];
}
```

### 3. Create a Settings Class

Create a class that extends `BasePlugin` and use decorators to define settings:

```typescript
import { BasePlugin, BooleanSetting, StringSetting, NumberSetting, SelectSetting } from '../../core/settings';

class MyFeaturePluginClass extends BasePlugin {
  @BooleanSetting({
    default: true,
    title: "Enable My Feature",
    description: "Enables the awesome new feature."
  })
  enabled!: boolean;
  
  @StringSetting({
    default: "Default text",
    title: "Custom Message",
    description: "Sets a custom message for the feature",
    maxLength: 100
  })
  message!: string;
  
  @NumberSetting({
    default: 5,
    title: "Refresh Interval",
    description: "How often to refresh the data (in seconds)",
    min: 1,
    max: 60,
    step: 1
  })
  refreshInterval!: number;
  
  @SelectSetting({
    default: "small",
    options: ["small", "medium", "large"] as const,
    title: "Display Size",
    description: "Control how large the feature appears"
  })
  displaySize!: "small" | "medium" | "large";
}
```

### 4. Create a Plugin Instance

Create an instance of your settings class and define the plugin object:

```typescript
// Create an instance to extract settings
const settingsInstance = new MyFeaturePluginClass();

const myFeaturePlugin: Plugin<typeof settingsInstance.settings, MyFeatureStorage> = {
  id: 'myFeature',
  name: 'My Awesome Feature',
  description: 'Adds an awesome new feature to SEQTA',
  version: '1.0.0',
  settings: settingsInstance.settings,
  run: async (api) => {
    // Plugin implementation goes here
  }
};

export default myFeaturePlugin;
```

### 5. Implement Plugin Functionality

Implement your plugin's functionality in the `run` function:

```typescript
run: async (api) => {
  // Initialize storage with defaults if needed
  if (api.storage.lastUsed === undefined) {
    api.storage.lastUsed = new Date().toISOString();
  }
  
  if (api.storage.favoriteItems === undefined) {
    api.storage.favoriteItems = [];
  }
  
  // Only run if enabled
  if (!api.settings.enabled) return;
  
  // Main plugin logic
  const initializeFeature = () => {
    console.log(`Initializing feature with message: ${api.settings.message}`);
    console.log(`Using display size: ${api.settings.displaySize}`);
    
    // Set up refreshing
    const intervalId = setInterval(() => {
      refreshData();
    }, api.settings.refreshInterval * 1000);
    
    // Clean up function returned here
    return () => {
      clearInterval(intervalId);
      console.log('Feature cleaned up');
    };
  };
  
  const refreshData = () => {
    console.log('Refreshing data...');
    api.storage.lastUsed = new Date().toISOString();
  };
  
  // Listen for elements we need
  api.seqta.onMount('.some-element', (element) => {
    // Do something when element appears
  });
  
  // Listen for settings changes
  api.settings.onChange('refreshInterval', (newValue) => {
    console.log(`Refresh interval changed to ${newValue} seconds`);
  });
  
  // Return cleanup function
  return initializeFeature();
}
```

### 6. Register the Plugin

Make sure your plugin is registered in the plugin system. In the `src/plugins/index.ts` file, add your plugin to the list of built-in plugins:

```typescript
import myFeaturePlugin from './built-in/myFeature';

// Add your plugin to this array
const builtInPlugins = [
  // ... other plugins
  myFeaturePlugin,
];
```

## Advanced Features

### Reacting to Settings Changes

You can listen for settings changes with the `onChange` method:

```typescript
api.settings.onChange('enabled', (value) => {
  if (value) {
    // Setting was turned on
    initialize();
  } else {
    // Setting was turned off
    cleanup();
  }
});
```

### Using Storage

The storage API lets you persist data between sessions:

```typescript
// Read from storage
const favorites = api.storage.favoriteItems;

// Write to storage
api.storage.favoriteItems = [...favorites, 'new item'];

// Listen for storage changes
api.storage.onChange('favoriteItems', (newValue) => {
  console.log('Favorites updated:', newValue);
});
```

### Cleaning Up

Always return a cleanup function from your plugin's `run` method if you have any resources to clean up:

```typescript
run: async (api) => {
  // Set up resources
  const intervalId = setInterval(() => {
    // Do something
  }, 1000);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    // Clean up any other resources
  };
}
```

## Best Practices

1. **Initialize Storage Values**: Always check if storage values are undefined and set defaults
2. **Handle Enabled State**: Check if your plugin is enabled before running main functionality
3. **Use TypeScript**: Take advantage of TypeScript's type system to ensure type safety
4. **Clean Up Resources**: Always clean up resources when a plugin is disabled
5. **Document Settings**: Use clear titles and descriptions for your settings

## Complete Example

Here's a complete example of a simple plugin that changes the color of elements:

```typescript
import { BasePlugin, BooleanSetting, ColorSetting } from '../../core/settings';
import type { Plugin } from '../../core/types';

interface ColorChangerStorage {
  lastApplied: string;
}

class ColorChangerPluginClass extends BasePlugin {
  @BooleanSetting({
    default: true,
    title: "Enable Color Changer",
    description: "Applies custom colors to elements on the page."
  })
  enabled!: boolean;
  
  @ColorSetting({
    default: "#4285f4",
    title: "Heading Color",
    description: "Color for headings on the page",
    presets: ["#4285f4", "#ea4335", "#fbbc05", "#34a853"]
  })
  headingColor!: string;
  
  @ColorSetting({
    default: "#34a853",
    title: "Button Color",
    description: "Color for buttons on the page",
    presets: ["#4285f4", "#ea4335", "#fbbc05", "#34a853"]
  })
  buttonColor!: string;
}

const settingsInstance = new ColorChangerPluginClass();

const colorChangerPlugin: Plugin<typeof settingsInstance.settings, ColorChangerStorage> = {
  id: 'colorChanger',
  name: 'Color Changer',
  description: 'Changes colors of various elements on the page',
  version: '1.0.0',
  settings: settingsInstance.settings,
  run: async (api) => {
    if (api.storage.lastApplied === undefined) {
      api.storage.lastApplied = new Date().toISOString();
    }
    
    const applyColors = () => {
      if (!api.settings.enabled) return;
      
      // Apply heading color
      document.querySelectorAll('h1, h2, h3').forEach(heading => {
        (heading as HTMLElement).style.color = api.settings.headingColor;
      });
      
      // Apply button color
      document.querySelectorAll('button').forEach(button => {
        (button as HTMLElement).style.backgroundColor = api.settings.buttonColor;
      });
      
      api.storage.lastApplied = new Date().toISOString();
    };
    
    // Apply colors initially
    applyColors();
    
    // Apply colors when DOM changes
    api.seqta.onMount('h1, h2, h3, button', applyColors);
    
    // Listen for color changes
    api.settings.onChange('headingColor', applyColors);
    api.settings.onChange('buttonColor', applyColors);
    api.settings.onChange('enabled', (enabled) => {
      if (enabled) {
        applyColors();
      } else {
        // Reset colors
        document.querySelectorAll('h1, h2, h3').forEach(heading => {
          (heading as HTMLElement).style.color = '';
        });
        
        document.querySelectorAll('button').forEach(button => {
          (button as HTMLElement).style.backgroundColor = '';
        });
      }
    });
    
    // No cleanup needed for this plugin
    return () => {};
  }
};

export default colorChangerPlugin;
```

This plugin demonstrates:
- Using multiple setting types including a custom color setting
- Handling the enabled state
- Initializing storage
- Listening for setting changes
- Applying and resetting styles based on settings
- Proper cleanup when disabled 