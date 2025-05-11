// Function to create a debounced version of a function
export default function debounce<T extends (...args: any[]) => void>(
  fn: T, // The function to be debounced
  delay: number, // The delay (in milliseconds) after which the function will be called
): (...args: Parameters<T>) => void { // Returns a debounced version of the function
  let timeout: ReturnType<typeof setTimeout>; // Variable to store the timeout ID

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    // Clears the previous timeout each time the function is called
    clearTimeout(timeout);

    // Sets a new timeout to call the function after the specified delay
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}
