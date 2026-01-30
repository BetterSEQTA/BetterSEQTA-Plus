import type { SettingsState } from "@/types/storage";
import { settingsState } from "../listeners/SettingsState";
import stringToHTML from "../stringToHTML";
import Sortable from "sortablejs";
import { isSEQTATeachSync } from "../platformDetection";

export let SpineMenuOptionsOpen = false;

/**
 * Finds the Spine navigation container that holds the navigation items
 * Uses multiple strategies to find the container (same as AddBetterSEQTAElementsTeach.ts)
 */
function findSpineNavContainer(): HTMLElement | null {
  // Try multiple strategies to find the Spine navigation container
  const strategies = [
    // Strategy 1: Look for Spine component with navigation links
    () => {
      const spine = document.querySelector("[class*='Spine__Spine']");
      if (!spine) return null;
      
      // Look for a container with navigation links (usually has multiple <a> tags)
      const containers = spine.querySelectorAll("div, nav, ul, ol");
      for (const container of Array.from(containers)) {
        const links = container.querySelectorAll("a[href]");
        // If it has multiple links, it's likely the nav container
        if (links.length >= 3) {
          return container as HTMLElement;
        }
      }
      return null;
    },
    
    // Strategy 2: Look for the first flex container in Spine
    () => {
      const spine = document.querySelector("[class*='Spine__Spine']");
      if (!spine) return null;
      
      const flexContainers = Array.from(spine.querySelectorAll("div")).filter(div => {
        const style = window.getComputedStyle(div);
        return style.display === "flex" && style.flexDirection === "column";
      });
      
      if (flexContainers.length > 0) {
        return flexContainers[0] as HTMLElement;
      }
      return null;
    },
    
    // Strategy 3: Look for container with specific Spine classes
    () => {
      const spine = document.querySelector("[class*='Spine__Spine']");
      if (!spine) return null;
      
      // Look for containers with Spine navigation item classes
      const navItems = spine.querySelectorAll("[class*='Spine__q'], [class*='Spine__workspace']");
      if (navItems.length > 0 && navItems[0].parentElement) {
        return navItems[0].parentElement as HTMLElement;
      }
      return null;
    },
    
    // Strategy 4: Use the first direct child that contains links
    () => {
      const spine = document.querySelector("[class*='Spine__Spine']");
      if (!spine) return null;
      
      for (const child of Array.from(spine.children)) {
        const links = child.querySelectorAll("a[href]");
        if (links.length >= 2) {
          return child as HTMLElement;
        }
      }
      return null;
    },
    
    // Strategy 5: Fallback - use Spine itself
    () => {
      return document.querySelector("[class*='Spine__Spine']") as HTMLElement | null;
    }
  ];
  
  for (const strategy of strategies) {
    const result = strategy();
    if (result) {
      console.debug("[BetterSEQTA+] Found Spine nav container using strategy:", strategies.indexOf(strategy) + 1);
      return result;
    }
  }
  
  return null;
}

/**
 * Gets all navigation items from the Spine
 * These are typically <a> tags or buttons with Spine classes
 */
function getSpineNavItems(container: HTMLElement): HTMLElement[] {
  const items: HTMLElement[] = [];
  
  // Look for navigation items - typically links or buttons
  // Exclude BetterSEQTA+ items (they have data-betterseqta attribute)
  const candidates = container.querySelectorAll("a[href], button");
  
  for (const candidate of Array.from(candidates)) {
    const element = candidate as HTMLElement;
    // Skip BetterSEQTA+ items and spacer elements
    if (
      !element.dataset.betterseqta &&
      !element.classList.toString().includes("Spine__spacer") &&
      !element.classList.toString().includes("Spine__logout") &&
      !element.classList.toString().includes("Spine__help")
    ) {
      // Ensure it has a way to identify it (href or data attribute)
      if (element.getAttribute("href") || element.getAttribute("data-key")) {
        items.push(element);
      }
    }
  }
  
  return items;
}

/**
 * Gets the current main page identifier from URL
 */
function getCurrentMainPage(): string | null {
  const path = window.location.pathname;
  // Extract main page from path (e.g., /ta/messages -> "messages", /ta/assessments -> "assessments")
  const match = path.match(/\/(?:ta\/|teach\/)?([^\/\?]+)/);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  return null;
}

/**
 * Detects sub-pages (tabs, secondary navigation) on the current page
 * Looks for common patterns like tabs, secondary nav menus, etc.
 */
function getSubPages(): HTMLElement[] {
  const subPages: HTMLElement[] = [];
  
  // Strategy 1: Look for tab navigation (common pattern)
  const tabContainers = document.querySelectorAll('[role="tablist"], [class*="Tab"], [class*="tab"], nav[class*="Nav"]');
  for (const container of Array.from(tabContainers)) {
    const tabs = container.querySelectorAll('[role="tab"], a[href], button');
    for (const tab of Array.from(tabs)) {
      const element = tab as HTMLElement;
      // Skip if it's a main navigation item or external link
      if (element.closest('[class*="Spine"]') || 
          element.getAttribute('href')?.startsWith('http') ||
          !element.getAttribute('href')) {
        continue;
      }
      // Check if it's a sub-page link (usually relative URLs within the same section)
      const href = element.getAttribute('href');
      if (href && (href.startsWith('/') || href.startsWith('#'))) {
        subPages.push(element);
      }
    }
  }
  
  // Strategy 2: Look for secondary navigation menus
  const navMenus = document.querySelectorAll('nav:not([class*="Spine"]), [class*="Nav"]:not([class*="Spine"])');
  for (const nav of Array.from(navMenus)) {
    const links = nav.querySelectorAll('a[href], button[data-href]');
    for (const link of Array.from(links)) {
      const element = link as HTMLElement;
      const href = element.getAttribute('href') || element.getAttribute('data-href');
      if (href && (href.startsWith('/') || href.startsWith('#')) && !href.includes('http')) {
        if (!subPages.includes(element)) {
          subPages.push(element);
        }
      }
    }
  }
  
  // Strategy 3: Look for buttons/links in content area that might be sub-pages
  // This is more aggressive and might catch some false positives
  const contentArea = document.querySelector('main, [class*="Content"], [class*="content"], [class*="Page"]');
  if (contentArea) {
    const potentialSubPages = contentArea.querySelectorAll('a[href^="/"], a[href^="#"], button[data-href]');
    for (const item of Array.from(potentialSubPages)) {
      const element = item as HTMLElement;
      // Skip if already added or if it's clearly not a sub-page
      if (subPages.includes(element) || 
          element.closest('[class*="Spine"]') ||
          element.textContent?.trim().length === 0) {
        continue;
      }
      // Only add if it looks like a navigation item (has text, is clickable)
      const text = element.textContent?.trim();
      if (text && text.length > 0 && text.length < 50) { // Reasonable length for a nav item
        subPages.push(element);
      }
    }
  }
  
  // Remove duplicates
  return Array.from(new Set(subPages));
}

/**
 * Generates a unique key for a sub-page item
 */
function getSubPageKey(item: HTMLElement): string {
  // Try data-key first
  if (item.dataset.key) {
    return item.dataset.key;
  }
  
  // Try href
  const href = item.getAttribute("href") || item.getAttribute("data-href");
  if (href) {
    // Extract meaningful part from href
    const match = href.match(/\/([^/?#]+)/);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    // Fallback to full href (sanitized)
    return href.replace(/[/?#=]/g, "_").toLowerCase();
  }
  
  // Try text content
  const text = item.textContent?.trim();
  if (text) {
    return text.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  }
  
  // Fallback
  return `subpage_${Date.now()}_${Math.random()}`;
}

/**
 * Generates a unique key for a Spine navigation item
 */
function getSpineItemKey(item: HTMLElement): string {
  // Try data-key first
  if (item.dataset.key) {
    return item.dataset.key;
  }
  
  // Try href
  const href = item.getAttribute("href");
  if (href) {
    // Extract meaningful part from href (e.g., "/ta/assessments" -> "assessments")
    const match = href.match(/\/([^/]+)$/);
    if (match) {
      return match[1];
    }
    // Fallback to full href
    return href.replace(/[/?=]/g, "_");
  }
  
  // Try text content
  const text = item.textContent?.trim();
  if (text) {
    return text.toLowerCase().replace(/\s+/g, "_");
  }
  
  // Fallback to class name
  const className = Array.from(item.classList).find(c => c.includes("Spine__"));
  if (className) {
    return className.replace("Spine__", "").replace(/[^a-zA-Z0-9]/g, "_");
  }
  
  // Last resort: use index
  return `spine_item_${Date.now()}_${Math.random()}`;
}

export async function OpenMenuOptionsTeach() {
  if (!isSEQTATeachSync()) {
    console.warn("[BetterSEQTA+] OpenMenuOptionsTeach called but not on Teach platform");
    return;
  }
  
  const spine = document.querySelector("[class*='Spine__Spine']") as HTMLElement;
  if (!spine) {
    console.error("[BetterSEQTA+] Could not find Spine element");
    // Log debug info
    console.debug("[BetterSEQTA+] Available elements:", {
      body: document.body ? "found" : "not found",
      root: document.getElementById("root") ? "found" : "not found",
      spineClasses: Array.from(document.querySelectorAll("[class*='Spine']")).map(el => el.className)
    });
    return;
  }
  
  // Try multiple times with delays (React might still be rendering)
  let navContainer: HTMLElement | null = null;
  let attempts = 0;
  const maxAttempts = 10;
  
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  while (!navContainer && attempts < maxAttempts) {
    navContainer = findSpineNavContainer();
    if (!navContainer && attempts < maxAttempts - 1) {
      // Wait a bit before retrying
      await delay(100);
    }
    attempts++;
  }
  
  if (!navContainer) {
    console.error("[BetterSEQTA+] Could not find Spine navigation container after", maxAttempts, "attempts");
    // Log detailed debug info
    console.debug("[BetterSEQTA+] Spine structure:", {
      tagName: spine.tagName,
      className: spine.className,
      children: Array.from(spine.children).map(c => ({
        tagName: c.tagName,
        className: c.className,
        children: c.children.length,
        links: c.querySelectorAll("a[href]").length
      }))
    });
    return;
  }
  
  const navItems = getSpineNavItems(navContainer);
  if (navItems.length === 0) {
    console.error("[BetterSEQTA+] No navigation items found in Spine");
    return;
  }
  
  // Initialize default order if empty
  if (!settingsState.defaultteachspineorder || settingsState.defaultteachspineorder.length === 0) {
    const newDefaultOrder: string[] = [];
    for (const item of navItems) {
      const key = getSpineItemKey(item);
      newDefaultOrder.push(key);
      // Set data-key attribute for future reference
      item.setAttribute("data-key", key);
    }
    settingsState.defaultteachspineorder = newDefaultOrder;
  }
  
  // Check if new items were added
  if (settingsState.defaultteachspineorder.length !== navItems.length) {
    for (const item of navItems) {
      const key = getSpineItemKey(item);
      if (!settingsState.defaultteachspineorder.includes(key)) {
        settingsState.defaultteachspineorder = [
          ...settingsState.defaultteachspineorder,
          key,
        ];
      }
      // Ensure data-key is set
      item.setAttribute("data-key", key);
    }
  }
  
  SpineMenuOptionsOpen = true;
  
  // Check for sub-pages on current page (before creating modal)
  const currentMainPage = getCurrentMainPage();
  const subPages = currentMainPage ? getSubPages() : [];
  const hasSubPages = subPages.length > 0;
  
  // Create cover overlay
  const cover = document.createElement("div");
  cover.classList.add("notMenuCover");
  cover.id = "betterseqta-spine-reorder-cover";
  cover.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 100000 !important;
    backdrop-filter: blur(4px);
  `;
  document.body.appendChild(cover);
  
  // Ensure logout/help buttons stay below modal
  const logoutHelpButtons = document.querySelectorAll("[class*='Spine__logout'], [class*='Spine__help']");
  logoutHelpButtons.forEach((btn: Element) => {
    (btn as HTMLElement).style.zIndex = "1";
  });
  
  // Create settings container
  const spineSettings = document.createElement("div");
  spineSettings.classList.add("editmenuoption-container");
  spineSettings.id = "betterseqta-spine-reorder-modal";
  // Check if dark mode
  const isDarkMode = document.documentElement.classList.contains("dark") || 
                     window.getComputedStyle(document.body).backgroundColor === "rgb(0, 0, 0)" ||
                     window.getComputedStyle(document.body).backgroundColor === "rgba(0, 0, 0, 0)";
  
  const modalWidth = hasSubPages ? '1100px' : '700px';
  const modalMinWidth = hasSubPages ? '900px' : '600px';
  
  spineSettings.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${isDarkMode ? 'rgb(39, 39, 42)' : '#fff'} !important;
    border-radius: 16px;
    padding: 32px;
    z-index: 100001 !important;
    min-width: ${modalMinWidth};
    width: ${modalWidth};
    max-width: 95vw;
    min-height: 500px;
    max-height: 85vh;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    color: ${isDarkMode ? '#fff' : '#000'} !important;
    overflow: hidden;
  `;
  
  const title = document.createElement("h2");
  title.textContent = "Reorder Spine Navigation";
  title.style.cssText = `
    margin: 0 0 28px 0;
    font-family: Rubik, sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: ${isDarkMode ? '#fff' : '#000'} !important;
    text-align: center;
  `;
  spineSettings.appendChild(title);
  
  const defaultButton = document.createElement("button");
  defaultButton.classList.add("editmenuoption");
  defaultButton.textContent = "Restore Default";
  defaultButton.style.cssText = `
    padding: 12px 24px;
    margin-right: 12px;
    background: var(--background-secondary, #f5f5f5);
    color: var(--text-primary, #000);
    border: 2px solid var(--border-primary, #ddd);
    border-radius: 10px;
    cursor: pointer;
    font-family: Rubik, sans-serif;
    font-size: 15px;
    font-weight: 600;
    transition: all 0.2s ease;
  `;
  defaultButton.addEventListener("mouseenter", () => {
    defaultButton.style.background = "var(--background-hover, #e8e8e8)";
    defaultButton.style.borderColor = "var(--accent-bg, #007bff)";
  });
  defaultButton.addEventListener("mouseleave", () => {
    defaultButton.style.background = "var(--background-secondary, #f5f5f5)";
    defaultButton.style.borderColor = "var(--border-primary, #ddd)";
  });
  
  const saveButton = document.createElement("button");
  saveButton.classList.add("editmenuoption");
  saveButton.textContent = "Save";
  saveButton.style.cssText = `
    padding: 12px 24px;
    background: var(--accent-bg, #007bff);
    color: white;
    border: 2px solid var(--accent-bg, #007bff);
    border-radius: 10px;
    cursor: pointer;
    font-family: Rubik, sans-serif;
    font-size: 15px;
    font-weight: 600;
    transition: all 0.2s ease;
  `;
  saveButton.addEventListener("mouseenter", () => {
    saveButton.style.opacity = "0.9";
    saveButton.style.transform = "scale(1.02)";
  });
  saveButton.addEventListener("mouseleave", () => {
    saveButton.style.opacity = "1";
    saveButton.style.transform = "scale(1)";
  });
  
  const buttonContainer = document.createElement("div");
  buttonContainer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    margin-top: 0;
    padding-top: 16px;
    border-top: 1px solid var(--border-primary, #ddd);
  `;
  buttonContainer.appendChild(defaultButton);
  buttonContainer.appendChild(saveButton);
  spineSettings.appendChild(buttonContainer);
  
  document.body.appendChild(spineSettings);
  
  // Initialize teachspineitems if empty
  if (!settingsState.teachspineitems || Object.keys(settingsState.teachspineitems).length === 0) {
    const spineItems: { [key: string]: { toggle: boolean } } = {};
    for (const item of navItems) {
      const key = getSpineItemKey(item);
      spineItems[key] = { toggle: true };
    }
    settingsState.teachspineitems = spineItems;
  }
  
  // Create a wrapper container for side-by-side layout
  const contentWrapper = document.createElement("div");
  contentWrapper.style.cssText = `
    display: flex;
    gap: 24px;
    flex: 1;
    overflow: hidden;
    margin: 0 0 24px 0;
    min-height: 350px;
    max-height: calc(85vh - 200px);
  `;
  
  // Create a temporary container for reordering main spine items
  const reorderContainer = document.createElement("div");
  reorderContainer.id = "betterseqta-spine-reorder-container";
  reorderContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 12px;
    min-height: 350px;
  `;
  
  // Add custom scrollbar styling
  const style = document.createElement("style");
  style.textContent = `
    #betterseqta-spine-reorder-container::-webkit-scrollbar {
      width: 8px;
    }
    #betterseqta-spine-reorder-container::-webkit-scrollbar-track {
      background: var(--background-secondary, #f5f5f5);
      border-radius: 4px;
    }
    #betterseqta-spine-reorder-container::-webkit-scrollbar-thumb {
      background: var(--border-primary, #ddd);
      border-radius: 4px;
    }
    #betterseqta-spine-reorder-container::-webkit-scrollbar-thumb:hover {
      background: var(--text-muted, #999);
    }
  `;
  document.head.appendChild(style);
  
  // Clone items for reordering (don't modify originals yet)
  const clonedItems: HTMLElement[] = [];
  for (const item of navItems) {
    const key = getSpineItemKey(item);
    const clone = item.cloneNode(true) as HTMLElement;
    clone.setAttribute("data-key", key);
    clone.classList.add("draggable-spine-item");
    
    // Extract text content and icon for display
    // Try multiple methods to get text
    let textContent = item.textContent?.trim();
    if (!textContent || textContent === "") {
      textContent = item.getAttribute("aria-label") || 
                    item.getAttribute("title") ||
                    item.querySelector("[title]")?.getAttribute("title") ||
                    item.querySelector("span")?.textContent?.trim() ||
                    key;
    }
    
    // Get icon - try SVG first, then icon elements
    const icon = item.querySelector("svg") || 
                 item.querySelector("i") ||
                 item.querySelector("[class*='icon']") ||
                 null;
    
    // Clear clone and rebuild with proper structure
    clone.innerHTML = "";
    clone.style.cssText = `
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 18px 20px !important;
      margin-bottom: 12px !important;
      background: ${isDarkMode ? 'rgb(63, 63, 70)' : '#f5f5f5'} !important;
      border: 2px solid ${isDarkMode ? 'rgb(82, 82, 91)' : '#ddd'} !important;
      border-radius: 10px !important;
      cursor: move !important;
      transition: all 0.2s ease !important;
      min-height: 56px !important;
      gap: 12px !important;
      width: 100% !important;
      box-sizing: border-box !important;
    `;
    
    // Create left side with icon and text
    const leftSide = document.createElement("div");
    leftSide.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    `;
    
    // Add drag handle icon
    const dragHandle = document.createElement("div");
    dragHandle.innerHTML = "⋮⋮";
    dragHandle.style.cssText = `
      color: var(--text-muted, #999);
      font-size: 16px;
      cursor: move;
      user-select: none;
      margin-right: 4px;
    `;
    leftSide.appendChild(dragHandle);
    
    // Add icon if exists
    if (icon) {
      const iconWrapper = document.createElement("div");
      iconWrapper.style.cssText = `
        display: flex;
        align-items: center;
        flex-shrink: 0;
      `;
      if (icon instanceof SVGElement) {
        iconWrapper.appendChild(icon.cloneNode(true) as SVGElement);
      } else if (icon) {
        iconWrapper.appendChild(icon.cloneNode(true) as Node);
      }
      leftSide.appendChild(iconWrapper);
    }
    
    // Add text
    const textSpan = document.createElement("span");
    textSpan.textContent = textContent;
    textSpan.style.cssText = `
      font-family: Rubik, sans-serif !important;
      font-size: 16px !important;
      font-weight: 500 !important;
      color: ${isDarkMode ? '#fff' : '#000'} !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    `;
    leftSide.appendChild(textSpan);
    
    clone.appendChild(leftSide);
    
    // Add toggle switch on the right
    const toggle = stringToHTML(
      `<div class="onoffswitch" style="margin-left: auto; flex-shrink: 0;"><input class="onoffswitch-checkbox spine-menuitem" type="checkbox" id="spine_${key}"><label for="spine_${key}" class="onoffswitch-label"></label></div>`,
    ).firstChild as HTMLElement;
    clone.appendChild(toggle);
    
    // Set initial toggle state
    const checkbox = clone.querySelector(`#spine_${key}`) as HTMLInputElement;
    if (settingsState.teachspineitems[key]) {
      checkbox.checked = settingsState.teachspineitems[key].toggle;
    } else {
      checkbox.checked = true;
    }
    
    // Add hover effect
    clone.addEventListener("mouseenter", () => {
      clone.style.background = `${isDarkMode ? 'rgb(82, 82, 91)' : '#e8e8e8'} !important`;
      clone.style.borderColor = "var(--accent-bg, #007bff) !important";
      clone.style.transform = "translateX(4px) !important";
    });
    clone.addEventListener("mouseleave", () => {
      clone.style.background = `${isDarkMode ? 'rgb(63, 63, 70)' : '#f5f5f5'} !important`;
      clone.style.borderColor = `${isDarkMode ? 'rgb(82, 82, 91)' : '#ddd'} !important`;
      clone.style.transform = "translateX(0) !important";
    });
    
    // Debug: Log if item has content
    if (!textContent || textContent.trim() === "") {
      console.warn("[BetterSEQTA+] Item has no text content:", item, key);
    }
    
    clonedItems.push(clone);
    reorderContainer.appendChild(clone);
  }
  
  // Add sub-pages section if they exist
  let subPageSortable: any = null;
  const clonedSubPages: HTMLElement[] = [];
  
  // Create sub-page container (will be added to right side if sub-pages exist)
  let subPageSection: HTMLElement | null = null;
  
  // Add main spine items to content wrapper
  contentWrapper.appendChild(reorderContainer);
  
  if (hasSubPages && currentMainPage) {
    subPageSection = document.createElement("div");
    subPageSection.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    `;
    
    const subPageTitle = document.createElement("h3");
    subPageTitle.textContent = `Reorder ${currentMainPage.charAt(0).toUpperCase() + currentMainPage.slice(1)} Sub-pages`;
    subPageTitle.style.cssText = `
      margin: 0 0 16px 0;
      font-family: Rubik, sans-serif;
      font-size: 18px;
      font-weight: 600;
      color: ${isDarkMode ? '#fff' : '#000'} !important;
    `;
    subPageSection.appendChild(subPageTitle);
    
    const subPageContainer = document.createElement("div");
    subPageContainer.id = "betterseqta-subpage-reorder-container";
    subPageContainer.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 12px;
      min-height: 350px;
    `;
    
    // Initialize sub-page orders if needed
    if (!settingsState.teachSubPageOrders) {
      settingsState.teachSubPageOrders = {};
    }
    if (!settingsState.defaultTeachSubPageOrders) {
      settingsState.defaultTeachSubPageOrders = {};
    }
    
    // Get default order or create it from current DOM order
    let defaultOrder = settingsState.defaultTeachSubPageOrders[currentMainPage] || [];
    
    // Create default order if not exists (capture original order from DOM)
    if (defaultOrder.length === 0) {
      const newDefaultOrder: string[] = [];
      for (const subPage of subPages) {
        const key = getSubPageKey(subPage);
        newDefaultOrder.push(key);
        subPage.setAttribute("data-subpage-key", key);
      }
      settingsState.defaultTeachSubPageOrders[currentMainPage] = newDefaultOrder;
      defaultOrder = newDefaultOrder;
    } else {
      // Ensure all current sub-pages have keys set
      for (const subPage of subPages) {
        const key = getSubPageKey(subPage);
        subPage.setAttribute("data-subpage-key", key);
        // If a new sub-page appears that's not in default order, add it
        if (!defaultOrder.includes(key)) {
          defaultOrder.push(key);
          settingsState.defaultTeachSubPageOrders[currentMainPage] = [...defaultOrder];
        }
      }
    }
    
    // Clone sub-pages for reordering
    for (const subPage of subPages) {
      const key = getSubPageKey(subPage);
      const clone = subPage.cloneNode(true) as HTMLElement;
      // Ensure data-subpage-key is set (required for Sortable toArray())
      clone.setAttribute("data-subpage-key", key);
      clone.classList.add("draggable-subpage-item");
      
      // Debug: verify key is set
      if (!clone.getAttribute("data-subpage-key")) {
        console.warn("[BetterSEQTA+] Warning: data-subpage-key not set for sub-page:", key, clone);
      }
      
      const textContent = subPage.textContent?.trim() || 
                         subPage.getAttribute("aria-label") ||
                         subPage.getAttribute("title") ||
                         key;
      
      // Style the clone
      clone.style.cssText = `
        display: flex !important;
        align-items: center !important;
        padding: 14px 18px !important;
        background: ${isDarkMode ? 'rgb(63, 63, 70)' : '#f5f5f5'} !important;
        border: 2px solid ${isDarkMode ? 'rgb(82, 82, 91)' : '#ddd'} !important;
        border-radius: 8px !important;
        cursor: move !important;
        transition: all 0.2s ease !important;
        min-height: 48px !important;
        gap: 12px !important;
      `;
      
      // Clear and rebuild with proper structure
      clone.innerHTML = "";
      
      const leftSide = document.createElement("div");
      leftSide.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      `;
      
      const dragHandle = document.createElement("div");
      dragHandle.innerHTML = "⋮⋮";
      dragHandle.style.cssText = `
        color: var(--text-muted, #999);
        font-size: 14px;
        cursor: move;
        user-select: none;
      `;
      leftSide.appendChild(dragHandle);
      
      const textSpan = document.createElement("span");
      textSpan.textContent = textContent;
      textSpan.style.cssText = `
        font-family: Rubik, sans-serif !important;
        font-size: 15px !important;
        font-weight: 500 !important;
        color: ${isDarkMode ? '#fff' : '#000'} !important;
      `;
      leftSide.appendChild(textSpan);
      
      clone.appendChild(leftSide);
      
      // Add toggle switch on the right (like main spine items)
      const toggle = stringToHTML(
        `<div class="onoffswitch" style="margin-left: auto; flex-shrink: 0;"><input class="onoffswitch-checkbox subpage-menuitem" type="checkbox" id="subpage_${currentMainPage}_${key}"><label for="subpage_${currentMainPage}_${key}" class="onoffswitch-label"></label></div>`,
      ).firstChild as HTMLElement;
      clone.appendChild(toggle);
      
      // Set initial toggle state
      const checkbox = clone.querySelector(`#subpage_${currentMainPage}_${key}`) as HTMLInputElement;
      if (!settingsState.teachSubPageItems) {
        settingsState.teachSubPageItems = {};
      }
      if (!settingsState.teachSubPageItems[currentMainPage]) {
        settingsState.teachSubPageItems[currentMainPage] = {};
      }
      if (settingsState.teachSubPageItems[currentMainPage][key]) {
        checkbox.checked = settingsState.teachSubPageItems[currentMainPage][key].toggle;
      } else {
        checkbox.checked = true;
        settingsState.teachSubPageItems[currentMainPage][key] = { toggle: true };
      }
      
      // Make clickable but prevent navigation when clicking in reorder menu
      // Store original href for later use
      const originalHref = subPage.getAttribute("href");
      if (clone.tagName === "A" && originalHref) {
        clone.setAttribute("href", originalHref);
      }
      
      // Add click handler that prevents navigation only in reorder menu
      clone.addEventListener("click", (e) => {
        // Only prevent if clicking the item itself (not the toggle)
        if (e.target === clone || clone.contains(e.target as Node)) {
          const target = e.target as HTMLElement;
          // Allow toggle clicks
          if ((target instanceof HTMLInputElement && target.type === "checkbox") || target.closest(".onoffswitch")) {
            return;
          }
          // Prevent navigation in reorder menu
          e.preventDefault();
          e.stopPropagation();
        }
      });
      
      clonedSubPages.push(clone);
      subPageContainer.appendChild(clone);
    }
    
    subPageSection.appendChild(subPageContainer);
    
    // Add scrollbar styling for sub-page container
    const subPageStyle = document.createElement("style");
    subPageStyle.textContent = `
      #betterseqta-subpage-reorder-container::-webkit-scrollbar {
        width: 8px;
      }
      #betterseqta-subpage-reorder-container::-webkit-scrollbar-track {
        background: var(--background-secondary, #f5f5f5);
        border-radius: 4px;
      }
      #betterseqta-subpage-reorder-container::-webkit-scrollbar-thumb {
        background: var(--border-primary, #ddd);
        border-radius: 4px;
      }
      #betterseqta-subpage-reorder-container::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted, #999);
      }
    `;
    document.head.appendChild(subPageStyle);
    
    // Add sub-page section to content wrapper (right side)
    contentWrapper.appendChild(subPageSection);
    
    // Add event listeners to sub-page checkboxes
    const subPageCheckboxes = subPageContainer.querySelectorAll(".subpage-menuitem");
    for (const checkbox of Array.from(subPageCheckboxes)) {
      checkbox.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const item = target.closest(".draggable-subpage-item") as HTMLElement;
        if (!item) return;
        
        const key = item.getAttribute("data-subpage-key");
        if (!key || !currentMainPage) return;
        
        if (!settingsState.teachSubPageItems) {
          settingsState.teachSubPageItems = {};
        }
        if (!settingsState.teachSubPageItems[currentMainPage]) {
          settingsState.teachSubPageItems[currentMainPage] = {};
        }
        
        settingsState.teachSubPageItems[currentMainPage][key] = { toggle: target.checked };
        
        // Update visual state
        if (!target.checked) {
          item.style.opacity = "0.5";
          item.style.pointerEvents = "none";
        } else {
          item.style.opacity = "1";
          item.style.pointerEvents = "auto";
        }
        
        // Save sub-page settings immediately
        storeSubPageSettings();
      });
    }
    
    // Initialize Sortable for sub-pages
    try {
      subPageSortable = Sortable.create(subPageContainer, {
        draggable: ".draggable-subpage-item",
        dataIdAttr: "data-subpage-key",
        animation: 150,
        easing: "cubic-bezier(.5,0,.5,1)",
        onEnd: function () {
          if (subPageSortable && currentMainPage) {
            let newOrder = subPageSortable.toArray();
            
            // Fallback: manually extract order from DOM if toArray() returns empty
            if (!newOrder || newOrder.length === 0) {
              const subPageContainer = document.getElementById("betterseqta-subpage-reorder-container");
              if (subPageContainer) {
                newOrder = [];
                const items = subPageContainer.querySelectorAll(".draggable-subpage-item");
                for (const item of Array.from(items)) {
                  const key = item.getAttribute("data-subpage-key");
                  if (key) {
                    newOrder.push(key);
                  }
                }
              }
            }
            
            console.debug("[BetterSEQTA+] Sub-page order changed:", { mainPage: currentMainPage, order: newOrder });
            
            if (newOrder && newOrder.length > 0) {
              if (!settingsState.teachSubPageOrders) {
                settingsState.teachSubPageOrders = {};
              }
              settingsState.teachSubPageOrders[currentMainPage] = newOrder;
              // Explicitly save to ensure persistence
              storeSubPageSettings();
            }
          }
        },
      });
    } catch (err) {
      console.error("[BetterSEQTA+] Error creating sub-page Sortable:", err);
    }
  }
  
  // Insert contentWrapper before buttonContainer
  spineSettings.insertBefore(contentWrapper, buttonContainer);
  
  // Debug: Log container state
  console.debug("[BetterSEQTA+] Reorder container created:", {
    itemsCount: clonedItems.length,
    containerHeight: reorderContainer.offsetHeight,
    containerVisible: reorderContainer.offsetParent !== null,
    firstItem: clonedItems[0]?.textContent
  });
  
  // Initialize Sortable
  let sortable: any = null;
  try {
    sortable = Sortable.create(reorderContainer, {
      draggable: ".draggable-spine-item",
      dataIdAttr: "data-key",
      animation: 150,
      easing: "cubic-bezier(.5,0,.5,1)",
      onEnd: function () {
        saveSpineNewOrder(sortable);
      },
    });
  } catch (err) {
    console.error("[BetterSEQTA+] Error creating Sortable:", err);
  }
  
  function changeDisplayProperty(element: HTMLInputElement) {
    const item = element.closest(".draggable-spine-item") as HTMLElement;
    if (!item) return;
    
    if (!element.checked) {
      item.style.opacity = "0.5";
      item.style.pointerEvents = "none";
    } else {
      item.style.opacity = "1";
      item.style.pointerEvents = "auto";
    }
  }
  
  function storeSpineSettings() {
    const spineItems: { [key: string]: { toggle: boolean } } = {};
    
    for (let i = 0; i < clonedItems.length; i++) {
      const item = clonedItems[i];
      const key = item.getAttribute("data-key");
      if (key) {
        const checkbox = item.querySelector(`#spine_${key}`) as HTMLInputElement;
        spineItems[key] = { toggle: checkbox.checked };
      }
    }
    
    settingsState.teachspineitems = spineItems;
  }
  
  function storeSubPageSettings() {
    if (!currentMainPage || clonedSubPages.length === 0) return;
    
    if (!settingsState.teachSubPageItems) {
      settingsState.teachSubPageItems = {};
    }
    if (!settingsState.teachSubPageItems[currentMainPage]) {
      settingsState.teachSubPageItems[currentMainPage] = {};
    }
    
    for (const item of clonedSubPages) {
      const key = item.getAttribute("data-subpage-key");
      if (key) {
        const checkbox = item.querySelector(`#subpage_${currentMainPage}_${key}`) as HTMLInputElement;
        if (checkbox) {
          settingsState.teachSubPageItems[currentMainPage][key] = { toggle: checkbox.checked };
        }
      }
    }
  }
  
  // Add event listeners to checkboxes
  const checkboxes = reorderContainer.querySelectorAll(".spine-menuitem");
  for (const checkbox of Array.from(checkboxes)) {
    checkbox.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      changeDisplayProperty(target);
      storeSpineSettings();
    });
  }
  
  function closeAll() {
    spineSettings?.remove();
    cover?.remove();
    style?.remove();
    SpineMenuOptionsOpen = false;
    
    // Clean up cloned items
    clonedItems.forEach(item => item.remove());
    
    // Restore logout/help button z-index
    logoutHelpButtons.forEach((btn: Element) => {
      (btn as HTMLElement).style.zIndex = "";
    });
  }
  
  cover.addEventListener("click", closeAll);
  saveButton.addEventListener("click", () => {
    // Apply the new order to actual Spine items
    if (sortable) {
      const newOrder = sortable.toArray();
      ChangeSpineItemPositions(newOrder);
    }
    
    // Apply sub-page order if exists
    if (subPageSortable && currentMainPage) {
      // Get order from Sortable, or manually extract from DOM if toArray() fails
      let newSubPageOrder = subPageSortable.toArray();
      
      // Fallback: manually extract order from DOM if toArray() returns empty
      if (!newSubPageOrder || newSubPageOrder.length === 0) {
        const subPageContainer = document.getElementById("betterseqta-subpage-reorder-container");
        if (subPageContainer) {
          newSubPageOrder = [];
          const items = subPageContainer.querySelectorAll(".draggable-subpage-item");
          for (const item of Array.from(items)) {
            const key = item.getAttribute("data-subpage-key");
            if (key) {
              newSubPageOrder.push(key);
            }
          }
        }
      }
      
      console.debug("[BetterSEQTA+] Saving sub-page order on Save:", { mainPage: currentMainPage, order: newSubPageOrder });
      
      if (newSubPageOrder && newSubPageOrder.length > 0) {
        if (!settingsState.teachSubPageOrders) {
          settingsState.teachSubPageOrders = {};
        }
        settingsState.teachSubPageOrders[currentMainPage] = newSubPageOrder;
        applySubPageOrder(currentMainPage, newSubPageOrder);
      }
    }
    
    storeSpineSettings();
    storeSubPageSettings();
    closeAll();
  });
  
  defaultButton.addEventListener("click", function () {
    const defaultOrder = settingsState.defaultteachspineorder;
    if (defaultOrder && defaultOrder.length > 0) {
      settingsState.teachspineorder = [...defaultOrder];
      
      // Reset all toggles to true
      const checkboxes = reorderContainer.querySelectorAll(".spine-menuitem");
      for (const checkbox of Array.from(checkboxes)) {
        (checkbox as HTMLInputElement).checked = true;
        changeDisplayProperty(checkbox as HTMLInputElement);
      }
      
      // Reorder the cloned items
      if (sortable) {
        // Sort clonedItems array based on defaultOrder
        clonedItems.sort((a, b) => {
          const keyA = a.getAttribute("data-key") || "";
          const keyB = b.getAttribute("data-key") || "";
          const indexA = defaultOrder.indexOf(keyA);
          const indexB = defaultOrder.indexOf(keyB);
          return indexA - indexB;
        });
        
        // Rebuild DOM
        reorderContainer.innerHTML = "";
        clonedItems.forEach(item => reorderContainer.appendChild(item));
        
        // Reinitialize Sortable
        sortable.destroy();
        sortable = Sortable.create(reorderContainer, {
          draggable: ".draggable-spine-item",
          dataIdAttr: "data-key",
          animation: 150,
          easing: "cubic-bezier(.5,0,.5,1)",
          onEnd: function () {
            saveSpineNewOrder(sortable);
          },
        });
        
        // Reattach event listeners
        const newCheckboxes = reorderContainer.querySelectorAll(".spine-menuitem");
        for (const checkbox of Array.from(newCheckboxes)) {
          checkbox.addEventListener("change", (e) => {
            const target = e.target as HTMLInputElement;
            changeDisplayProperty(target);
            storeSpineSettings();
          });
        }
      }
      
      // Reset sub-pages: remove storage item and use default order
      if (currentMainPage && subPageSortable) {
        // Remove the storage items for this page
        if (settingsState.teachSubPageOrders) {
          delete settingsState.teachSubPageOrders[currentMainPage];
        }
        if (settingsState.teachSubPageItems) {
          delete settingsState.teachSubPageItems[currentMainPage];
        }
        
        // Get the default order (should already be stored)
        const defaultSubPageOrder = settingsState.defaultTeachSubPageOrders?.[currentMainPage];
        
        if (defaultSubPageOrder && defaultSubPageOrder.length > 0) {
          // Reset all sub-page toggles to true
          const subPageCheckboxes = document.querySelectorAll("#betterseqta-subpage-reorder-container .subpage-menuitem");
          for (const checkbox of Array.from(subPageCheckboxes)) {
            (checkbox as HTMLInputElement).checked = true;
            const item = checkbox.closest(".draggable-subpage-item") as HTMLElement;
            if (item) {
              item.style.opacity = "1";
              item.style.pointerEvents = "auto";
            }
          }
          
          // Update the cloned items to match default order
          clonedSubPages.sort((a, b) => {
            const keyA = a.getAttribute("data-subpage-key") || "";
            const keyB = b.getAttribute("data-subpage-key") || "";
            const indexA = defaultSubPageOrder.indexOf(keyA);
            const indexB = defaultSubPageOrder.indexOf(keyB);
            return indexA - indexB;
          });
          
          // Rebuild sub-page DOM
          const subPageContainer = document.getElementById("betterseqta-subpage-reorder-container");
          if (subPageContainer) {
            subPageContainer.innerHTML = "";
            clonedSubPages.forEach(item => {
              subPageContainer.appendChild(item);
              // Re-add click prevention (but allow toggle clicks)
              item.addEventListener("click", (e) => {
                const target = e.target as HTMLElement;
                // Allow toggle clicks
                if ((target instanceof HTMLInputElement && target.type === "checkbox") || target.closest(".onoffswitch")) {
                  return;
                }
                // Prevent navigation in reorder menu
                e.preventDefault();
                e.stopPropagation();
              });
              
              // Re-add toggle event listener
              const checkbox = item.querySelector(`#subpage_${currentMainPage}_${item.getAttribute("data-subpage-key")}`) as HTMLInputElement;
              if (checkbox) {
                checkbox.addEventListener("change", (e) => {
                  const target = e.target as HTMLInputElement;
                  const item = target.closest(".draggable-subpage-item") as HTMLElement;
                  if (!item) return;
                  
                  const key = item.getAttribute("data-subpage-key");
                  if (!key || !currentMainPage) return;
                  
                  if (!settingsState.teachSubPageItems) {
                    settingsState.teachSubPageItems = {};
                  }
                  if (!settingsState.teachSubPageItems[currentMainPage]) {
                    settingsState.teachSubPageItems[currentMainPage] = {};
                  }
                  
                  settingsState.teachSubPageItems[currentMainPage][key] = { toggle: target.checked };
                  
                  // Update visual state
                  if (!target.checked) {
                    item.style.opacity = "0.5";
                    item.style.pointerEvents = "none";
                  } else {
                    item.style.opacity = "1";
                    item.style.pointerEvents = "auto";
                  }
                  
                  // Save sub-page settings immediately
                  storeSubPageSettings();
                });
              }
            });
            
            // Reinitialize sub-page Sortable
            subPageSortable.destroy();
            subPageSortable = Sortable.create(subPageContainer, {
              draggable: ".draggable-subpage-item",
              dataIdAttr: "data-subpage-key",
              animation: 150,
              easing: "cubic-bezier(.5,0,.5,1)",
              onEnd: function () {
                if (subPageSortable && currentMainPage) {
                  const newOrder = subPageSortable.toArray();
                  if (!settingsState.teachSubPageOrders) {
                    settingsState.teachSubPageOrders = {};
                  }
                  settingsState.teachSubPageOrders[currentMainPage] = newOrder;
                }
              },
            });
          }
        }
      }
      
      storeSpineSettings();
      saveSpineNewOrder(sortable);
    }
  });
}

function saveSpineNewOrder(sortable: any) {
  if (!sortable) return;
  const order = sortable.toArray();
  settingsState.teachspineorder = order;
}

/**
 * Applies the saved sub-page order for a specific main page
 */
function applySubPageOrder(mainPage: string, order: string[]): void {
  if (!order || order.length === 0) return;
  
  const subPages = getSubPages();
  if (subPages.length === 0) return;
  
  // Create a map of sub-pages by key
  const subPagesMap = new Map<string, HTMLElement>();
  for (const subPage of subPages) {
    const key = getSubPageKey(subPage);
    subPagesMap.set(key, subPage);
  }
  
  // Find the parent container (could be tablist, nav, etc.)
  const parentContainer = subPages[0]?.parentElement;
  if (!parentContainer) return;
  
  // Reorder based on saved order
  const orderedSubPages: HTMLElement[] = [];
  for (const key of order) {
    const subPage = subPagesMap.get(key);
    if (subPage && parentContainer.contains(subPage)) {
      orderedSubPages.push(subPage);
    }
  }
  
  // Add any sub-pages not in the order (new items)
  for (const subPage of subPages) {
    const key = getSubPageKey(subPage);
    if (!order.includes(key) && parentContainer.contains(subPage)) {
      orderedSubPages.push(subPage);
    }
  }
  
  // Apply visibility based on teachSubPageItems
  for (const subPage of orderedSubPages) {
    const key = getSubPageKey(subPage);
    const subPageItem = settingsState.teachSubPageItems?.[mainPage]?.[key];
    if (subPageItem && !subPageItem.toggle) {
      subPage.style.display = "none";
    } else {
      subPage.style.display = "";
    }
  }
  
  // Apply the order to DOM
  // Remove all sub-pages first
  orderedSubPages.forEach(subPage => {
    if (subPage.parentElement) {
      subPage.parentElement.removeChild(subPage);
    }
  });
  
  // Re-append in order (only visible ones)
  orderedSubPages.forEach(subPage => {
    if (subPage.style.display !== "none") {
      parentContainer.appendChild(subPage);
    }
  });
  
  // Add reorder button at the bottom of sub-pages if it doesn't exist
  addSubPageReorderButton(mainPage, parentContainer);
  
  console.debug(`[BetterSEQTA+] Applied sub-page order for ${mainPage}:`, order);
}

/**
 * Adds a reorder button at the bottom of sub-pages list
 */
function addSubPageReorderButton(mainPage: string, parentContainer: HTMLElement): void {
  // Check if button already exists
  const existingButton = document.getElementById(`betterseqta-subpage-reorder-btn-${mainPage}`);
  if (existingButton) {
    return;
  }
  
  // Check if dark mode
  const isDarkMode = document.documentElement.classList.contains("dark") || 
                     window.getComputedStyle(document.body).backgroundColor === "rgb(0, 0, 0)" ||
                     window.getComputedStyle(document.body).backgroundColor === "rgba(0, 0, 0, 0)";
  
  // Create reorder button
  const reorderButton = document.createElement("button");
  reorderButton.id = `betterseqta-subpage-reorder-btn-${mainPage}`;
  reorderButton.setAttribute("data-betterseqta", "true");
  reorderButton.textContent = "Reorder Pages";
  reorderButton.style.cssText = `
    margin-top: 8px;
    padding: 6px 12px;
    background: transparent;
    color: ${isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)'};
    border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'};
    border-radius: 6px;
    cursor: pointer;
    font-family: Rubik, sans-serif;
    font-size: 12px;
    font-weight: 400;
    transition: all 0.2s ease;
    opacity: 0.7;
  `;
  
  // Add hover effect
  reorderButton.addEventListener("mouseenter", () => {
    reorderButton.style.opacity = "1";
    reorderButton.style.color = isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.7)';
    reorderButton.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)';
    reorderButton.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
  });
  reorderButton.addEventListener("mouseleave", () => {
    reorderButton.style.opacity = "0.7";
    reorderButton.style.color = isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)';
    reorderButton.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
    reorderButton.style.background = "transparent";
  });
  
  // Open reorder modal on click
  reorderButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    OpenMenuOptionsTeach();
  });
  
  // Append to parent container
  parentContainer.appendChild(reorderButton);
}

/**
 * Applies saved sub-page orders when pages load
 * Should be called when navigating to a page
 */
export function applySavedSubPageOrders(): void {
  const mainPage = getCurrentMainPage();
  if (!mainPage) return;
  
  // Check if sub-pages exist
  const subPages = getSubPages();
  if (subPages.length === 0) return;
  
  // Find parent container
  const parentContainer = subPages[0]?.parentElement;
  if (!parentContainer) return;
  
  // Apply saved order if exists
  if (settingsState.teachSubPageOrders) {
    const order = settingsState.teachSubPageOrders[mainPage];
    if (order && order.length > 0) {
      // Wait a bit for page to render
      setTimeout(() => {
        applySubPageOrder(mainPage, order);
      }, 300);
      return;
    }
  }
  
  // Even if no saved order, add the reorder button
  setTimeout(() => {
    addSubPageReorderButton(mainPage, parentContainer);
  }, 300);
}

/**
 * Applies the saved order to the actual Spine navigation
 */
export function ChangeSpineItemPositions(spineorder: SettingsState["teachspineorder"]) {
  if (!spineorder || spineorder.length === 0) return;
  
  const navContainer = findSpineNavContainer();
  if (!navContainer) return;
  
  const spine = document.querySelector("[class*='Spine__Spine']");
  if (!spine) return;
  
  // Get all items from the container (including BetterSEQTA+ items)
  const allItems = Array.from(navContainer.children) as HTMLElement[];
  
  // Separate items into categories
  const regularItems: HTMLElement[] = [];
  const betterSEQTAItems: HTMLElement[] = [];
  const spacerItems: HTMLElement[] = [];
  const logoutHelpItems: HTMLElement[] = [];
  
  for (const item of allItems) {
    // Check if it's a BetterSEQTA+ item
    if (item.dataset.betterseqta === "true") {
      betterSEQTAItems.push(item);
    }
    // Check if it's a spacer
    else if (item.classList.toString().includes("Spine__spacer")) {
      spacerItems.push(item);
    }
    // Check if it's logout or help
    else if (item.classList.toString().includes("Spine__logout") || 
             item.classList.toString().includes("Spine__help")) {
      logoutHelpItems.push(item);
    }
    // Regular navigation item
    else {
      regularItems.push(item);
    }
  }
  
  // Create a map of regular items by key
  const itemsMap = new Map<string, HTMLElement>();
  for (const item of regularItems) {
    const key = getSpineItemKey(item);
    itemsMap.set(key, item);
  }
  
  // Reorder regular items based on spineorder
  const orderedRegularItems: HTMLElement[] = [];
  for (const key of spineorder) {
    const item = itemsMap.get(key);
    if (item) {
      orderedRegularItems.push(item);
    }
  }
  
  // Add any regular items not in the order (new items)
  for (const item of regularItems) {
    const key = getSpineItemKey(item);
    if (!spineorder.includes(key)) {
      orderedRegularItems.push(item);
    }
  }
  
  // Apply visibility based on teachspineitems
  for (const item of orderedRegularItems) {
    const key = getSpineItemKey(item);
    const spineItem = settingsState.teachspineitems?.[key];
    if (spineItem && !spineItem.toggle) {
      item.style.display = "none";
    } else {
      item.style.display = "";
    }
  }
  
  // Build final order: BetterSEQTA+ items -> regular items -> spacers -> logout/help
  const finalOrder: HTMLElement[] = [
    ...betterSEQTAItems,
    ...orderedRegularItems.filter(item => item.style.display !== "none"),
    ...spacerItems,
    ...logoutHelpItems
  ];
  
  // Reorder DOM elements
  // Clear container and append in final order
  finalOrder.forEach(item => {
    navContainer.appendChild(item);
  });
  
  // Add CSS to center regular navigation items horizontally and position others correctly
  const styleId = "betterseqta-spine-center-items";
  let centerStyle = document.getElementById(styleId);
  if (!centerStyle) {
    centerStyle = document.createElement("style");
    centerStyle.id = styleId;
    document.head.appendChild(centerStyle);
  }
  
  // Get the visible regular items
  const visibleRegularItems = orderedRegularItems.filter(item => item.style.display !== "none");
  
  // Add a class to regular items for styling
  visibleRegularItems.forEach(item => {
    item.classList.add("betterseqta-spine-regular-item");
  });
  
  // Add classes to BetterSEQTA+ items if not already present
  betterSEQTAItems.forEach(item => {
    if (!item.classList.contains("betterseqta-spine-top-item")) {
      item.classList.add("betterseqta-spine-top-item");
    }
  });
  
  // Add classes to logout/help items
  logoutHelpItems.forEach(item => {
    if (!item.classList.contains("betterseqta-spine-bottom-item")) {
      item.classList.add("betterseqta-spine-bottom-item");
    }
  });
  
  centerStyle.textContent = `
    [class*="Spine__Spine"] {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    }
    
    /* BetterSEQTA+ items at top - center horizontally like regular items */
    [class*="Spine__Spine"] .betterseqta-spine-top-item,
    [class*="Spine__Spine"] [data-betterseqta="true"] {
      align-self: center !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
    
    /* Regular navigation items in middle - center horizontally */
    [class*="Spine__Spine"] .betterseqta-spine-regular-item {
      align-self: center !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
    
    /* Logout and help at bottom - center horizontally and push to bottom */
    [class*="Spine__Spine"] .betterseqta-spine-bottom-item,
    [class*="Spine__Spine"] [class*="Spine__logout"],
    [class*="Spine__Spine"] [class*="Spine__help"] {
      align-self: center !important;
      margin-left: auto !important;
      margin-right: auto !important;
      margin-top: auto !important;
    }
    
    /* Spacers should expand to fill space */
    [class*="Spine__Spine"] [class*="Spine__spacer"] {
      flex: 1 !important;
      align-self: stretch !important;
    }
  `;
}
