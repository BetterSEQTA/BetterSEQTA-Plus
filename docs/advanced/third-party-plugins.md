# Developing Third-Party Plugins

BetterSEQTA+ supports third-party plugins, allowing developers to extend its functionality beyond what's provided by the built-in plugins. This guide covers everything you need to know about developing, distributing, and installing third-party plugins.

## Introduction to Third-Party Plugins

Third-party plugins are plugins developed outside of the main BetterSEQTA+ codebase. They can be created by anyone and distributed to users who want to extend their BetterSEQTA+ experience.

Unlike built-in plugins, which are included with BetterSEQTA+, third-party plugins must be installed separately by users. This allows for a wide range of extensions without bloating the core application.

## Plugin Structure

A third-party plugin is a JavaScript or TypeScript module that exports a plugin object conforming to the `Plugin` interface. It can be distributed as a single file or as a package with multiple files.

### Basic Structure

```typescript
// my-awesome-plugin.ts
import { Plugin, PluginAPI, PluginSettings } from 'betterseqta-plugin-api';

export interface MyAwesomePluginSettings extends PluginSettings {
  enabled: {
    type: 'boolean';
    default: true;
    title: 'Enable My Awesome Plugin';
    description: 'Turn my awesome plugin on or off';
  };
  // Add more settings as needed
}

export interface MyAwesomePluginStorage {
  lastRun: string;
  // Add more storage fields as needed
}

const myAwesomePlugin: Plugin<MyAwesomePluginSettings, MyAwesomePluginStorage> = {
  id: 'my-awesome-plugin',
  name: 'My Awesome Plugin',
  description: 'A simple plugin for BetterSEQTA+',
  version: '1.0.0',
  author: 'Your Name',
  license: 'MIT',
  settings: {
    enabled: {
      type: 'boolean',
      default: true,
      title: 'Enable My Awesome Plugin',
      description: 'Turn my awesome plugin on or off',
    },
    // Initialize your settings here
  },
  run: (api) => {
    // Your plugin logic goes here
    console.log('My Awesome Plugin is running!');
    
    // Return a cleanup function (optional but recommended)
    return () => {
      console.log('My Awesome Plugin is cleaning up!');
      // Cleanup logic goes here
    };
  },
};

export default myAwesomePlugin;
```

### Plugin Manifest

For plugins that consist of multiple files or that need additional resources, a manifest file is recommended. This file provides metadata about the plugin and points to the main plugin file.

```json
// plugin.json
{
  "id": "my-awesome-plugin",
  "name": "My Awesome Plugin",
  "description": "A simple plugin for BetterSEQTA+",
  "version": "1.0.0",
  "author": "Your Name",
  "license": "MIT",
  "main": "index.js",
  "dependencies": {
    "betterseqta-plus": "^1.0.0"
  }
}
```

## Development Environment

### Setting Up Your Development Environment

1. Clone the BetterSEQTA+ repository or create a new project:
   ```bash
   git clone https://github.com/yourusername/betterseqta-plus-plugin.git
   cd betterseqta-plus-plugin
   ```

2. Initialize a new npm project:
   ```bash
   npm init -y
   ```

3. Install the necessary dependencies:
   ```bash
   npm install --save-dev typescript webpack webpack-cli @types/node
   npm install --save betterseqta-plugin-api
   ```

4. Set up TypeScript configuration:
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "target": "es2020",
       "module": "esnext",
       "moduleResolution": "node",
       "esModuleInterop": true,
       "strict": true,
       "declaration": true,
       "outDir": "dist",
       "lib": ["es2020", "dom"]
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

5. Set up webpack configuration:
   ```javascript
   // webpack.config.js
   const path = require('path');

   module.exports = {
     entry: './src/index.ts',
     mode: 'production',
     module: {
       rules: [
         {
           test: /\.tsx?$/,
           use: 'ts-loader',
           exclude: /node_modules/,
         },
       ],
     },
     resolve: {
       extensions: ['.tsx', '.ts', '.js'],
     },
     output: {
       filename: 'index.js',
       path: path.resolve(__dirname, 'dist'),
       library: {
         type: 'umd',
         name: 'MyAwesomePlugin',
       },
       globalObject: 'this',
     },
     externals: {
       'betterseqta-plugin-api': 'betterseqta-plugin-api',
     },
   };
   ```

6. Create your plugin in the `src` directory:
   ```bash
   mkdir -p src
   touch src/index.ts
   ```

7. Add build scripts to your `package.json`:
   ```json
   "scripts": {
     "build": "webpack",
     "dev": "webpack --watch"
   }
   ```

### Developing Your Plugin

1. Implement your plugin in `src/index.ts` following the structure shown above.

2. Build your plugin:
   ```bash
   npm run build
   ```

3. For development, you can use the watch mode:
   ```bash
   npm run dev
   ```

### Testing Your Plugin

There are several ways to test your plugin during development:

#### Method 1: Plugin Development Mode

BetterSEQTA+ provides a development mode for testing plugins:

1. Open BetterSEQTA+ settings
2. Navigate to the "Developer" section
3. Enable "Plugin Development Mode"
4. Click "Load Local Plugin" and select your plugin's directory or main file

#### Method 2: Manual Installation

You can manually install your plugin in a development environment:

1. Build your plugin
2. Copy the output file to the BetterSEQTA+ plugins directory:
   ```bash
   cp dist/index.js ~/.betterseqta/plugins/my-awesome-plugin/
   ```
3. Reload BetterSEQTA+

## Packaging and Distribution

### Creating a Plugin Package

A plugin package should include:

1. **The plugin code**: Compiled JavaScript file(s)
2. **A manifest file**: `plugin.json` with metadata
3. **Documentation**: README.md and other documentation
4. **License**: A license file

Example file structure:
```
my-awesome-plugin/
├── index.js         # Compiled plugin code
├── plugin.json      # Plugin manifest
├── README.md        # Documentation
└── LICENSE          # License file
```

### Publishing Your Plugin

You can publish your plugin in several ways:

#### 1. GitHub Repository

Host your plugin on GitHub:

1. Create a new repository
2. Push your plugin code
3. Create releases for new versions
4. Users can install it using the GitHub URL

#### 2. npm Package

Publish your plugin as an npm package:

1. Prepare your package:
   ```json
   // package.json
   {
     "name": "betterseqta-plugin-my-awesome",
     "version": "1.0.0",
     "description": "An awesome plugin for BetterSEQTA+",
     "main": "dist/index.js",
     "files": [
       "dist",
       "plugin.json",
       "README.md",
       "LICENSE"
     ],
     "keywords": [
       "betterseqta",
       "plugin"
     ],
     "author": "Your Name",
     "license": "MIT"
   }
   ```

2. Build your plugin:
   ```bash
   npm run build
   ```

3. Publish to npm:
   ```bash
   npm publish
   ```

#### 3. BetterSEQTA+ Plugin Directory

Submit your plugin to the official BetterSEQTA+ plugin directory:

1. Ensure your plugin follows all guidelines
2. Create a pull request to add your plugin to the directory
3. Once approved, your plugin will be available in the BetterSEQTA+ plugin browser

### Creating a Plugin Listing

Your plugin listing should include:

1. **Name and Description**: Clear, concise name and description
2. **Screenshots**: Showcase your plugin in action
3. **Features**: List of key features
4. **Installation Instructions**: How to install your plugin
5. **Configuration**: How to configure your plugin
6. **Support Information**: Where users can get help

## Plugin Installation Guide

Include instructions for users to install your plugin:

### Method 1: Using the Plugin Browser

1. Open BetterSEQTA+
2. Go to Settings → Plugins → Browse
3. Search for "My Awesome Plugin"
4. Click "Install"

### Method 2: Manual Installation

1. Download the plugin files
2. Create a folder in the BetterSEQTA+ plugins directory:
   ```bash
   mkdir -p ~/.betterseqta/plugins/my-awesome-plugin
   ```
3. Copy the plugin files to the folder:
   ```bash
   cp -r * ~/.betterseqta/plugins/my-awesome-plugin/
   ```
4. Restart BetterSEQTA+

### Method 3: Using npm

If your plugin is published on npm:

```bash
npm install -g betterseqta-plugin-my-awesome
```

## Best Practices for Plugin Development

### Security Considerations

1. **Respect User Privacy**: Don't collect unnecessary data
2. **Secure Data Handling**: Encrypt sensitive data
3. **Minimize Permissions**: Only request the permissions you need
4. **Code Review**: Get others to review your code for security issues

### Performance Optimization

1. **Minimize DOM Operations**: Batch DOM operations when possible
2. **Use Event Delegation**: Instead of adding many individual event listeners
3. **Lazy Loading**: Load resources only when needed
4. **Throttle and Debounce**: Limit frequent events like scroll or resize

### User Experience

1. **Clear UI**: Keep your UI simple and intuitive
2. **Consistent Design**: Follow SEQTA's design language
3. **Responsive Feedback**: Provide feedback for user actions
4. **Error Handling**: Gracefully handle errors and inform the user

### Accessibility

1. **Keyboard Navigation**: Ensure all features are accessible via keyboard
2. **Screen Reader Support**: Use appropriate ARIA attributes
3. **Color Contrast**: Ensure sufficient contrast for text
4. **Font Size**: Allow for text resizing

### Maintenance

1. **Version Control**: Use semantic versioning
2. **Changelog**: Maintain a changelog
3. **Documentation**: Keep documentation up to date
4. **Issue Tracking**: Set up an issue tracker for bug reports and feature requests

## Advanced Topics

### Plugin Communication

Plugins can communicate with each other using the Events API:

```typescript
// Plugin A: Emit an event
api.events.emit('pluginA:dataUpdated', { data: 'some data' });

// Plugin B: Listen for the event
api.events.on('pluginA:dataUpdated', (data) => {
  console.log('Data from Plugin A:', data);
});
```

### Plugin Dependencies

If your plugin depends on other plugins, you should specify this in your manifest:

```json
// plugin.json
{
  "id": "my-awesome-plugin",
  "name": "My Awesome Plugin",
  "dependencies": {
    "another-plugin": "^1.0.0"
  }
}
```

Your plugin's `run` method should check if the dependencies are available:

```typescript
run: (api) => {
  // Check if dependencies are available
  if (!window.betterseqta.plugins.isPluginLoaded('another-plugin')) {
    console.error('My Awesome Plugin requires Another Plugin to be installed and enabled');
    return;
  }

  // Plugin logic
}
```

### Plugin Configuration UI

For complex plugins, you might want to provide a custom settings UI beyond what the automatic settings generation provides:

```typescript
settings: {
  enabled: {
    type: 'boolean',
    default: true,
    title: 'Enable My Awesome Plugin',
    description: 'Turn my awesome plugin on or off',
  },
  customUI: {
    type: 'custom',
    render: (container, value, onChange) => {
      // Create a custom UI
      const div = document.createElement('div');
      div.innerHTML = `
        <h3>Custom Settings</h3>
        <p>This is a custom settings UI.</p>
        <button>Click Me</button>
      `;
      
      // Add event listeners
      div.querySelector('button').addEventListener('click', () => {
        // Do something
        onChange({ clicked: true });
      });
      
      // Append to container
      container.appendChild(div);
      
      // Return a cleanup function
      return () => {
        // Clean up event listeners
        div.querySelector('button').removeEventListener('click', handleClick);
      };
    }
  }
}
```

### Internationalization

For plugins with international users, consider adding support for multiple languages:

```typescript
// Define translations
const translations = {
  en: {
    title: 'My Awesome Plugin',
    description: 'A simple plugin for BetterSEQTA+',
    button: 'Click Me',
  },
  fr: {
    title: 'Mon Plugin Génial',
    description: 'Un plugin simple pour BetterSEQTA+',
    button: 'Cliquez-moi',
  },
};

// Get the current language
const language = navigator.language.split('-')[0];
const t = translations[language] || translations.en;

// Use translations
console.log(t.title);
```

## Troubleshooting and FAQ

### Common Issues

#### "Plugin not found" error

- Make sure your plugin is installed in the correct directory
- Check that the plugin ID in your code matches the one in the manifest

#### "Plugin failed to load" error

- Check the console for error messages
- Ensure your plugin's code is compatible with the current version of BetterSEQTA+

#### "Settings not saving" issue

- Make sure you're using the Settings API correctly
- Check that your settings have the correct types

### FAQ

#### Q: Can I use external libraries in my plugin?
A: Yes, you can include external libraries. However, be mindful of the size and performance impact.

#### Q: How do I update my plugin?
A: Update the code, increment the version number, and publish the new version. Users will be notified of the update.

#### Q: Can I monetize my plugin?
A: There's no built-in payment system, but you can offer premium versions or accept donations.

#### Q: How do I debug my plugin?
A: Use the browser's developer tools to debug your plugin. BetterSEQTA+ also provides debugging tools in the developer settings.

## Contributing to the Plugin Ecosystem

### Reporting Issues

If you find a bug in the plugin API, report it on the BetterSEQTA+ GitHub repository:

1. Go to the Issues tab
2. Click "New Issue"
3. Select "Plugin API Bug"
4. Fill in the details

### Contributing Documentation

Improvements to the plugin documentation are always welcome:

1. Fork the repository
2. Make your changes
3. Submit a pull request

### Sharing Your Plugins

Share your plugins with the community:

1. Announce your plugin on the BetterSEQTA+ forum
2. Create a GitHub repository for your plugin
3. Submit your plugin to the plugin directory

## Conclusion

Developing third-party plugins for BetterSEQTA+ is a rewarding way to customize and extend the platform. By following these guidelines, you can create high-quality plugins that enhance the experience for yourself and other users.

Remember that the plugin ecosystem thrives on community contributions. Share your plugins, collaborate with other developers, and help make BetterSEQTA+ even better for everyone! 