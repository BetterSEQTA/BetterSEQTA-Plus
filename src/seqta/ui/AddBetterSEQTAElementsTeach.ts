/**
 * Teach-specific BetterSEQTA+ element additions
 * This file contains Teach platform-specific implementations of features
 * that were originally designed for SEQTA Learn
 */

import { delay } from "@/seqta/utils/delay";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { isSEQTATeachSync } from "@/seqta/utils/platformDetection";
import { appendBackgroundToUI } from "./ImageBackgrounds";
import { addExtensionSettings } from "@/seqta/utils/Adders/AddExtensionSettings";
import { setupSettingsButton } from "@/seqta/utils/setupSettingsButton";
import { loadTeachHomePage } from "@/seqta/utils/Loaders/LoadTeachHomePage";
import { updateAllColors } from "./colors/Manager";
import { OpenWhatsNewPopupTeach } from "@/seqta/utils/Openers/OpenWhatsNewPopup";
import { ChangeSpineItemPositions } from "@/seqta/utils/Openers/OpenMenuOptionsTeach";
import { initializeSIPEnhancements } from "@/seqta/utils/SIPEnhancements";

// Track if we've set up the observer to prevent multiple observers
let spineObserverSetup = false;
let injectionInProgress = false;

/**
 * Adds Teach-specific BetterSEQTA+ elements to the page
 * This is the Teach equivalent of AddBetterSEQTAElements for Learn
 */
export async function AddBetterSEQTAElementsTeach() {
  console.log("[BetterSEQTA+] AddBetterSEQTAElementsTeach called!");
  // Prevent concurrent injections
  if (injectionInProgress) {
    console.debug("[BetterSEQTA+] Injection already in progress, skipping");
    return;
  }
  
  injectionInProgress = true;
  console.log("[BetterSEQTA+] Starting injection process...");
  
  try {
    // Always create settings button and popup, regardless of onoff state
    addExtensionSettings();
    await createTeachSettingsButton();
    
    // Wait a bit for the button to be inserted before setting up event listener
    await delay(50);
    setupSettingsButton();

    if (settingsState.onoff) {
      if (settingsState.DarkMode) {
        document.documentElement.classList.add("dark");
      }

      // Create Teach-specific navigation elements
      await createTeachHomeButton();

      try {
        await Promise.all([
          appendBackgroundToUI(),
          // Teach-specific initialization
          initializeTeachFeatures(),
        ]);
      } catch (error) {
        console.error("[BetterSEQTA+] Error initializing Teach UI elements:", error);
      }

      // Setup Teach-specific event listeners
      setupTeachEventListeners();
      
      await addDarkLightToggleTeach();
    }
    
    // Set up MutationObserver to watch for Spine changes (React navigation)
    if (!spineObserverSetup) {
      setupSpineObserver();
      spineObserverSetup = true;
    }
    
    // Set up navigation listener for Teach's React Router
    setupNavigationListener();
  } finally {
    injectionInProgress = false;
  }
}

/**
 * Sets up a MutationObserver to watch for Spine navigation changes
 * This ensures elements are re-injected when React replaces the DOM
 */
function setupSpineObserver() {
  const spine = document.querySelector("[class*='Spine__Spine']");
  if (!spine) {
    // Retry after a delay if Spine isn't ready yet
    setTimeout(() => setupSpineObserver(), 500);
    return;
  }
  
  const observer = new MutationObserver(() => {
    // Check if BetterSEQTA elements were removed
    const settingsButton = document.getElementById("AddedSettings");
    const homeButton = document.getElementById("betterseqta-teach-homebutton");
    const darkToggle = document.getElementById("LightDarkModeButton"); // Use correct ID
    
    // If any element is missing, re-inject (but only if not already in progress)
    if (!injectionInProgress && (!settingsButton || !homeButton || !darkToggle)) {
      console.debug("[BetterSEQTA+] Spine changed, re-injecting BetterSEQTA+ elements");
      // Use a small delay to avoid rapid re-injections
      setTimeout(() => {
        AddBetterSEQTAElementsTeach().catch(err => {
          console.error("[BetterSEQTA+] Error re-injecting elements:", err);
        });
      }, 100);
    }
  });
  
  // Observe the Spine and its children
  observer.observe(spine, {
    childList: true,
    subtree: true,
    attributes: false
  });
  
  console.debug("[BetterSEQTA+] Spine observer setup complete");
}

/**
 * Sets up a listener for Teach's React Router navigation
 */
function setupNavigationListener() {
  // Listen for popstate events (back/forward navigation)
  window.addEventListener("popstate", () => {
    console.debug("[BetterSEQTA+] Navigation detected (popstate), re-injecting elements");
    setTimeout(() => {
      AddBetterSEQTAElementsTeach().catch(err => {
        console.error("[BetterSEQTA+] Error re-injecting on navigation:", err);
      });
    }, 300);
  });
  
  // Listen for pushstate/replacestate (programmatic navigation)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    console.debug("[BetterSEQTA+] Navigation detected (pushState), re-injecting elements");
    setTimeout(() => {
      AddBetterSEQTAElementsTeach().catch(err => {
        console.error("[BetterSEQTA+] Error re-injecting on pushState:", err);
      });
    }, 300);
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    console.debug("[BetterSEQTA+] Navigation detected (replaceState), re-injecting elements");
    setTimeout(() => {
      AddBetterSEQTAElementsTeach().catch(err => {
        console.error("[BetterSEQTA+] Error re-injecting on replaceState:", err);
      });
    }, 300);
  };
  
  console.debug("[BetterSEQTA+] Navigation listener setup complete");
}

/**
 * Helper function to find the Spine navigation container using JavaScript inspection
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
        if (links.length > 0) {
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
 * Creates the home button for Teach platform
 */
async function createTeachHomeButton() {
  // Check if home button already exists and is still in the DOM
  const existingButton = document.getElementById("betterseqta-teach-homebutton");
  if (existingButton && document.body.contains(existingButton)) {
    return; // Button already exists and is attached
  }
  
  // If button exists but isn't attached, remove the reference
  if (existingButton) {
    existingButton.remove();
  }

  // Wait for the Spine navbar to be available
  let navContainer: HTMLElement | null = null;
  let attempts = 0;
  const maxAttempts = 50; // Wait up to 5 seconds

  while (!navContainer && attempts < maxAttempts) {
    await delay(100);
    navContainer = findSpineNavContainer();
    attempts++;
  }

  if (!navContainer) {
    console.error("[BetterSEQTA+] Could not find Spine navigation container for Teach platform");
    // Log debug info
    const spine = document.querySelector("[class*='Spine__Spine']");
    if (spine) {
      console.debug("[BetterSEQTA+] Spine element found but nav container not found. Spine structure:", {
        tagName: spine.tagName,
        className: spine.className,
        children: Array.from(spine.children).map(c => ({
          tagName: c.tagName,
          className: c.className,
          children: c.children.length
        }))
      });
    }
    return;
  }

  // Create home button matching Teach's navigation structure (icon-only)
  const homeButton = stringToHTML(
    /* html */`<a href="/betterseqta-home" id="betterseqta-teach-homebutton" data-betterseqta="true" style="display: flex; align-items: center; justify-content: center; padding: 12px; text-decoration: none; color: inherit; cursor: pointer;">
      <svg style="width: 24px; height: 24px;" viewBox="0 0 495.398 495.398" fill="currentColor">
        <path d="M487.083,225.514l-75.08-75.08V63.704c0-15.682-12.708-28.391-28.413-28.391c-15.669,0-28.377,12.709-28.377,28.391 v29.941L299.31,37.74c-27.639-27.624-75.694-27.575-103.27,0.05L8.312,225.514c-11.082,11.104-11.082,29.071,0,40.158 c11.087,11.101,29.089,11.101,40.172,0l187.71-187.729c6.115-6.083,16.893-6.083,22.976-0.018l187.742,187.747 c5.567,5.551,12.825,8.312,20.081,8.312c7.271,0,14.541-2.764,20.091-8.312C498.17,254.586,498.17,236.619,487.083,225.514z"></path>
        <path d="M257.561,131.836c-5.454-5.451-14.285-5.451-19.723,0L72.712,296.913c-2.607,2.606-4.085,6.164-4.085,9.877v120.401 c0,28.253,22.908,51.16,51.16,51.16h81.754v-126.61h92.299v126.61h81.755c28.251,0,51.159-22.907,51.159-51.159V306.79 c0-3.713-1.465-7.271-4.085-9.877L257.561,131.836z"></path>
      </svg>
    </a>`
  );

  if (homeButton.firstChild) {
    // Insert at the beginning of the navigation container
    navContainer.insertBefore(homeButton.firstChild, navContainer.firstChild);
    console.info("[BetterSEQTA+] Successfully injected home button into Teach Spine at:", navContainer.className);
  }
}

/**
 * Creates the settings button for Teach platform - injects into Spine
 */
async function createTeachSettingsButton() {
  // Check if button already exists and is still in the DOM
  const existingButton = document.getElementById("AddedSettings");
  if (existingButton && document.body.contains(existingButton)) {
    return; // Button already exists and is attached
  }
  
  // If button exists but isn't attached, remove the reference
  if (existingButton) {
    existingButton.remove();
  }

  // Wait for the Spine navigation container to be available
  let navContainer: HTMLElement | null = null;
  let attempts = 0;
  const maxAttempts = 50; // Wait up to 5 seconds

  while (!navContainer && attempts < maxAttempts) {
    await delay(100);
    navContainer = findSpineNavContainer();
    attempts++;
  }

  if (!navContainer) {
    console.error("[BetterSEQTA+] Could not find Spine navigation container for Teach platform");
    return;
  }

  // Create settings button matching Teach's Spine navigation structure (icon-only)
  let SettingsButton = stringToHTML(/* html */ `
    <a href="#" id="AddedSettings" data-betterseqta="true" class="tooltip" style="display: flex; align-items: center; justify-content: center; padding: 12px; text-decoration: none; color: inherit; cursor: pointer; border-radius: 8px; margin: 4px; transition: all 0.2s ease;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <g><g><path d="M23.182,6.923c-.29,0-3.662,2.122-4.142,2.4l-2.8-1.555V4.511l4.257-2.456a.518.518,0,0,0,.233-.408.479.479,0,0,0-.233-.407,6.511,6.511,0,1,0-3.327,12.107,6.582,6.582,0,0,0,6.148-4.374,5.228,5.228,0,0,0,.333-1.542A.461.461,0,0,0,23.182,6.923Z"></path><path d="M9.73,10.418,7.376,12.883c-.01.01-.021.016-.03.025L1.158,19.1a2.682,2.682,0,1,0,3.793,3.793l4.583-4.582,0,0,4.1-4.005-.037-.037A9.094,9.094,0,0,1,9.73,10.418ZM3.053,21.888A.894.894,0,1,1,3.946,21,.893.893,0,0,1,3.053,21.888Z"></path></g></g>
      </svg>
      ${settingsState.onoff ? '<div class="tooltiptext topmenutooltip">BetterSEQTA+ Settings</div>' : ""}
    </a>
  `);
  
  if (!SettingsButton.firstChild) {
    console.error("[BetterSEQTA+] Failed to create SettingsButton element");
    return;
  }

  // Insert settings button after the home button (or at the beginning if home button doesn't exist)
  const homeButton = document.getElementById("betterseqta-teach-homebutton");
  if (homeButton && homeButton.parentElement === navContainer) {
    // Insert after home button
    if (homeButton.nextSibling) {
      navContainer.insertBefore(SettingsButton.firstChild, homeButton.nextSibling);
    } else {
      navContainer.appendChild(SettingsButton.firstChild);
    }
  } else {
    // Insert at the beginning if no home button
    navContainer.insertBefore(SettingsButton.firstChild, navContainer.firstChild);
  }
  
  console.info("[BetterSEQTA+] Successfully injected settings button into Teach Spine at:", navContainer.className);
}

/**
 * Initialize Teach-specific features
 */
async function initializeTeachFeatures() {
  // Check for Spine elements and show changelog if visible
  checkAndShowChangelog();
  
  // Apply saved spine order if available
  if (settingsState.teachspineorder && settingsState.teachspineorder.length > 0) {
    // Wait a bit for Spine to be fully rendered
    await delay(500);
    try {
      ChangeSpineItemPositions(settingsState.teachspineorder);
    } catch (error) {
      console.error("[BetterSEQTA+] Error applying spine order:", error);
    }
  }
  // Initialize SIP enhancements
  try {
    await initializeSIPEnhancements();
  } catch (error) {
    console.error("[BetterSEQTA+] Error initializing SIP enhancements:", error);
  }
  
  // Add Teach-specific features here
  // For example: Teach-specific shortcuts, Teach-specific UI enhancements, etc.
  console.debug("[BetterSEQTA+] Initializing Teach-specific features");
}

/**
 * Checks for Spine and tour-spine elements and shows changelog when visible
 * Only shows if justupdated flag is set (same as Learn)
 */
function checkAndShowChangelog() {
  // Only run on Teach platform
  if (!isSEQTATeachSync()) {
    console.debug("[BetterSEQTA+] Not on Teach platform, skipping changelog check");
    return;
  }

  // Only show if extension was just updated (same logic as Learn)
  if (!settingsState.justupdated) {
    return;
  }

  // Check if popup is already open in the DOM
  const existingPopup = document.getElementById("whatsnewbk");
  if (existingPopup) {
    console.debug("[BetterSEQTA+] Changelog popup already exists in DOM, skipping");
    return;
  }

  // Check for Spine__Spine___zYUJ6 and tour-spine elements
  const spine = document.querySelector("[class*='Spine__Spine___zYUJ6']");
  const tourSpine = document.querySelector(".tour-spine");

  if (spine && tourSpine) {
    // Double-check popup doesn't exist before showing
    if (document.getElementById("whatsnewbk")) {
      console.debug("[BetterSEQTA+] Popup appeared between checks, skipping");
      return;
    }

    // Both elements are visible, show changelog
    console.debug("[BetterSEQTA+] Spine and tour-spine elements detected, showing changelog");
    OpenWhatsNewPopupTeach();
  }
}

/**
 * Setup Teach-specific event listeners
 */
function setupTeachEventListeners() {
  const homebutton = document.getElementById("betterseqta-teach-homebutton");

  homebutton?.addEventListener("click", function (e) {
    e.preventDefault();
    // Navigate to welcome page (keep valid route) but show BetterSEQTA+ homepage content
    const currentPath = window.location.pathname;
    if (currentPath !== '/welcome' && !currentPath.endsWith('/welcome')) {
      // Use pushState to change URL to /welcome (valid route) without reloading
      window.history.pushState({}, '', '/welcome');
      // Trigger popstate event so route listener picks it up
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    // Load homepage (will check if already loaded)
    loadTeachHomePage();
  });
  
  // Settings button click handler is set up by setupSettingsButton()
  // Just need to prevent default navigation for anchor tag
  const settingsButton = document.getElementById("AddedSettings");
  if (settingsButton && settingsButton.tagName === "A") {
    settingsButton.addEventListener("click", function (e) {
      e.preventDefault();
    });
  }
}

/**
 * Get light/dark mode toggle string
 */
function GetLightDarkModeString() {
  if (settingsState.DarkMode) {
    return "Switch to light theme";
  } else {
    return "Switch to dark theme";
  }
}

/**
 * Add dark/light mode toggle button for Teach - injects into Spine
 */
async function addDarkLightToggleTeach() {
  // Check if dark toggle already exists and is still in the DOM
  // Use the correct ID that matches what we create below
  const existingToggle = document.getElementById("LightDarkModeButton");
  if (existingToggle && document.body.contains(existingToggle)) {
    console.debug("[BetterSEQTA+] Dark/light toggle already exists, skipping creation");
    return; // Toggle already exists and is attached
  }
  
  // If toggle exists but isn't attached, remove the reference
  if (existingToggle) {
    existingToggle.remove();
  }
  
  const tooltipString = GetLightDarkModeString();
  const SUN_ICON_SVG = /* html */ `<defs><clipPath id="__lottie_element_80"><rect width="24" height="24" x="0" y="0"></rect></clipPath></defs><g clip-path="url(#__lottie_element_80)"><g style="display: block;" transform="matrix(1,0,0,1,12,12)" opacity="1"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill-opacity="1" d=" M0,-4 C-2.2100000381469727,-4 -4,-2.2100000381469727 -4,0 C-4,2.2100000381469727 -2.2100000381469727,4 0,4 C2.2100000381469727,4 4,2.2100000381469727 4,0 C4,-2.2100000381469727 2.2100000381469727,-4 0,-4z"></path></g></g><g style="display: block;" transform="matrix(1,0,0,1,12,12)" opacity="1"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill-opacity="1" d=" M0,6 C-3.309999942779541,6 -6,3.309999942779541 -6,0 C-6,-3.309999942779541 -3.309999942779541,-6 0,-6 C3.309999942779541,-6 6,-3.309999942779541 6,0 C6,3.309999942779541 3.309999942779541,6 0,6z M8,-3.309999942779541 C8,-3.309999942779541 8,-8 8,-8 C8,-8 3.309999942779541,-8 3.309999942779541,-8 C3.309999942779541,-8 0,-11.3100004196167 0,-11.3100004196167 C0,-11.3100004196167 -3.309999942779541,-8 -3.309999942779541,-8 C-3.309999942779541,-8 -8,-8 -8,-8 C-8,-8 -8,-3.309999942779541 -8,-3.309999942779541 C-8,-3.309999942779541 -11.3100004196167,0 -11.3100004196167,0 C-11.3100004196167,0 -8,3.309999942779541 -8,3.309999942779541 C-8,3.309999942779541 -8,8 -8,8 C-8,8 -3.309999942779541,8 -3.309999942779541,8 C-3.309999942779541,8 0,11.3100004196167 0,11.3100004196167 C0,11.3100004196167 3.309999942779541,8 3.309999942779541,8 C3.309999942779541,8 8,8 8,8 C8,8 8,3.309999942779541 8,3.309999942779541 C8,3.309999942779541 11.3100004196167,0 11.3100004196167,0 C11.3100004196167,0 8,-3.309999942779541 8,-3.309999942779541z"></path></g></g></g>`;
  const MOON_ICON_SVG = /* html */ `<defs><clipPath id="__lottie_element_263"><rect width="24" height="24" x="0" y="0"></rect></clipPath></defs><g clip-path="url(#__lottie_element_263)"><g style="display: block;" transform="matrix(1.5,0,0,1.5,7,12)" opacity="1"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill-opacity="1" d=" M0,-4 C-2.2100000381469727,-4 -1.2920000553131104,-2.2100000381469727 -1.2920000553131104,0 C-1.2920000553131104,2.2100000381469727 -2.2100000381469727,4 0,4 C2.2100000381469727,4 4,2.2100000381469727 4,0 C4,-2.2100000381469727 2.2100000381469727,-4 0,-4z"></path></g></g><g style="display: block;" transform="matrix(-1,0,0,-1,12,12)" opacity="1"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill-opacity="1" d=" M0,6 C-3.309999942779541,6 -6,3.309999942779541 -6,0 C-6,-3.309999942779541 -3.309999942779541,-6 0,-6 C3.309999942779541,-6 6,-3.309999942779541 6,0 C6,3.309999942779541 3.309999942779541,6 0,6z M8,-3.309999942779541 C8,-3.309999942779541 8,-8 8,-8 C8,-8 3.309999942779541,-8 3.309999942779541,-8 C3.309999942779541,-8 0,-11.3100004196167 0,-11.3100004196167 C0,-11.3100004196167 -3.309999942779541,-8 -3.309999942779541,-8 C-3.309999942779541,-8 -8,-8 -8,-8 C-8,-8 -8,-3.309999942779541 -8,-3.309999942779541 C-8,-3.309999942779541 -11.3100004196167,0 -11.3100004196167,0 C-11.3100004196167,0 -8,3.309999942779541 -8,3.309999942779541 C-8,3.309999942779541 -8,8 -8,8 C-8,8 -3.309999942779541,8 -3.309999942779541,8 C-3.309999942779541,8 0,11.3100004196167 0,11.3100004196167 C0,11.3100004196167 3.309999942779541,8 3.309999942779541,8 C3.309999942779541,8 8,8 8,8 C8,8 8,3.309999942779541 8,3.309999942779541 C8,3.309999942779541 11.3100004196167,0 11.3100004196167,0 C11.3100004196167,0 8,-3.309999942779541 8,-3.309999942779541z"></path></g></g></g>`;
  
  const initialSvgContent = settingsState.DarkMode ? SUN_ICON_SVG : MOON_ICON_SVG;

  // Wait for the Spine navigation container to be available
  let navContainer: HTMLElement | null = null;
  let attempts = 0;
  const maxAttempts = 50; // Wait up to 5 seconds

  while (!navContainer && attempts < maxAttempts) {
    await delay(100);
    navContainer = findSpineNavContainer();
    attempts++;
  }

  if (!navContainer) {
    console.error("[BetterSEQTA+] Could not find Spine navigation container for Teach platform");
    return;
  }

  // Create dark/light toggle button matching Teach's Spine navigation structure (icon-only)
  const LightDarkModeButton = stringToHTML(/* html */ `
    <a href="#" id="LightDarkModeButton" data-betterseqta="true" class="DarkLightButton tooltip" style="display: flex; align-items: center; justify-content: center; padding: 12px; text-decoration: none; color: inherit; cursor: pointer; border-radius: 8px; margin: 4px; transition: all 0.2s ease;">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">${initialSvgContent}</svg>
      <div class="tooltiptext topmenutooltip" id="darklighttooliptext">${tooltipString}</div>
    </a>
  `);

  if (!LightDarkModeButton.firstChild) {
    console.error("[BetterSEQTA+] Failed to create LightDarkModeButton element");
    return;
  }

  // Insert dark/light toggle button after the settings button (or after home button if settings doesn't exist)
  const settingsButton = document.getElementById("AddedSettings");
  if (settingsButton && settingsButton.parentElement === navContainer) {
    // Insert after settings button
    if (settingsButton.nextSibling) {
      navContainer.insertBefore(LightDarkModeButton.firstChild, settingsButton.nextSibling);
    } else {
      navContainer.appendChild(LightDarkModeButton.firstChild);
    }
  } else {
    // Fallback: insert after home button or at the beginning
    const homeButton = document.getElementById("betterseqta-teach-homebutton");
    if (homeButton && homeButton.parentElement === navContainer) {
      if (homeButton.nextSibling) {
        navContainer.insertBefore(LightDarkModeButton.firstChild, homeButton.nextSibling);
      } else {
        navContainer.appendChild(LightDarkModeButton.firstChild);
      }
    } else {
      navContainer.insertBefore(LightDarkModeButton.firstChild, navContainer.firstChild);
    }
  }

  console.info("[BetterSEQTA+] Successfully injected dark/light toggle button into Teach Spine at:", navContainer.className);

  updateAllColors();

  const lightDarkModeButtonElement = document.getElementById("LightDarkModeButton")!;

  lightDarkModeButtonElement.addEventListener("click", async (e) => {
    e.preventDefault();
    const darklightText = document.getElementById("darklighttooliptext");

    if (
      settingsState.originalDarkMode !== undefined &&
      settingsState.selectedTheme
    ) {
      darklightText!.innerText = "Locked by current theme";
      await delay(1000);
      darklightText!.innerText = GetLightDarkModeString();
      return;
    }

    if (!document.startViewTransition || !settingsState.animations || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settingsState.DarkMode = !settingsState.DarkMode;
      updateAllColors(); 
      
      const newSvgContent = settingsState.DarkMode ? SUN_ICON_SVG : MOON_ICON_SVG;
      const svgElement = lightDarkModeButtonElement.querySelector("svg");
      if (svgElement) svgElement.innerHTML = newSvgContent;
      darklightText!.innerText = GetLightDarkModeString();
      return;
    }

    settingsState.DarkMode = !settingsState.DarkMode;
    
    updateAllColors(); 
    
    const newSvgContent = settingsState.DarkMode ? SUN_ICON_SVG : MOON_ICON_SVG;
    const svgElement = lightDarkModeButtonElement.querySelector("svg");
    if (svgElement) svgElement.innerHTML = newSvgContent;
    
    darklightText!.innerText = GetLightDarkModeString();
  });
}
