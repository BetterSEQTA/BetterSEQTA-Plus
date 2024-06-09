import { settingsState } from "../utils/listeners/SettingsState";

/**
 * Update the background animation durations based on the slider input.
 * @param {Object} item - The object containing the bksliderinput property.
 * @param {number} [minDuration=1] - The minimum animation duration in seconds.
 * @param {number} [maxDuration=10] - The maximum animation duration in seconds.
 */
export function updateBgDurations() {
  // Class names to look for
  const bgClasses = ['bg', 'bg2', 'bg3'];
    
  // Function to calculate animation duration
  const calcDuration = (
    baseValue: number, 
    offset = 0, 
    minBase = 50, 
    maxBase = 150, 
  ) => {
    const scaledValue = 2 + ((maxBase - baseValue) / (maxBase - minBase)) ** 4;
    return scaledValue + offset;
  };
    
  // Iterate through each class name to update its animation duration
  bgClasses.forEach((className, index) => {
    const elements = document.getElementsByClassName(className);

    if (elements.length === 0) {
      return;
    }
    
    const offset = index * 0.05;
    const duration = calcDuration(parseInt(settingsState.bksliderinput), offset);
    (elements[0] as HTMLElement).style.animationDuration = `${duration}s`;
    (elements[0] as HTMLElement).style.animationDelay = `${offset * 5}s`;
  });
}