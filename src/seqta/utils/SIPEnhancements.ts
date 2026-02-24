/**
 * SIP (Student Information Portal) Enhancements for BetterSEQTA+ Teach
 * This module provides enhancements and improvements to the SIP functionality
 * in SEQTA Teach platform
 */

import { isSEQTATeachSync } from "./platformDetection";
import { settingsState } from "./listeners/SettingsState";
import { delay } from "./delay";

let currentStudentId: string | null = null;
let isMonitoring = false;
let lastFormContainer: Element | null = null;

/**
 * Checks if we're currently on the SIP/pastoral care page
 */
function isOnSIPPage(): boolean {
  return !!document.querySelector('[class*="Pastoral__container"]');
}

/**
 * Extracts student identifier from the current page
 * Gets the student name from the FindAsYouType search box value
 */
function getCurrentStudentId(): string | null {
  // Look for the student name in the FindAsYouType value element
  // This is the search box that shows the current student name
  const studentNameElement = document.querySelector('[class*="FindAsYouType__value"]');
  
  if (studentNameElement) {
    const studentName = studentNameElement.textContent?.trim();
    if (studentName && studentName.length > 0) {
      return studentName;
    }
  }

  // Fallback: use URL path if name element not found
  // This helps track navigation even if the element isn't present yet
  return window.location.pathname;
}

/**
 * Clears the pastoral care form
 */
function clearPastoralForm(): void {
  const container = document.querySelector('[class*="Pastoral__container"]');
  if (!container) {
    return;
  }

  // Clear textarea (Details field)
  const textarea = container.querySelector('textarea');
  if (textarea) {
    textarea.value = '';
    // Trigger input event to ensure React/form state updates
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Clear points input (FancyNumberInput)
  const pointsInput = container.querySelector('[class*="FancyNumberInput"] input');
  if (pointsInput && pointsInput instanceof HTMLInputElement) {
    pointsInput.value = '0';
    pointsInput.dispatchEvent(new Event('input', { bubbles: true }));
    pointsInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Reset category dropdown if possible
  const categoryButton = container.querySelector('[class*="Pastoral__selector"] button');
  if (categoryButton) {
    // Try clicking to reset (may not work for all dropdowns)
    // This is a best-effort approach
  }

  console.debug("[BetterSEQTA+] Cleared pastoral care form");
}

/**
 * Monitors for student changes and clears form if enabled
 */
async function monitorStudentChanges(): Promise<void> {
  if (isMonitoring) {
    return;
  }
  isMonitoring = true;

  // Initial student ID
  currentStudentId = getCurrentStudentId();

  // Monitor URL changes (most reliable for student changes)
  let lastUrl = window.location.href;
  let lastPath = window.location.pathname;
  
  const checkForStudentChange = async () => {
    // Check if setting is enabled (default to true)
    const autoClearEnabled = settingsState.sipAutoClearOnStudentChange ?? true;
    if (!autoClearEnabled) {
      return;
    }

    // Check if we're on SIP page
    const isOnSIP = isOnSIPPage();
    
    if (!isOnSIP) {
      // Reset tracking when not on SIP page
      if (currentStudentId !== null) {
        currentStudentId = null;
      }
      return;
    }

    const newStudentId = getCurrentStudentId();
    
    // Check if student name changed (primary detection method)
    if (currentStudentId !== null && newStudentId !== null && currentStudentId !== newStudentId) {
      console.debug("[BetterSEQTA+] Student changed, clearing pastoral form", {
        old: currentStudentId,
        new: newStudentId
      });
      
      // Wait a bit for form to render
      await delay(200);
      clearPastoralForm();
      
      currentStudentId = newStudentId;
    } else if (isOnSIP && currentStudentId === null && newStudentId !== null) {
      // First time seeing a student on SIP page
      currentStudentId = newStudentId;
    } else if (isOnSIP && currentStudentId === null && newStudentId === null) {
      // Still waiting for student name to appear
      // This is fine, will be set on next check
    }
    
    // Also track URL changes as a secondary check
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    const urlChanged = currentUrl !== lastUrl;
    const pathChanged = currentPath !== lastPath;
    
    if (urlChanged || pathChanged) {
      lastUrl = currentUrl;
      lastPath = currentPath;
      
      // URL changed, wait a bit and re-check student name
      await delay(300);
      const updatedStudentId = getCurrentStudentId();
      
      // If student name changed, clear form
      if (currentStudentId !== null && updatedStudentId !== null && currentStudentId !== updatedStudentId) {
        console.debug("[BetterSEQTA+] Student changed (via URL), clearing pastoral form", {
          old: currentStudentId,
          new: updatedStudentId
        });
        
        await delay(200);
        clearPastoralForm();
        currentStudentId = updatedStudentId;
      } else if (updatedStudentId !== null) {
        // Update current student ID even if it didn't change (for tracking)
        currentStudentId = updatedStudentId;
      }
    }
  };

  // Check periodically for changes
  setInterval(checkForStudentChange, 500);

  // Also listen to popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    setTimeout(checkForStudentChange, 300);
  });

  // Override pushState/replaceState to catch programmatic navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(checkForStudentChange, 300);
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    setTimeout(checkForStudentChange, 300);
  };

  // Watch for DOM changes that might indicate student change or form appearance
  // This catches cases where React updates the page without URL change
  const observer = new MutationObserver(async (mutations) => {
    // Check if the pastoral form container was replaced (indicates new form/student)
    const currentFormContainer = document.querySelector('[class*="Pastoral__container"]');
    
    if (currentFormContainer && lastFormContainer && currentFormContainer !== lastFormContainer) {
      // Form container was replaced - likely a new student
      console.debug("[BetterSEQTA+] Pastoral form container replaced, checking for student change");
      await checkForStudentChange();
    }
    
    lastFormContainer = currentFormContainer;
    
    // Check if the student name in FindAsYouType value changed
    const hasStudentNameChange = mutations.some(mutation => {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const target = mutation.target as Node;
        // Check if mutation is in or near the FindAsYouType value element
        const findAsYouTypeValue = target instanceof Element 
          ? target.querySelector?.('[class*="FindAsYouType__value"]')
          : (target.parentElement?.querySelector?.('[class*="FindAsYouType__value"]') || 
             (target.parentElement?.classList?.contains('FindAsYouType__value') ? target.parentElement : null));
        
        if (findAsYouTypeValue || 
            (target instanceof Element && target.classList?.contains('FindAsYouType__value'))) {
          return true;
        }
      }
      return false;
    });
    
    // Also check for mutations near pastoral form or student-related elements
    const hasRelevantChanges = mutations.some(mutation => {
      if (mutation.type === 'childList') {
        const target = mutation.target as Element;
        // Check if mutation is near pastoral form or student-related elements
        return target.querySelector?.('[class*="Pastoral"]') !== null ||
               target.closest?.('[class*="Pastoral"]') !== null ||
               target.querySelector?.('[class*="FindAsYouType"]') !== null ||
               target.closest?.('[class*="FindAsYouType"]') !== null;
      }
      return false;
    });

    if (hasStudentNameChange || hasRelevantChanges) {
      await checkForStudentChange();
    }
  });

  // Observe the document body for changes
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  // Initial check
  checkForStudentChange();

  console.debug("[BetterSEQTA+] Started monitoring for student changes on SIP page");
}

/**
 * Initializes SIP enhancements for BetterSEQTA Teach
 * This function is called when BetterSEQTA Teach is loaded
 */
export async function initializeSIPEnhancements(): Promise<void> {
  // Only run on Teach platform
  if (!isSEQTATeachSync()) {
    console.debug("[BetterSEQTA+] Not on Teach platform, skipping SIP enhancements");
    return;
  }

  console.debug("[BetterSEQTA+] Initializing SIP enhancements");
  
  // Start monitoring for student changes
  await monitorStudentChanges();
}
