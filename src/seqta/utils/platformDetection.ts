/**
 * Platform detection utilities for SEQTA
 */

export type SEQTAPlatform = 'learn' | 'teach' | 'unknown';

/**
 * Detects which SEQTA platform we're currently on
 * @returns The detected platform type
 */
export function detectSEQTAPlatform(): SEQTAPlatform {
  const title = document.title.toLowerCase();
  
  if (title.includes('seqta learn')) {
    return 'learn';
  } else if (title.includes('seqta teach')) {
    return 'teach';
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
