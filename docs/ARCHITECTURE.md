# BetterSEQTA+ Architecture

**Published version:** [docs.betterseqta.org/architecture/](https://docs.betterseqta.org/architecture/)

Hey there! 👋 New to the codebase and feeling a bit lost? Don't worry - this guide will help you understand how everything fits together!

## Table of Contents

- [Overview](#overview)
- [High-Level Architecture](#high-level-architecture)
- [Core Components](#core-components)
- [Plugin System](#plugin-system)
- [File Structure Explained](#file-structure-explained)
- [Data Flow](#data-flow)
- [Browser Extension Basics](#browser-extension-basics)

## Overview

BetterSEQTA+ is a browser extension that enhances SEQTA Learn by:
- Adding new features through a plugin system
- Providing customizable themes and UI improvements
- Offering better navigation and user experience

Think of it like this: **SEQTA Learn + BetterSEQTA+ = Enhanced SEQTA Experience**

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER EXTENSION                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌──────────────────┐                │
│  │  Background     │    │  Content Script  │                │
│  │  Script         │    │  (SEQTA.ts)      │                │
│  │                 │    │                  │                │
│  │  - Settings     │◄───┤  - Page Detection│                │
│  │  - Storage      │    │  - Plugin Loading│                │
│  │  - Updates      │    │  - UI Injection  │                │
│  └─────────────────┘    └──────────────────┘                │
│                                   │                         │
│                         ┌─────────▼─────────┐               │
│                         │   Plugin System   │               │
│                         │                   │               │
│                         │  ┌─────────────┐  │               │
│                         │  │ Built-in    │  │               │
│                         │  │ Plugins     │  │               │
│                         │  │             │  │               │
│                         │  │ - Themes    │  │               │
│                         │  │ - Search    │  │               │
│                         │  │ - Timetable │  │               │
│                         │  │ - etc...    │  │               │
│                         │  └─────────────┘  │               │
│                         └───────────────────┘               │
│                                   │                         │
│                         ┌─────────▼─────────┐               │
│                         │   Settings UI     │               │
│                         │   (Svelte App)    │               │
│                         │                   │               │
│                         │  - Plugin Config  │               │
│                         │  - Theme Creator  │               │
│                         │  - General Settings│              │
│                         └───────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │   SEQTA Learn     │
                         │   Website         │
                         └───────────────────┘
```

## Core Components

### 1. Entry Point (`src/SEQTA.ts`)
This is where it all begins! When you visit a SEQTA page:
1. Detects if you're on a SEQTA Learn page
2. Injects our CSS styles
3. Changes the favicon to BetterSEQTA+ icon
4. Loads settings from storage
5. Initializes the plugin system

### 2. Plugin System (`src/plugins/`)
The heart of BetterSEQTA+! This is what makes it extensible:
- **Plugin Manager**: Registers and manages all plugins
- **Built-in Plugins**: Pre-made plugins (themes, search, etc.)
- **Plugin API**: Provides plugins with tools to interact with SEQTA

### 3. Settings UI (`src/interface/`)
A Svelte application that lets users:
- Enable/disable plugins
- Configure plugin settings
- Create custom themes
- Browse the theme store

### 4. Background Script (`src/background.ts`)
Runs in the background and handles:
- Extension-wide settings storage
- Communication between different parts
- Update notifications

## Plugin System

Our plugin system is what makes BetterSEQTA+ so powerful. Here's how it works:

### Plugin Lifecycle
```
Plugin Registration → Settings Loading → Plugin Initialization → Running → Cleanup
```

### Built-in Plugins Overview

| Plugin | What it does | Files |
|--------|-------------|-------|
| **Themes** | Custom CSS themes and backgrounds | `src/plugins/built-in/themes/` |
| **Global Search** | Search across all SEQTA content | `src/plugins/built-in/globalSearch/` |
| **Timetable** | Enhanced timetable features | `src/plugins/built-in/timetable/` |
| **Profile Picture** | Custom profile pictures | `src/plugins/built-in/profilePicture/` |
| **Animated Background** | Moving background animations | `src/plugins/built-in/animatedBackground/` |

### Creating a Plugin
Every plugin follows this structure:
```typescript
const myPlugin: Plugin = {
  id: "unique-plugin-id",
  name: "Human Readable Name",
  description: "What does this plugin do?",
  version: "1.0.0",
  settings: { /* user configurable options */ },
  run: async (api) => {
    // Your plugin code goes here!
  }
};
```

## File Structure Explained

```
src/
├── SEQTA.ts              # 🚀 Main entry point - start reading here!
├── background.ts         # 🔧 Background script for extension
├── manifests/           # 📦 Browser extension manifests
├── plugins/             # 🧩 Plugin system (the magic happens here!)
│   ├── core/           # 🏗️  Plugin infrastructure 
│   ├── built-in/       # 🎁 Pre-made plugins
│   └── index.ts        # 📋 Plugin registration
├── interface/          # 🎨 Settings UI (Svelte app)
│   ├── pages/          # 📄 Settings pages
│   ├── components/     # 🧱 Reusable UI components
│   └── main.ts         # 🏠 Settings app entry point
├── seqta/              # 🔗 SEQTA-specific utilities
│   ├── main.ts         # 🎯 Core SEQTA modifications
│   ├── ui/             # 🎨 UI manipulation helpers
│   └── utils/          # 🛠️  Helper functions
└── css/                # 💄 Styles and themes
```

### Where to Start Reading?
1. **New to the project?** Start with `src/SEQTA.ts`
2. **Want to understand plugins?** Look at `src/plugins/core/types.ts`
3. **Want to see a simple plugin?** Check out `src/plugins/built-in/profilePicture/`
4. **Interested in the UI?** Explore `src/interface/main.ts`

## Data Flow

Here's how data flows through the system:

```
User visits SEQTA → SEQTA.ts detects page → Loads settings from storage
                                                        │
                                                        ▼
Plugin Manager initializes → Each plugin gets API access → Plugins modify SEQTA
                                                        │
                                                        ▼
User opens settings → Svelte UI loads → Settings changed → Storage updated
                                                        │
                                                        ▼
Storage change detected → Plugins notified → UI updates automatically
```

## Browser Extension Basics

Never worked on a browser extension before? Here's what you need to know:

### Content Scripts vs Background Scripts
- **Content Script** (`SEQTA.ts`): Runs on SEQTA pages, can access and modify the page
- **Background Script** (`background.ts`): Runs in the background, handles storage and messaging

### Manifest Files
Each browser needs a slightly different manifest file:
- `manifests/chrome.ts` - Chrome, Edge, Brave
- `manifests/firefox.ts` - Firefox
- `manifests/safari.ts` - Safari (experimental)

### Communication
Different parts of the extension communicate using:
- `browser.runtime.sendMessage()` - Send messages
- `browser.storage` - Shared storage, but we have created a custom storage system that is easier to use:
```ts
settingsState.[the setting name] = [whatever you want to set it to]
console.log(settingsState.[the setting name])
```
- Custom events for plugin communication

## Development Tips

### Debugging
1. **Chrome DevTools**: Right-click → Inspect → Console tab
2. **Extension Console**: `chrome://extensions` → BetterSEQTA+ → "Inspect views: background page"
3. **Look for logs**: We log everything with `[BetterSEQTA+]` prefix

### Making Changes
1. Edit code → Save → Browser auto-reloads extension → Refresh SEQTA page
2. For UI changes: The dev server hot-reloads automatically
3. For plugin changes: May need to disable/enable the plugin in settings

### Common Gotchas
- Settings take a moment to load (use `api.settings.loaded` promise)
- Some SEQTA elements load dynamically (use `api.seqta.onMount()`)
- Plugin cleanup is important (always return a cleanup function)

## Next Steps

Ready to contribute? Here's what to do next:

1. **Read the code**: Start with `src/SEQTA.ts` and follow the flow
2. **Try creating a simple plugin**: Follow the [plugin documentation](https://docs.betterseqta.org/plugins/)
3. **Look at existing issues**: Check our [GitHub issues](https://github.com/BetterSEQTA/BetterSEQTA-plus/issues) for "good first issue" labels
4. **Join our Discord**: Get help from the community!

## Questions?

Still confused about something? That's totally normal! Here are your options:
- 💬 Ask in our [Discord server](https://discord.gg/YzmbnCDkat)
- 🐛 Open an issue on GitHub
- 📧 Email us at betterseqta.plus@gmail.com

Remember: **Every expert was once a beginner!** We're here to help you learn and contribute. 🚀 