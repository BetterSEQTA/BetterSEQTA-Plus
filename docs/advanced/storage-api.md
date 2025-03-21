# Storage API Guide

The Storage API is a powerful component of BetterSEQTA+ that allows plugins to store and retrieve data persistently. This guide covers the TypedStorageAPI in detail, including advanced usage patterns and best practices.

## Overview

The Storage API provides a type-safe, persistent storage mechanism for plugins. Each plugin has its own storage namespace, ensuring that plugins cannot interfere with each other's data.

The Storage API is generic, allowing plugins to define their own storage structure through TypeScript interfaces:

```typescript
export interface TypedStorageAPI<S = any> {
  get<K extends keyof S>(key: K): S[K] | undefined;
  set<K extends keyof S>(key: K, value: S[K]): void;
  onChange<K extends keyof S>(key: K, callback: (value: S[K]) => void): () => void;
  getAll(): Partial<S>;
  clear(): void;
}
```

## Defining Your Storage Structure

Before using the Storage API, you should define the structure of your plugin's storage using a TypeScript interface:

```typescript
interface MyPluginStorage {
  lastRun: string;
  userPreferences: {
    theme: 'light' | 'dark';
    fontSize: number;
  };
  savedItems: string[];
}
```

Then, when creating your plugin, specify this interface as the second generic parameter to the `Plugin` interface:

```typescript
const myPlugin: Plugin<MyPluginSettings, MyPluginStorage> = {
  // Plugin implementation
};
```

## Using the Storage API

### Getting and Setting Values

The most basic operations are getting and setting values:

```typescript
// Get a value (returns undefined if not set)
const lastRun = api.storage.get('lastRun');

// Set a value
api.storage.set('lastRun', new Date().toISOString());

// Get a nested value
const theme = api.storage.get('userPreferences')?.theme;

// Set a nested value (make sure to preserve existing properties)
const preferences = api.storage.get('userPreferences') || { theme: 'light', fontSize: 14 };
api.storage.set('userPreferences', { ...preferences, theme: 'dark' });
```

### Working with Complex Objects

When working with complex objects, it's important to remember that the Storage API works with references. To update a property of a complex object, you need to create a new object with the updated property:

```typescript
// Get the current preferences
const preferences = api.storage.get('userPreferences') || { theme: 'light', fontSize: 14 };

// Update a property (wrong way - changes won't be detected)
// preferences.theme = 'dark';
// api.storage.set('userPreferences', preferences);

// Update a property (correct way)
api.storage.set('userPreferences', { ...preferences, theme: 'dark' });
```

### Working with Arrays

Similarly, when working with arrays, you need to create a new array to trigger change detection:

```typescript
// Get the current items
const items = api.storage.get('savedItems') || [];

// Add an item (wrong way - changes won't be detected)
// items.push('new item');
// api.storage.set('savedItems', items);

// Add an item (correct way)
api.storage.set('savedItems', [...items, 'new item']);

// Remove an item
api.storage.set('savedItems', items.filter(item => item !== 'item to remove'));
```

### Handling Default Values

When getting a value that might not exist yet, you should provide a default value:

```typescript
const preferences = api.storage.get('userPreferences') || { theme: 'light', fontSize: 14 };
```

Or, as part of your plugin initialization:

```typescript
run: (api) => {
  // Initialize storage with default values
  if (api.storage.get('lastRun') === undefined) {
    api.storage.set('lastRun', new Date().toISOString());
  }

  if (api.storage.get('userPreferences') === undefined) {
    api.storage.set('userPreferences', { theme: 'light', fontSize: 14 });
  }

  if (api.storage.get('savedItems') === undefined) {
    api.storage.set('savedItems', []);
  }

  // Rest of plugin logic
};
```

## Advanced Usage

### Reacting to Storage Changes

The Storage API allows you to register callbacks that will be called when a value changes:

```typescript
const removeListener = api.storage.onChange('userPreferences', (newPreferences) => {
  console.log('User preferences changed:', newPreferences);
  
  // Update UI based on new preferences
  if (newPreferences?.theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
});

// Later, to remove the listener
removeListener();
```

This is particularly useful for updating the UI in response to storage changes, whether those changes were made by your plugin or by the user through a settings panel.

### Synchronizing with Settings

In some cases, you might want to synchronize certain storage values with settings. For example, you might want to save the user's preferences as settings:

```typescript
// When user preferences change
api.storage.onChange('userPreferences', (newPreferences) => {
  // Update the settings
  api.settings.set('theme', newPreferences?.theme || 'light');
  api.settings.set('fontSize', newPreferences?.fontSize || 14);
});

// When settings change
api.settings.onChange('theme', (newTheme) => {
  // Update the storage
  const preferences = api.storage.get('userPreferences') || { theme: 'light', fontSize: 14 };
  api.storage.set('userPreferences', { ...preferences, theme: newTheme });
});
```

### Clearing Storage

You can clear all stored values for your plugin:

```typescript
api.storage.clear();
```

This is useful when you want to reset your plugin to its default state.

### Getting All Stored Values

You can get all stored values as an object:

```typescript
const allStoredValues = api.storage.getAll();
console.log('All stored values:', allStoredValues);
```

This is useful for debugging or for implementing a "reset to defaults" feature.

## Storage Persistence

The Storage API persists data using browser storage mechanisms (e.g., `localStorage`). This means that the data will be available across page refreshes and browser restarts, but will not be shared across different devices or browsers.

The persistence is handled automatically by BetterSEQTA+, so you don't need to worry about saving or loading data explicitly.

## Type Safety Considerations

The TypedStorageAPI is designed to be type-safe, but there are a few things to keep in mind:

1. **Keys Must Exist in Interface**: You can only use keys that are defined in your storage interface.

2. **Values Must Match Type**: The values you set must match the types defined in your interface.

3. **Default Values for Complex Types**: When getting a value that might not exist, make sure to provide a default value with the correct type.

## Best Practices

### 1. Define a Clear Storage Structure

Define a clear and well-documented storage structure using a TypeScript interface. This makes it easier to understand what data your plugin is storing and how it's organized.

```typescript
interface MyPluginStorage {
  /**
   * The timestamp of the last time the plugin was run.
   * Format: ISO 8601 string
   */
  lastRun: string;

  /**
   * User-specific preferences for the plugin.
   */
  userPreferences: {
    /**
     * The user's preferred theme.
     */
    theme: 'light' | 'dark';

    /**
     * The user's preferred font size in pixels.
     */
    fontSize: number;
  };

  /**
   * A list of items saved by the user.
   */
  savedItems: string[];
}
```

### 2. Initialize Storage Early

Initialize your storage with default values as early as possible, ideally at the beginning of your plugin's `run` method. This ensures that the values are available throughout your plugin.

```typescript
run: (api) => {
  // Initialize storage with default values
  const initializeStorage = () => {
    if (api.storage.get('lastRun') === undefined) {
      api.storage.set('lastRun', new Date().toISOString());
    }
    
    if (api.storage.get('userPreferences') === undefined) {
      api.storage.set('userPreferences', { theme: 'light', fontSize: 14 });
    }
    
    if (api.storage.get('savedItems') === undefined) {
      api.storage.set('savedItems', []);
    }
  };
  
  initializeStorage();
  
  // Rest of plugin logic
};
```

### 3. Handle Missing Values Gracefully

Always handle the case where a value might not exist yet. This can happen if the user is running your plugin for the first time, or if there was an issue with storage.

```typescript
const preferences = api.storage.get('userPreferences');
const theme = preferences?.theme || 'light';
const fontSize = preferences?.fontSize || 14;
```

### 4. Clean Up Listeners

If you register change listeners, make sure to clean them up when your plugin is stopped. This prevents memory leaks and ensures that the listeners are not called after your plugin is disabled.

```typescript
run: (api) => {
  // Register listeners
  const listeners = [
    api.storage.onChange('userPreferences', handlePreferencesChange),
    api.storage.onChange('savedItems', handleSavedItemsChange),
  ];
  
  // Return cleanup function
  return () => {
    // Clean up listeners
    listeners.forEach(removeListener => removeListener());
  };
};
```

### 5. Batch Updates When Possible

If you need to update multiple values, consider batching them to reduce the number of storage operations:

```typescript
// Instead of this:
api.storage.set('userPreferences', { ...preferences, theme: 'dark' });
api.storage.set('lastRun', new Date().toISOString());
api.storage.set('savedItems', [...items, 'new item']);

// Consider using a helper function:
const batchUpdate = () => {
  const preferences = api.storage.get('userPreferences') || { theme: 'light', fontSize: 14 };
  const items = api.storage.get('savedItems') || [];
  
  api.storage.set('userPreferences', { ...preferences, theme: 'dark' });
  api.storage.set('lastRun', new Date().toISOString());
  api.storage.set('savedItems', [...items, 'new item']);
};

batchUpdate();
```

## Example: A Complete Plugin with Storage

Here's a complete example of a plugin that uses the Storage API effectively:

```typescript
interface NotesPluginStorage {
  notes: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }[];
  activeNoteId: string | null;
  view: 'list' | 'detail';
}

const notesPlugin: Plugin<NotesPluginSettings, NotesPluginStorage> = {
  id: 'notes',
  name: 'Notes',
  description: 'A simple notes plugin for BetterSEQTA+',
  version: '1.0.0',
  settings: {
    enabled: {
      type: 'boolean',
      default: true,
      title: 'Enable Notes',
      description: 'Turn the notes plugin on or off',
    },
    autoSave: {
      type: 'boolean',
      default: true,
      title: 'Auto Save',
      description: 'Automatically save notes as you type',
    },
  },
  run: (api) => {
    if (!api.settings.get('enabled')) {
      return;
    }

    // Initialize storage with default values
    if (api.storage.get('notes') === undefined) {
      api.storage.set('notes', []);
    }
    
    if (api.storage.get('activeNoteId') === undefined) {
      api.storage.set('activeNoteId', null);
    }
    
    if (api.storage.get('view') === undefined) {
      api.storage.set('view', 'list');
    }

    // Create and render the UI
    let notesContainer: HTMLElement | null = null;
    let removePageListener: () => void;

    const renderUI = async () => {
      const pageContainer = await api.seqta.waitForElement('#page-container');
      
      if (!notesContainer) {
        notesContainer = document.createElement('div');
        notesContainer.className = 'notes-plugin-container';
        pageContainer.appendChild(notesContainer);
      }
      
      renderNotes();
    };

    const renderNotes = () => {
      if (!notesContainer) return;
      
      const notes = api.storage.get('notes') || [];
      const activeNoteId = api.storage.get('activeNoteId');
      const view = api.storage.get('view');
      
      if (view === 'list') {
        notesContainer.innerHTML = `
          <div class="notes-header">
            <h2>Notes</h2>
            <button class="add-note-btn">Add Note</button>
          </div>
          <div class="notes-list">
            ${notes.length === 0 
              ? '<p>No notes yet. Click "Add Note" to create one.</p>' 
              : notes.map(note => `
                <div class="note-item ${note.id === activeNoteId ? 'active' : ''}">
                  <h3>${note.title}</h3>
                  <p>${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}</p>
                  <div class="note-actions">
                    <button class="view-note-btn" data-id="${note.id}">View</button>
                    <button class="delete-note-btn" data-id="${note.id}">Delete</button>
                  </div>
                </div>
              `).join('')}
          </div>
        `;
        
        // Add event listeners
        notesContainer.querySelector('.add-note-btn')?.addEventListener('click', addNote);
        notesContainer.querySelectorAll('.view-note-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = (e.target as HTMLElement).getAttribute('data-id');
            if (id) viewNote(id);
          });
        });
        notesContainer.querySelectorAll('.delete-note-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = (e.target as HTMLElement).getAttribute('data-id');
            if (id) deleteNote(id);
          });
        });
      } else if (view === 'detail') {
        const activeNote = notes.find(note => note.id === activeNoteId);
        
        if (!activeNote) {
          api.storage.set('view', 'list');
          renderNotes();
          return;
        }
        
        notesContainer.innerHTML = `
          <div class="notes-header">
            <button class="back-btn">Back to List</button>
            <h2>Editing Note</h2>
          </div>
          <div class="note-detail">
            <input type="text" class="note-title" value="${activeNote.title}">
            <textarea class="note-content">${activeNote.content}</textarea>
            <div class="note-actions">
              <button class="save-note-btn">Save</button>
            </div>
          </div>
        `;
        
        // Add event listeners
        notesContainer.querySelector('.back-btn')?.addEventListener('click', () => {
          api.storage.set('view', 'list');
          renderNotes();
        });
        
        const titleInput = notesContainer.querySelector('.note-title') as HTMLInputElement;
        const contentTextarea = notesContainer.querySelector('.note-content') as HTMLTextAreaElement;
        
        if (api.settings.get('autoSave')) {
          let timeout: number;
          
          const autoSave = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
              updateNote(activeNoteId, titleInput.value, contentTextarea.value);
            }, 500) as unknown as number;
          };
          
          titleInput.addEventListener('input', autoSave);
          contentTextarea.addEventListener('input', autoSave);
        }
        
        notesContainer.querySelector('.save-note-btn')?.addEventListener('click', () => {
          updateNote(activeNoteId, titleInput.value, contentTextarea.value);
          api.storage.set('view', 'list');
          renderNotes();
        });
      }
    };

    const addNote = () => {
      const notes = api.storage.get('notes') || [];
      const newNote = {
        id: Date.now().toString(),
        title: 'New Note',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      api.storage.set('notes', [...notes, newNote]);
      api.storage.set('activeNoteId', newNote.id);
      api.storage.set('view', 'detail');
      renderNotes();
    };

    const viewNote = (id: string) => {
      api.storage.set('activeNoteId', id);
      api.storage.set('view', 'detail');
      renderNotes();
    };

    const updateNote = (id: string, title: string, content: string) => {
      const notes = api.storage.get('notes') || [];
      const updatedNotes = notes.map(note => 
        note.id === id 
          ? { ...note, title, content, updatedAt: new Date().toISOString() } 
          : note
      );
      
      api.storage.set('notes', updatedNotes);
    };

    const deleteNote = (id: string) => {
      const notes = api.storage.get('notes') || [];
      const updatedNotes = notes.filter(note => note.id !== id);
      
      api.storage.set('notes', updatedNotes);
      
      if (api.storage.get('activeNoteId') === id) {
        api.storage.set('activeNoteId', null);
      }
      
      renderNotes();
    };

    // Register listeners
    const storageListeners = [
      api.storage.onChange('notes', renderNotes),
      api.storage.onChange('activeNoteId', renderNotes),
      api.storage.onChange('view', renderNotes),
    ];
    
    // Set up page load listener
    removePageListener = api.seqta.onPageLoad('*', renderUI);

    // Return cleanup function
    return () => {
      // Remove event listeners
      storageListeners.forEach(removeListener => removeListener());
      removePageListener();
      
      // Remove UI
      notesContainer?.remove();
      notesContainer = null;
    };
  },
};

export default notesPlugin;
```

## Summary

The Storage API is a powerful tool for maintaining state in your BetterSEQTA+ plugins. By following the best practices outlined in this guide, you can create robust and reliable plugins that provide a great user experience.

Key takeaways:

1. Define a clear storage structure using TypeScript interfaces
2. Initialize storage early with default values
3. Handle missing values gracefully
4. Clean up listeners when your plugin is stopped
5. Use the onChange method to react to storage changes

With these principles in mind, you can leverage the full power of the Storage API in your plugins.

## Next Steps

- [Explore the Plugin API](./plugin-api.md)
- [Learn About Third-Party Plugins](./third-party-plugins.md)
- [Contribute to BetterSEQTA+](../contributing.md) 