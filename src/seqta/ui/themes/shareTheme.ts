import { getTheme } from './getTheme';

const saveThemeFile = (data: object, fileName: string) => {
  const fileData = JSON.stringify(data, null, 2);
  const blob = new Blob([fileData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.json.theme`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const shareTheme = async (themeID: string) => {
  try {
    // Use getTheme to retrieve the theme data
    const themeData = await getTheme(themeID);
    if (!themeData) {
      console.error('Failed to retrieve theme data');
      return;
    }

    // Extract images and coverImage from themeData, if they exist
    const { CustomImages = [], coverImage, ...themeWithoutImages } = themeData;

    // Helper function to convert Blob to Base64
    const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Convert cover image to Base64
    let coverImageBase64 = null;
    if (coverImage) {
      coverImageBase64 = await blobToBase64(coverImage);
    }

    // Convert custom images to Base64
    const finalImages = await Promise.all(CustomImages.map(async (image) => {
      const imageBase64 = await blobToBase64(image.blob);
      return {
        id: image.id,
        variableName: image.variableName,
        data: imageBase64,
      };
    }));

    // Prepare the non-file data for uploading
    const data = {
      ...themeWithoutImages,
      images: finalImages.map((image) => ({
        id: image.id,
        variableName: image.variableName,
        data: image.data,
      })),
      coverImage: coverImageBase64,
    };

    saveThemeFile(data, themeData.name || 'Unnamed_Theme');
  } catch (error) {
    console.error('Error sharing theme:', error);
  }
};

export default shareTheme;