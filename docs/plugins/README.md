# BetterSEQTA+ Plugin System

BetterSEQTA+ features a powerful plugin system that allows developers to extend and customize the functionality of SEQTA Learn. This document provides an overview of how the plugin system works and how to get started with creating your own plugins.

## What is a Plugin?

A plugin is a self-contained piece of code that adds functionality to BetterSEQTA+. Plugins can:

- Add new UI elements to SEQTA Learn
- Modify existing UI elements
- Add new features to SEQTA Learn
- Modify or extend existing features
- Store and retrieve user data
- Respond to events in SEQTA Learn

Each plugin is isolated from other plugins, with its own settings, storage, and lifecycle. This ensures that plugins can be enabled, disabled, or removed without affecting other parts of the system.

## Plugin Architecture

The BetterSEQTA+ plugin system consists of several key components:

### 1. Plugin Interface

All plugins implement the `Plugin` interface, which defines the structure and lifecycle methods of a plugin:

```typescript
export interface Plugin<T extends PluginSettings = PluginSettings, S = any> {
  id: string;
  name: string;
  description: string;
  version: string;
  settings: T;
  run: (api: PluginAPI<T, S>) => void | Promise<void> | (() => void) | Promise<(() => void)>;
}
```

### 2. Plugin API

When a plugin is run, it receives an instance of the `PluginAPI`, which provides access to various services and utilities:

```typescript
export interface PluginAPI<T extends PluginSettings, S = any> {
  seqta: SEQTAAPI;
  settings: SettingsAPI<T>;
  storage: TypedStorageAPI<S>;
  events: EventsAPI;
}
```

- **SEQTA API**: Provides methods for interacting with the SEQTA Learn UI
- **Settings API**: Provides type-safe access to plugin settings
- **Storage API**: Provides type-safe persistent storage for plugin data
- **Events API**: Allows plugins to emit and listen for events

### 3. Plugin Manager

The Plugin Manager is responsible for loading, starting, stopping, and managing plugins. It handles the lifecycle of each plugin and ensures that plugins have access to the resources they need.

### 4. Plugin Registry

The Plugin Registry is a central repository of all available plugins. Built-in plugins are automatically registered, and additional plugins can be registered dynamically.

## Plugin Lifecycle

Plugins follow a simple lifecycle:

1. **Registration**: The plugin is registered with the Plugin Manager
2. **Loading**: The plugin's settings and storage are loaded
3. **Running**: The plugin's `run` method is called with the Plugin API
4. **Cleanup**: If the plugin returns a cleanup function, it is called when the plugin is stopped

## Creating a Plugin

Creating a plugin for BetterSEQTA+ involves a few simple steps:

1. Define your plugin's interface
2. Implement the Plugin interface
3. Register your plugin with the Plugin Manager

For a detailed guide on creating plugins, see [Creating Your First Plugin](./creating-plugins.md).

## Built-in Plugins

BetterSEQTA+ comes with several built-in plugins that provide core functionality:

- **Timetable**: Enhances the SEQTA timetable view
- **Notification Collector**: Improves the notification system
- **Theme Customizer**: Allows customization of the SEQTA theme
- **Assessment Enhancer**: Adds features to the assessment view

These plugins serve as good examples of how to use the plugin system effectively.

## Type-Safe Settings and Storage

One of the key features of the BetterSEQTA+ plugin system is its type-safe settings and storage. Using TypeScript generics, plugins can define the structure of their settings and storage, ensuring that they are used correctly throughout the codebase.

### Settings Example

```typescript
interface MyPluginSettings extends PluginSettings {
  enabled: {
    type: 'boolean';
    default: boolean;
    title: string;
    description: string;
  };
  refreshInterval: {
    type: 'number';
    default: number;
    title: string;
    description: string;
    min: number;
    max: number;
  };
}
```

### Storage Example

```typescript
interface MyPluginStorage {
  lastRefresh: string;
  savedItems: string[];
  userPreferences: {
    theme: 'light' | 'dark';
    fontSize: number;
  };
}
```

## Decorator-Based Settings

BetterSEQTA+ also offers a more modern, decorator-based approach to defining settings. For more information, see [Creating Plugins with Settings](../settings/creating-plugins.md).

## Plugin API Reference

The Plugin API provides a rich set of features for interacting with SEQTA Learn. For a complete reference, see [Plugin API Reference](../advanced/plugin-api.md).

## Best Practices

When creating plugins for BetterSEQTA+, consider these best practices:

1. **Use TypeScript**: Take advantage of TypeScript's type system to ensure type safety in your plugins.
2. **Keep Plugins Focused**: Each plugin should do one thing well.
3. **Handle Cleanup**: Always return a cleanup function from your plugin's `run` method to ensure proper resource management.
4. **Document Your Code**: Add clear documentation to your code, especially for public APIs.
5. **Test Thoroughly**: Test your plugins in different environments and with different configurations.
6. **Follow UI Guidelines**: When adding UI elements, follow the SEQTA Learn UI guidelines to maintain a consistent experience.
7. **Optimize Performance**: Be mindful of performance impact, especially for plugins that run on every page.

## Next Steps

- [Creating Your First Plugin](./creating-plugins.md)
- [Plugin API Reference](../advanced/plugin-api.md)
- [Typed Storage API](../advanced/storage-api.md) 