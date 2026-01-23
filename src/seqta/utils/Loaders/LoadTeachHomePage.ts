import { delay } from "../delay";
import { settingsState } from "../listeners/SettingsState";
import stringToHTML from "../stringToHTML";
import { isSEQTATeach } from "../platformDetection";
import { animate, stagger } from "motion";
import browser from "webextension-polyfill";
import LogoLight from "@/resources/icons/betterseqta-light-icon.png";
import assessmentsicon from "@/seqta/icons/assessmentsIcon";
import coursesicon from "@/seqta/icons/coursesIcon";
import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { convertTo12HourFormat } from "../convertTo12HourFormat";
import { renderShortcuts } from "@/seqta/utils/Render/renderShortcuts";
import { CreateElement } from "@/seqta/utils/CreateEnable/CreateElement";
import { FilterUpcomingAssessments } from "@/seqta/utils/FilterUpcomingAssessments";
import { getMockNotices } from "@/seqta/ui/dev/hideSensitiveContent";
import { setupFixedTooltips } from "@/seqta/utils/fixedTooltip";

// Flag to prevent multiple simultaneous loads
let isLoadingHomePage = false;
let routeListenerSetup = false;
let LessonInterval: any;
let currentSelectedDate = new Date();
let loadingTimeout: any;
let cachedStaffId: number | null = null;
let loadingIndicatorObserver: MutationObserver | null = null;
let showingOriginalWelcome = false; // Track if we're showing original welcome page

// BetterSEQTA+ homepage route (separate from Teach's welcome page)
const BETTERSEQTA_HOME_ROUTE = '/betterseqta-home';

/**
 * Hides SEQTA's loading indicators/spinners when on BetterSEQTA+ home page
 * This prevents SEQTA from showing a loading spinner while waiting for welcome page
 * Uses debouncing to avoid excessive DOM queries
 */
let hideLoadingDebounceTimer: number | null = null;
function hideSEQTALoadingIndicators() {
  // Debounce to avoid excessive calls
  if (hideLoadingDebounceTimer !== null) {
    return;
  }
  
  hideLoadingDebounceTimer = window.setTimeout(() => {
    hideLoadingDebounceTimer = null;
    
    // Only hide if we're actually on the BetterSEQTA home page
    const currentPath = window.location.pathname;
    if (!currentPath.includes(BETTERSEQTA_HOME_ROUTE)) {
      return;
    }
    
    // Hide common SEQTA loading spinners/indicators
    const loadingSelectors = [
      '[class*="Spinner__Spinner___"]',
      '[class*="Loading__Loading___"]',
      '[class*="Loader__Loader___"]',
    ];
    
    loadingSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const htmlEl = el as HTMLElement;
          // Only hide if it's visible (not already hidden)
          const style = window.getComputedStyle(htmlEl);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            htmlEl.style.display = 'none';
            htmlEl.setAttribute('data-betterseqta-hidden', 'true');
          }
        });
      } catch (e) {
        // Ignore errors
      }
    });
    
    // Also hide loading overlays that contain spinners
    try {
      const overlays = document.querySelectorAll('[class*="Overlay__Overlay___"]');
      overlays.forEach(overlay => {
        const hasSpinner = overlay.querySelector('[class*="Spinner"], [class*="Loading"], [class*="Loader"]');
        if (hasSpinner) {
          const style = window.getComputedStyle(overlay);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            (overlay as HTMLElement).style.display = 'none';
            (overlay as HTMLElement).setAttribute('data-betterseqta-hidden', 'true');
          }
        }
      });
    } catch (e) {
      // Ignore errors
    }
  }, 50); // Debounce to 50ms
}

/**
 * Sets up a persistent MutationObserver to hide loading indicators while on BetterSEQTA home page
 */
function setupLoadingIndicatorObserver() {
  // Disconnect existing observer if any
  if (loadingIndicatorObserver) {
    loadingIndicatorObserver.disconnect();
    loadingIndicatorObserver = null;
  }
  
  // Only set up observer if we're on welcome page (where we show BetterSEQTA home) or betterseqta-home route
  const currentPath = window.location.pathname;
  const isOnWelcomePage = currentPath === '/welcome' || currentPath.endsWith('/welcome');
  const isOnHomeRoute = currentPath.includes(BETTERSEQTA_HOME_ROUTE);
  
  if (!isOnWelcomePage && !isOnHomeRoute) {
    return;
  }
  
  // Initial hide
  hideSEQTALoadingIndicators();
  
  // Create persistent observer that stays active while on home page
  loadingIndicatorObserver = new MutationObserver((mutations) => {
    // Only process if we're still on welcome page or home route
    const currentPath = window.location.pathname;
    const isOnWelcomePage = currentPath === '/welcome' || currentPath.endsWith('/welcome');
    const isOnHomeRoute = currentPath.includes(BETTERSEQTA_HOME_ROUTE);
    
    if (!isOnWelcomePage && !isOnHomeRoute) {
      if (loadingIndicatorObserver) {
        loadingIndicatorObserver.disconnect();
        loadingIndicatorObserver = null;
      }
      return;
    }
    
    // Check if any mutations added nodes that might be loading indicators
    const hasRelevantMutations = mutations.some(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            return el.classList.toString().includes('Spinner') ||
                   el.classList.toString().includes('Loading') ||
                   el.classList.toString().includes('Loader') ||
                   el.querySelector('[class*="Spinner"], [class*="Loading"], [class*="Loader"]') !== null;
          }
          return false;
        });
      }
      return false;
    });
    
    if (hasRelevantMutations) {
      hideSEQTALoadingIndicators();
    }
  });
  
  // Observe the entire document for changes
  loadingIndicatorObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  console.debug("[BetterSEQTA+] Loading indicator observer setup");
}

/**
 * Disconnects the loading indicator observer
 */
function disconnectLoadingIndicatorObserver() {
  if (loadingIndicatorObserver) {
    loadingIndicatorObserver.disconnect();
    loadingIndicatorObserver = null;
    console.debug("[BetterSEQTA+] Loading indicator observer disconnected");
  }
}

/**
 * Sets up the toggle button to switch between BetterSEQTA+ home and original welcome page
 */
function setupWelcomeToggleButton() {
  const toggleButton = document.getElementById('toggle-welcome-view');
  if (!toggleButton) {
    console.debug("[BetterSEQTA+] Toggle button not found");
    return;
  }

  // Update button text based on current state
  const updateButtonText = () => {
    if (toggleButton) {
      toggleButton.textContent = showingOriginalWelcome 
        ? 'View BetterSEQTA+ Home' 
        : 'View Original Welcome';
    }
  };

  toggleButton.addEventListener('click', () => {
    showingOriginalWelcome = !showingOriginalWelcome;
    updateButtonText();
    
    const homeElement = document.getElementById("betterseqta-teach-home");
    const chromeContent = document.querySelector('[class*="Chrome__content"]');
    
    if (showingOriginalWelcome) {
      // Show original welcome, hide BetterSEQTA+ home
      if (homeElement) {
        homeElement.style.display = 'none';
      }
      
      // Show all children of Chrome__content except our home element
      if (chromeContent) {
        Array.from(chromeContent.children).forEach(child => {
          const htmlChild = child as HTMLElement;
          if (htmlChild.id !== 'betterseqta-teach-home') {
            htmlChild.style.display = '';
          }
        });
      }
      
      console.debug("[BetterSEQTA+] Showing original welcome page");
    } else {
      // Show BetterSEQTA+ home, hide original welcome
      if (homeElement) {
        homeElement.style.display = '';
      }
      
      // Hide all children of Chrome__content except our home element
      if (chromeContent) {
        Array.from(chromeContent.children).forEach(child => {
          const htmlChild = child as HTMLElement;
          if (htmlChild.id !== 'betterseqta-teach-home') {
            htmlChild.style.display = 'none';
          }
        });
      }
      
      console.debug("[BetterSEQTA+] Showing BetterSEQTA+ home");
    }
  });

  updateButtonText();
}

/**
 * Waits for SEQTA's welcome page to finish loading completely
 * Returns true when welcome page has fully loaded, false if timeout
 * Uses multiple checks to ensure the page is truly ready
 */
async function waitForWelcomePageToLoad(): Promise<boolean> {
  return new Promise((resolve) => {
    let stableChecks = 0;
    const requiredStableChecks = 5; // Page must be stable for 5 consecutive checks (500ms)
    let lastState = false;
    
    const checkWelcomeLoaded = (): boolean => {
      // 1. Check for visible loading spinners - none should be visible
      const visibleSpinners = Array.from(document.querySelectorAll(
        '[class*="Spinner__Spinner___"], ' +
        '[class*="Loading__Loading___"], ' +
        '[class*="Loader__Loader___"]'
      )).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               style.opacity !== '0';
      });
      
      // 2. Check for main content container
      const mainContent = document.querySelector('[class*="Chrome__content"]');
      const hasMainContent = mainContent && window.getComputedStyle(mainContent).display !== 'none';
      
      // 3. Check for welcome page specific content (cards, widgets, etc.)
      const welcomeContent = document.querySelector('[class*="Welcome"], [class*="Dashboard"], [class*="Card"]');
      const hasWelcomeContent = welcomeContent !== null;
      
      // 4. Check that React has finished rendering (no pending updates)
      // Look for elements that are typically rendered after initial load
      const hasRenderedContent = document.querySelectorAll('[class*="Chrome__content"] > *').length > 0;
      
      // 5. Check for loading overlays
      const loadingOverlays = Array.from(document.querySelectorAll('[class*="Overlay__Overlay___"]'))
        .filter(overlay => {
          const hasSpinner = overlay.querySelector('[class*="Spinner"], [class*="Loading"], [class*="Loader"]');
          if (!hasSpinner) return false;
          const style = window.getComputedStyle(overlay);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
      
      // Page is loaded if:
      // - No visible spinners
      // - No loading overlays
      // - Main content exists and is visible
      // - Some welcome content exists OR rendered content exists
      const isLoaded = visibleSpinners.length === 0 && 
                      loadingOverlays.length === 0 &&
                      !!hasMainContent && 
                      (!!hasWelcomeContent || !!hasRenderedContent);
      
      return Boolean(isLoaded);
    };
    
    // Check immediately
    const initialCheck = checkWelcomeLoaded();
    if (initialCheck) {
      console.debug("[BetterSEQTA+] Welcome page appears loaded, verifying stability...");
    }
    
    // Wait for welcome page to finish loading with stability check
    let attempts = 0;
    const maxAttempts = 200; // 20 seconds max
    const checkInterval = setInterval(() => {
      attempts++;
      
      const welcomeLoaded = checkWelcomeLoaded();
      
      // Stability check: page must be loaded for consecutive checks
      if (welcomeLoaded) {
        if (lastState === true) {
          stableChecks++;
        } else {
          stableChecks = 1; // Reset counter if state changed
        }
        lastState = true;
        
        // Page is stable and loaded
        if (stableChecks >= requiredStableChecks) {
          clearInterval(checkInterval);
          console.debug(`[BetterSEQTA+] Welcome page fully loaded and stable after ${attempts * 100}ms`);
          // Additional delay to ensure SEQTA's internal state is settled
          setTimeout(() => {
            resolve(true);
          }, 300);
          return;
        }
      } else {
        stableChecks = 0;
        lastState = false;
      }
      
      // Timeout fallback
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        const finalCheck = checkWelcomeLoaded();
        console.debug(`[BetterSEQTA+] Welcome page check timeout after ${attempts * 100}ms, final state: ${finalCheck ? 'loaded' : 'still loading'}`);
        // Even on timeout, wait a bit more to let SEQTA finish
        setTimeout(() => {
          resolve(finalCheck);
        }, 500);
      }
    }, 100);
  });
}

/**
 * Sets up route listener to show/hide homepage based on current route
 * Exported so it can be called early to set up routing
 */
export function setupRouteListener() {
  if (routeListenerSetup) {
    console.debug("[BetterSEQTA+] Route listener already setup");
    return;
  }
  routeListenerSetup = true;
  console.debug("[BetterSEQTA+] Setting up route listener");

  // Listen for route changes
  const checkRoute = () => {
    const currentPath = window.location.pathname;
    const isOnWelcomePage = currentPath === '/welcome' || currentPath.endsWith('/welcome');
    const isOnHomeRoute = currentPath.includes(BETTERSEQTA_HOME_ROUTE);
    
    console.debug("[BetterSEQTA+] Route check:", currentPath, "isWelcome:", isOnWelcomePage, "isHomeRoute:", isOnHomeRoute);
    
    const homeElement = document.getElementById("betterseqta-teach-home");
    const homeRoot = document.querySelector(".home-root");
    const mainContent = homeElement?.parentElement;
    
    // Show BetterSEQTA home if on welcome page OR on betterseqta-home route
    // We keep URL as /welcome to prevent SEQTA from showing "Unknown page"
    if (isOnWelcomePage || isOnHomeRoute) {
      console.debug("[BetterSEQTA+] On welcome/home route - showing BetterSEQTA+ homepage");
      
      // Set up observer to hide loading indicators and "Unknown page" UI
      setupLoadingIndicatorObserver();
      
      // Hide SEQTA's welcome page content if it exists (unless showing original welcome)
      if (!showingOriginalWelcome) {
        const chromeContent = document.querySelector('[class*="Chrome__content"]');
        if (chromeContent) {
          Array.from(chromeContent.children).forEach(child => {
            const htmlChild = child as HTMLElement;
            if (htmlChild.id !== 'betterseqta-teach-home') {
              htmlChild.style.display = 'none';
            }
          });
          console.debug("[BetterSEQTA+] Hidden SEQTA welcome content");
        }
      }
      
      // Hide any "Unknown page" or 404 elements
      const unknownPageElements = document.querySelectorAll('[class*="Unknown"], [class*="NotFound"], [class*="404"]');
      unknownPageElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.display = 'none';
      });
      
      // Show homepage if on the route
      if (homeElement) {
        homeElement.style.display = '';
        console.debug("[BetterSEQTA+] Homepage element displayed");
      } else {
        console.debug("[BetterSEQTA+] Homepage element not found, loading content");
        // Load homepage if element doesn't exist
        loadTeachHomePageContent();
      }
    } else {
      // Disconnect observer when navigating away from home page
      disconnectLoadingIndicatorObserver();
      
      console.debug("[BetterSEQTA+] Not on homepage route - cleaning up homepage");
      // Clean up homepage when navigating away
      if (homeElement) {
        console.debug("[BetterSEQTA+] Found homepage element, cleaning up");
        console.debug("[BetterSEQTA+] Homepage element details:", {
          id: homeElement.id,
          tagName: homeElement.tagName,
          parentElement: homeElement.parentElement?.tagName,
          parentId: homeElement.parentElement?.id,
          isConnected: homeElement.isConnected,
          children: homeElement.children.length,
        });
        
        try {
          // Check if element is still in the DOM
          if (!homeElement.isConnected) {
            console.debug("[BetterSEQTA+] Homepage element already disconnected from DOM");
            return;
          }
          
          const parent = homeElement.parentElement;
          if (!parent) {
            console.warn("[BetterSEQTA+] Homepage element has no parent, already removed?");
            return;
          }
          
          console.debug("[BetterSEQTA+] Parent element details:", {
            tagName: parent.tagName,
            id: parent.id,
            className: parent.className,
            children: parent.children.length,
            containsHomeElement: parent.contains(homeElement),
          });
          
          // Since we're inserting as a sibling (not inside React's container),
          // we can safely remove it without React conflicts
          if (parent.contains(homeElement)) {
            console.debug("[BetterSEQTA+] Removing homepage element from parent");
            parent.removeChild(homeElement);
            console.debug("[BetterSEQTA+] Homepage element removed successfully");
          } else {
            console.warn("[BetterSEQTA+] Homepage element is not a child of its parent");
          }
          
        } catch (error) {
          console.error("[BetterSEQTA+] Error during cleanup:", error);
          console.error("[BetterSEQTA+] Error stack:", error instanceof Error ? error.stack : 'No stack');
          
          // Fallback: just hide it (safer than removing)
          try {
            homeElement.style.display = 'none';
            console.debug("[BetterSEQTA+] Fallback: homepage hidden via display:none");
          } catch (hideError) {
            console.error("[BetterSEQTA+] Failed to hide homepage:", hideError);
          }
        }
      } else {
        console.debug("[BetterSEQTA+] No homepage element found to clean up");
      }
    }
  };

  // Listen to popstate (back/forward navigation)
  window.addEventListener('popstate', checkRoute);
  
  // Also check periodically in case Teach uses other navigation methods
  // Use a longer interval to reduce overhead
  let lastPath = window.location.pathname;
  const routeCheckInterval = setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      checkRoute();
    }
  }, 1000); // Increased from 500ms to reduce overhead

  // Initial check (but debounce to avoid conflicts with initial load)
  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    setTimeout(checkRoute, 100);
  });
}

/**
 * Loads the BetterSEQTA+ homepage content into the page
 */
async function loadTeachHomePageContent() {
  console.debug("[BetterSEQTA+] loadTeachHomePageContent called");
  
  // Prevent multiple simultaneous loads
  if (isLoadingHomePage) {
    console.debug("[BetterSEQTA+] Already loading homepage, skipping");
    return;
  }

  // Check if homepage already exists
  const existingHome = document.getElementById("betterseqta-teach-home");
  if (existingHome) {
    console.debug("[BetterSEQTA+] Homepage already exists, showing it");
    existingHome.style.display = '';
    return;
  }

  isLoadingHomePage = true;
  console.info("[BetterSEQTA+] Loading BetterSEQTA+ Home Page Content");

  // Wait for Teach's main content area to be available
  // IMPORTANT: We need to insert into a container that React doesn't manage
  // Instead of inserting into React's managed container, we'll insert as a sibling
  let insertionPoint: HTMLElement | null = null;
  let attempts = 0;
  const maxAttempts = 50;

  while (!insertionPoint && attempts < maxAttempts) {
    await delay(100);
    
    // Find the React-managed content container
    const reactContent = document.querySelector("[class*='Chrome__content']") as HTMLElement;
    const main = document.querySelector("#root > div > main");
    
    if (reactContent && main) {
      // Instead of inserting INTO the React container, insert AS A SIBLING
      // This way React won't try to manage our content
      insertionPoint = reactContent.parentElement as HTMLElement;
      console.debug("[BetterSEQTA+] Found insertion point (React container parent):", insertionPoint?.tagName);
    } else if (main) {
      // Fallback: use main element directly
      insertionPoint = main as HTMLElement;
      console.debug("[BetterSEQTA+] Using main element as insertion point");
    }
    
    attempts++;
  }

  if (!insertionPoint) {
    console.error("[BetterSEQTA+] Could not find insertion point for Teach homepage after", attempts, "attempts");
    isLoadingHomePage = false;
    return;
  }
  
  console.debug("[BetterSEQTA+] Found insertionPoint:", {
    tagName: insertionPoint.tagName,
    id: insertionPoint.id,
    className: insertionPoint.className,
    children: insertionPoint.children.length,
  });

  // Create homepage root container with scrollable styling
  const homeRoot = stringToHTML(`<div id="betterseqta-teach-home" class="home-root" style="overflow-y: auto; height: 100vh; max-height: 100vh;"></div>`);
  const homeContainer = homeRoot.firstChild as HTMLElement;
  
  if (!homeContainer) {
    console.error("[BetterSEQTA+] Failed to create homepage container");
    isLoadingHomePage = false;
    return;
  }

  // Create skeleton structure with only shortcuts
  const skeletonStructure = stringToHTML(/* html */`
    <div class="home-container" id="home-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 8px 0;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 600;">BetterSEQTA+ Home</h2>
        <button id="toggle-welcome-view" style="padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border-secondary, rgba(255,255,255,0.1)); background: var(--button-hover, rgba(255,255,255,0.05)); color: var(--text-primary, white); cursor: pointer; font-size: 14px; transition: all 0.2s ease; font-weight: 500;">
          View Original Welcome
        </button>
      </div>
      <div class="border shortcut-container">
        <div class="border shortcuts" id="shortcuts"></div>
      </div>
    </div>
  `);

  homeContainer.appendChild(skeletonStructure.firstChild!);

  // Insert homepage as a sibling to React's content container, not inside it
  // This prevents React from trying to manage our DOM
  try {
    console.debug("[BetterSEQTA+] Preparing to insert homepage");
    
    // Find the React content container to insert after it
    const reactContent = document.querySelector("[class*='Chrome__content']") as HTMLElement;
    
    if (reactContent && reactContent.parentElement === insertionPoint) {
      // Insert our homepage AFTER the React container
      // This way React won't try to manage it
      console.debug("[BetterSEQTA+] Inserting homepage after React content container");
      insertionPoint.insertBefore(homeContainer, reactContent.nextSibling);
      console.debug("[BetterSEQTA+] Homepage inserted successfully as sibling");
    } else {
      // Fallback: append to insertion point
      console.debug("[BetterSEQTA+] React container not found, appending to insertion point");
      insertionPoint.appendChild(homeContainer);
      console.debug("[BetterSEQTA+] Homepage appended successfully");
    }
    
    // Mark our container
    homeContainer.setAttribute('data-betterseqta-homepage', 'true');
    
  } catch (error) {
    console.error("[BetterSEQTA+] Error inserting homepage:", error);
    console.error("[BetterSEQTA+] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      insertionPoint: {
        tagName: insertionPoint.tagName,
        id: insertionPoint.id,
        className: insertionPoint.className,
      }
    });
    isLoadingHomePage = false;
    return;
  }

  // Animate homepage elements
  if (settingsState.animations) {
    animate(
      ".home-container > div",
      { opacity: [0, 1], y: [10, 0], scale: [0.99, 1] },
      {
        delay: stagger(0.15, { startDelay: 0.1 }),
        type: "spring",
        stiffness: 341,
        damping: 20,
        mass: 1,
      },
    );
  }

  // Render shortcuts only
  renderShortcuts();

  // Set up toggle button to switch between BetterSEQTA+ home and original welcome
  setupWelcomeToggleButton();

  // Set up persistent observer to hide loading indicators while on BetterSEQTA home page
  setupLoadingIndicatorObserver();

  // Update page title
  document.title = "Home ― BetterSEQTA+";
  
  isLoadingHomePage = false;
}

// Helper function to get staff ID
async function getStaffId(): Promise<number | null> {
  if (cachedStaffId) {
    return cachedStaffId;
  }

  try {
    // Method 1: Call /seqta/ta/login to get user info with staff ID
    try {
      const response = await fetch(`${location.origin}/seqta/ta/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          mode: "normal",
          query: null,
          redirect_url: location.origin,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.payload?.id && typeof data.payload.id === 'number') {
          cachedStaffId = data.payload.id;
          console.info("[BetterSEQTA+] Retrieved staff ID from login endpoint:", cachedStaffId);
          return cachedStaffId;
        }
      }
    } catch (e) {
      console.warn("[BetterSEQTA+] Login endpoint failed, trying other methods:", e);
    }

    // Method 2: Try /seqta/ta/json/user/get as fallback
    try {
      const response = await fetch(`${location.origin}/seqta/ta/json/user/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.payload?.id && typeof data.payload.id === 'number') {
          cachedStaffId = data.payload.id;
          console.info("[BetterSEQTA+] Retrieved staff ID from user/get endpoint:", cachedStaffId);
          return cachedStaffId;
        }
      }
    } catch (e) {
      console.warn("[BetterSEQTA+] User/get endpoint failed:", e);
    }

    console.error("[BetterSEQTA+] Could not determine staff ID from any source");
    return null;
  } catch (error) {
    console.error("[BetterSEQTA+] Error getting staff ID:", error);
    return null;
  }
}

// Process timetable data from all 4 APIs and extract lessons for a specific date
function processTeachTimetableData(
  timetable1: any,
  adhoc1: any,
  timetable2: any,
  adhoc2: any,
  targetDate: string
): any[] {
  const lessons: any[] = [];
  const allAvailableDates: string[] = [];

  // Process timetabled periods from API 1 and 3
  const processTimetabledPeriods = (timetabled: any) => {
    if (!timetabled?.periods) {
      console.debug("[BetterSEQTA+] No periods found in timetabled data");
      return;
    }
    
    console.debug("[BetterSEQTA+] Processing periods, target date:", targetDate, "periods count:", timetabled.periods.length);
    for (const period of timetabled.periods) {
      // Each period object has date keys like "2025-12-22" and "2025-12-29"
      // Skip non-date keys like "name", "id", "order"
      for (const dateKey in period) {
        // Check if this key is a date (format: YYYY-MM-DD)
        if (dateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Track all available dates
          if (!allAvailableDates.includes(dateKey)) {
            allAvailableDates.push(dateKey);
          }
          
          console.debug("[BetterSEQTA+] Found date key:", dateKey, "matches target?", dateKey === targetDate, "is array?", Array.isArray(period[dateKey]));
          if (dateKey === targetDate && Array.isArray(period[dateKey])) {
            console.debug("[BetterSEQTA+] Adding lessons for date:", dateKey, "count:", period[dateKey].length);
            // Add all lessons for this date
            for (const lesson of period[dateKey]) {
              // Normalize lesson data
              lessons.push({
                ...lesson,
                from: lesson.from?.substring(0, 5) || lesson.from,
                until: lesson.until?.substring(0, 5) || lesson.until,
              });
            }
          }
        }
      }
    }
  };

  processTimetabledPeriods(timetable1?.timetabled);
  processTimetabledPeriods(timetable2?.timetabled);

  // Process adhoc lessons from API 2 and 4
  const processAdhoc = (adhocPayload: any) => {
    if (!adhocPayload?.adhoc) return;
    
    for (const adhocLesson of adhocPayload.adhoc) {
      if (adhocLesson.date === targetDate) {
        lessons.push({
          ...adhocLesson,
          from: adhocLesson.from?.substring(0, 5) || adhocLesson.from,
          until: adhocLesson.until?.substring(0, 5) || adhocLesson.until,
          type: 'adhoc',
        });
      }
    }
  };

  processAdhoc(adhoc1);
  processAdhoc(adhoc2);

  // If no lessons found for target date, try nearest date
  if (lessons.length === 0 && allAvailableDates.length > 0) {
    console.debug("[BetterSEQTA+] No lessons for target date", targetDate, ", available dates:", allAvailableDates);
    // Find nearest date
    const targetDateObj = new Date(targetDate);
    allAvailableDates.sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      const targetTime = targetDateObj.getTime();
      return Math.abs(dateA - targetTime) - Math.abs(dateB - targetTime);
    });
    
    const nearestDate = allAvailableDates[0];
    console.debug("[BetterSEQTA+] Using nearest date with lessons:", nearestDate);
    
    // Reprocess with nearest date
    const processTimetabledPeriodsForDate = (timetabled: any, searchDate: string) => {
      if (!timetabled?.periods) return;
      for (const period of timetabled.periods) {
        for (const dateKey in period) {
          if (dateKey.match(/^\d{4}-\d{2}-\d{2}$/) && dateKey === searchDate && Array.isArray(period[dateKey])) {
            for (const lesson of period[dateKey]) {
              lessons.push({
                ...lesson,
                from: lesson.from?.substring(0, 5) || lesson.from,
                until: lesson.until?.substring(0, 5) || lesson.until,
              });
            }
          }
        }
      }
    };
    
    processTimetabledPeriodsForDate(timetable1?.timetabled, nearestDate);
    processTimetabledPeriodsForDate(timetable2?.timetabled, nearestDate);
    
    // Also check adhoc for nearest date
    if (adhoc1?.adhoc) {
      for (const adhocLesson of adhoc1.adhoc) {
        if (adhocLesson.date === nearestDate) {
          lessons.push({
            ...adhocLesson,
            from: adhocLesson.from?.substring(0, 5) || adhocLesson.from,
            until: adhocLesson.until?.substring(0, 5) || adhocLesson.until,
            type: 'adhoc',
          });
        }
      }
    }
    if (adhoc2?.adhoc) {
      for (const adhocLesson of adhoc2.adhoc) {
        if (adhocLesson.date === nearestDate) {
          lessons.push({
            ...adhocLesson,
            from: adhocLesson.from?.substring(0, 5) || adhocLesson.from,
            until: adhocLesson.until?.substring(0, 5) || adhocLesson.until,
            type: 'adhoc',
          });
        }
      }
    }
  }

  // Remove duplicates based on id and time
  const seen = new Set<string>();
  return lessons.filter((lesson) => {
    const key = `${lesson.id}-${lesson.from}-${lesson.until}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Helper functions (adapted from LoadHomePage.ts)
async function GetUpcomingAssessments() {
  try {
    // Try Teach endpoint first
    let response = await fetch(
      `${location.origin}/seqta/ta/assessment/list/upcoming?`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({}),
      },
    );
    
    if (!response.ok) {
      // Fallback: try without /ta/
      response = await fetch(
        `${location.origin}/seqta/assessment/list/upcoming?`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({}),
        },
      );
    }
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.payload || [];
  } catch (error) {
    console.error("[BetterSEQTA+] Error fetching assessments:", error);
    return [];
  }
}

async function GetActiveClasses() {
  try {
    // Use Teach endpoint /seqta/ta/json/program/list
    const response = await fetch(
      `${location.origin}/seqta/ta/json/program/list`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({}),
      },
    );
    
    if (!response.ok) {
      console.warn("[BetterSEQTA+] Program list endpoint failed, returning empty array");
      return [];
    }
    
    const data = await response.json();
    // Transform Teach program data to match Learn format if needed
    return data.payload || [];
  } catch (error) {
    console.error("[BetterSEQTA+] Error fetching classes:", error);
    return [];
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setupTimetableListeners() {
  const listeners: Array<() => void> = [];
  const timetableBack = document.getElementById("home-timetable-back");
  const timetableForward = document.getElementById("home-timetable-forward");

  function changeTimetable(value: number) {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }

    loadingTimeout = setTimeout(() => {
      const dayContainer = document.getElementById("day-container");
      if (dayContainer) {
        dayContainer.classList.add("loading");
        dayContainer.innerHTML = "";
      }
    }, 200);

    currentSelectedDate.setDate(currentSelectedDate.getDate() + value);
    const formattedDate = formatDate(currentSelectedDate);
    callHomeTimetable(formattedDate, true);
    SetTimetableSubtitle();
  }

  const backHandler = () => changeTimetable(-1);
  const forwardHandler = () => changeTimetable(1);

  timetableBack?.addEventListener("click", backHandler);
  timetableForward?.addEventListener("click", forwardHandler);

  listeners.push(
    () => timetableBack?.removeEventListener("click", backHandler),
    () => timetableForward?.removeEventListener("click", forwardHandler),
  );

  return () => listeners.forEach((cleanup) => cleanup());
}

async function callHomeTimetable(date: string, change?: any) {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }

  const DayContainer = document.getElementById("day-container")!;
  if (!DayContainer) return;

  try {
    // Get staff ID
    const staffId = await getStaffId();
    if (!staffId) {
      console.error("[BetterSEQTA+] Could not get staff ID for timetable");
      DayContainer.classList.remove("loading");
      return;
    }

    // Calculate date range (week view - 7 days before and after)
    // Parse the date string (format: YYYY-MM-DD)
    const dateParts = date.split('-');
    const targetDateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    const dateFrom = new Date(targetDateObj);
    dateFrom.setDate(dateFrom.getDate() - 7);
    const dateFromFormatted = formatDate(dateFrom);
    
    const dateTo = new Date(targetDateObj);
    dateTo.setDate(dateTo.getDate() + 7);
    const dateToFormatted = formatDate(dateTo);

    // Call all four APIs
    const [timetable1, adhoc1, timetable2, adhoc2] = await Promise.all([
      fetch(`${location.origin}/seqta/ta/json/timetable/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timetabled: true,
          untimetabled: true,
          dateFrom: dateFromFormatted,
          dateTo: dateToFormatted,
          staff: staffId,
        }),
      }).then((res) => res.ok ? res.json() : Promise.reject()).catch(() => ({ payload: { timetabled: { periods: [] }, untimetabled: [] } })),

      fetch(`${location.origin}/seqta/ta/json/timetable/adhoc/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateFrom: dateFromFormatted,
          dateTo: dateToFormatted,
          staff: staffId,
        }),
      }).then((res) => res.ok ? res.json() : Promise.reject()).catch(() => ({ payload: { adhoc_classunits: [], adhoc: [] } })),

      fetch(`${location.origin}/seqta/ta/json/timetable/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateFrom: dateFromFormatted,
          dateTo: dateToFormatted,
          staff: staffId,
          timetabled: true,
          untimetabled: false,
          expandLast: true,
        }),
      }).then((res) => res.ok ? res.json() : Promise.reject()).catch(() => ({ payload: { timetabled: { periods: [] } } })),

      fetch(`${location.origin}/seqta/ta/json/timetable/adhoc/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateFrom: dateFromFormatted,
          dateTo: dateToFormatted,
          staff: staffId,
          expandLast: true,
        }),
      }).then((res) => res.ok ? res.json() : Promise.reject()).catch(() => ({ payload: { adhoc_classunits: [], adhoc: [] } })),
    ]);

    // Process timetable data
    const lessonArray = processTeachTimetableData(
      timetable1.payload,
      adhoc1.payload,
      timetable2.payload,
      adhoc2.payload,
      date
    );

    if (lessonArray.length > 0) {
      if (DayContainer.innerText || change) {
        lessonArray.sort(function (a, b) {
          return a.from.localeCompare(b.from);
        });

            GetLessonColours().then((colours) => {
              let subjects = colours;
              for (let i = 0; i < lessonArray.length; i++) {
                // Teach uses timetable.class.colour.* instead of timetable.subject.colour.*
                const classunit = lessonArray[i].classunit || lessonArray[i].code;
                let subjectname = `timetable.class.colour.${classunit}`;
                let subject = subjects.find(
                  (element: any) => element.name === subjectname || element.name === `timetable.subject.colour.${lessonArray[i].code}`,
                );
                if (!subject) {
                  lessonArray[i].colour = "--item-colour: #8e8e8e;";
                } else {
                  lessonArray[i].colour = `--item-colour: ${subject.value};`;
                  let result = GetThresholdOfColor(subject.value);
                  if (result > 300) {
                    lessonArray[i].invert = true;
                  }
                }

                lessonArray[i].from = lessonArray[i].from.substring(0, 5);
                lessonArray[i].until = lessonArray[i].until.substring(0, 5);

                if (settingsState.timeFormat === "12") {
                  lessonArray[i].from = convertTo12HourFormat(
                    lessonArray[i].from,
                  );
                  lessonArray[i].until = convertTo12HourFormat(
                    lessonArray[i].until,
                  );
                }

                lessonArray[i].attendanceTitle = CheckUnmarkedAttendance(
                  lessonArray[i].attendance,
                );
              }

              DayContainer.innerText = "";
              for (let i = 0; i < lessonArray.length; i++) {
                var div = makeLessonDiv(lessonArray[i], i + 1);
                if (lessonArray[i].invert) {
                  const div1 = div.firstChild! as HTMLElement;
                  div1.classList.add("day-inverted");
                }
                DayContainer.append(div.firstChild as HTMLElement);
              }

              DayContainer.classList.remove("loading");

              const today = new Date();
              if (currentSelectedDate.getDate() == today.getDate()) {
                for (let i = 0; i < lessonArray.length; i++) {
                  CheckCurrentLesson(lessonArray[i], i + 1);
                }
                CheckCurrentLessonAll(lessonArray);
              }
            });
          }
        } else {
          DayContainer.innerHTML = "";
          var dummyDay = document.createElement("div");
          dummyDay.classList.add("day-empty");
          let img = document.createElement("img");
          img.src = browser.runtime.getURL(LogoLight);
          let text = document.createElement("p");
          text.innerText = "No lessons available.";
          dummyDay.append(img);
          dummyDay.append(text);
          DayContainer.append(dummyDay);
          DayContainer.classList.remove("loading");
        }
  } catch (error) {
    console.error("[BetterSEQTA+] Error in callHomeTimetable:", error);
    DayContainer.classList.remove("loading");
    DayContainer.innerHTML = "";
    const errorDiv = document.createElement("div");
    errorDiv.classList.add("day-empty");
    errorDiv.innerHTML = `
      <img src="${browser.runtime.getURL(LogoLight)}" />
      <p>Error loading lessons. Please try again.</p>
    `;
    DayContainer.append(errorDiv);
  }
}

function CheckCurrentLessonAll(lessons: any) {
  LessonInterval = setInterval(
    function () {
      for (let i = 0; i < lessons.length; i++) {
        CheckCurrentLesson(lessons[i], i + 1);
      }
    }.bind(lessons),
    60000,
  );
}

async function CheckCurrentLesson(lesson: any, num: number) {
  const {
    from: startTime,
    until: endTime,
    code,
    description,
    room,
    staff,
  } = lesson;
  const currentDate = new Date();

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const startDate = new Date(currentDate);
  startDate.setHours(startHour, startMinute, 0);

  const endDate = new Date(currentDate);
  endDate.setHours(endHour, endMinute, 0);

  const isValidTime = startDate < currentDate && endDate > currentDate;

  const elementId = `${code}${num}`;
  const element = document.getElementById(elementId);

  if (!element) {
    clearInterval(LessonInterval);
    return;
  }

  const isCurrentDate =
    currentSelectedDate.toLocaleDateString("en-au") ===
    currentDate.toLocaleDateString("en-au");

  if (isCurrentDate) {
    if (isValidTime) {
      element.classList.add("activelesson");
    } else {
      element.classList.remove("activelesson");
    }
  }
}

function makeLessonDiv(lesson: any, num: number) {
  if (!lesson) throw new Error("No lesson provided.");

  const {
    code,
    colour,
    description,
    staff,
    room,
    from,
    until,
    attendanceTitle,
    programmeID,
    metaID,
    assessments,
  } = lesson;

  let lessonString = `
    <div class="day" id="${code + num}" style="${colour}">
      <h2>${description || "Unknown"}</h2>
      <h3>${staff || "Unknown"}</h3>
      <h3>${room || "Unknown"}</h3>
      <h4>${from || "Unknown"} - ${until || "Unknown"}</h4>
      <h5>${attendanceTitle || "Unknown"}</h5>
  `;

  if (programmeID !== 0) {
    lessonString += `
      <div class="day-button clickable" style="right: 5px;" onclick="window.location.href='/assessments/${programmeID}:${metaID}'">${assessmentsicon}</div>
      <div class="day-button clickable" style="right: 35px;" onclick="window.location.href='/courses/${programmeID}:${metaID}'">${coursesicon}</div>
    `;
  }

  if (assessments && assessments.length > 0) {
    const assessmentString = assessments
      .map(
        (element: any) =>
          `<p onclick="window.location.href = '/assessments/${programmeID}:${metaID}?item=${element.id}';">${element.title}</p>`,
      )
      .join("");

    lessonString += `
      <div class="fixed-tooltip assessmenttooltip">
        <svg style="width:28px;height:28px;border-radius:0;" viewBox="0 0 24 24">
          <path fill="#ed3939" d="M16 2H4C2.9 2 2 2.9 2 4V20C2 21.11 2.9 22 4 22H16C17.11 22 18 21.11 18 20V4C18 2.9 17.11 2 16 2M16 20H4V4H6V12L8.5 9.75L11 12V4H16V20M20 15H22V17H20V15M22 7V13H20V7H22Z" />
        </svg>
        <div class="tooltiptext">${assessmentString}</div>
      </div>
    `;
  }

  lessonString += "</div>";
  const element = stringToHTML(lessonString);
  setupFixedTooltips(element);
  return element;
}

function CheckUnmarkedAttendance(lessonattendance: any) {
  if (lessonattendance) {
    var lesson = lessonattendance.label;
  } else {
    lesson = " ";
  }
  return lesson;
}

function comparedate(obj1: any, obj2: any) {
  if (obj1.date < obj2.date) {
    return -1;
  }
  if (obj1.date > obj2.date) {
    return 1;
  }
  return 0;
}

async function CreateUpcomingSection(assessments: any, activeSubjects: any) {
  let upcomingitemcontainer = document.querySelector("#upcoming-items");
  let overdueDates = [];
  let upcomingDates = {};

  var Today = new Date();

  for (let i = 0; i < assessments.length; i++) {
    const assessment = assessments[i];
    let assessmentdue = new Date(assessment.due);

    CheckSpecialDay(Today, assessmentdue);
    if (assessmentdue < Today) {
      if (!CheckSpecialDay(Today, assessmentdue)) {
        overdueDates.push(assessment);
        assessments.splice(i, 1);
        i--;
      }
    }
  }

  const colours = await GetLessonColours();

  let subjects = colours;
  for (let i = 0; i < assessments.length; i++) {
    // Teach uses timetable.class.colour.* instead of timetable.subject.colour.*
    const classunit = assessments[i].classunit || assessments[i].code;
    let subjectname = `timetable.class.colour.${classunit}`;
    let subject = subjects.find((element: any) => 
      element.name === subjectname || element.name === `timetable.subject.colour.${assessments[i].code}`
    );

    if (!subject) {
      assessments[i].colour = "--item-colour: #8e8e8e;";
    } else {
      assessments[i].colour = `--item-colour: ${subject.value};`;
      GetThresholdOfColor(subject.value);
    }
  }

  for (let i = 0; i < activeSubjects.length; i++) {
    const element = activeSubjects[i];
    // Teach uses timetable.class.colour.* instead of timetable.subject.colour.*
    const classunit = element.classunit || element.code;
    let subjectname = `timetable.class.colour.${classunit}`;
    let colour = colours.find((element: any) => 
      element.name === subjectname || element.name === `timetable.subject.colour.${element.code}`
    );
    if (!colour) {
      element.colour = "--item-colour: #8e8e8e;";
    } else {
      element.colour = `--item-colour: ${colour.value};`;
      let result = GetThresholdOfColor(colour.value);
      if (result > 300) {
        element.invert = true;
      }
    }
  }

  CreateFilters(activeSubjects);

  let type;
  let class_;

  for (let i = 0; i < assessments.length; i++) {
    const element: any = assessments[i];
    if (!upcomingDates[element.due as keyof typeof upcomingDates]) {
      let dateObj: any = new Object();
      dateObj.div = CreateElement(
        (type = "div"),
        (class_ = "upcoming-date-container"),
      );
      dateObj.assessments = [];
      (upcomingDates[element.due as keyof typeof upcomingDates] as any) =
        dateObj;
    }
    let assessmentDateDiv =
      upcomingDates[element.due as keyof typeof upcomingDates];

    if (assessmentDateDiv) {
      (assessmentDateDiv as any).assessments.push(element);
    }
  }

  for (var date in upcomingDates) {
    let assessmentdue = new Date(
      (
        upcomingDates[date as keyof typeof upcomingDates] as any
      ).assessments[0].due,
    );
    let specialcase = CheckSpecialDay(Today, assessmentdue);
    let assessmentDate;

    if (specialcase) {
      let datecase: string = specialcase!;
      assessmentDate = createAssessmentDateDiv(
        date,
        upcomingDates[date as keyof typeof upcomingDates],
        datecase,
      );
    } else {
      assessmentDate = createAssessmentDateDiv(
        date,
        upcomingDates[date as keyof typeof upcomingDates],
      );
    }

    if (specialcase === "Yesterday") {
      upcomingitemcontainer!.insertBefore(
        assessmentDate,
        upcomingitemcontainer!.firstChild,
      );
    } else {
      upcomingitemcontainer!.append(assessmentDate);
    }
  }
  FilterUpcomingAssessments(settingsState.subjectfilters);
}

function createAssessmentDateDiv(date: string, value: any, datecase?: any) {
  var options = {
    weekday: "long" as "long",
    month: "long" as "long",
    day: "numeric" as "numeric",
  };
  const FormattedDate = new Date(date);

  const assessments = value.assessments;
  const container = value.div;

  let DateTitleDiv = document.createElement("div");
  DateTitleDiv.classList.add("upcoming-date-title");

  if (datecase) {
    let datetitle = document.createElement("h5");
    datetitle.classList.add("upcoming-special-day");
    datetitle.innerText = datecase;
    DateTitleDiv.append(datetitle);
    container.setAttribute("data-day", datecase);
  }

  let DateTitle = document.createElement("h5");
  DateTitle.innerText = FormattedDate.toLocaleDateString("en-AU", options);
  DateTitleDiv.append(DateTitle);

  container.append(DateTitleDiv);

  let assessmentContainer = document.createElement("div");
  assessmentContainer.classList.add("upcoming-date-assessments");

  for (let i = 0; i < assessments.length; i++) {
    const element = assessments[i];
    let item = document.createElement("div");
    item.classList.add("upcoming-assessment");
    item.setAttribute("data-subject", element.code);
    item.id = `assessment${element.id}`;

    item.style.cssText = element.colour;

    let titlediv = document.createElement("div");
    titlediv.classList.add("upcoming-subject-title");

    let titlesvg =
      stringToHTML(`<svg viewBox="0 0 24 24" style="width:35px;height:35px;fill:white;">
    <path d="M6 20H13V22H6C4.89 22 4 21.11 4 20V4C4 2.9 4.89 2 6 2H18C19.11 2 20 2.9 20 4V12.54L18.5 11.72L18 12V4H13V12L10.5 9.75L8 12V4H6V20M24 17L18.5 14L13 17L18.5 20L24 17M15 19.09V21.09L18.5 23L22 21.09V19.09L18.5 21L15 19.09Z"></path>
    </svg>`).firstChild;
    titlediv.append(titlesvg!);

    let detailsdiv = document.createElement("div");
    detailsdiv.classList.add("upcoming-details");
    let detailstitle = document.createElement("h5");
    detailstitle.innerText = `${element.subject} assessment`;
    let subject = document.createElement("p");
    subject.innerText = element.title;
    subject.classList.add("upcoming-assessment-title");
    subject.onclick = function () {
      window.location.href = `/assessments/${element.programmeID}:${element.metaclassID}?item=${element.id}`;
    };
    detailsdiv.append(detailstitle);
    detailsdiv.append(subject);

    item.append(titlediv);
    item.append(detailsdiv);
    assessmentContainer.append(item);
  }

  container.append(assessmentContainer);

  return container;
}

function CheckSpecialDay(date1: Date, date2: Date) {
  if (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() - 1 === date2.getDate()
  ) {
    return "Yesterday";
  }
  if (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  ) {
    return "Today";
  }
  if (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() + 1 === date2.getDate()
  ) {
    return "Tomorrow";
  }
}

async function GetLessonColours() {
  try {
    // Get staff ID first
    const staffId = await getStaffId();
    if (!staffId) {
      console.warn("[BetterSEQTA+] Could not get staff ID for lesson colours");
      return [];
    }

    const response = await fetch(`${location.origin}/seqta/ta/json/userPrefs/load`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        request: "userPrefs",
        asArray: true,
        user: staffId,
      }),
    });
    
    if (!response.ok) {
      console.warn("[BetterSEQTA+] UserPrefs load failed, returning empty array");
      return [];
    }
    
    const data = await response.json();
    // Extract userPrefs array from payload, filter for timetable.class.colour entries (Teach uses class instead of subject)
    const prefs = data.payload || [];
    // Teach uses timetable.class.colour.* instead of timetable.subject.colour.*
    return prefs.filter((pref: any) => 
      pref.name?.startsWith('timetable.class.colour.') || 
      pref.name?.startsWith('timetable.subject.colour.')
    );
  } catch (error) {
    console.error("[BetterSEQTA+] Error fetching lesson colours:", error);
    return [];
  }
}

function CreateFilters(subjects: any) {
  let filteroptions = settingsState.subjectfilters;

  let filterdiv = document.querySelector("#upcoming-filters");
  for (let i = 0; i < subjects.length; i++) {
    const element = subjects[i];

    if (!Object.prototype.hasOwnProperty.call(filteroptions, element.code)) {
      filteroptions[element.code] = true;
      settingsState.subjectfilters = filteroptions;
    }
    let elementdiv = CreateSubjectFilter(
      element.code,
      element.colour,
      filteroptions[element.code],
    );

    filterdiv!.append(elementdiv);
  }
}

function CreateSubjectFilter(
  subjectcode: any,
  itemcolour: string,
  checked: any,
) {
  let label = CreateElement("label", "upcoming-checkbox-container");
  label.innerText = subjectcode;
  let input1 = CreateElement("input");
  const input = input1 as HTMLInputElement;
  input.type = "checkbox";
  input.checked = checked;
  input.id = `filter-${subjectcode}`;
  label.style.cssText = itemcolour;
  let span = CreateElement("span", "upcoming-checkmark");
  label.append(input);
  label.append(span);

  input.addEventListener("change", function (change) {
    let filters = settingsState.subjectfilters;
    let id = (change.target as HTMLInputElement)!.id.split("-")[1];
    filters[id] = (change.target as HTMLInputElement)!.checked;

    settingsState.subjectfilters = filters;
  });

  return label;
}

function SetTimetableSubtitle() {
  const homelessonsubtitle = document.getElementById("home-lesson-subtitle");
  if (!homelessonsubtitle) return;

  const date = new Date();
  const isSameMonth =
    date.getFullYear() === currentSelectedDate.getFullYear() &&
    date.getMonth() === currentSelectedDate.getMonth();

  if (isSameMonth) {
    const dayDiff = date.getDate() - currentSelectedDate.getDate();
    switch (dayDiff) {
      case 0:
        homelessonsubtitle.innerText = "Today's Lessons";
        break;
      case 1:
        homelessonsubtitle.innerText = "Yesterday's Lessons";
        break;
      case -1:
        homelessonsubtitle.innerText = "Tomorrow's Lessons";
        break;
      default:
        homelessonsubtitle.innerText = formatDateString(currentSelectedDate);
    }
  } else {
    homelessonsubtitle.innerText = formatDateString(currentSelectedDate);
  }
}

function formatDateString(date: Date): string {
  return `${date.toLocaleString("en-us", { weekday: "short" })} ${date.toLocaleDateString("en-au")}`;
}

function setupNotices(labelArray: string[], date: string) {
  const dateControl = document.querySelector(
    'input[type="date"]',
  ) as HTMLInputElement;

  const fetchNotices = async (date: string) => {
    let data;

    if (settingsState.mockNotices) {
      data = getMockNotices();
    } else {
      try {
        // Try Teach endpoint first
        let response = await fetch(
          `${location.origin}/seqta/ta/load/notices?`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({ date }),
          },
        );
        
        if (!response.ok) {
          // Fallback: try without /ta/
          response = await fetch(
            `${location.origin}/seqta/load/notices?`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json; charset=utf-8" },
              body: JSON.stringify({ date }),
            },
          );
        }
        
        if (response.ok) {
          data = await response.json();
        } else {
          data = { payload: [] };
        }
      } catch (error) {
        console.error("[BetterSEQTA+] Error fetching notices:", error);
        data = { payload: [] };
      }
    }

    processNotices(data, labelArray);
  };

  const debouncedInputChange = debounce((e: Event) => {
    const target = e.target as HTMLInputElement;
    fetchNotices(target.value);
  }, 250);

  dateControl?.addEventListener("input", debouncedInputChange);
  fetchNotices(date);

  return () => dateControl?.removeEventListener("input", debouncedInputChange);
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function processNotices(response: any, labelArray: string[]) {
  const NoticeContainer = document.getElementById("notice-container");
  if (!NoticeContainer) return;

  NoticeContainer.innerHTML = "";

  const notices = response.payload || [];
  if (!notices.length) {
    const dummyNotice = document.createElement("div");
    dummyNotice.textContent = "No notices for today.";
    dummyNotice.classList.add("dummynotice");
    NoticeContainer.append(dummyNotice);
    return;
  }

  const fragment = document.createDocumentFragment();

  notices.forEach((notice: any) => {
    const shouldInclude =
      settingsState.mockNotices ||
      labelArray.includes(JSON.stringify(notice.label));

    if (shouldInclude) {
      const colour = processNoticeColor(notice.colour);
      const noticeElement = createNoticeElement(notice, colour);
      fragment.appendChild(noticeElement);
    }
  });

  NoticeContainer.appendChild(fragment);
}

function processNoticeColor(colour: string): string | undefined {
  if (typeof colour === "string") {
    const rgb = GetThresholdOfColor(colour);
    if (rgb < 100 && settingsState.DarkMode) {
      return undefined;
    }
  }
  return colour;
}

function createNoticeElement(notice: any, colour: string | undefined): Node {
  const textPreview = notice.contents
    ?.replace(/<[^>]*>/g, "")
    ?.replace(/\[\[[\w]+[:][\w]+[\]\]]+/g, "")
    ?.replace(/\s+/g, " ")
    ?.trim()
    ?.substring(0, 150) + (notice.contents?.length > 150 ? "..." : "") || "";
  
  const noticeId = `notice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const htmlContent = `
    <div class="notice-unified-content notice-card-state" data-notice-id="${noticeId}" style="--colour: ${colour || "#8e8e8e"}; position: relative; background: var(--background-primary); cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.1);">
      <div class="notice-header">
        <div class="notice-badge-row">
          <span class="notice-badge" style="background: linear-gradient(135deg, ${colour || "#8e8e8e"}, ${colour || "#8e8e8e"}dd); color: white;">
            ${notice.label_title || "General"}
          </span>
          <span class="notice-staff">${notice.staff || ""}</span>
        </div>
        <button class="notice-close-btn" style="opacity: 0; pointer-events: none;">&times;</button>
      </div>
      <h2 class="notice-content-title">${notice.title || ""}</h2>
      <div class="notice-content-body">${textPreview}</div>
    </div>`;

  const element = stringToHTML(htmlContent).firstChild as HTMLElement;
  if (element) {
    element.addEventListener("click", () =>
      openNoticeModal(notice, colour, element),
    );
  }
  return element!;
}

function openNoticeModal(
  notice: any,
  colour: string | undefined,
  sourceElement: HTMLElement,
) {
  // Simplified notice modal - can be expanded later
  const cleanContent = notice.contents
    ?.replace(/\[\[[\w]+[:][\w]+[\]\]]+/g, "")
    ?.replace(/ +/, " ") || "";

  const existingModal = document.getElementById("notice-modal");
  if (existingModal) {
    existingModal.remove();
  }

  alert(`${notice.title || "Notice"}\n\n${cleanContent.substring(0, 500)}`);
}

/**
 * Loads the BetterSEQTA+ homepage for SEQTA Teach
 * Navigates to /betterseqta-home and sets up route listener
 */
export async function loadTeachHomePage() {
  // Set up route listener to handle show/hide (only once)
  setupRouteListener();

  // Check if we're already on the homepage route
  const currentPath = window.location.pathname;
  const isOnHomePage = currentPath.includes(BETTERSEQTA_HOME_ROUTE);
  const isOnWelcomePage = currentPath === '/welcome' || currentPath.endsWith('/welcome');
  
  // Only redirect if we're on the welcome page (not other pages like /messages, /timetable, etc.)
  if (!isOnHomePage && isOnWelcomePage) {
    console.debug("[BetterSEQTA+] On welcome page, waiting for it to fully load...");
    const welcomeLoaded = await waitForWelcomePageToLoad();
    
    if (welcomeLoaded) {
      console.debug("[BetterSEQTA+] Welcome page fully loaded and stable");
    } else {
      console.warn("[BetterSEQTA+] Welcome page load timeout, but proceeding");
    }
    
    // Don't change the URL - keep it as /welcome so SEQTA's router thinks we're on a valid route
    // This prevents SEQTA from showing "Unknown page" loading state
    // We'll just load our custom content and hide SEQTA's welcome content
    console.debug("[BetterSEQTA+] Loading BetterSEQTA+ home content (keeping URL as /welcome)");
  } else if (!isOnHomePage && !isOnWelcomePage) {
    // Not on welcome page and not on home page - don't redirect, just return
    console.debug("[BetterSEQTA+] Not on welcome page, skipping redirect");
    return;
  }

  // Load the homepage content (route listener will handle showing it)
  // But only if it doesn't already exist (to prevent double loading)
  const existingHome = document.getElementById("betterseqta-teach-home");
  if (!existingHome) {
    await loadTeachHomePageContent();
  } else {
    // Just show it if it exists
    existingHome.style.display = '';
  }
}

