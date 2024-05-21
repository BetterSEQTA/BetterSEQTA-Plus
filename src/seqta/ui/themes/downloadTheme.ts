import localforage from 'localforage';
import { Theme } from '../../../interface/pages/Store';
import base64ToBlob from '../../utils/base64ToBlob';

type ThemeContent = {
  id: string;
  name: string;
  coverImage: string; // base64
  description: string;
  defaultColour: string;
  CanChangeColour: boolean;
  CustomCSS: string;
  hideThemeName: boolean;
  images: { id: string, variableName: string, data: string }[]; // data: base64
};

export const StoreDownloadTheme = async (theme: { themeContent: Theme }) => {
  console.log(theme.themeContent.id);
  if (!theme.themeContent.id) return;

  const themeContent = await fetch(`https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes/${theme.themeContent.id}/theme.json`);
  const themeData = await themeContent.json() as ThemeContent;

  await InstallTheme(themeData);
};

export const InstallTheme = async (themeData: ThemeContent) => {
  const coverImageBlob = base64ToBlob(themeData.coverImage);

  const images = themeData.images.map((image) => ({
    ...image,
    blob: base64ToBlob(image.data)
  }));

  let availableThemes = await localforage.getItem('availableThemes') as string[];
  if (availableThemes && !availableThemes.includes(themeData.id)) {
    availableThemes.push(themeData.id);
  } else if (!availableThemes) {
    availableThemes = [themeData.id];
  }
  await localforage.setItem('availableThemes', availableThemes);

  await localforage.setItem(themeData.id, {
    ...themeData,
    webURL: themeData.id,
    coverImage: coverImageBlob,
    CustomImages: themeData.images.map((image) => {
      return {
        ...image,
        blob: images.find((img) => image.id === img.id)?.blob
      };
    })
  });
};