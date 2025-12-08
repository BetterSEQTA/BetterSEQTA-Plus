/**
 * Platform detection utilities for SEQTA
 */

export type SEQTAPlatform = 'learn' | 'teach' | 'unknown';

/**
 * Detects which SEQTA platform we're currently on
 * Uses multiple methods to detect the platform, including title, URL, and DOM elements
 * @returns The detected platform type
 */
export function detectSEQTAPlatform(): SEQTAPlatform {
  // Method 1: Check document title
  const title = document.title.toLowerCase();
  if (title.includes('seqta learn')) {
    return 'learn';
  } else if (title.includes('seqta teach')) {
    return 'teach';
  }
  
  // Method 2: Check URL path
  const url = window.location.href.toLowerCase();
  if (url.includes('/learn/') || url.includes('/student/')) {
    return 'learn';
  } else if (url.includes('/teach/') || url.includes('/ta/')) {
    return 'teach';
  }
  
  // Method 3: Check for platform-specific DOM elements or classes
  // SEQTA Teach often has elements with 'ta' in class names or IDs
  const body = document.body;
  if (body) {
    const bodyClasses = body.className.toLowerCase();
    const bodyId = body.id.toLowerCase();
    
    // Check for teach-specific indicators
    if (bodyClasses.includes('teach') || bodyId.includes('teach') ||
        document.querySelector('[class*="ta"]') ||
        document.querySelector('[id*="ta"]')) {
      return 'teach';
    }
    
    // Check for learn-specific indicators
    if (bodyClasses.includes('learn') || bodyId.includes('learn') ||
        document.querySelector('[class*="learn"]') ||
        document.querySelector('[id*="learn"]')) {
      return 'learn';
    }
  }
  
  return 'unknown';
}

/**
 * Checks if we're currently on SEQTA Learn
 * @returns true if on SEQTA Learn, false otherwise
 */
export function isSEQTALearn(): boolean {
  return detectSEQTAPlatform() === 'learn';
}

/**
 * Checks if we're currently on SEQTA Teach
 * @returns true if on SEQTA Teach, false otherwise
 */
export function isSEQTATeach(): boolean {
  return detectSEQTAPlatform() === 'teach';
}
