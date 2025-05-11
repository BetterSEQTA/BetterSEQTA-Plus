// Function to create a delay using a promise
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms)); // Resolves after the specified number of milliseconds
}
