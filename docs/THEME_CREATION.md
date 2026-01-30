# Theme Creation Guide

This guide covers everything you need to know about creating custom themes for BetterSEQTA+.

## Table of Contents

1. [Overview](#overview)
2. [Theme Structure](#theme-structure)
3. [CSS Variables](#css-variables)
4. [CSS Selectors & Classes](#css-selectors--classes)
5. [Custom Images](#custom-images)
6. [Theme Settings](#theme-settings)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

## Overview

Themes in BetterSEQTA+ allow you to completely customize the appearance of SEQTA Learn. A theme consists of:

- **Custom CSS**: CSS rules that override default styles
- **Custom Images**: Images that can be referenced via CSS variables
- **Theme Metadata**: Name, description, default color, etc.
- **Theme Settings**: Options like forcing dark/light mode

Themes are applied by injecting CSS into the SEQTA page and setting CSS custom properties (variables) on the document root.

## CSS Variables

BetterSEQTA+ provides a comprehensive set of CSS variables that you can use in your themes. These variables automatically adapt to light/dark mode and user preferences.

### Core Background Variables

| Variable | Light Mode | Dark Mode | Description |
|----------|------------|-----------|-------------|
| `--background-primary` | `#ffffff` | `#232323` | Main background color |
| `--background-secondary` | `#e5e7eb` | `#1a1a1a` | Secondary background color |
| `--theme-primary` | `#ffffff` | `#232323` | Primary theme color (same as background-primary) |
| `--theme-secondary` | `#e5e7eb` | `#1a1a1a` | Secondary theme color (same as background-secondary) |
| `--text-primary` | `black` | `white` | Primary text color |
| `--text-color` | `black` | `white` | Text color (alias for text-primary) |

### BetterSEQTA+ Specific Variables

| Variable | Description | Notes |
|----------|-------------|-------|
| `--better-main` | User's selected accent color | Dynamically set based on color picker |
| `--better-sub` | Dark navy color | Always `#161616` |
| `--better-pale` | Lightened version of accent color | Only available in light mode |
| `--better-light` | Lighter version of accent color | Calculated based on brightness |
| `--better-alert-highlight` | Alert/highlight color | `#c61851` |
| `--betterseqta-logo` | Logo URL | Changes based on dark/light mode |
| `--auto-background` | Auto background color | Falls back to `--better-pale` or `--background-secondary` |
| `--navy` | Navy color | `#1a1a1a` |
| `--theme-fg-parts` | Theme foreground parts | `white` |

### Subject/Item Color Variables

| Variable | Description |
|----------|-------------|
| `--item-colour` | Subject/item color | Set dynamically per subject/item |
| `--colour` | Generic color variable | Used in various contexts |
| `--person-colour` | Person/avatar color | `var(--better-light)` for staff |

### Transparency Effects

When transparency effects are enabled, background variables become semi-transparent:

| Variable | Light Mode (Transparent) | Dark Mode (Transparent) |
|----------|--------------------------|-------------------------|
| `--background-primary` | `rgba(255, 255, 255, 0.6)` | `rgba(35, 35, 35, 0.6)` |
| `--background-secondary` | `rgba(229, 231, 235, 0.6)` | `rgba(26, 26, 26, 0.6)` |

### Using CSS Variables

You can use these variables in your custom CSS:

```css
/* Example: Style a custom element */
.my-custom-element {
  background: var(--background-primary);
  color: var(--text-primary);
  border: 1px solid var(--better-main);
}

/* Example: Create a gradient */
.gradient-box {
  background: linear-gradient(
    to bottom,
    var(--better-main),
    var(--background-secondary)
  );
}
```

## CSS Selectors & Classes

BetterSEQTA+ uses specific CSS selectors and classes that you can target in your themes. Here are the most important ones:

### Main Layout Elements

| Selector | Description |
|----------|-------------|
| `#container` | Main container element |
| `#content` | Content area |
| `#main` | Main content wrapper |
| `#title` | Top title bar |
| `#menu` | Sidebar menu |

### Dark Mode

The `dark` class is added to `html` when dark mode is active:

```css
/* Target dark mode specifically */
html.dark #main {
  background: var(--background-primary);
}

/* Target light mode */
html:not(.dark) #main {
  background: var(--background-primary);
}
```

### Transparency Effects

When transparency effects are enabled, the `transparencyEffects` class is added to `html`:

```css
html.transparencyEffects .notice {
  backdrop-filter: blur(80px);
}
```

### Common SEQTA Classes

| Class/Selector | Description |
|----------------|-------------|
| `.notice` | Notice cards |
| `.day` | Day containers in timetable |
| `.dashboard` | Dashboard sections |
| `.dashlet` | Dashboard widgets |
| `.document` | Document elements |
| `.quickbar` | Quick action bar |
| `.calendar` | Calendar elements |
| `.message` | Message elements |
| `.thread` | Forum threads |
| `.shortcut` | Shortcut buttons |
| `.upcoming-assessment` | Upcoming assessments |
| `.entry.class` | Timetable entries |

### BetterSEQTA+ Specific Classes

| Class | Description |
|-------|-------------|
| `.addedButton` | BetterSEQTA+ added buttons |
| `.tooltip` | Tooltip elements |
| `.notice-unified-content` | Unified notice content |
| `.home-container` | Home page container |
| `.timetable-container` | Timetable container |
| `.notices-container` | Notices container |

### Attribute Selectors

SEQTA uses data attributes that you can target:

```css
/* Target specific data types */
[data-type="student"] .header {
  color: var(--text-primary);
}

/* Target specific labels */
[data-label="inbox"] {
  /* Styles */
}
```

### CSS Modules

SEQTA uses CSS modules with hashed class names. You can target them using attribute selectors:

```css
/* Target CSS module classes */
[class*="MessageList__MessageList___"] {
  background: var(--background-primary);
}

[class*="BasicPanel__BasicPanel___"] {
  border-radius: 16px;
}
```

## Custom Images

Themes can include custom images that are made available as CSS variables.

### Adding Images

1. Upload an image in the theme creator
2. Set a CSS variable name (e.g., `custom-background`)
3. The image will be available as `var(--custom-background)`

### Using Image Variables

```css
/* Use as background */
.my-element {
  background-image: var(--custom-background);
  background-size: cover;
  background-position: center;
}

/* Use in content */
.my-icon::before {
  content: '';
  background-image: var(--custom-icon);
  width: 24px;
  height: 24px;
}
```

### Image Variable Format

Images are stored as `url()` values:

```css
/* The variable contains: url(blob:...) */
--custom-background: url(blob:chrome-extension://...);
```

## Theme Settings

### Force Dark/Light Mode

You can force a theme to always use dark or light mode:

```typescript
forceDark: true   // Force dark mode
forceDark: false  // Force light mode
forceDark: undefined  // Use user's preference (default)
```

When `forceDark` is set, users cannot toggle dark/light mode while the theme is active.

### Default Color

Set a default accent color for your theme:

```typescript
defaultColour: "rgba(0, 123, 255, 1)"  // Blue
defaultColour: "#ff6b6b"                // Red (hex format)
```

### Allow Color Changes

Control whether users can change the accent color:

```typescript
CanChangeColour: true   // Users can change color
CanChangeColour: false  // Color is locked
```

## Best Practices

### 1. Use CSS Variables

Always use CSS variables instead of hardcoded colors:

```css
/* ✅ Good */
.my-element {
  background: var(--background-primary);
  color: var(--text-primary);
}

/* ❌ Bad */
.my-element {
  background: #ffffff;
  color: #000000;
}
```

### 2. Support Both Light and Dark Modes

Unless your theme forces a specific mode, ensure it works in both:

```css
/* Use variables that adapt automatically */
.my-element {
  background: var(--background-primary);
  color: var(--text-primary);
}

/* Or explicitly handle both modes */
html.dark .my-element {
  background: #1a1a1a;
}

html:not(.dark) .my-element {
  background: #ffffff;
}
```

### 3. Use !important Sparingly

Only use `!important` when necessary to override SEQTA's default styles:

```css
/* ✅ Good - necessary override */
#title {
  background: var(--background-primary) !important;
}

/* ❌ Bad - unnecessary */
.my-element {
  color: var(--text-primary) !important;
}
```

### 4. Test Responsive Design

SEQTA is responsive. Test your theme at different screen sizes:

```css
/* Example: Mobile-specific styles */
@media (max-width: 900px) {
  #menu {
    transform: translate(-270px);
  }
}
```

### 5. Use Semantic Selectors

Prefer semantic selectors over fragile ones:

```css
/* ✅ Good - stable selector */
#main > .dashboard > section {
  border-radius: 16px;
}

/* ⚠️ Caution - CSS module classes may change */
[class*="Dashboard__Dashboard___"] {
  border-radius: 16px;
}
```

### 6. Optimize Images

Keep image file sizes reasonable:

- Use appropriate formats (PNG for transparency, JPG for photos)
- Compress images before uploading
- Consider using CSS for simple graphics instead of images

### 7. Document Your Theme

Include comments in your CSS explaining complex styles:

```css
/* 
 * Custom gradient background for dashboard
 * Uses the user's accent color for a cohesive look
 */
#main > .dashboard {
  background: linear-gradient(
    135deg,
    var(--better-main),
    var(--background-secondary)
  );
}
```

## Examples

### Example 1: Simple Color Theme

```css
/* Change accent color throughout */
:root {
  --better-main: #ff6b6b;
}

/* Style the menu */
#menu {
  background: var(--background-primary);
  border-right: 3px solid var(--better-main);
}

/* Style buttons */
.uiButton {
  background: var(--better-main);
  color: var(--text-color);
  border-radius: 8px;
}
```

### Example 2: Custom Background Image

```css
/* Use a custom background image */
body {
  background-image: var(--custom-background);
  background-size: cover;
  background-attachment: fixed;
}

/* Add overlay for readability */
#main::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: -1;
}
```

### Example 3: Rounded Corners Theme

```css
/* Make everything more rounded */
#main > .dashboard > section,
.dashlet,
.notice,
.document {
  border-radius: 20px !important;
}

/* Round buttons */
.uiButton {
  border-radius: 25px !important;
}
```

### Example 4: Minimal Theme

```css
/* Remove shadows and borders */
#main > .dashboard > section,
.dashlet,
.notice {
  box-shadow: none !important;
  border: 1px solid var(--background-secondary) !important;
}

/* Simplify colors */
#menu {
  background: var(--background-primary) !important;
}

/* Remove gradients */
.day {
  background: var(--background-primary) !important;
}
```

### Example 5: High Contrast Theme

```css
/* Increase contrast */
:root {
  --background-primary: #000000;
  --background-secondary: #1a1a1a;
  --text-primary: #ffffff;
}

html:not(.dark) {
  --background-primary: #ffffff;
  --background-secondary: #f0f0f0;
  --text-primary: #000000;
}

/* Add borders for clarity */
.dashlet,
.notice,
.document {
  border: 2px solid var(--better-main) !important;
}
```

## Advanced Techniques

### CSS Custom Properties Override

You can override CSS variables in your theme:

```css
/* Override a variable */
:root {
  --better-main: #your-color;
}

/* Override conditionally */
html.dark {
  --background-primary: #your-dark-color;
}
```

### Animations

Add smooth transitions:

```css
/* Smooth color transitions */
#menu li {
  transition: background-color 0.3s ease;
}

/* Hover effects */
.dashlet:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}
```

### Pseudo-elements

Use pseudo-elements for decorative elements:

```css
/* Add decorative border */
.notice::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--better-main);
}
```

## Troubleshooting

### Theme Not Applying

1. Check browser console for CSS errors
2. Verify CSS syntax is correct
3. Ensure selectors are specific enough
4. Check if `!important` is needed

### Colors Not Changing

1. Verify you're using CSS variables
2. Check if `forceDark` is overriding your styles
3. Ensure variables are set on `:root` or `html`

### Images Not Showing

1. Verify image variable name matches CSS
2. Check image format is supported
3. Ensure image size is reasonable
4. Verify `url()` wrapper in CSS

### Dark Mode Issues

1. Test with `forceDark: true` and `forceDark: false`
2. Check if transparency effects are interfering
3. Verify `html.dark` selector is correct

## Resources

- **Theme Creator**: Access via BetterSEQTA+ settings
- **CSS Variables Reference**: See [CSS Variables](#css-variables) section above
- **SEQTA DOM Structure**: Inspect SEQTA pages in browser DevTools
- **BetterSEQTA+ Source**: Check `src/css/injected.scss` for default styles

## Contributing Themes

If you create a great theme, consider sharing it:

1. Export your theme (Share button in theme creator)
2. Submit to the BetterSEQTA+ theme store
3. Or share on GitHub/Discord

---

**Note**: This documentation is based on BetterSEQTA+ v3.4.13. Some details may change in future versions.

