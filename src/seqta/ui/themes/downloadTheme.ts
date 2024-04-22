//import PocketBase from 'pocketbase';
import localforage from 'localforage';
import { ThemesResponse } from '../../../interface/types/pocketbase-types';
import { CustomTheme } from '../../../interface/types/CustomThemes';

const DownloadTheme = async (theme: ThemesResponse & { theme: CustomTheme & { images: { id: string, variableName: string }[] } }) => {
  const images: { imageData: Blob, imageID: string }[] = []
  for (const imageID of theme.images) {
    console.log(theme.images, `https://betterseqta.pockethost.io/api/files/${theme.collectionId}/${theme.id}/${imageID}`);
    const image = await fetch(
      `https://betterseqta.pockethost.io/api/files/${theme.collectionId}/${theme.id}/${imageID}`
    )
    const imageData = await image.blob();

    images.push({ imageData, imageID });
  }

  const coverImage = await fetch(
    `https://betterseqta.pockethost.io/api/files/${theme.collectionId}/${theme.id}/${theme.coverImage}`
  );

  // add to temp storage index
  let availableThemes = await localforage.getItem('availableThemes') as string[];
  if (availableThemes && !availableThemes.includes(theme.theme.id)) {
    availableThemes.push(theme.theme.id);
  } else if (!availableThemes) {
    availableThemes = [theme.theme.id];
  }
  localforage.setItem('availableThemes', availableThemes);

  localforage.setItem(theme.theme.id, {
    ...theme.theme,
    webURL: theme.id,
    coverImage: await coverImage.blob(),
    CustomImages: theme.theme.images.map((image) => {
      return {
        ...image,
        blob: images.find((img) => {
          return image.id.includes(img.imageID.split('_')[0]);
        })?.imageData
      }
    })
  });
}

export default DownloadTheme;
