---
name: betterseqta-teach-styling
description: Guides styling BetterSEQTA Teach components with proper theme integration and transparency effects support. Use when adding new styles, creating components, or modifying existing component styling for SEQTA Teach platform in BetterSEQTA-Plus.
---

# BetterSEQTA Teach Component Styling Guide

## Overview

BetterSEQTA Teach uses a comprehensive theming system with CSS variables, transparency effects, and consistent styling patterns. All components for the SEQTA Teach platform must respect the transparency effects setting and use theme variables for colors. This guide focuses specifically on Teach platform styling patterns.

## Theme System

### CSS Variables

The theme system is defined in `src/css/injected/theme.scss` and provides:

**Background Colors:**
- `--background-primary`: Main background (#232323 dark, #ffffff light)
- `--background-secondary`: Secondary background (#1a1a1a dark, #e5e7eb light)
- `--background-tertiary`: Tertiary background (#0f0f0f dark, #f3f4f6 light)

**Text Colors:**
- `--text-primary`: Main text (white dark, black light)
- `--text-secondary`: Secondary text (rgba(255,255,255,0.8) dark, rgba(0,0,0,0.8) light)
- `--text-muted`: Muted text (rgba(255,255,255,0.6) dark, rgba(0,0,0,0.6) light)
- `--text-on-accent`: Text on accent backgrounds (always white)

**Accent Colors:**
- `--accent-bg`: Primary accent background (uses `--better-main` or default #3b82f6)
- `--accent-hover`: Hover state accent color (uses `--better-light` or lighter variant)
- `--accent-ring`: Focus ring color (rgba variant of accent)

**Border Colors:**
- `--border-primary`: Primary borders (rgba(255,255,255,0.2) dark, rgba(0,0,0,0.2) light)
- `--border-secondary`: Secondary borders (rgba(255,255,255,0.1) dark, rgba(0,0,0,0.1) light)
- `--border-tertiary`: Tertiary borders (rgba(255,255,255,0.05) dark, rgba(0,0,0,0.05) light)

**Card/Panel Colors:**
- `--card-bg`: Card background (#1a1a1a dark, #ffffff light)
- `--card-border`: Card border (rgba(255,255,255,0.2) dark, rgba(0,0,0,0.1) light)

**Theme Offset Backgrounds (for layered navigation):**
- `--theme-offset-bg`: Subtle offset (rgba(255,255,255,0.05) dark, rgba(0,0,0,0.03) light)
- `--theme-offset-bg-more`: More pronounced offset (rgba(255,255,255,0.1) dark, rgba(0,0,0,0.05) light)
- `--theme-table-headers`: Table header backgrounds

### Using Theme Variables

Always use CSS variables instead of hardcoded colors:

```svelte
<!-- ✅ Good -->
<div class="bg-[var(--background-primary)] text-[var(--text-primary)]">
  <button class="bg-[var(--accent-bg)] hover:bg-[var(--accent-hover)]">
    Click me
  </button>
</div>

<!-- ❌ Bad -->
<div class="bg-white dark:bg-gray-800 text-black dark:text-white">
  <button class="bg-blue-500 hover:bg-blue-600">
    Click me
  </button>
</div>
```

## Transparency Effects

### How It Works

Transparency effects are controlled by the `transparencyEffects` setting in `settingsState`. When enabled:
- The `transparencyEffects` class is added to `document.documentElement`
- Background colors become semi-transparent (0.6 opacity)
- Backdrop blur effects are applied to various elements

### Transparency-Aware Styling

**Critical Rule:** Always check `transparencyEffects` before applying backdrop-filter or semi-transparent backgrounds.

#### In Svelte Components

Use conditional classes based on the `transparencyEffects` prop or `settingsState`:

```svelte
<script lang="ts">
  import { settingsState } from '@/seqta/utils/listeners/SettingsState';
  
  // Option 1: Use reactive statement
  $: transparencyEffects = $settingsState.transparencyEffects;
</script>

<!-- Conditional backdrop blur -->
<div class="bg-white dark:bg-zinc-900 {transparencyEffects ? 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl' : ''}">
  Content
</div>

<!-- Or use ternary in class binding -->
<div class="{transparencyEffects ? 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl' : 'bg-white dark:bg-zinc-900'}">
  Content
</div>
```

#### In SCSS Files

Use the `html.transparencyEffects` selector:

```scss
.my-component {
  background: var(--background-primary);
  border: 1px solid var(--border-primary);
  
  // Make fully solid when transparency effects are disabled
  html:not(.transparencyEffects) & {
    background: var(--background-primary) !important;
  }
  
  // Apply blur only when transparency effects are enabled
  html.transparencyEffects & {
    backdrop-filter: blur(10px) !important;
  }
}
```

### Transparency Effects Behavior

**When Enabled (`html.transparencyEffects`):**
- Background variables become semi-transparent:
  - Dark: `--background-primary: rgba(35, 35, 35, 0.6)`
  - Light: `--background-primary: rgba(255, 255, 255, 0.6)`
- Backdrop blur is applied to various SEQTA Teach elements (defined in `transparency.scss`)
- Components can use `backdrop-blur-*` Tailwind classes

**When Disabled (`html:not(.transparencyEffects)`):**
- All `backdrop-filter` effects are removed globally (`backdrop-filter: none !important`)
- Semi-transparent rgba backgrounds are converted to fully solid using `var(--background-primary)`
- Components should use fully opaque backgrounds

### Global Transparency Rules

The system automatically handles transparency via global CSS rules in `injected.scss`:

```scss
html:not(.transparencyEffects) {
  * {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  
  // Convert semi-transparent backgrounds to solid
  [style*="rgba(255, 255, 255, 0"] {
    background: var(--background-primary) !important;
  }
}
```

## Component Styling Patterns

### Buttons

Use accent colors and consistent transitions:

```svelte
<button 
  class="px-4 py-2 rounded-lg bg-[var(--accent-bg)] hover:bg-[var(--accent-hover)] 
         text-[var(--text-on-accent)] transition-all duration-200 
         focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] 
         transform hover:scale-105 active:scale-95"
>
  Button Text
</button>
```

### Cards/Panels

Use card variables and respect transparency:

```svelte
<script lang="ts">
  import { settingsState } from '@/seqta/utils/listeners/SettingsState';
  $: transparencyEffects = $settingsState.transparencyEffects;
</script>

<div 
  class="bg-[var(--card-bg)] border border-[var(--card-border)] 
         rounded-lg shadow-md p-4
         {transparencyEffects ? 'backdrop-blur-sm' : ''}"
>
  Card content
</div>
```

### Modals/Dialogs

Always check transparency for backdrop blur:

```svelte
<script lang="ts">
  import { settingsState } from '@/seqta/utils/listeners/SettingsState';
  $: transparencyEffects = $settingsState.transparencyEffects;
</script>

<!-- Backdrop -->
<div class="fixed inset-0 bg-black/50 backdrop-blur-sm {transparencyEffects ? '' : 'backdrop-blur-none'}">
</div>

<!-- Modal -->
<div 
  class="bg-[var(--background-primary)] rounded-xl shadow-2xl
         {transparencyEffects ? 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl' : ''}"
>
  Modal content
</div>
```

### Headers/Navigation

Use backdrop blur conditionally:

```svelte
<script lang="ts">
  import { settingsState } from '@/seqta/utils/listeners/SettingsState';
  $: transparencyEffects = $settingsState.transparencyEffects;
</script>

<header 
  class="bg-[var(--background-primary)] border-b border-[var(--border-primary)]
         {transparencyEffects ? 'backdrop-blur-xl' : ''}"
>
  Header content
</header>
```

## Common Patterns

### Dark Mode Support

Always provide dark mode variants using the `dark:` prefix:

```svelte
<div class="bg-white dark:bg-[var(--background-primary)] 
            text-black dark:text-[var(--text-primary)]">
  Content
</div>
```

### Transitions

Use consistent transition classes:

```svelte
<!-- Standard transitions -->
<div class="transition-all duration-200">
  Content
</div>

<!-- Hover scaling (tight containers) -->
<div class="hover:scale-[1.02] transition-all duration-200">
  Content
</div>

<!-- Hover scaling (more space) -->
<div class="hover:scale-105 transition-all duration-200">
  Content
</div>
```

### Focus States

Always include focus rings for accessibility:

```svelte
<button 
  class="focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] 
         focus:ring-offset-2"
>
  Button
</button>
```

## Examples

### Example 1: Search Bar Component

```svelte
<script lang="ts">
  import { settingsState } from '@/seqta/utils/listeners/SettingsState';
  $: transparencyEffects = $settingsState.transparencyEffects;
</script>

<div 
  class="bg-[var(--background-primary)] border border-[var(--border-primary)]
         rounded-lg px-4 py-2
         {transparencyEffects ? 'backdrop-blur-xl' : ''}"
>
  <input 
    type="text" 
    class="bg-transparent text-[var(--text-primary)] 
           placeholder-[var(--text-muted)] 
           focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
  />
</div>
```

### Example 2: Modal Component

```svelte
<script lang="ts">
  import { settingsState } from '@/seqta/utils/listeners/SettingsState';
  import { fade, scale } from 'svelte/transition';
  
  $: transparencyEffects = $settingsState.transparencyEffects;
  let isOpen = $state(false);
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 bg-black/50 z-50 {transparencyEffects ? 'backdrop-blur-sm' : ''}"
    transition:fade
    onclick={() => isOpen = false}
  ></div>
  
  <!-- Modal -->
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    transition:scale={{ start: 0.95 }}
  >
    <div 
      class="bg-[var(--background-primary)] rounded-xl shadow-2xl p-6 max-w-md w-full
             {transparencyEffects ? 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl' : ''}"
    >
      <slot />
    </div>
  </div>
{/if}
```

## Checklist for New Components

When creating or styling a new component:

- [ ] Use CSS variables (`var(--background-primary)`, etc.) instead of hardcoded colors
- [ ] Check `transparencyEffects` before applying `backdrop-blur-*` classes
- [ ] Provide dark mode variants using `dark:` prefix
- [ ] Include focus states for accessibility
- [ ] Use consistent transitions (`transition-all duration-200`)
- [ ] Apply hover scaling appropriately (`hover:scale-105` or `hover:scale-[1.02]`)
- [ ] Use accent colors (`--accent-bg`, `--accent-hover`, `--accent-ring`) for interactive elements
- [ ] Test with transparency effects both enabled and disabled
- [ ] Ensure backgrounds are fully opaque when transparency effects are disabled

## Teach-Specific Considerations

### Platform Detection

Always check if you're on Teach platform before applying Teach-specific styles:

```typescript
import { isSEQTATeachSync } from "@/seqta/utils/platformDetection";

if (isSEQTATeachSync()) {
  // Apply Teach-specific styling
}
```

### Teach CSS Selectors

SEQTA Teach uses React with CSS modules. Target elements using class name patterns:

```scss
// Target Teach components using class name patterns
[class*="Chrome__content"] {
  // Styles for Teach content area
}

[class*="Spine__Spine"] {
  // Styles for Teach navigation spine
}

[class*="Pastoral__container"] {
  // Styles for SIP/pastoral care pages
}
```

### Teach-Specific Transparency Rules

Teach has specific transparency rules in `injected.scss`:

```scss
body[data-seqta-platform="teach"] {
  html:not(.transparencyEffects) & {
    * {
      backdrop-filter: none !important;
    }
  }
}
```

## Files Reference

- Theme variables: `src/css/injected/theme.scss`
- Transparency effects: `src/css/injected/transparency.scss`
- Global transparency rules: `src/css/injected.scss` (lines 16297-16333)
- Teach-specific styles: `src/css/injected.scss` (body[data-seqta-platform="teach"])
- Settings state: `src/seqta/utils/listeners/SettingsState.ts`
- Color manager: `src/seqta/ui/colors/Manager.ts`
- Platform detection: `src/seqta/utils/platformDetection.ts`
