import type { LoadedCustomTheme } from "@/types/CustomThemes"; // Import the type for custom themes

// Generates a random image ID using base-36 encoding
export function generateImageId(): string {
  return Math.random().toString(36).substr(2, 9); // Generates a short, random alphanumeric string
}

// Handles image upload and adds the image to the custom theme
export function handleImageUpload(
  event: Event,
  theme: LoadedCustomTheme,
): Promise<LoadedCustomTheme> | LoadedCustomTheme {
  const input = event.target as HTMLInputElement; // Cast the event target as an HTML input element
  const file = input.files?.[0]; // Get the first selected file
  input.value = ""; // Reset the input value to allow re-uploading the same file
  if (file) {
    return new Promise((resolve) => {
      const reader = new FileReader(); // Create a FileReader to read the file
      reader.onload = async () => {
        const imageBlob = await fetch(reader.result as string).then((res) =>
          res.blob(), // Convert the result to a Blob object
        );
        const imageId = generateImageId(); // Generate a unique ID for the image
        const variableName = `custom-image-${theme.CustomImages.length}`; // Create a variable name based on the current number of custom images
        resolve({
          ...theme,
          CustomImages: [
            ...theme.CustomImages,
            { id: imageId, blob: imageBlob, variableName, url: null }, // Add the new image to the theme
          ],
        });
      };
      reader.readAsDataURL(file); // Read the file as a data URL
    });
  }
  return theme; // If no file is selected, return the original theme
}

// Removes an image from the custom theme by its ID
export function handleRemoveImage(
  imageId: string,
  theme: LoadedCustomTheme,
): LoadedCustomTheme {
  return {
    ...theme,
    CustomImages: theme.CustomImages.filter((image) => image.id !== imageId), // Filter out the image with the matching ID
  } as LoadedCustomTheme;
}

// Updates the variable name of an image in the custom theme
export function handleImageVariableChange(
  imageId: string,
  variableName: string,
  theme: LoadedCustomTheme,
): LoadedCustomTheme {
  return {
    ...theme,
    CustomImages: theme.CustomImages.map((image) =>
      image.id === imageId ? { ...image, variableName } : image, // Update the variable name for the matching image
    ),
  } as LoadedCustomTheme;
}

// Handles uploading a cover image and updates the theme's cover image property
export function handleCoverImageUpload(
  event: Event,
  theme: LoadedCustomTheme,
): Promise<LoadedCustomTheme> {
  const input = event.target as HTMLInputElement; // Cast the event target as an HTML input element
  const file = input.files?.[0]; // Get the first selected file
  input.value = ""; // Reset the input value
  if (file) {
    return new Promise((resolve) => {
      const reader = new FileReader(); // Create a FileReader to read the file
      reader.onload = async () => {
        const imageBlob = await fetch(reader.result as string).then((res) =>
          res.blob(), // Convert the result to a Blob object
        );
        resolve({ ...theme, coverImage: imageBlob }); // Update the theme with the new cover image
      };
      reader.readAsDataURL(file); // Read the file as a data URL
    });
  }
  return Promise.resolve(theme); // If no file is selected, return the original theme in a resolved promise
}
