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
  
  spineSettings.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${isDarkMode ? 'rgb(39, 39, 42)' : '#fff'} !important;
    border-radius: 16px;
    padding: 32px;
    z-index: 100001 !important;
    min-width: 600px;
    width: 700px;
    max-width: 90vw;
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
  
  // Create a temporary container for reordering
  const reorderContainer = document.createElement("div");
  reorderContainer.id = "betterseqta-spine-reorder-container";
  reorderContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    margin: 0 0 24px 0;
    padding-right: 12px;
    min-height: 350px;
    max-height: calc(85vh - 200px);
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
  
  // Insert reorderContainer before buttonContainer
  spineSettings.insertBefore(reorderContainer, buttonContainer);
  
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
    storeSpineSettings();
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
