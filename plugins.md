# BetterSEQTA+ Plugin System

## Overview
The BetterSEQTA+ plugin system is designed to provide a clean, type-safe, and developer-friendly way to extend the functionality of BetterSEQTA+. While initially focused on built-in plugins, the architecture is designed to potentially support external plugins in the future.

## Core Concepts

### Plugin Structure
Each plugin is a simple object that contains metadata and a run function:

```typescript
const examplePlugin = {
  id: 'example',
  name: 'Example Plugin',
  description: 'Does something cool',
  version: '1.0.0',
  settings: {
    enabled: { type: 'boolean', default: true },
    color: { type: 'string', default: '#ff0000' }
  },
  
  run: (api) => {
    // Plugin logic here
  }
};
```

### Plugin API
Plugins receive a powerful API object that provides access to:

- **Settings**: Type-safe settings management with direct property access
- **SEQTA Integration**: React component mounting and state management
- **Storage**: Persistent storage capabilities
- **Events**: Communication system

### Settings System
Settings are defined with TypeScript types for safety and accessed like regular properties:

```typescript
// In your plugin
api.settings.myOption = true;
const value = api.settings.myOption;

// Watch for changes
api.settings.onChange('myOption', (newValue) => {
  console.log('Option changed:', newValue);
});
```

### SEQTA Integration
Plugins can interact with SEQTA's React components:

```typescript
// Listen for component mounting
api.seqta.onMount('.timetable-view', (element) => {
  // Access the DOM element directly
  console.log('Timetable mounted:', element);
  
  // If you need React access, use getFiber
  const fiber = api.seqta.getFiber('.timetable-view');
  fiber.setState(prevState => ({
    ...prevState,
    someValue: true
  }));
});

// Get specific component
const fiber = api.seqta.getFiber('.timetable-cell');
const props = await fiber.getProps();

// Listen for page changes
api.seqta.onPageChange((page) => {
  if (page === 'timetable') {
    // Handle timetable page
  }
});
```

## Implementation Status

### Phase 1: Core Infrastructure ✅
- [x] Create basic plugin type definitions
- [x] Implement plugin manager
- [x] Set up basic API structure
- [x] Create plugin loading system

### Phase 2: Settings System ✅
- [x] Design settings storage structure
- [x] Implement settings proxy system
- [x] Add settings change notifications
- [x] Create settings validation

### Phase 3: SEQTA Integration ✅
- [x] Implement component mount detection
- [x] Create ReactFiber wrapper
- [x] Add page change detection
- [x] Create component state utilities

### Phase 4: Plugin API Features ✅
- [x] Storage system
- [x] Event system
- [x] Error handling
- [ ] Plugin lifecycle hooks

### Phase 5: Migration & Testing 🚧
- [ ] Convert existing features to plugins
- [ ] Create plugin testing utilities
- [ ] Add plugin documentation
- [ ] Create example plugins

### Phase 6: Future Enhancements 📝
- [ ] Plugin dependencies system
- [ ] Plugin hot-reloading
- [ ] External plugin support
- [ ] Plugin marketplace infrastructure

## Plugin Example

```typescript
const timetablePlugin = {
  id: 'timetable',
  name: 'Timetable Enhancer',
  description: 'Adds extra features to the timetable view',
  version: '1.0.0',
  settings: {
    showWeekends: {
      type: 'boolean',
      default: false,
      description: 'Show weekend days in the timetable'
    },
    theme: {
      type: 'select',
      options: ['light', 'dark', 'auto'],
      default: 'auto',
      description: 'Timetable theme'
    }
  },
  
  run: async (api) => {
    // Listen for timetable mount
    api.seqta.onMount('.timetable-view', (element) => {
      // Get React access since we need to modify state
      const fiber = api.seqta.getFiber('.timetable-view');
      
      // Apply settings
      if (api.settings.showWeekends) {
        fiber.setState(prevState => ({
          ...prevState,
          showWeekends: true
        }));
      }
    });

    // Watch for settings changes
    api.settings.onChange('theme', async (newTheme) => {
      const timetable = api.seqta.getFiber('.timetable-view');
      if (newTheme !== 'auto') {
        await timetable.setProp('theme', newTheme);
      }
    });
  }
};
```

## Directory Structure
```
src/
  plugins/
    core/
      types.ts         # Core type definitions
      createAPI.ts     # API implementation
      manager.ts       # Plugin manager
    built-in/         # Built-in plugins
      timetable/
      assessments/
      etc...
```

## API Type Definitions

```typescript
interface BSAPI<TSettings> {
  seqta: {
    onMount: (selector: string, callback: (fiber: ReactFiber) => void) => void;
    getFiber: (selector: string) => ReactFiber;
    getCurrentPage: () => string;
    onPageChange: (callback: (page: string) => void) => void;
  };

  settings: TSettings & {
    onChange: <K extends keyof TSettings>(
      key: K, 
      callback: (value: TSettings[K]) => void
    ) => void;
  };

  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };

  events: {
    on: (event: string, callback: (...args: any[]) => void) => void;
    emit: (event: string, ...args: any[]) => void;
  };
}
```