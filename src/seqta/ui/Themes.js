import localforage from 'localforage';
import { updateAllColors } from '../ui/colors/Manager.js';

let currentThemeClass = '';

// Utility function to fetch and parse JSON
const fetchJSON = async (url) => {
  const res = await fetch(url, {cache: 'no-store'});
  return await res.json();
};

// Utility function to fetch and parse text
const fetchText = async (url) => {
  const res = await fetch(url);
  return await res.text();
};

// Check if the theme already exists in IndexedDB
const themeExistsInDB = async (themeName) => {
  return (await localforage.getItem(`css_${themeName}`)) !== null;
};

// Fetch theme details (CSS, images, className, darkMode, defaultColour) from a given URL
const fetchThemeJSON = async (url) => {
  const { css, images, className, darkMode, defaultColour } = await fetchJSON(url);
  const cssText = await fetchText(css);
  return { css: cssText, images, className, darkMode, defaultColour };
};

// Save individual image to IndexedDB
const saveImageToDB = async (themeName, cssVar, imageUrl) => {
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
const saveToIndexedDB = async (theme, themeName) => {
  await localforage.setItem(`css_${themeName}`, theme);
  await Promise.all(Object.entries(theme.images).map(([cssVar, imageUrl]) => saveImageToDB(themeName, cssVar, imageUrl)));
};

// Apply theme from storage via localForage to document, including dark mode and default color
const applyTheme = async (themeName) => {
  const { css, className, images, darkMode, defaultColour } = await localforage.getItem(`css_${themeName}`);
  
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
        const imageData = await localforage.getItem(`images_${themeName}_${cssVar}`);
        const objectURL = URL.createObjectURL(imageData);
        document.documentElement.style.setProperty(cssVar, `url(${objectURL})`);
      })
    );
  }

  // Update colors based on theme settings
  updateAllColors(darkMode, defaultColour);
};

export const listThemes = async () => {
  const themes = await localforage.keys();
  return {
    themes: themes.filter((key) => key.startsWith('css_')).map((key) => key.replace('css_', '')),
    selectedTheme: await localforage.getItem('selectedTheme')
  };
};

export const downloadTheme = async (themeName, themeUrl) => {
  const themeData = await fetchThemeJSON(themeUrl);
  await saveToIndexedDB(themeData, themeName);
  await setTheme(themeName, themeUrl);
};

export const deleteTheme = async (themeName) => {
  const currentTheme = await localforage.getItem('selectedTheme');
  if (currentTheme === themeName) {
    await disableTheme();
  }
  await localforage.removeItem(`css_${themeName}`);
  await Promise.all(
    (await localforage.keys()).filter((key) => key.startsWith(`images_${themeName}`)).map((key) => localforage.removeItem(key))
  );
};

export const setTheme = async (themeName, themeUrl) => {
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
    const themeData = await localforage.getItem(`css_${currentTheme}`);
    if (themeData && themeData.images) {
      Object.keys(themeData.images).forEach(cssVar => {
        document.documentElement.style.removeProperty(cssVar);
      });
    }
  }

  // Clear the selected theme from localforage
  localforage.removeItem('selectedTheme');
};