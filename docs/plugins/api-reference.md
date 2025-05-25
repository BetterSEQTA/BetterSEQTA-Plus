# Plugin API Reference

This document provides detailed technical information about BetterSEQTA+'s plugin APIs. For a beginner-friendly introduction, see [Creating Your First Plugin](./README.md).

## Plugin Structure

Here's how a plugin is structured:

```typescript
import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  defineSettings,
  Setting,
} from "@/plugins/core/settingsHelpers";

// First, define your settings
const settings = defineSettings({
  enabled: booleanSetting({
    default: true,
    title: "Enable Feature",
    description: "Turn this feature on or off",
  }),
});

// Create a class to handle your settings
class MyPluginClass extends BasePlugin<typeof settings> {
  @Setting(settings.enabled)
  enabled!: boolean;
}

// Create an instance of your settings
const settingsInstance = new MyPluginClass();

// Create your plugin
const myPlugin: Plugin<typeof settings> = {
  id: "my-plugin",
  name: "My Plugin",
  description: "A cool plugin that does things",
  version: "1.0.0",
  settings: settingsInstance.settings,
  disableToggle: true,
  beta: true,

  run: async (api) => {
    console.log("Plugin is running!");

    // Do stuff when settings change
    api.settings.onChange("enabled", (enabled) => {
      if (enabled) {
        console.log("Feature enabled!");
      }
    });

    // Return a cleanup function
    return () => {
      console.log("Plugin cleanup");
    };
  },
};

export default myPlugin;
```

## Plugin Metadata

The plugin object supports several metadata fields and options:

```typescript
interface Plugin {
  // Required fields
  id: string;                    // Unique identifier (lowercase, dashes)
  name: string;                  // Display name shown to users
  description: string;           // Brief description of what the plugin does
  version: string;               // Semantic version (e.g., "1.0.0")
  settings: PluginSettings;      // Plugin settings object
  run: (api: PluginAPI) => void; // Main plugin function

  // Optional fields
  styles?: string;               // CSS styles to inject
  disableToggle?: boolean;       // Show enable/disable toggle in settings
  defaultEnabled?: boolean;      // Start enabled/disabled (requires disableToggle)
  beta?: boolean;               // Show "Beta" tag in settings UI
}
```

### Metadata Options

- **`disableToggle`**: When `true`, users can enable/disable your plugin in the settings page
- **`defaultEnabled`**: When `false`, your plugin starts disabled by default (only works with `disableToggle: true`)
- **`beta`**: When `true`, displays an orange "Beta" tag next to your plugin name in the settings UI
- **`styles`**: CSS string that gets injected into the page when your plugin runs

## SEQTA API

The SEQTA API helps you interact with SEQTA's pages:

```typescript
import type { Plugin } from "@/plugins/core/types";

const seqtaPlugin: Plugin<typeof settings> = {
  id: "seqta-example",
  name: "SEQTA Example",
  description: "Shows how to use the SEQTA API",
  version: "1.0.0",
  settings: {},
  disableToggle: true,

  run: async (api) => {
    // Wait for elements to appear
    const { unregister: timetableUnregister } = api.seqta.onMount(
      ".timetable",
      (timetable) => {
        const button = document.createElement("button");
        button.textContent = "Export";
        timetable.appendChild(button);
      },
    );

    // Track page changes
    const { unregister: pageUnregister } = api.seqta.onPageChange((page) => {
      console.log("User went to:", page);
    });

    // Clean up when disabled
    return () => {
      timetableUnregister();
      pageUnregister();
    };
  },
};

export default seqtaPlugin;
```

## Settings API

Here's how to add settings to your plugin:

```typescript
import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  stringSetting,
  numberSetting,
  selectSetting,
  defineSettings,
  Setting,
} from "@/plugins/core/settingsHelpers";

// Define your settings
const settings = defineSettings({
  darkMode: booleanSetting({
    default: false,
    title: "Dark Mode",
    description: "Enable dark mode",
  }),
  userName: stringSetting({
    default: "",
    title: "User Name",
    description: "Your display name",
    placeholder: "Enter your name...",
  }),
  theme: selectSetting({
    default: "light",
    title: "Theme",
    description: "Choose your theme",
    options: [
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
    ],
  }),
});

// Create your settings class
class ThemePluginClass extends BasePlugin<typeof settings> {
  @Setting(settings.darkMode)
  darkMode!: boolean;

  @Setting(settings.userName)
  userName!: string;

  @Setting(settings.theme)
  theme!: string;
}

// Create the plugin
const themePlugin: Plugin<typeof settings> = {
  id: "theme-example",
  name: "Theme Example",
  description: "Shows how to use settings",
  version: "1.0.0",
  settings: new ThemePluginClass().settings,
  disableToggle: true,

  run: async (api) => {
    // Apply initial settings
    if (api.settings.darkMode) {
      document.body.classList.add("dark");
    }

    // Listen for changes
    const { unregister } = api.settings.onChange("darkMode", (enabled) => {
      document.body.classList.toggle("dark", enabled);
    });

    return () => {
      unregister();
      document.body.classList.remove("dark");
    };
  },
};

export default themePlugin;
```

## Storage API

Here's how to use storage in your plugin:

```typescript
import type { Plugin } from "@/plugins/core/types";

const storagePlugin: Plugin<typeof settings> = {
  id: "storage-example",
  name: "Storage Example",
  description: "Shows how to use storage",
  version: "1.0.0",
  settings: {},
  disableToggle: true,

  run: async (api) => {
    // Wait for storage to be ready
    await api.storage.loaded;

    // Save some data
    await api.storage.set("lastVisit", new Date().toISOString());

    // Get saved data
    const lastVisit = await api.storage.get("lastVisit");
    console.log("Last visit:", lastVisit);

    // Listen for changes
    const { unregister } = api.storage.onChange("lastVisit", (newValue) => {
      console.log("Last visit updated:", newValue);
    });

    return () => {
      unregister();
    };
  },
};

export default storagePlugin;
```

## Events API

Here's how to use events in your plugin:

```typescript
import type { Plugin } from "@/plugins/core/types";

const eventsPlugin: Plugin<typeof settings> = {
  id: "events-example",
  name: "Events Example",
  description: "Shows how to use events",
  version: "1.0.0",
  settings: {},
  disableToggle: true,

  run: async (api) => {
    // Listen for theme changes
    const { unregister: themeListener } = api.events.on(
      "theme.changed",
      (theme) => {
        console.log("Theme changed to:", theme);
      },
    );

    // Listen for notifications
    const { unregister: notifyListener } = api.events.on(
      "notification.new",
      (notification) => {
        console.log("New notification:", notification);
      },
    );

    // Clean up listeners
    return () => {
      themeListener();
      notifyListener();
    };
  },
};

export default eventsPlugin;
```

## Performance Tips

Here's how to write efficient plugins:

```typescript
import type { Plugin } from "@/plugins/core/types";

const efficientPlugin: Plugin<typeof settings> = {
  id: "efficient-example",
  name: "Efficient Example",
  description: "Shows performance best practices",
  version: "1.0.0",
  settings: {},
  disableToggle: true,

  run: async (api) => {
    // ✅ Good: Use onMount
    const { unregister } = api.seqta.onMount(".timetable", (el) => {
      el.classList.add("enhanced");
    });

    // ❌ Bad: Don't use intervals
    // const interval = setInterval(() => {
    //   const el = document.querySelector('.timetable');
    //   if (el) el.classList.add('enhanced');
    // }, 100);

    // ✅ Good: Cache DOM elements
    const header = document.querySelector(".header");
    if (header) {
      // Reuse header instead of querying again
    }

    // ✅ Good: Batch DOM updates
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 10; i++) {
      const div = document.createElement("div");
      fragment.appendChild(div);
    }
    document.body.appendChild(fragment);

    return () => {
      unregister();
      // clearInterval(interval); // If you used the bad approach
    };
  },
};

export default efficientPlugin;
```

Each plugin should be in its own file and exported as the default export. The plugin should:

1. Import necessary types and helpers
2. Define settings if needed
3. Create a settings class if using settings
4. Create the plugin object with proper type annotation
5. Export the plugin as default

Remember to always:

- Use proper TypeScript types
- Clean up when your plugin is disabled
- Handle errors gracefully
- Follow the plugin structure shown above
