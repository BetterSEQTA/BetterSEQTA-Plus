// Function to convert a Blob to a base64 string
export const blobToBase64 = (blob: Blob) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); // Create a new FileReader instance

    // When the FileReader finishes loading the Blob, resolve the Promise with the base64 result
    reader.onload = () => {
      const base64 = reader.result as string; // Cast the result to string
      resolve(base64); // Resolve the promise with the base64 string
    };

    // If an error occurs while reading the Blob, reject the Promise
    reader.onerror = reject;

    // Start reading the Blob as a data URL (base64 encoded)
    reader.readAsDataURL(blob);
  });
};
