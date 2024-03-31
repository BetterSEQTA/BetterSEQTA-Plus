import browser from 'webextension-polyfill'
import localforage from 'localforage';

let currentThemeClass = '';

// Utility function to fetch and parse JSON
const fetchJSON = async (url: any) => {
  const res = await fetch(url, {cache: 'no-store'});
  return await res.json();
};

// Utility function to fetch and parse text
const fetchText = async (url: any) => {
  const res = await fetch(url);
  return await res.text();
};

// Check if the theme already exists in IndexedDB
const themeExistsInDB = async (themeName: any) => {
  return (await localforage.getItem(`css_${themeName}`)) !== null;
};

// Fetch theme details (CSS, images, className, darkMode, defaultColour) from a given URL
const fetchThemeJSON = async (url: any) => {
  const { css, images, className, darkMode, defaultColour } = await fetchJSON(url);
  const cssText = await fetchText(css);
  return { css: cssText, images, className, darkMode, defaultColour };
};

// Save individual image to IndexedDB
const saveImageToDB = async (themeName: any, cssVar: any, imageUrl: any) => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(response.statusText);
    const blob = await response.blob();
    await localforage.setItem(`images_${themeName}_${cssVar}`, blob);
  } catch (error) {
    console.error(`Failed to save image for ${cssVar}: ${error}`);
  }
};

// Save theme details to storage via localForage
const saveToIndexedDB = async (theme: any, themeName: any) => {
  await localforage.setItem(`css_${themeName}`, theme);
  await Promise.all(Object.entries(theme.images).map(([cssVar, imageUrl]) => saveImageToDB(themeName, cssVar, imageUrl)));
};

declare global {
  interface Window {
      currentThemeStyle: any;
      currentThemeClass: any;
  }
}

// Apply theme from storage via localForage to document, including dark mode and default color
const applyTheme = async (themeName: any) => {
  const { css, className, images, darkMode, defaultColour }: any = await localforage.getItem(`css_${themeName}`);
  
  const newStyle = document.createElement('style');
  newStyle.innerHTML = css;
  document.head.appendChild(newStyle);
  
  if (window.currentThemeStyle) {
    document.head.removeChild(window.currentThemeStyle);
  }

  window.currentThemeStyle = newStyle;

  if (window.currentThemeClass) {
    document.body.classList.remove(window.currentThemeClass);
  }
  if (className) {
    document.body.classList.add(className);
    window.currentThemeClass = className;
  }

  if (images) {
    await Promise.all(
      Object.keys(images).map(async (cssVar) => {
        const imageData: any = await localforage.getItem(`images_${themeName}_${cssVar}`);
        const objectURL = URL.createObjectURL(imageData);
        document.documentElement.style.setProperty(cssVar, `url(${objectURL})`);
      })
    );
  }

  browser.storage.local.set({ DarkMode: darkMode, selectedColor: defaultColour });
};

export const listThemes = async () => {
  const themes = await localforage.keys();
  return {
    themes: themes.filter((key) => key.startsWith('css_')).map((key) => key.replace('css_', '')),
    selectedTheme: await localforage.getItem('selectedTheme')
  };
};

export const downloadTheme = async (themeName: any, themeUrl: any) => {
  const themeData = await fetchThemeJSON(themeUrl);
  await saveToIndexedDB(themeData, themeName);
  await setTheme(themeName, themeUrl);
};

export const deleteTheme = async (themeName: any) => {
  const currentTheme = await localforage.getItem('selectedTheme');
  if (currentTheme === themeName) {
    await disableTheme();
  }
  await localforage.removeItem(`css_${themeName}`);
  await Promise.all(
    (await localforage.keys()).filter((key) => key.startsWith(`images_${themeName}`)).map((key) => localforage.removeItem(key))
  );
};

export const setTheme = async (themeName: any, themeUrl: any) => {
  if (!(await themeExistsInDB(themeName))) {
    await downloadTheme(themeName, themeUrl);
  }

  await localforage.setItem('selectedTheme', themeName);
  await applyTheme(themeName).catch((error) => {
    console.error(`Failed to apply theme: ${error}`);
  });
};

export const enableCurrentTheme = async () => {
  const currentTheme = await localforage.getItem('selectedTheme');
  
  if (currentTheme) {
    await applyTheme(currentTheme).catch((error) => {
      console.error(`Failed to apply current theme: ${error}`);
    });
  }
};

export const disableTheme = async () => {
  // Remove current theme's style if it exists
  if (window.currentThemeStyle) {
    document.head.removeChild(window.currentThemeStyle);
    window.currentThemeStyle = null;
  }

  // Remove current theme's class if it exists
  if (currentThemeClass) {
    document.body.classList.remove(currentThemeClass);
    currentThemeClass = '';
  }

  // Remove any applied image URLs from the root element
  const currentTheme = await localforage.getItem('selectedTheme');
  if (currentTheme) {
    const themeData: any = await localforage.getItem(`css_${currentTheme}`);
    if (themeData && themeData.images) {
      Object.keys(themeData.images).forEach(cssVar => {
        document.documentElement.style.removeProperty(cssVar);
      });
    }
  }

  // Clear the selected theme from localforage
  localforage.removeItem('selectedTheme');
};

const imageData: Record<string, { url: string; variableName: string }> = {};

export const UpdateThemePreview = async (updatedTheme: CustomTheme) => {
  const { CustomCSS, CustomImages, defaultColour } = updatedTheme;

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
    }

    imageData[image.id] = {
      url: updateImage(image),
      variableName: image.variableName,
    };
  });

  // Apply custom CSS
  applyCustomCSS(CustomCSS);

  // Apply default color
  if (defaultColour !== '') {
    browser.storage.local.set({ selectedColor: defaultColour });
  }

  // Apply custom images
  CustomImages.forEach((image) => {
    const imageUrl = imageData[image.id]?.url;
    if (imageUrl) {
      document.documentElement.style.setProperty('--' + image.variableName, `url(${imageUrl})`);
    }
  });
};

function applyCustomCSS(customCSS: string) {
  let styleElement = document.getElementById('theme-preview-styles');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'theme-preview-styles';
    document.head.appendChild(styleElement);
  }
  styleElement.textContent = customCSS;
}

function removeImageFromDocument(variableName: string) {
  document.documentElement.style.removeProperty('--' + variableName);
}

export function updateImage(image: CustomImage) {
  // Extract base64 data from the data URI
  const base64Index = image.url.indexOf(',') + 1;
  const imageBase64 = image.url.substring(base64Index);

  // Convert base64 to blob
  const byteCharacters = atob(imageBase64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  // Convert blob to blob URL
  const imageUrl = URL.createObjectURL(blob);

  return imageUrl;
}