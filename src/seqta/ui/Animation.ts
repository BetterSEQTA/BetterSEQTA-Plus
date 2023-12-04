/**
 * Update the background animation durations based on the slider input.
 * @param {Object} item - The object containing the bksliderinput property.
 * @param {number} [minDuration=1] - The minimum animation duration in seconds.
 * @param {number} [maxDuration=10] - The maximum animation duration in seconds.
 */
export function updateBgDurations(speed: any, minDuration = 0.5, maxDuration = 10) {
  // Class names to look for
  const bgClasses = ['bg', 'bg2', 'bg3'];
  let reversedValue: any;

  if (speed.bksliderinput === undefined) {
    // Reverse the slider direction to align with the animation
    reversedValue = 150 - speed;
  } else {
    reversedValue = 150 - speed.bksliderinput;
  }
  
  // Range of possible animation durations
  const durationRange = maxDuration - minDuration;
  
  // Function to calculate animation duration
  const calcDuration = (baseValue: number, offset = 0) => minDuration + ((baseValue / 200) + offset) * durationRange;
  
  // Iterate through each class name to update its animation duration
  bgClasses.forEach((className, index) => {
    const elements = document.getElementsByClassName(className);

    if (elements.length === 0) {
      return;
    }
    
    const offset = index * 0.05;
    const duration = calcDuration(reversedValue, offset);
    (elements[0] as HTMLElement).style.animationDuration = `${duration}s`;
  });
}