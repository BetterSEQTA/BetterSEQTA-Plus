# Creating Plugins for BetterSEQTA+

Hey there! 👋 So you want to create a plugin for BetterSEQTA+? That's awesome! This guide will walk you through everything you need to know, from the very basics to more advanced features. Don't worry if you're new to this - we'll explain everything step by step.

## What is a Plugin?

In BetterSEQTA+, a plugin is like a mini-app that adds new features to SEQTA. Think of it as a piece of LEGO that you can snap onto SEQTA to make it do new things. For example, you could create a plugin that:

- Changes how SEQTA looks
- Adds new buttons or features
- Shows extra information on your timetable
- Collects notifications in a better way
- Really, anything you can imagine!

## Your First Plugin

Let's create a super simple plugin together. We'll make one that adds a friendly message to the SEQTA homepage. Here's what we'll need:

```typescript
import type { Plugin } from "@/plugins/core/types";

const myFirstPlugin: Plugin = {
  // Every plugin needs these basic details
  id: "my-first-plugin",
  name: "My First Plugin",
  description: "Adds a friendly message to SEQTA",
  version: "1.0.0",

  // This tells BetterSEQTA+ that users can turn our plugin on/off
  disableToggle: true,

  // Optional: Mark your plugin as beta to show a "Beta" tag in settings
  beta: true,

  // This is where the magic happens!
  run: async (api) => {
    // Wait for the homepage to load
    api.seqta.onMount(".home-page", (homePage) => {
      // Create our message
      const message = document.createElement("div");
      message.textContent = "Hello from my first plugin! 🎉";
      message.style.padding = "20px";
      message.style.backgroundColor = "#e9f5ff";
      message.style.borderRadius = "8px";
      message.style.margin = "20px";

      // Add it to the page
      homePage.prepend(message);
    });

    // Return a cleanup function that removes our message when the plugin is disabled
    return () => {
      const message = document.querySelector(".home-page > div");
      message?.remove();
    };
  },
};

export default myFirstPlugin;
```

Let's break down what's happening here:

1. First, we import the `Plugin` type that tells TypeScript what a plugin should look like
2. We create our plugin object with some basic information:
   - `id`: A unique name for your plugin (use lowercase and dashes)
   - `name`: A friendly name that users will see
   - `description`: Explain what your plugin does
   - `version`: Your plugin's version number
3. We set `disableToggle: true` so users can turn our plugin on/off in settings
4. We set `beta: true` to mark the plugin as beta
5. The `run` function is where we put our plugin's code
6. We use `api.seqta.onMount` to wait for the homepage to load
7. We create and style a message element
8. We return a cleanup function that removes our changes when the plugin is disabled

## The Plugin API

When your plugin runs, it gets access to a powerful API that lets you do all sorts of things. Let's look at what you can do:

### SEQTA API (`api.seqta`)

This helps you interact with SEQTA's pages:

```typescript
// Wait for an element to appear on the page
api.seqta.onMount(".some-class", (element) => {
  // Do something with the element
});

// Know when the user changes pages
api.seqta.onPageChange((page) => {
  console.log("User went to:", page);
});

// Get the current page
const currentPage = api.seqta.getCurrentPage();
```

### Settings API (`api.settings`)

Want to let users customize your plugin? Use settings!

```typescript
import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  defineSettings,
  Setting,
} from "@/plugins/core/settingsHelpers";

// Define your settings
const settings = defineSettings({
  showMessage: booleanSetting({
    default: true,
    title: "Show Welcome Message",
    description: "Show a friendly message on the homepage",
  }),
});

// Create a class for your plugin
class MyPluginClass extends BasePlugin<typeof settings> {
  @Setting(settings.showMessage)
  showMessage!: boolean;
}

// Create your plugin
const settingsInstance = new MyPluginClass();

const myPlugin: Plugin<typeof settings> = {
  // ... other plugin details ...
  settings: settingsInstance.settings,

  run: async (api) => {
    // Use the setting
    if (api.settings.showMessage) {
      // Show the message
    }

    // Listen for setting changes
    api.settings.onChange("showMessage", (newValue) => {
      if (newValue) {
        // Show the message
      } else {
        // Hide the message
      }
    });
  },
};
```

### Storage API (`api.storage`)

Need to save some data? The storage API has got you covered:

```typescript
// Save some data
await api.storage.set("lastVisit", new Date().toISOString());

// Get it back later
const lastVisit = await api.storage.get("lastVisit");

// Listen for changes
api.storage.onChange("lastVisit", (newValue) => {
  console.log("Last visit updated:", newValue);
});
```

### Events API (`api.events`)

Want your plugin to be able to interface with other plugins? Then use events!

```typescript
// Listen for an event
api.events.on("myCustomEvent", (data) => {
  console.log("Got event:", data);
});

// Send an event
api.events.emit("myCustomEvent", { some: "data" });
```

## Adding Styles

Want to make your plugin look pretty? You can add CSS styles:

```typescript
const myPlugin: Plugin = {
  // ... other plugin details ...

  // Add your CSS here
  styles: `
    .my-plugin-message {
      background: linear-gradient(135deg, #6e8efb, #a777e3);
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin: 20px;
      animation: slide-in 0.3s ease-out;
    }
    
    @keyframes slide-in {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,

  run: async (api) => {
    // Your plugin code here
  },
};
```

## Best Practices

Here are some tips to make your plugin awesome:

1. **Always Clean Up**: When your plugin is disabled, clean up any changes you made:

   ```typescript
   run: async (api) => {
     // Add stuff to the page
     const element = document.createElement("div");
     document.body.appendChild(element);

     // Return a cleanup function
     return () => {
       element.remove();
     };
   };
   ```

2. **Use TypeScript**: It helps catch errors before they happen and makes your code easier to understand.

3. **Test Your Plugin**: Make sure it works in different situations:

   - When SEQTA is loading
   - When the user switches pages
   - When the plugin is enabled/disabled
   - When settings are changed

4. **Keep It Fast**: Don't slow down SEQTA:

   - Use `onMount` instead of intervals or timeouts
   - Clean up event listeners when they're not needed
   - Don't do heavy calculations on the main thread

5. **Make It User-Friendly**:
   - Add clear settings with good descriptions
   - Use `disableToggle: true` so users can turn it off if needed
   - Add helpful error messages if something goes wrong
   - Use `beta: true` for experimental features to let users know they're trying something new

## Plugin Metadata Options

Your plugin object supports several optional flags to customize how it appears and behaves:

```typescript
const myPlugin: Plugin = {
  id: "my-plugin",
  name: "My Plugin",
  description: "What my plugin does",
  version: "1.0.0",
  
  // Optional flags:
  disableToggle: true,     // Show enable/disable toggle in settings
  defaultEnabled: false,   // Start disabled by default (requires disableToggle: true)
  beta: true,             // Show "Beta" tag in settings UI
  
  // Your plugin code...
  run: async (api) => { /* ... */ },
};
```

- **`disableToggle`**: When `true`, users can enable/disable your plugin in settings
- **`defaultEnabled`**: When `false`, your plugin starts disabled (only works with `disableToggle: true`)
- **`beta`**: When `true`, shows an orange "Beta" tag next to your plugin name in settings

## Examples

Want to see more examples? Check out our built-in plugins:

- [themes](../../src/plugins/built-in/themes/index.ts): Shows how to change SEQTA's appearance
- [notificationCollector](../../src/plugins/built-in/notificationCollector/index.ts): Shows how to work with SEQTA's notifications
- [timetable](../../src/plugins/built-in/timetable/index.ts): Shows how to modify SEQTA's timetable view
- [assessmentsAverage](../../src/plugins/built-in/assessmentsAverage/index.ts): Shows how to add new features to existing pages

## Need Help?

Got stuck? No worries! Here's where you can get help:

- Join our [Discord server](https://discord.gg/YzmbnCDkat)
- Check out the built-in plugins in the `src/plugins/built-in` folder
- Open an issue on our [GitHub page](https://github.com/betterseqta/betterseqta-plus/issues)

Happy coding and feel free to checkout the api reference [here](./api-reference.md)
