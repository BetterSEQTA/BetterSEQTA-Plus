# Troubleshooting Guide

Having issues with BetterSEQTA+ development? This guide covers the most common problems and their solutions.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Development Server Issues](#development-server-issues)
- [Browser Extension Issues](#browser-extension-issues)
- [Plugin Development Issues](#plugin-development-issues)
- [Build Issues](#build-issues)
- [Still Stuck?](#still-stuck)

## Installation Issues

### ❌ "npm install" fails with peer dependency errors

**Problem**: You see errors about peer dependencies or conflicting packages.

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### ❌ "Cannot find module" errors

**Problem**: Node.js can't find required packages.

**Solutions**:
1. **Clear and reinstall**:
   ```bash
   rm -rf node_modules
   npm install --legacy-peer-deps
   ```

2. **Check Node.js version**:
   ```bash
   node --version  # Should be v16 or higher
   ```

3. **Try with npm cache clean**:
   ```bash
   npm cache clean --force
   npm install --legacy-peer-deps
   ```

### ❌ Permission errors on macOS/Linux

**Problem**: "EACCES" or permission denied errors.

**Solution**:
```bash
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

## Development Server Issues

### ❌ "npm run dev" fails

**Problem**: Development server won't start.

**Solutions**:
1. **Check if port is in use**:
   ```bash
   lsof -i :5173  # Kill the process using the port
   ```

2. **Clear dist folder**:
   ```bash
   rm -rf dist
   npm run dev
   ```

3. **Check for TypeScript errors**:
   ```bash
   npx tsc --noEmit  # Check for type errors
   ```

### ❌ Changes not reflecting in browser

**Problem**: You make code changes but don't see them in the browser.

**Solutions**:
1. **Reload the extension**:
   - Go to `chrome://extensions`
   - Find BetterSEQTA+ and click the refresh icon
   - Refresh your SEQTA page

2. **Check if dev server is running**:
   - Look for "Build completed" in your terminal
   - If not, restart `npm run dev`

3. **Hard refresh the page**:
   - Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)

## Browser Extension Issues

### ❌ Extension doesn't load in Chrome

**Problem**: Extension appears in `chrome://extensions` but doesn't work.

**Solutions**:
1. **Check for errors**:
   - Go to `chrome://extensions`
   - Click "Errors" button on BetterSEQTA+
   - Fix any JavaScript errors shown

2. **Verify manifest**:
   - Check if `dist/manifest.json` exists
   - Ensure it has proper structure

3. **Check permissions**:
   - Extension needs permission to access SEQTA pages
   - Click "Details" → "Site access" → "On all sites"

### ❌ Extension doesn't appear on SEQTA pages

**Problem**: Extension loads but doesn't modify SEQTA.

**Solutions**:
1. **Check if you're on a SEQTA Learn page**:
   - URL should contain "seqta" or "learn"
   - Page title should include "SEQTA Learn"

2. **Check browser console**:
   - Press `F12` → Console tab
   - Look for "[BetterSEQTA+]" messages
   - If no messages, extension isn't running

3. **Verify page detection**:
   - Extension only runs on actual SEQTA Learn pages
   - Test on a real SEQTA instance

### ❌ Settings page won't open

**Problem**: Clicking the extension icon doesn't open settings.

**Solutions**:
1. **Check popup errors**:
   - Right-click extension icon → "Inspect popup"
   - Look for JavaScript errors

2. **Clear extension storage**:
   ```javascript
   // In browser console on any page:
   chrome.storage.local.clear()
   ```

3. **Reload extension and try again**

## Plugin Development Issues

### ❌ My plugin doesn't appear in settings

**Problem**: Created a plugin but it's not showing up.

**Solutions**:
1. **Check plugin registration**:
   - Ensure your plugin is imported in `src/plugins/index.ts`
   - Verify `pluginManager.registerPlugin(yourPlugin)` is called

2. **Check plugin structure**:
   ```typescript
   // Ensure your plugin has all required fields
   const myPlugin: Plugin = {
     id: "unique-id",      // Must be unique
     name: "Display Name",
     description: "What it does",
     version: "1.0.0",
     run: async (api) => {
       // Your code here
     }
   };
   ```

3. **Check for errors**:
   - Look in browser console for plugin loading errors

### ❌ Plugin settings not working

**Problem**: Plugin settings don't save or load properly.

**Solutions**:
1. **Check settings definition**:
   ```typescript
   import { defineSettings, booleanSetting } from "@/plugins/core/settingsHelpers";
   
   const settings = defineSettings({
     myOption: booleanSetting({
       default: true,
       title: "My Option",
       description: "What this does"
     })
   });
   ```

2. **Wait for settings to load**:
   ```typescript
   run: async (api) => {
     await api.settings.loaded;  // Wait for settings to load
     console.log(api.settings.myOption);  // Now you can use settings
   }
   ```

### ❌ Plugin API functions not working

**Problem**: `api.seqta.onMount()` or other API functions don't work.

**Solutions**:
1. **Check selector specificity**:
   ```typescript
   // Be specific with selectors
   api.seqta.onMount(".home-page", (element) => {
     // Your code
   });
   ```

2. **Wait for elements**:
   ```typescript
   // Some elements load after page navigation
   api.seqta.onPageChange((page) => {
     if (page === "home") {
       api.seqta.onMount(".home-content", (element) => {
         // Now element should exist
       });
     }
   });
   ```

## Build Issues

### ❌ "npm run build" fails

**Problem**: Production build fails with errors.

**Solutions**:
1. **Check TypeScript errors**:
   ```bash
   npx tsc --noEmit
   ```

2. **Clear cache and rebuild**:
   ```bash
   rm -rf dist node_modules
   npm install --legacy-peer-deps
   npm run build
   ```

3. **Check for import errors**:
   - Ensure all imports use correct paths
   - Check for missing files

### ❌ Built extension doesn't work

**Problem**: `npm run build` succeeds but extension doesn't work.

**Solutions**:
1. **Test the built extension**:
   - Load the `dist` folder as unpacked extension
   - Check console for errors

2. **Compare with dev version**:
   - If dev works but build doesn't, there might be a build configuration issue

3. **Check manifest generation**:
   - Verify `dist/manifest.json` looks correct
   - Compare with working version

## Common Error Messages

### "Cannot access contents of the URL"
- **Cause**: Extension permissions issue
- **Fix**: Go to `chrome://extensions` → BetterSEQTA+ → Details → Site access → "On all sites"

### "Extension context invalidated"
- **Cause**: Extension was reloaded while page was open
- **Fix**: Refresh the SEQTA page

### "Uncaught ReferenceError: browser is not defined"
- **Cause**: Missing webextension-polyfill import
- **Fix**: Add `import browser from "webextension-polyfill";` at top of file

### "Module not found: Can't resolve '@/...' "
- **Cause**: TypeScript path mapping issue
- **Fix**: Check `tsconfig.json` and `vite.config.ts` for path configuration

## Performance Issues

### Extension makes SEQTA slow
1. **Check for memory leaks**:
   - Use Chrome DevTools → Performance tab
   - Look for growing memory usage

2. **Optimize plugin code**:
   - Remove unnecessary listeners
   - Clean up intervals/timeouts
   - Use efficient selectors

3. **Profile your changes**:
   - Test with extension disabled vs enabled
   - Identify which plugin is causing issues

## Still Stuck?

If none of these solutions work:

1. **🔍 Search existing issues**: [GitHub Issues](https://github.com/BetterSEQTA/BetterSEQTA-plus/issues)

2. **💬 Ask on Discord**: [Join our server](https://discord.gg/YzmbnCDkat) - fastest way to get help!

3. **📝 Create a new issue**: Include:
   - Your operating system
   - Node.js version (`node --version`)
   - Browser version
   - Exact error message
   - Steps to reproduce
   - What you've already tried

4. **📧 Email us**: betterseqta.plus@gmail.com for urgent issues

## Getting More Debug Info

### Enable verbose logging
Add this to your plugin's `run` function:
```typescript
console.log("[DEBUG] Plugin starting:", api);
```

### Check extension background page
1. Go to `chrome://extensions`
2. Click "Details" on BetterSEQTA+
3. Click "Inspect views: background page"
4. Check console for background script errors

### Export debug info
Run this in browser console on a SEQTA page:
```javascript
console.log("Extension info:", {
  version: chrome.runtime.getManifest().version,
  url: window.location.href,
  userAgent: navigator.userAgent,
  storage: await chrome.storage.local.get()
});
```

Remember: **Don't give up!** Every developer faces these issues. The community is here to help, and solving these problems makes you a better developer. 💪 