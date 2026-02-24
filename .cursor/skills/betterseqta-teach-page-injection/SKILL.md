---
name: betterseqta-teach-page-injection
description: Guides injecting content and enhancements into SEQTA Teach pages, handling React-managed DOM, route changes, and DOM mutations. Use when adding new page injections, dashboard enhancements, SIP features, or modifying existing page injection code for SEQTA Teach platform in BetterSEQTA-Plus.
---

# BetterSEQTA Teach Page Injection Guide

## Overview

BetterSEQTA Teach injects content into SEQTA Teach pages using careful DOM manipulation patterns that respect React's virtual DOM, handle route changes, and monitor for DOM mutations. SEQTA Teach is a React-based SPA, so all injection patterns must account for React's DOM management. This guide covers the patterns used for Teach dashboard, SIP enhancements, and other Teach page injections.

## Core Principles

### 1. React-Aware Injection

SEQTA Teach is a React-based SPA. React manages its own DOM through virtual DOM reconciliation. **Never inject directly into React-managed containers** - React will remove your elements during re-renders.

**✅ Correct:** Insert as a sibling to React containers
```typescript
// Find React container
const reactContent = document.querySelector("[class*='Chrome__content']");
const parent = reactContent.parentElement;

// Insert as sibling, not child
parent.insertBefore(yourElement, reactContent.nextSibling);
```

**❌ Wrong:** Inserting into React container
```typescript
// React will remove this!
reactContent.appendChild(yourElement);
```

### 2. Wait for Elements

Always wait for target elements to exist before injecting:

```typescript
import { delay } from "@/seqta/utils/delay";
import { waitForElm } from "@/seqta/utils/waitForElm";

// Method 1: Polling with delay
let insertionPoint: HTMLElement | null = null;
let attempts = 0;
const maxAttempts = 50; // 5 seconds max

while (!insertionPoint && attempts < maxAttempts) {
  await delay(100);
  insertionPoint = document.querySelector(".target-selector");
  attempts++;
}

// Method 2: Using waitForElm (preferred)
const insertionPoint = await waitForElm(".target-selector");
```

### 3. Prevent Duplicate Injections

Always check if elements already exist:

```typescript
const existingElement = document.getElementById("your-unique-id");
if (existingElement && document.body.contains(existingElement)) {
  return; // Already injected
}

// If exists but not attached, clean up
if (existingElement) {
  existingElement.remove();
}
```

### 4. Handle Route Changes

SEQTA Teach uses React Router for client-side navigation. Set up listeners for navigation:

```typescript
// Listen for popstate (back/forward)
window.addEventListener('popstate', () => {
  setTimeout(() => {
    injectContent();
  }, 300);
});

// Override pushState/replaceState
const originalPushState = history.pushState;
history.pushState = function(...args) {
  originalPushState.apply(history, args);
  setTimeout(() => {
    injectContent();
  }, 300);
};
```

## Common Patterns

### Pattern 1: Simple Element Injection

For injecting buttons, links, or simple elements:

```typescript
import stringToHTML from "@/seqta/utils/stringToHTML";
import { delay } from "@/seqta/utils/delay";

async function injectButton() {
  // Check if already exists
  const existing = document.getElementById("my-button");
  if (existing && document.body.contains(existing)) {
    return;
  }

  // Wait for insertion point
  let container: HTMLElement | null = null;
  let attempts = 0;
  while (!container && attempts < 50) {
    await delay(100);
    container = document.querySelector(".target-container");
    attempts++;
  }

  if (!container) {
    console.error("Could not find insertion point");
    return;
  }

  // Create element using stringToHTML (sanitizes HTML)
  const button = stringToHTML(/* html */`
    <button id="my-button" data-betterseqta="true">
      Click me
    </button>
  `);

  // Insert
  if (button.firstChild) {
    container.insertBefore(button.firstChild, container.firstChild);
  }
}
```

### Pattern 2: Dashboard/Page Content Injection (Teach Homepage)

For injecting full page content like the Teach homepage dashboard:

```typescript
async function injectDashboard() {
  // Prevent multiple loads
  if (isLoading) {
    return;
  }

  // Check if already exists
  const existing = document.getElementById("betterseqta-dashboard");
  if (existing) {
    existing.style.display = '';
    return;
  }

  isLoading = true;

  // Wait for Teach's React content container
  let reactContent: HTMLElement | null = null;
  let attempts = 0;
  while (!reactContent && attempts < 50) {
    await delay(100);
    // Teach uses Chrome__content class for main content area
    reactContent = document.querySelector("[class*='Chrome__content']");
    attempts++;
  }

  if (!reactContent) {
    console.error("Could not find React container");
    isLoading = false;
    return;
  }

  // Get parent (insertion point)
  const insertionPoint = reactContent.parentElement;
  if (!insertionPoint) {
    isLoading = false;
    return;
  }

  // Create dashboard container
  const dashboard = stringToHTML(/* html */`
    <div id="betterseqta-dashboard" class="dashboard-container">
      <!-- Dashboard content -->
    </div>
  `);

  const dashboardElement = dashboard.firstChild as HTMLElement;
  if (!dashboardElement) {
    isLoading = false;
    return;
  }

  // Insert as sibling to React container
  if (reactContent.parentElement === insertionPoint) {
    insertionPoint.insertBefore(dashboardElement, reactContent.nextSibling);
  } else {
    insertionPoint.appendChild(dashboardElement);
  }

  // Mark with data attribute
  dashboardElement.setAttribute('data-betterseqta-dashboard', 'true');

  isLoading = false;
}
```

### Pattern 3: MutationObserver for Re-injection (Teach Spine)

When React replaces DOM (common in Teach navigation), use MutationObserver to re-inject. This is especially important for Teach's Spine navigation:

```typescript
let observerSetup = false;
let injectionInProgress = false;

function setupObserver() {
  if (observerSetup) return;
  observerSetup = true;

  // Teach's navigation spine uses Spine__Spine class
  const target = document.querySelector("[class*='Spine__Spine']");
  if (!target) {
    // Retry if Spine isn't ready yet (common on initial load)
    setTimeout(() => setupObserver(), 500);
    return;
  }

  const observer = new MutationObserver(() => {
    // Check if elements were removed
    const myElement = document.getElementById("my-element");
    
    // Re-inject if missing (but not if already injecting)
    if (!injectionInProgress && !myElement) {
      setTimeout(() => {
        injectContent();
      }, 100);
    }
  });

  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: false
  });
}
```

### Pattern 4: Monitoring DOM Changes (SIP Pattern)

For Teach features that need to react to DOM changes, like SIP (Student Information Portal) enhancements that monitor student changes:

```typescript
function monitorChanges() {
  let lastState: string | null = null;

  const checkForChanges = async () => {
    // Detect current state
    const currentState = getCurrentState(); // e.g., student name, form state
    
    // React to changes
    if (lastState !== null && currentState !== lastState) {
      await handleStateChange(currentState);
    }
    
    lastState = currentState;
  };

  // Poll periodically
  setInterval(checkForChanges, 500);

  // Listen to navigation
  window.addEventListener('popstate', () => {
    setTimeout(checkForChanges, 300);
  });

  // Override history methods
  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(checkForChanges, 300);
  };

  // Watch DOM mutations
  const observer = new MutationObserver(async (mutations) => {
    // Check if relevant elements changed
    const hasRelevantChanges = mutations.some(mutation => {
      if (mutation.type === 'childList') {
        const target = mutation.target as Element;
        return target.querySelector?.('[class*="RelevantClass"]') !== null ||
               target.closest?.('[class*="RelevantClass"]') !== null;
      }
      return false;
    });

    if (hasRelevantChanges) {
      await checkForChanges();
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  // Initial check
  checkForChanges();
}
```

### Pattern 5: Route Listener (Teach React Router)

For Teach content that should appear/disappear based on route. Teach uses React Router, so routes change without full page reloads:

```typescript
let routeListenerSetup = false;

export function setupRouteListener() {
  if (routeListenerSetup) return;
  routeListenerSetup = true;

  const checkRoute = () => {
    const currentPath = window.location.pathname;
    const isOnTargetPage = currentPath === '/target' || currentPath.includes('/target');
    
    const element = document.getElementById("my-element");
    
    if (isOnTargetPage) {
      // Show element
      if (element) {
        element.style.display = '';
      } else {
        injectContent();
      }
    } else {
      // Hide or remove element
      if (element) {
        element.style.display = 'none';
        // Or remove: element.remove();
      }
    }
  };

  // Listen to navigation
  window.addEventListener('popstate', checkRoute);
  
  // Poll for route changes
  let lastPath = window.location.pathname;
  setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      checkRoute();
    }
  }, 1000);

  // Initial check
  requestAnimationFrame(() => {
    setTimeout(checkRoute, 100);
  });
}
```

## Utility Functions

### stringToHTML

Always use `stringToHTML` for creating DOM elements (sanitizes HTML):

```typescript
import stringToHTML from "@/seqta/utils/stringToHTML";

const element = stringToHTML(/* html */`
  <div id="my-element">
    <button onclick="handleClick()">Click</button>
  </div>
`);

// Access first child (the root element)
const rootElement = element.firstChild as HTMLElement;
```

### waitForElm

Use `waitForElm` for waiting on elements (more efficient than polling):

```typescript
import { waitForElm } from "@/seqta/utils/waitForElm";

try {
  const element = await waitForElm(".target-selector");
  // Element is ready
} catch (error) {
  console.error("Element not found");
}
```

### delay

Use `delay` for timing:

```typescript
import { delay } from "@/seqta/utils/delay";

await delay(100); // Wait 100ms
```

## Finding Insertion Points

### For SEQTA Teach Spine Navigation

The Spine is Teach's left-side navigation bar. Finding the correct container requires multiple strategies:

```typescript
function findSpineNavContainer(): HTMLElement | null {
  const strategies = [
    // Strategy 1: Look for Spine with navigation links
    () => {
      const spine = document.querySelector("[class*='Spine__Spine']");
      if (!spine) return null;
      
      const containers = spine.querySelectorAll("div, nav, ul, ol");
      for (const container of Array.from(containers)) {
        const links = container.querySelectorAll("a[href]");
        if (links.length >= 3) {
          return container as HTMLElement;
        }
      }
      return null;
    },
    
    // Strategy 2: First flex container
    () => {
      const spine = document.querySelector("[class*='Spine__Spine']");
      if (!spine) return null;
      
      const flexContainers = Array.from(spine.querySelectorAll("div")).filter(div => {
        const style = window.getComputedStyle(div);
        return style.display === "flex" && style.flexDirection === "column";
      });
      
      return flexContainers[0] as HTMLElement || null;
    },
    
    // Fallback: Spine itself
    () => document.querySelector("[class*='Spine__Spine']") as HTMLElement | null
  ];
  
  for (const strategy of strategies) {
    const result = strategy();
    if (result) return result;
  }
  
  return null;
}
```

### For Teach Page Content Areas

Teach's main content area is managed by React. Find insertion points as siblings:

```typescript
// Find Teach's React content container
const reactContent = document.querySelector("[class*='Chrome__content']");
const main = document.querySelector("#root > div > main");

// Use parent as insertion point (insert as sibling, not child)
const insertionPoint = reactContent?.parentElement || main;

// Always insert as sibling to prevent React from managing your elements
if (reactContent && reactContent.parentElement === insertionPoint) {
  insertionPoint.insertBefore(yourElement, reactContent.nextSibling);
}
```

## Best Practices

### 1. Use Unique IDs

Always use unique IDs prefixed with `betterseqta-`:

```typescript
const element = stringToHTML(/* html */`
  <div id="betterseqta-my-feature">
    Content
  </div>
`);
```

### 2. Mark Elements with data-betterseqta

Add `data-betterseqta="true"` to identify BetterSEQTA elements:

```typescript
<button id="my-button" data-betterseqta="true">
  Button
</button>
```

### 3. Prevent Concurrent Injections

Use flags to prevent multiple simultaneous injections:

```typescript
let injectionInProgress = false;

async function injectContent() {
  if (injectionInProgress) {
    console.debug("Injection already in progress");
    return;
  }
  
  injectionInProgress = true;
  try {
    // Injection logic
  } finally {
    injectionInProgress = false;
  }
}
```

### 4. Clean Up on Navigation

Remove or hide elements when navigating away:

```typescript
function cleanup() {
  const element = document.getElementById("my-element");
  if (element && element.isConnected) {
    const parent = element.parentElement;
    if (parent) {
      parent.removeChild(element);
    }
  }
}
```

### 5. Handle Errors Gracefully

Always wrap injection logic in try-catch:

```typescript
try {
  await injectContent();
} catch (error) {
  console.error("[BetterSEQTA+] Error injecting content:", error);
  // Don't throw - fail gracefully
}
```

## Examples

### Example 1: Injecting Navigation Button

```typescript
async function createNavButton() {
  const existing = document.getElementById("betterseqta-nav-button");
  if (existing && document.body.contains(existing)) {
    return;
  }

  let navContainer: HTMLElement | null = null;
  let attempts = 0;
  while (!navContainer && attempts < 50) {
    await delay(100);
    navContainer = findSpineNavContainer();
    attempts++;
  }

  if (!navContainer) {
    console.error("Could not find nav container");
    return;
  }

  const button = stringToHTML(/* html */`
    <a href="#" id="betterseqta-nav-button" data-betterseqta="true"
       style="display: flex; align-items: center; padding: 12px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <!-- SVG content -->
      </svg>
    </a>
  `);

  if (button.firstChild) {
    navContainer.insertBefore(button.firstChild, navContainer.firstChild);
  }
}
```

### Example 2: Dashboard Widget Injection

```typescript
async function injectDashboardWidget() {
  if (isLoadingWidget) return;
  
  const existing = document.getElementById("betterseqta-widget");
  if (existing) return;

  isLoadingWidget = true;

  const container = await waitForElm(".dashboard-container");
  
  const widget = stringToHTML(/* html */`
    <div id="betterseqta-widget" class="widget" data-betterseqta="true">
      <h3>Widget Title</h3>
      <div class="widget-content">
        <!-- Widget content -->
      </div>
    </div>
  `);

  if (widget.firstChild) {
    container.appendChild(widget.firstChild);
  }

  isLoadingWidget = false;
}
```

### Example 3: Form Enhancement (SIP Pattern)

SIP (Student Information Portal) enhancements monitor for student changes and enhance pastoral care forms:

```typescript
import { isSEQTATeachSync } from "@/seqta/utils/platformDetection";

function enhanceSIPForm() {
  // Only run on Teach platform
  if (!isSEQTATeachSync()) {
    return;
  }

  let lastFormContainer: Element | null = null;

  const observer = new MutationObserver(async (mutations) => {
    // Teach uses Pastoral__container for SIP forms
    const currentForm = document.querySelector('[class*="Pastoral__container"]');
    
    // Check if form container was replaced (indicates new student/form)
    if (currentForm && lastFormContainer && currentForm !== lastFormContainer) {
      await enhanceFormFields(currentForm);
    }
    
    lastFormContainer = currentForm;
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

async function enhanceFormFields(form: Element) {
  // Add enhancements to Teach SIP form fields
  const textarea = form.querySelector('textarea');
  if (textarea) {
    // Enhance textarea (e.g., auto-clear on student change)
  }
}
```

## Teach-Specific Considerations

### Platform Detection

Always check if you're on Teach platform:

```typescript
import { isSEQTATeachSync } from "@/seqta/utils/platformDetection";

if (!isSEQTATeachSync()) {
  console.debug("Not on Teach platform, skipping");
  return;
}
```

### Teach Class Name Patterns

Teach uses CSS modules with hashed class names. Use pattern matching:

```typescript
// ✅ Correct: Pattern matching
document.querySelector("[class*='Spine__Spine']");
document.querySelector("[class*='Chrome__content']");
document.querySelector("[class*='Pastoral__container']");

// ❌ Wrong: Exact class names (will break when CSS modules regenerate)
document.querySelector(".Spine__Spine___zYUJ6");
```

### Teach Route Patterns

Teach routes are typically:
- `/welcome` - Welcome/home page
- `/betterseqta-home` - BetterSEQTA+ homepage (custom route)
- `/pastoral` - SIP/pastoral care pages
- Other routes follow `/section/subsection` pattern

## Checklist for New Teach Injections

When creating a new Teach page injection:

- [ ] Check platform with `isSEQTATeachSync()` before injecting
- [ ] Check if element already exists before injecting
- [ ] Wait for insertion point to be available (with timeout)
- [ ] Use `stringToHTML` for creating elements (sanitization)
- [ ] Insert as sibling to React containers, not inside them
- [ ] Use Teach class name patterns (`[class*='ClassName']`)
- [ ] Use unique IDs prefixed with `betterseqta-teach-`
- [ ] Add `data-betterseqta="true"` attribute
- [ ] Set up MutationObserver for Spine if injecting navigation elements
- [ ] Set up route listener if content is route-specific
- [ ] Prevent concurrent injections with flags
- [ ] Handle errors gracefully (try-catch)
- [ ] Clean up on navigation away
- [ ] Test with Teach React Router navigation (back/forward, route changes)
- [ ] Test with DOM mutations (React re-renders)
- [ ] Test with Spine navigation (React replaces navigation DOM)

## Files Reference

**Teach-Specific Files:**
- Dashboard injection: `src/seqta/utils/Loaders/LoadTeachHomePage.ts`
- SIP enhancements: `src/seqta/utils/SIPEnhancements.ts`
- Element injection: `src/seqta/ui/AddBetterSEQTAElementsTeach.ts`
- Platform detection: `src/seqta/utils/platformDetection.ts`

**Shared Utilities:**
- Wait for element: `src/seqta/utils/waitForElm.ts`
- String to HTML: `src/seqta/utils/stringToHTML.ts`
- Delay utility: `src/seqta/utils/delay.ts`
- Event manager: `src/seqta/utils/listeners/EventManager.ts`
