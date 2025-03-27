# BetterSEQTA+ Theme System Documentation

## Overview
The BetterSEQTA+ theme system allows users to customize their SEQTA interface with custom CSS, colors, and images. Themes are stored locally using `localforage` and can be shared, downloaded, and modified.

## Theme Storage
Themes are stored using `localforage` in two main ways:
1. A list of theme IDs is stored under the key 'customThemes'
2. Individual themes are stored using their unique ID as the key

## Theme Structure
A theme consists of the following components:

```typescript
type CustomTheme = {
  id: string;                    // Unique identifier for the theme
  name: string;                  // Display name
  description: string;           // Theme description
  defaultColour: string;         // Default accent color
  CanChangeColour: boolean;      // Whether users can change the accent color
  allowBackgrounds: boolean;     // Whether background customization is allowed
  CustomCSS: string;            // Custom CSS styles
  CustomImages: CustomImage[];   // Array of custom images used in the theme
  coverImage: Blob | null;       // Theme preview image
  isEditable: boolean;          // Whether the theme can be edited
  hideThemeName: boolean;       // Whether to hide the theme name in UI
  webURL?: string;              // Optional URL for web-downloaded themes
  selectedColor?: string;       // Currently selected accent color
  forceDark?: boolean;         // Force dark mode when theme is active
}
```

## Theme Management Functions

### Core Functions
1. `setTheme(themeId)`: Activates a theme
   - Removes currently active theme
   - Applies new theme's CSS and images
   - Updates color settings

2. `applyTheme(theme)`: Applies theme components
   - Applies custom CSS
   - Sets up custom images
   - Handles dark mode settings

3. `removeTheme(theme)`: Cleans up theme components
   - Removes custom CSS
   - Cleans up image URLs
   - Restores original settings

### Theme Storage Operations
1. `saveTheme(theme)`: Saves/updates a theme
   - Stores theme data in localforage
   - Updates theme list if new
   - Triggers theme update notifications

2. `deleteTheme(themeId)`: Removes a theme
   - Removes theme data
   - Updates theme list
   - Cleans up theme components

### Theme Sharing
1. `shareTheme(themeId)`: Exports theme for sharing
   - Converts blobs to base64
   - Packages theme data
   - Creates downloadable JSON file

2. `downloadTheme(theme)`: Installs shared theme
   - Converts base64 to blobs
   - Stores theme data
   - Updates theme list

## State Management
The theme system uses a `settingsState` object to track:
- Currently selected theme (`selectedTheme`)
- Original and current color settings (`originalSelectedColor`, `selectedColor`)
- Dark mode state (`DarkMode`, `originalDarkMode`)

## Known Issues and Considerations

### Image Handling
1. Images are stored as Blobs and converted to URLs for display
2. Need to properly revoke object URLs to prevent memory leaks
3. Image variable names must be unique across themes

### Color Management
1. Theme colors can override user preferences
2. Need to properly restore original colors when disabling themes
3. Color change permissions (`CanChangeColour`) may need better enforcement

### CSS Application
1. CSS is applied through a single `<style>` element with id 'custom-theme'
2. Multiple themes attempting to apply CSS simultaneously could cause conflicts
3. CSS specificity issues might affect theme application

### State Persistence
1. Theme state needs to be properly restored on page reload
2. Dark mode preferences need better synchronization with theme settings
3. Original settings should be properly preserved and restored

## Best Practices

### Theme Development
1. Use unique, descriptive variable names for custom images
2. Include proper fallbacks in custom CSS
3. Test themes in both light and dark modes
4. Provide clear documentation for custom variables and features

### Theme Management
1. Always clean up resources when disabling/removing themes
2. Implement proper error handling for theme operations
3. Validate theme data before saving/applying
4. Maintain backward compatibility for theme formats

## Future Improvements
1. Theme versioning system
2. Better conflict resolution between themes
3. Theme dependencies management
4. Theme update mechanism
5. Theme preview system
6. Better error handling and user feedback
7. Theme categories and tags
8. Theme export/import validation 