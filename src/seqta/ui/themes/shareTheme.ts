import PocketBase from 'pocketbase';
import { getTheme } from './getTheme';

const pb = new PocketBase('https://betterseqta.pockethost.io');

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

    const finalCoverImage = await fetch(coverImage as string).then((res) => res.blob());
    let finalImages: { id: string, data: Blob }[] = [];
    
    for (const image of CustomImages) {
      const finalImage = await fetch(image.url as string).then((res) => res.blob());

      finalImages.push({
        id: image.id,
        data: finalImage,
      });

    }


    // Prepare the non-file data for uploading
    const data = {
      name: themeData.name || 'Unnamed Theme',
      description: themeData.description || 'No description',
      downloads: '0', // Assuming initial value as 0
      theme: JSON.stringify({
        ...themeWithoutImages,
        images: [
          ...CustomImages.map((image) => ({
            id: image.id,
            variableName: image.variableName,
          })),
        ],
      }), // Convert theme data (excluding images) to JSON string
      submitted: true,
      coverImage: new File([finalCoverImage], 'coverImage.png'),
      images: [ ...finalImages.map((image) => new File([image.data], `${image.id}.png`)) ],
    };

    const record = await pb.collection('themes').create(data);

    console.debug('record', record);

    return record.id;
  } catch (error) {
    console.error('Error sharing theme:', error);

    return null;
  }
};

export default shareTheme;