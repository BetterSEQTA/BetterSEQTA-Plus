import type { LoadedCustomTheme } from "@/types/CustomThemes";

/**
 * Generates a random 9-character alphanumeric string to be used as a unique ID for images.
 * This helps in identifying and managing custom images within a theme.
 *
 * @returns {string} A randomly generated unique ID string.
 */
export function generateImageId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Handles the upload of a new custom image from a file input event.
 * If a file is selected, it reads the file using FileReader, converts it to a Blob,
 * generates a unique ID and a default variable name for it, and then adds this new image
 * to the `CustomImages` array within the provided `theme` object.
 *
 * @param {Event} event The file input change event, typically from an `<input type="file">` element.
 * @param {LoadedCustomTheme} theme The current theme object to which the new image will be added.
 * @returns {Promise<LoadedCustomTheme> | LoadedCustomTheme} A Promise that resolves with the updated theme object
 *                                                          containing the new image if a file was processed.
 *                                                          Returns the original theme object synchronously if no file was selected.
 */
export function handleImageUpload(
  event: Event,
  theme: LoadedCustomTheme,
): Promise<LoadedCustomTheme> | LoadedCustomTheme {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageBlob = await fetch(reader.result as string).then((res) =>
          res.blob(),
        );
        const imageId = generateImageId();
        const variableName = `custom-image-${theme.CustomImages.length}`;
        resolve({
          ...theme,
          CustomImages: [
            ...theme.CustomImages,
            { id: imageId, blob: imageBlob, variableName, url: null },
          ],
        });
      };
      reader.readAsDataURL(file);
    });
  }
  return theme;
}

/**
 * Removes a custom image from the theme based on its ID.
 * It filters out the image with the specified `imageId` from the `CustomImages` array
 * in the `theme` object.
 *
 * @param {string} imageId The unique ID of the custom image to be removed.
 * @param {LoadedCustomTheme} theme The current theme object from which the image will be removed.
 * @returns {LoadedCustomTheme} A new theme object with the specified image removed from its `CustomImages` array.
 *                              This function is synchronous.
 */
export function handleRemoveImage(
  imageId: string,
  theme: LoadedCustomTheme,
): LoadedCustomTheme {
  return {
    ...theme,
    CustomImages: theme.CustomImages.filter((image) => image.id !== imageId),
  } as LoadedCustomTheme;
}

/**
 * Updates the CSS variable name associated with a specific custom image in the theme.
 * It finds the image by `imageId` in the `CustomImages` array of the `theme` object
 * and updates its `variableName` property.
 *
 * @param {string} imageId The unique ID of the custom image whose variable name is to be updated.
 * @param {string} variableName The new CSS variable name to assign to the image.
 * @param {LoadedCustomTheme} theme The current theme object containing the image to be updated.
 * @returns {LoadedCustomTheme} A new theme object with the updated image variable name.
 *                              This function is synchronous.
 */
export function handleImageVariableChange(
  imageId: string,
  variableName: string,
  theme: LoadedCustomTheme,
): LoadedCustomTheme {
  return {
    ...theme,
    CustomImages: theme.CustomImages.map((image) =>
      image.id === imageId ? { ...image, variableName } : image,
    ),
  } as LoadedCustomTheme;
}

/**
 * Handles the upload of a cover image for the theme from a file input event.
 * If a file is selected, it reads the file using FileReader, converts it to a Blob,
 * and then updates the `coverImage` property of the provided `theme` object with this new blob.
 *
 * @param {Event} event The file input change event, typically from an `<input type="file">` element.
 * @param {LoadedCustomTheme} theme The current theme object whose cover image will be updated.
 * @returns {Promise<LoadedCustomTheme>} A Promise that resolves with the updated theme object
 *                                       containing the new cover image if a file was processed.
 *                                       Returns a Promise resolving with the original theme object if no file was selected.
 */
export function handleCoverImageUpload(
  event: Event,
  theme: LoadedCustomTheme,
): Promise<LoadedCustomTheme> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageBlob = await fetch(reader.result as string).then((res) =>
          res.blob(),
        );
        resolve({ ...theme, coverImage: imageBlob });
      };
      reader.readAsDataURL(file);
    });
  }
  return Promise.resolve(theme);
}
