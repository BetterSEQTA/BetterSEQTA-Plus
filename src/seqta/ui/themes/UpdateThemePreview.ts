import type { CustomThemeBase64 } from '@/types/CustomThemes';
import { applyCustomCSS, imageData, removeImageFromDocument, UpdateImageData } from './Themes';
import { settingsState } from '@/seqta/utils/listeners/SettingsState';


export const UpdateThemePreview = async (updatedTheme: CustomThemeBase64 /* Omit<CustomTheme, 'CustomImages'> & { CustomImages: Omit<CustomImage, 'blob'>[] } */) => {
  const { CustomCSS, CustomImages, defaultColour } = updatedTheme;

  if (updatedTheme.forceDark != undefined) {
    if (updatedTheme.forceDark) {
      settingsState.DarkMode = true;
    } else {
      settingsState.DarkMode = false;
    }
  }

  // Update image data
  const currentImageIds = Object.keys(imageData);
  const updatedImageIds = CustomImages.map((image) => image.id);

  // Remove unused images from imageData and document
  currentImageIds.forEach((imageId) => {
    if (!updatedImageIds.includes(imageId)) {
      const { variableName } = imageData[imageId];
      removeImageFromDocument(variableName);
      delete imageData[imageId];
    }
  });

  // Update or add new images to imageData
  CustomImages.forEach((image) => {
    const existingImage = imageData[image.id];

    if (existingImage && existingImage.variableName !== image.variableName) {
      // Remove the previous variableName from the document
      removeImageFromDocument(existingImage.variableName);

      // Update the variableName in imageData
      imageData[image.id].variableName = image.variableName;

      // Update the variableName in the document
      document.documentElement.style.setProperty('--' + image.variableName, `url(${existingImage.url})`);
    }

    if (image.url) {
      UpdateImageData({
        id: image.id,
        base64: image.url
      });
    }

    imageData[image.id] = {
      url: imageData[image.id]?.url || '',
      variableName: image.variableName,
    };
  });

  // Apply custom CSS
  applyCustomCSS(CustomCSS);

  // Apply default color
  if (defaultColour !== '') {
    settingsState.selectedColor = defaultColour
  }
};
