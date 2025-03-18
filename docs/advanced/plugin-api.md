# Plugin API Reference

This document provides a comprehensive reference for the BetterSEQTA+ Plugin API. The Plugin API is the primary interface through which plugins interact with BetterSEQTA+ and SEQTA Learn.

## Overview

The Plugin API consists of several sub-APIs:

```typescript
export interface PluginAPI<T extends PluginSettings, S = any> {
  seqta: SEQTAAPI;
  settings: SettingsAPI<T>;
  storage: TypedStorageAPI<S>;
  events: EventsAPI;
}
```

Each plugin receives an instance of this API when it is initialized, with the appropriate generic types for its settings and storage.

## SEQTA API

The SEQTA API provides methods for interacting with the SEQTA Learn interface.

```typescript
export interface SEQTAAPI {
  onPageLoad(path: string, callback: PageLoadCallback): () => void;
  getCurrentPath(): string;
  waitForElement(selector: string, options?: WaitForElementOptions): Promise<Element>;
  createStyleElement(css: string): HTMLStyleElement;
}
```

### `onPageLoad(path: string, callback: PageLoadCallback): () => void`

Registers a callback to be called when a specific page is loaded in SEQTA Learn.

**Parameters:**
- `path`: The URL path to match (e.g., `/timetable`, `/assessments`). Can be a string or a regular expression.
- `callback`: A function to be called when the page is loaded.

**Returns:** A function that, when called, will remove the page load listener.

**Example:**
```typescript
const removeListener = api.seqta.onPageLoad('/timetable', () => {
  console.log('Timetable page loaded!');
});

// Later, to remove the listener
removeListener();
```

### `getCurrentPath(): string`

Gets the current URL path in SEQTA Learn.

**Returns:** The current URL path as a string.

**Example:**
```typescript
const currentPath = api.seqta.getCurrentPath();
console.log(`Current path: ${currentPath}`);
```

### `waitForElement(selector: string, options?: WaitForElementOptions): Promise<Element>`

Waits for an element matching the given selector to appear in the DOM.

**Parameters:**
- `selector`: A CSS selector to match the element.
- `options`: (Optional) An object with the following properties:
  - `timeout`: The maximum time to wait for the element, in milliseconds. Default: 5000.
  - `interval`: The interval between checks, in milliseconds. Default: 100.

**Returns:** A Promise that resolves to the matched element, or rejects if the timeout is reached.

**Example:**
```typescript
try {
  const timetableElement = await api.seqta.waitForElement('.timetable');
  console.log('Timetable element found:', timetableElement);
} catch (error) {
  console.error('Timetable element not found:', error);
}
```

### `createStyleElement(css: string): HTMLStyleElement`

Creates a style element with the given CSS and adds it to the document head.

**Parameters:**
- `css`: The CSS to add to the style element.

**Returns:** The created style element.

**Example:**
```typescript
const styleElement = api.seqta.createStyleElement(`
  .timetable {
    background-color: #f5f5f5;
  }
  .timetable-cell {
    border: 1px solid #ccc;
  }
`);

// Later, to remove the style
styleElement.remove();
```

## Settings API

The Settings API provides type-safe access to plugin settings.

```typescript
export interface SettingsAPI<T extends PluginSettings> {
  get<K extends keyof T>(key: K): SettingValue<T[K]>;
  set<K extends keyof T>(key: K, value: SettingValue<T[K]>): void;
  onChange<K extends keyof T>(key: K, callback: (value: SettingValue<T[K]>) => void): () => void;
  getAll(): { [K in keyof T]: SettingValue<T[K]> };
}
```

### `get<K extends keyof T>(key: K): SettingValue<T[K]>`

Gets the value of a setting.

**Parameters:**
- `key`: The key of the setting to get.

**Returns:** The value of the setting.

**Example:**
```typescript
const isEnabled = api.settings.get('enabled');
console.log(`Plugin enabled: ${isEnabled}`);
```

### `set<K extends keyof T>(key: K, value: SettingValue<T[K]>): void`

Sets the value of a setting.

**Parameters:**
- `key`: The key of the setting to set.
- `value`: The new value for the setting.

**Example:**
```typescript
api.settings.set('enabled', true);
console.log('Plugin enabled!');
```

### `onChange<K extends keyof T>(key: K, callback: (value: SettingValue<T[K]>) => void): () => void`

Registers a callback to be called when a setting changes.

**Parameters:**
- `key`: The key of the setting to watch.
- `callback`: A function to be called when the setting changes.

**Returns:** A function that, when called, will remove the change listener.

**Example:**
```typescript
const removeListener = api.settings.onChange('enabled', (newValue) => {
  console.log(`Plugin enabled changed to: ${newValue}`);
  if (newValue) {
    // Enable functionality
  } else {
    // Disable functionality
  }
});

// Later, to remove the listener
removeListener();
```

### `getAll(): { [K in keyof T]: SettingValue<T[K]> }`

Gets all settings as an object.

**Returns:** An object containing all settings.

**Example:**
```typescript
const allSettings = api.settings.getAll();
console.log('All settings:', allSettings);
```

## Storage API

The Storage API provides type-safe persistent storage for plugin data.

```typescript
export interface TypedStorageAPI<S = any> {
  get<K extends keyof S>(key: K): S[K] | undefined;
  set<K extends keyof S>(key: K, value: S[K]): void;
  onChange<K extends keyof S>(key: K, callback: (value: S[K]) => void): () => void;
  getAll(): Partial<S>;
  clear(): void;
}
```

### `get<K extends keyof S>(key: K): S[K] | undefined`

Gets a value from storage.

**Parameters:**
- `key`: The key of the value to get.

**Returns:** The stored value, or `undefined` if it doesn't exist.

**Example:**
```typescript
const lastRun = api.storage.get('lastRun');
console.log(`Last run: ${lastRun || 'Never'}`);
```

### `set<K extends keyof S>(key: K, value: S[K]): void`

Sets a value in storage.

**Parameters:**
- `key`: The key of the value to set.
- `value`: The new value to store.

**Example:**
```typescript
api.storage.set('lastRun', new Date().toISOString());
console.log('Last run updated!');
```

### `onChange<K extends keyof S>(key: K, callback: (value: S[K]) => void): () => void`

Registers a callback to be called when a stored value changes.

**Parameters:**
- `key`: The key of the value to watch.
- `callback`: A function to be called when the value changes.

**Returns:** A function that, when called, will remove the change listener.

**Example:**
```typescript
const removeListener = api.storage.onChange('lastRun', (newValue) => {
  console.log(`Last run updated to: ${newValue}`);
});

// Later, to remove the listener
removeListener();
```

### `getAll(): Partial<S>`

Gets all stored values as an object.

**Returns:** An object containing all stored values.

**Example:**
```typescript
const allStoredValues = api.storage.getAll();
console.log('All stored values:', allStoredValues);
```

### `clear(): void`

Clears all stored values.

**Example:**
```typescript
api.storage.clear();
console.log('All stored values cleared!');
```

## Events API

The Events API allows plugins to emit and listen for events.

```typescript
export interface EventsAPI {
  on<T = any>(event: string, callback: (data: T) => void): () => void;
  emit<T = any>(event: string, data: T): void;
}
```

### `on<T = any>(event: string, callback: (data: T) => void): () => void`

Registers a callback to be called when an event is emitted.

**Parameters:**
- `event`: The name of the event to listen for.
- `callback`: A function to be called when the event is emitted.

**Returns:** A function that, when called, will remove the event listener.

**Example:**
```typescript
const removeListener = api.events.on('assessmentLoaded', (data) => {
  console.log('Assessment loaded:', data);
});

// Later, to remove the listener
removeListener();
```

### `emit<T = any>(event: string, data: T): void`

Emits an event with the given data.

**Parameters:**
- `event`: The name of the event to emit.
- `data`: The data to include with the event.

**Example:**
```typescript
api.events.emit('myPluginEvent', { message: 'Hello from My Plugin!' });
```

## Using the Plugin API in Practice

### Combining APIs for Complex Functionality

The true power of the Plugin API comes from combining the different sub-APIs to create complex functionality. Here's an example of a plugin that enhances the timetable view:

```typescript
run: (api) => {
  if (!api.settings.get('enabled')) {
    return;
  }

  // Initialize storage if needed
  if (api.storage.get('zoomLevel') === undefined) {
    api.storage.set('zoomLevel', 1);
  }

  // Add styles based on current zoom level
  const updateStyles = () => {
    const zoomLevel = api.storage.get('zoomLevel');
    const styleElement = api.seqta.createStyleElement(`
      .timetable-cell {
        transform: scale(${zoomLevel});
      }
    `);
    return styleElement;
  };

  let currentStyleElement = updateStyles();

  // Listen for storage changes
  const removeStorageListener = api.storage.onChange('zoomLevel', () => {
    // Remove old styles and add new ones
    currentStyleElement.remove();
    currentStyleElement = updateStyles();
  });

  // Add UI controls
  const removePageListener = api.seqta.onPageLoad('/timetable', async () => {
    try {
      const timetableElement = await api.seqta.waitForElement('.timetable');
      
      // Create controls
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'my-plugin-controls';
      controlsDiv.innerHTML = '<button>Zoom In</button><button>Zoom Out</button>';
      timetableElement.appendChild(controlsDiv);
      
      // Add event listeners
      const zoomInButton = controlsDiv.querySelector('button:first-child');
      const zoomOutButton = controlsDiv.querySelector('button:last-child');
      
      zoomInButton.addEventListener('click', () => {
        const currentZoom = api.storage.get('zoomLevel');
        api.storage.set('zoomLevel', Math.min(currentZoom + 0.1, 2));
      });
      
      zoomOutButton.addEventListener('click', () => {
        const currentZoom = api.storage.get('zoomLevel');
        api.storage.set('zoomLevel', Math.max(currentZoom - 0.1, 0.5));
      });
      
      // Emit an event
      api.events.emit('timetableEnhanced', { zoomLevel: api.storage.get('zoomLevel') });
    } catch (error) {
      console.error('Error enhancing timetable:', error);
    }
  });

  // Return cleanup function
  return () => {
    removeStorageListener();
    removePageListener();
    currentStyleElement.remove();
  };
}
```

### Error Handling

Always handle errors gracefully to prevent your plugin from crashing:

```typescript
try {
  // Your code
} catch (error) {
  console.error('Plugin error:', error);
}
```

### Performance Considerations

Be mindful of performance when using the Plugin API:

1. Use `onPageLoad` efficiently to avoid unnecessary work.
2. Clean up event listeners and DOM elements when they're no longer needed.
3. Use `waitForElement` with appropriate timeouts to avoid hanging indefinitely.

## Next Steps

- [Explore the Storage API in Detail](./storage-api.md)
- [Learn About Third-Party Plugins](./third-party-plugins.md)
- [Contribute to BetterSEQTA+](../contributing.md) 