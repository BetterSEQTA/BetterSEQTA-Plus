//import PocketBase from 'pocketbase';
import localforage from 'localforage';
import { ThemesResponse } from '../../../interface/types/pocketbase-types';
import { CustomTheme } from '../../../interface/types/CustomThemes';
import { Theme } from '../../../interface/pages/Store';

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

type ThemeContent = {
  id: string;
  name: string;
  coverImage: string;
  description: string;
  defaultColour: string;
  CanChangeColour: boolean;
  CustomCSS: string;
  hideThemeName: boolean;
  images: { id: string, variableName: string }[];
}

export const StoreDownloadTheme = async (theme: { themeContent: Theme }) => {
  console.log(theme.themeContent.id);
  if (!theme.themeContent.id) return;
  const themeContent = await fetch(`https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes/${theme.themeContent.id}/theme.json`);
  const themeData = await themeContent.json() as ThemeContent;

  const images: { imageData: Blob, imageID: string }[] = []
  for (const image of themeData.images) {
    const data = await fetch(
      `https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes/${themeData.id}/images/${image.id}`
    )
    const imageData = await data.blob();

    images.push({ imageData, imageID: image.id });
  }

  const coverImage = await fetch(
    `https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes/${themeData.id}/images/${themeData.coverImage}`
  );

  // add to temp storage index
  let availableThemes = await localforage.getItem('availableThemes') as string[];
  if (availableThemes && !availableThemes.includes(themeData.id)) {
    availableThemes.push(themeData.id);
  } else if (!availableThemes) {
    availableThemes = [themeData.id];
  }
  localforage.setItem('availableThemes', availableThemes);

  localforage.setItem(themeData.id, {
    ...themeData,
    webURL: theme.themeContent.id,
    coverImage: await coverImage.blob(),
    CustomImages: themeData.images.map((image) => {
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
