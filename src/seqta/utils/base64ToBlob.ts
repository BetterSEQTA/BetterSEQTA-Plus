// Function to convert a base64 string to a Blob
const base64ToBlob = (base64: string, contentType: string = ""): Blob => {
  const byteCharacters = atob(base64); // Decode base64 string to characters
  const byteArrays: Uint8Array[] = []; // Array to hold byte arrays

  // Loop through the byteCharacters in chunks of 512 characters
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512); // Get a chunk of characters
    const byteNumbers = new Array(slice.length); // Create an array to hold byte values

    // Convert each character to its byte value
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i); // Get the char code of the character
    }

    const byteArray = new Uint8Array(byteNumbers); // Create a Uint8Array from byte numbers
    byteArrays.push(byteArray); // Add the byte array to the byteArrays list
  }

  // Return a new Blob from the byte arrays with the specified content type
  return new Blob(byteArrays, { type: contentType });
};

export default base64ToBlob; // Export the function as default
