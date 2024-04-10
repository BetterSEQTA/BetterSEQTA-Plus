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

  console.log("Original Theme", theme);

  // add to temp storage index
  let availableThemes = await localforage.getItem('availableThemes') as string[];
  if (availableThemes && !availableThemes.includes(theme.theme.id)) {
    availableThemes.push(theme.theme.id);
  } else if (!availableThemes) {
    availableThemes = [theme.theme.id];
  }
  localforage.setItem('availableThemes', availableThemes);

  // save the theme to the temp storage
  localforage.setItem(theme.theme.id, {
    ...theme.theme,
    images: theme.theme.images.map((image) => {
      return {
        ...image,
        imageData: images.find((i) => i.imageID.split('_')[0] === image.id)?.imageData
      }
    })
  });
}

export default DownloadTheme;
