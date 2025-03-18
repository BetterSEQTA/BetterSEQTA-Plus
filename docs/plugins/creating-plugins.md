# Creating Your First Plugin

This guide will walk you through the process of creating a plugin for BetterSEQTA+, from setup to implementation to testing.

## Prerequisites

Before you start creating a plugin, make sure you have:

- Basic knowledge of TypeScript
- Familiarity with the BetterSEQTA+ codebase
- A development environment set up according to the [Installation Guide](../installation.md)

## Plugin Structure

A typical BetterSEQTA+ plugin consists of:

1. **Plugin Definition**: A TypeScript file that defines the plugin's metadata and functionality
2. **Settings Interface**: (Optional) A TypeScript interface that defines the plugin's settings
3. **Storage Interface**: (Optional) A TypeScript interface that defines the plugin's storage structure

## Step 1: Planning Your Plugin

Before you start coding, take some time to plan your plugin:

1. **Identify the Problem**: What issue or need does your plugin address?
2. **Define the Scope**: What specific features will your plugin include?
3. **Consider the User Experience**: How will users interact with your plugin?

## Step 2: Creating the Plugin File

Create a new TypeScript file for your plugin. The convention is to place it in the `src/plugins/` directory, either in the `built-in` folder or a new folder if it's a third-party plugin.

```typescript
// src/plugins/my-plugin/index.ts

import { Plugin, PluginAPI, PluginSettings } from '../../core/types';

export interface MyPluginSettings extends PluginSettings {
  enabled: {
    type: 'boolean';
    default: true;
    title: 'Enable My Plugin';
    description: 'Turn my plugin on or off';
  };
  // Add more settings as needed
}

export interface MyPluginStorage {
  lastRun: string;
  // Add more storage fields as needed
}

const myPlugin: Plugin<MyPluginSettings, MyPluginStorage> = {
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'A simple plugin for BetterSEQTA+',
  version: '1.0.0',
  settings: {
    enabled: {
      type: 'boolean',
      default: true,
      title: 'Enable My Plugin',
      description: 'Turn my plugin on or off',
    },
    // Initialize your settings here
  },
  run: (api) => {
    if (!api.settings.enabled) {
      return;
    }

    // Initialize storage with default values if needed
    if (api.storage.lastRun === undefined) {
      api.storage.lastRun = new Date().toISOString();
    }

    // Your plugin logic goes here
    console.log('My Plugin is running!');
    
    // Access the SEQTA API
    api.seqta.onPageLoad('/timetable', () => {
      // Code to run when the timetable page loads
    });
    
    // Return a cleanup function (optional but recommended)
    return () => {
      console.log('My Plugin is cleaning up!');
      // Cleanup logic goes here
    };
  },
};

export default myPlugin;
```

## Step 3: Registering Your Plugin

To make your plugin available to BetterSEQTA+, you need to register it with the Plugin Manager. For built-in plugins, you can add your plugin to the `src/plugins/built-in/index.ts` file:

```typescript
// src/plugins/built-in/index.ts

import myPlugin from './my-plugin';
// Other imports...

export const builtInPlugins = [
  myPlugin,
  // Other plugins...
];
```

For third-party plugins, you'll need to follow a different approach, as detailed in [Third-Party Plugins](../advanced/third-party-plugins.md).

## Step 4: Implementing Your Plugin Logic

The main functionality of your plugin goes in the `run` method. Here are some common patterns:

### Responding to Page Loads

```typescript
api.seqta.onPageLoad('/timetable', () => {
  // Code to run when the timetable page loads
});
```

### Modifying the UI

```typescript
api.seqta.onPageLoad('/timetable', () => {
  const timetableElement = document.querySelector('.timetable');
  if (timetableElement) {
    // Modify the timetable element
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'my-plugin-controls';
    controlsDiv.innerHTML = '<button>Zoom In</button><button>Zoom Out</button>';
    timetableElement.appendChild(controlsDiv);
    
    // Add event listeners
    controlsDiv.querySelector('button:first-child').addEventListener('click', () => {
      // Zoom in logic
    });
  }
});
```

### Working with Settings

```typescript
// Get a setting value
const isEnabled = api.settings.enabled;

// Listen for settings changes
api.settings.onChange('enabled', (newValue) => {
  if (newValue) {
    // Enable functionality
  } else {
    // Disable functionality
  }
});
```

### Working with Storage

```typescript
// Get a stored value
const lastRun = api.storage.lastRun;

// Set a stored value
api.storage.lastRun = new Date().toISOString();

// Listen for storage changes
api.storage.onChange('lastRun', (newValue) => {
  console.log(`Last run updated to: ${newValue}`);
});
```

### Working with Events

```typescript
// Listen for events
api.events.on('assessmentLoaded', (data) => {
  console.log(`Assessment loaded: ${data.id}`);
});

// Emit an event
api.events.emit('myPluginEvent', { message: 'Hello from My Plugin!' });
```

## Step 5: Testing Your Plugin

To test your plugin:

1. Run the development server:
   ```
   npm run dev
   ```

2. Open SEQTA Learn in your browser with BetterSEQTA+ enabled.

3. Check the console for any error messages.

4. Verify that your plugin works as expected.

## Step 6: Adding Plugin Settings UI

If your plugin has settings, they will automatically appear in the BetterSEQTA+ settings panel. The UI is generated based on the settings interface you defined.

For more control over the settings UI, you can use the decorator-based settings system. See [Creating Plugins with Settings](../settings/creating-plugins.md) for more information.

## Best Practices for Plugin Development

1. **Follow TypeScript Best Practices**: Use proper typing for all variables and functions.

2. **Handle Errors Gracefully**: Wrap your code in try-catch blocks to prevent crashes.
   ```typescript
   try {
     // Your code
   } catch (error) {
     console.error('My Plugin Error:', error);
   }
   ```

3. **Clean Up After Yourself**: Always return a cleanup function from your plugin's `run` method.
   ```typescript
   const cleanup = () => {
     // Remove event listeners, DOM elements, etc.
   };
   return cleanup;
   ```

4. **Document Your Code**: Add comments to explain complex logic or unusual patterns.

5. **Keep It Simple**: Start with a simple plugin and add features incrementally.

## Example Plugins

For inspiration, check out these example plugins in the BetterSEQTA+ codebase:

1. **Timetable Plugin**: Enhances the SEQTA timetable view with zoom controls and filtering options.
   - Location: `src/plugins/built-in/timetable/index.ts`

2. **Notification Collector**: Improves the notification system in SEQTA Learn.
   - Location: `src/plugins/built-in/notification-collector/index.ts`

## Troubleshooting

### Plugin Not Loading

- Check that your plugin is properly registered
- Verify that there are no TypeScript errors
- Look for error messages in the console

### Plugin Not Working as Expected

- Ensure that your plugin's `enabled` setting is true
- Check that your selectors match the SEQTA DOM structure
- Use `console.log` statements to debug your code

### TypeScript Errors

- Make sure your interfaces are properly defined
- Check that you're using the correct types for the plugin API
- Verify that your plugin implements the `Plugin` interface correctly

## Next Steps

- [Learn About Type-Safe Settings](../settings/creating-plugins.md)
- [Explore the Plugin API](../advanced/plugin-api.md)
- [Contribute to BetterSEQTA+](../contributing.md) 
