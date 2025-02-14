import localforage from 'localforage';
import base64ToBlob from '@/seqta/utils/base64ToBlob';

type Theme = {
  name: string;
  description: string;
  coverImage: string;
  marqueeImage: string;
  id: string;
}

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

function stripBase64Prefix(base64String: string): string {
  if (!base64String) return '';
  
  const prefixRegex = /^data:[^;]+;base64,/;
  try {
    // Check if the string actually has a base64 prefix
    if (prefixRegex.test(base64String)) {
      return base64String.replace(prefixRegex, '');
    }
    // If no prefix found, return the original string (assuming it's already base64)
    return base64String;
  } catch(err) {
    console.error('Error stripping base64 prefix:', err);
    return '';
  }
}

export const StoreDownloadTheme = async (theme: { themeContent: Theme }) => {
  if (!theme.themeContent.id) return;

  const themeContent = await fetch(`https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes/${theme.themeContent.id}/theme.json`);
  const themeData = await themeContent.json() as ThemeContent;

  await InstallTheme(themeData);
};

export const InstallTheme = async (themeData: ThemeContent) => {
  const strippedCoverImage = stripBase64Prefix(themeData.coverImage);
  console.log('1!')
  const coverImageBlob = base64ToBlob(strippedCoverImage);
  console.log('2!')
  const images = themeData.images.map((image) => ({
    ...image,
    blob: base64ToBlob(stripBase64Prefix(image.data))
  }));
  console.log('3!')
  let availableThemes = await localforage.getItem('customThemes') as string[];
  if (availableThemes && !availableThemes.includes(themeData.id)) {
    availableThemes.push(themeData.id);
  } else if (!availableThemes) {
    availableThemes = [themeData.id];
  }
  await localforage.setItem('customThemes', availableThemes);

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