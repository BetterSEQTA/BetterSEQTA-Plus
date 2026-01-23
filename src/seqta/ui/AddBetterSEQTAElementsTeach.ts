/**
 * Teach-specific BetterSEQTA+ element additions
 * This file contains Teach platform-specific implementations of features
 * that were originally designed for SEQTA Learn
 */

import { delay } from "@/seqta/utils/delay";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { isSEQTATeach } from "@/seqta/utils/platformDetection";
import { appendBackgroundToUI } from "./ImageBackgrounds";
import { addExtensionSettings } from "@/seqta/utils/Adders/AddExtensionSettings";
import { setupSettingsButton } from "@/seqta/utils/setupSettingsButton";
import { loadTeachHomePage } from "@/seqta/utils/Loaders/LoadTeachHomePage";
import { updateAllColors } from "./colors/Manager";

/**
 * Adds Teach-specific BetterSEQTA+ elements to the page
 * This is the Teach equivalent of AddBetterSEQTAElements for Learn
 */
export async function AddBetterSEQTAElementsTeach() {
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
  // Check if home button already exists
  if (document.getElementById("betterseqta-teach-homebutton")) {
    return; // Button already exists
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
      <svg style="width: 24px; height: 24px;" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.46,13.97L5.82,21L12,17.27Z" />
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
  // Check if button already exists
  if (document.getElementById("AddedSettings")) {
    return; // Button already exists
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
  // Add Teach-specific features here
  // For example: Teach-specific shortcuts, Teach-specific UI enhancements, etc.
  console.debug("[BetterSEQTA+] Initializing Teach-specific features");
}

/**
 * Setup Teach-specific event listeners
 */
function setupTeachEventListeners() {
  const homebutton = document.getElementById("betterseqta-teach-homebutton");

  homebutton?.addEventListener("click", function (e) {
    e.preventDefault();
    // Navigate to BetterSEQTA+ homepage
    window.location.href = "/betterseqta-home";
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
