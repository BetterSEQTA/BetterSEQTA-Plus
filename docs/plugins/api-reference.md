# Plugin API Reference

This document provides detailed technical information about BetterSEQTA+'s plugin APIs. For a beginner-friendly introduction, see [Creating Your First Plugin](./README.md).

## Plugin Interface

The core `Plugin` interface that all plugins must implement:

```typescript
interface Plugin<T extends PluginSettings = PluginSettings, S = any> {
  id: string;            // Unique identifier for the plugin
  name: string;          // Display name
  description: string;   // Plugin description
  version: string;       // Semantic version (e.g. "1.0.0")
  settings: T;           // Plugin settings (type-safe)
  styles?: string;       // Optional CSS styles
  disableToggle?: boolean; // Whether to show enable/disable toggle
  run: (api: PluginAPI<T, S>) => void | Promise<void> | (() => void) | Promise<(() => void)>;
}
```

## SEQTA API

The `SEQTAAPI` interface provides methods for interacting with SEQTA's UI:

```typescript
interface SEQTAAPI {
  // Wait for an element to appear in the DOM
  onMount(
    selector: string,           // CSS selector
    callback: (el: Element) => void
  ): { unregister: () => void };

  // Get React fiber for debugging/advanced usage
  getFiber(selector: string): ReactFiber;

  // Get current SEQTA page
  getCurrentPage(): string;

  // Listen for page changes
  onPageChange(
    callback: (page: string) => void
  ): { unregister: () => void };
}
```

## Settings API

The settings system provides type-safe plugin configuration:

```typescript
interface SettingsAPI<T extends PluginSettings> {
  // Access setting values
  [K in keyof T]: SettingValue<T[K]>;

  // Listen for setting changes
  onChange<K extends keyof T>(
    key: K,
    callback: (value: SettingValue<T[K]>) => void
  ): { unregister: () => void };

  // Remove change listener
  offChange<K extends keyof T>(
    key: K,
    callback: (value: SettingValue<T[K]>) => void
  ): void;

  // Promise that resolves when settings are loaded
  loaded: Promise<void>;
}
```

### Setting Types

Available setting types:

```typescript
// Boolean toggle
booleanSetting({
  default: boolean;
  title: string;
  description: string;
});

// Text input
stringSetting({
  default: string;
  title: string;
  description: string;
  placeholder?: string;
});

// Number input
numberSetting({
  default: number;
  title: string;
  description: string;
  min?: number;
  max?: number;
  step?: number;
});

// Dropdown select
selectSetting<T extends string>({
  default: T;
  title: string;
  description: string;
  options: Array<{
    value: T;
    label: string;
  }>;
});
```

### Using Settings

Two ways to define settings:

1. Using the BasePlugin class (recommended):
```typescript
const settings = defineSettings({
  mySetting: booleanSetting({...})
});

class MyPlugin extends BasePlugin<typeof settings> {
  @Setting(settings.mySetting)
  mySetting!: boolean;
}
```

2. Direct object (simpler but less type-safe):
```typescript
const settings = {
  mySetting: booleanSetting({...})
};
```

## Storage API

Persistent storage for plugin data:

```typescript
interface StorageAPI<T = any> {
  // Get a stored value
  get<K extends keyof T>(key: K): Promise<T[K] | undefined>;
  
  // Set a value
  set<K extends keyof T>(key: K, value: T[K]): Promise<void>;
  
  // Delete a value
  delete<K extends keyof T>(key: K): Promise<void>;
  
  // Listen for changes
  onChange<K extends keyof T>(
    key: K,
    callback: (value: T[K]) => void
  ): { unregister: () => void };
  
  // Promise that resolves when storage is loaded
  loaded: Promise<void>;
}
```

Storage is:
- Persistent across page reloads
- Isolated per plugin (plugins can't access each other's storage)
- Type-safe when using TypeScript
- Automatically synchronized across tabs

## Events API

Inter-plugin communication system:

```typescript
interface EventsAPI {
  // Listen for an event
  on(
    event: string,
    callback: (...args: any[]) => void
  ): { unregister: () => void };

  // Emit an event
  emit(event: string, ...args: any[]): void;
}
```

Event naming conventions:
- Use `plugin.{pluginId}.{eventName}` for plugin-specific events
- Use `seqta.{eventName}` for SEQTA-related events
- Use `global.{eventName}` for system-wide events

## Plugin Lifecycle

1. **Registration**:
   ```typescript
   PluginManager.getInstance().registerPlugin(myPlugin);
   ```

2. **Initialization**:
   - Plugin's `run` function is called
   - Settings and storage are loaded
   - CSS styles are injected (if any)

3. **Running**:
   - Plugin can use all APIs
   - Can listen for events and changes
   - Can modify SEQTA's UI

4. **Cleanup**:
   - When plugin is disabled or unloaded
   - Cleanup function from `run` is called
   - CSS styles are removed
   - Event listeners are cleaned up

## Type Safety

TypeScript types for type-safe plugins:

```typescript
// Plugin with settings and storage types
interface MyPluginSettings {
  theme: string;
  notifications: boolean;
}

interface MyPluginStorage {
  lastVisit: string;
  userData: { name: string; id: number };
}

const myPlugin: Plugin<MyPluginSettings, MyPluginStorage> = {
  // TypeScript will ensure type safety for:
  // - Settings access and changes
  // - Storage operations
  // - Event payloads (when typed)
};
```

## Error Handling

Best practices for plugin error handling:

```typescript
run: async (api) => {
  try {
    // Initialization
    await someAsyncOperation();
    
    // Return cleanup
    return () => {
      try {
        // Cleanup code
      } catch (error) {
        console.error('Plugin cleanup failed:', error);
      }
    };
  } catch (error) {
    // Log error but don't crash
    console.error('Plugin initialization failed:', error);
    
    // Still return cleanup to ensure proper shutdown
    return () => {};
  }
}
```

## Performance Considerations

1. **DOM Operations**:
   - Use `onMount` instead of polling
   - Batch DOM updates
   - Use CSS classes instead of inline styles
   - Remove listeners when not needed

2. **Storage**:
   - Cache frequently accessed values
   - Batch storage operations
   - Don't store large objects

3. **Events**:
   - Clean up listeners
   - Use typed events
   - Don't emit events too frequently

4. **Settings**:
   - Use appropriate setting types
   - Provide good defaults
   - Handle setting changes efficiently 