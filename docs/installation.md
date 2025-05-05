# Installing BetterSEQTA+

This guide will walk you through the process of installing and setting up BetterSEQTA+ for development or usage.

## Prerequisites

Before you begin, make sure you have the following installed:

- [npm](https://www.npmjs.com/) (v7 or higher) or [Bun](https://bun.sh/) (recommended)
- A modern web browser (Chrome, Firefox, Edge, etc.)

## Installation Methods

There are two ways to install BetterSEQTA+:

1. **For Users**: Install the browser extension
2. **For Developers**: Clone the repository and set up the development environment

## For Users: Installing the Browser Extension

BetterSEQTA+ is available as a browser extension for Chrome, Firefox, and Edge.

### Chrome/Edge

1. Visit the [Chrome Web Store page for BetterSEQTA+](https://chrome.google.com/webstore/detail/betterseqta)
2. Click the "Add to Chrome" button
3. Confirm the installation when prompted
4. The extension will be installed and ready to use

### Firefox

1. Visit the [Firefox Add-ons page for BetterSEQTA+](https://addons.mozilla.org/en-US/firefox/addon/betterseqta)
2. Click the "Add to Firefox" button
3. Confirm the installation when prompted
4. The extension will be installed and ready to use

## For Developers: Setting Up the Development Environment

If you want to develop for BetterSEQTA+ or modify the code, follow these steps:

### 1. Clone the Repository

```bash
git clone https://github.com/SeqtaLearning/betterseqta-plus.git
cd betterseqta-plus
```

### 2. Install Dependencies

Using npm:

```bash
npm install --legacy-peer-deps
```

Using Bun (recommended):

```bash
bun install
```

### 3. Set Up Environment Variables - Only required for pushing to extension stores from the command line

Copy the example environment file:

```bash
cp .env.submit.example .env
```

Edit the `.env` file with your SEQTA credentials and settings.

### 4. Start the Development Server

Using npm:

```bash
npm run dev
```

Using Bun:

```bash
bun run dev
```

This will start a development server and build the extension in watch mode.

### 5. Load the Extension in Your Browser

#### Chrome/Edge

1. Open Chrome/Edge and navigate to `chrome://extensions` or `edge://extensions`
2. Enable "Developer mode" using the toggle in the top right
3. Click "Load unpacked" and select the `dist` folder in your BetterSEQTA+ directory
4. The extension should now appear in your extensions list

#### Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select the `manifest.json` file in the `dist` folder
4. The extension should now appear in your add-ons list

### 6. Test Your Changes

After making changes to the code, the development server will automatically rebuild the extension. However, you may need to reload the extension in your browser to see the changes:

1. Go to the extensions page in your browser
2. Find BetterSEQTA+ and click the reload icon
3. Refresh any SEQTA Learn pages you have open

## Troubleshooting Installation

### Common Issues

#### "Cannot find module" errors

If you see errors about missing modules, try:

```bash
rm -rf node_modules
npm install
```

Or with Bun:

```bash
rm -rf node_modules
bun install
```

#### Extension not appearing in SEQTA

Make sure:

- You're visiting a SEQTA Learn page
- The extension is enabled
- You've refreshed the page after installing the extension

#### Development build not updating

Try:

1. Stopping the development server
2. Clearing your browser cache
3. Removing the extension from your browser
4. Rebuilding the extension
5. Loading it again

## Updating BetterSEQTA+

### For Users

Browser extensions update automatically, but you can manually check for updates:

- **Chrome/Edge**: Go to `chrome://extensions` or `edge://extensions`, enable Developer mode, and click "Update"
- **Firefox**: Go to `about:addons`, click the gear icon, and select "Check for Updates"

### For Developers

If you're working on the code, pull the latest changes and reinstall dependencies:

```bash
git pull
npm install
npm run dev
```

Or with Bun:

```bash
git pull
bun install
bun run dev
```

## Next Steps

Now that you have BetterSEQTA+ installed, you can:

- [Getting Started with Plugins](./plugins/getting-started.md)
- [Contribute to the project](../CONTRIBUTING.md)
