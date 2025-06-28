# Example Plugin Template

This is a complete, working example of a simple BetterSEQTA+ plugin. You can copy this code and modify it to create your own plugin!

## What This Example Does

This plugin adds a friendly welcome message to the SEQTA homepage and lets users customize the message through settings.

## Complete Plugin Code

Create a new file in `src/plugins/built-in/my-first-plugin/index.ts`:

```typescript
import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import { 
  defineSettings, 
  booleanSetting, 
  stringSetting 
} from "@/plugins/core/settingsHelpers";
import { Setting } from "@/plugins/core/settingsHelpers";

// Define the plugin settings
const settings = defineSettings({
  enabled: booleanSetting({
    default: true,
    title: "Show Welcome Message",
    description: "Display a welcome message on the SEQTA homepage"
  }),
  customMessage: stringSetting({
    default: "Welcome to SEQTA! 🎉",
    title: "Custom Message",
    description: "The message to display on the homepage",
    maxLength: 100
  }),
  showEmoji: booleanSetting({
    default: true,
    title: "Show Emoji",
    description: "Include emojis in the welcome message"
  })
});

// Create settings class
class MyFirstPluginSettings extends BasePlugin<typeof settings> {
  @Setting(settings.enabled)
  enabled!: boolean;

  @Setting(settings.customMessage)
  customMessage!: string;

  @Setting(settings.showEmoji)
  showEmoji!: boolean;
}

// Create settings instance
const settingsInstance = new MyFirstPluginSettings();

// Define the plugin
const myFirstPlugin: Plugin<typeof settings> = {
  id: "my-first-plugin",
  name: "My First Plugin",
  description: "Adds a customizable welcome message to the SEQTA homepage",
  version: "1.0.0",
  
  // Link our settings
  settings: settingsInstance.settings,
  
  // Mark as beta (optional)
  beta: true,
  
  // Add some CSS styles (optional)
  styles: `
    .my-plugin-welcome {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
      font-size: 18px;
      animation: slideIn 0.5s ease-out;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .my-plugin-welcome .close-btn {
      float: right;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 5px 10px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .my-plugin-welcome .close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `,
  
  // Main plugin function
  run: async (api) => {
    console.log("[My First Plugin] Starting up! 🚀");
    
    // Wait for settings to load
    await api.settings.loaded;
    
    let welcomeElement: HTMLElement | null = null;
    
    // Function to create the welcome message
    const createWelcomeMessage = () => {
      // Only show if enabled in settings
      if (!api.settings.enabled) {
        return;
      }
      
      // Remove existing message if it exists
      if (welcomeElement) {
        welcomeElement.remove();
      }
      
      // Create the message element
      welcomeElement = document.createElement("div");
      welcomeElement.className = "my-plugin-welcome";
      
      // Build the message content
      let message = api.settings.customMessage;
      if (!api.settings.showEmoji) {
        // Remove emojis if disabled
        message = message.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
      }
      
      welcomeElement.innerHTML = `
        <button class="close-btn" onclick="this.parentElement.remove()">×</button>
        <div>${message}</div>
        <small style="opacity: 0.8; margin-top: 10px; display: block;">
          Powered by My First Plugin
        </small>
      `;
      
      return welcomeElement;
    };
    
    // Function to add message to homepage
    const addToHomepage = () => {
      api.seqta.onMount(".home-page, .dashboard, [class*='home']", (homePage) => {
        console.log("[My First Plugin] Found homepage, adding welcome message");
        
        const message = createWelcomeMessage();
        if (message) {
          // Add to the top of the homepage
          homePage.insertBefore(message, homePage.firstChild);
        }
      });
    };
    
    // Add message when plugin starts
    addToHomepage();
    
    // Re-add message when user navigates to homepage
    api.seqta.onPageChange((page) => {
      console.log("[My First Plugin] Page changed to:", page);
      if (page.includes("home") || page.includes("dashboard")) {
        // Small delay to let the page load
        setTimeout(addToHomepage, 500);
      }
    });
    
    // Listen for settings changes and update the message
    api.settings.onChange("enabled", (enabled) => {
      console.log("[My First Plugin] Enabled setting changed:", enabled);
      if (enabled) {
        addToHomepage();
      } else if (welcomeElement) {
        welcomeElement.remove();
        welcomeElement = null;
      }
    });
    
    api.settings.onChange("customMessage", (newMessage) => {
      console.log("[My First Plugin] Message changed:", newMessage);
      if (welcomeElement && api.settings.enabled) {
        // Update existing message
        addToHomepage();
      }
    });
    
    api.settings.onChange("showEmoji", (showEmoji) => {
      console.log("[My First Plugin] Show emoji changed:", showEmoji);
      if (welcomeElement && api.settings.enabled) {
        // Update existing message
        addToHomepage();
      }
    });
    
    // Return cleanup function (called when plugin is disabled)
    return () => {
      console.log("[My First Plugin] Cleaning up...");
      if (welcomeElement) {
        welcomeElement.remove();
        welcomeElement = null;
      }
    };
  }
};

export default myFirstPlugin;
```

## How to Use This Example

### Step 1: Create the Plugin File
1. Create a new folder: `src/plugins/built-in/my-first-plugin/`
2. Create `index.ts` in that folder
3. Copy the code above into `index.ts`

### Step 2: Register the Plugin
Add this to `src/plugins/index.ts`:

```typescript
// Add this import at the top
import myFirstPlugin from "./built-in/my-first-plugin";

// Add this line where other plugins are registered
pluginManager.registerPlugin(myFirstPlugin);
```

### Step 3: Test It
1. Run `npm run dev`
2. Reload your extension in Chrome
3. Visit a SEQTA page
4. You should see your welcome message!
5. Open BetterSEQTA+ settings to customize it

## Key Concepts Explained

### 1. Plugin Structure
```typescript
const myPlugin: Plugin = {
  id: "unique-id",           // Must be unique across all plugins
  name: "Display Name",      // Shown in settings
  description: "What it does", // Shown in settings
  version: "1.0.0",         // Plugin version
  settings: settingsObject, // User-configurable options
  styles: "/* CSS here */", // Optional CSS styles
  run: async (api) => {     // Main plugin code
    // Your code here
  }
};
```

### 2. Settings System
```typescript
// Define what settings your plugin has
const settings = defineSettings({
  myOption: booleanSetting({
    default: true,
    title: "My Option",
    description: "What this option does"
  })
});

// Use in your plugin
if (api.settings.myOption) {
  // Do something
}
```

### 3. SEQTA Integration
```typescript
// Wait for elements to appear
api.seqta.onMount(".some-selector", (element) => {
  // Modify the element
});

// Detect page changes
api.seqta.onPageChange((page) => {
  if (page === "home") {
    // User navigated to homepage
  }
});
```

### 4. Cleanup
Always return a cleanup function to remove your changes when the plugin is disabled:

```typescript
run: async (api) => {
  // Add your features
  
  return () => {
    // Remove your features
  };
}
```

## Customization Ideas

Want to modify this example? Here are some ideas:

1. **Change the styling**: Modify the CSS to use different colors, animations, or layouts
2. **Add more settings**: Number settings, select dropdowns, hotkeys
3. **Different trigger**: Show on different pages, or based on time of day
4. **Add interactions**: Buttons that do things when clicked
5. **Store data**: Use `api.storage` to remember user preferences
6. **Communicate with other plugins**: Use `api.events` to send/receive events

## Next Steps

Once you've got this working:

1. **Experiment**: Try changing things and see what happens
2. **Read other plugins**: Look at the built-in plugins for inspiration
3. **Check the API docs**: Learn about all available API functions
4. **Share your creation**: Show it off in Discord!

## Need Help?

- 💬 Ask in our [Discord server](https://discord.gg/YzmbnCDkat)
- 📚 Read our [Plugin Development Guide](./README.md)
- 🐛 Check the [Troubleshooting Guide](../TROUBLESHOOTING.md)
- 📝 Open an issue on GitHub

Happy coding! 🎉 