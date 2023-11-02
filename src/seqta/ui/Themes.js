import localforage from "localforage";

let currentThemeStyle = null;
let currentThemeClass = "";

// Utility function to fetch and parse JSON
const fetchJSON = async (url) => {
  const res = await fetch(url, {cache: "no-store"});
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

// Fetch theme details (CSS, images, className) from a given URL
const fetchThemeJSON = async (url) => {
  const { css, images, className } = await fetchJSON(url);
  const cssText = await fetchText(css);
  return { css: cssText, images, className };
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

// Apply theme from storage via localForage to document
const applyTheme = async (themeName) => {
  // Remove previous theme's style if it exists
  if (currentThemeStyle) {
    document.head.removeChild(currentThemeStyle);
    currentThemeStyle = null;
  }

  // Remove previous theme's class if it exists
  if (currentThemeClass) {
    document.body.classList.remove(currentThemeClass);
    currentThemeClass = "";
  }

  const { css, className, images } = await localforage.getItem(`css_${themeName}`);
  
  // Apply CSS
  const style = document.createElement("style");
  style.innerHTML = css;
  document.head.appendChild(style);
  currentThemeStyle = style; // Keep track of the new style element

  // Apply className
  if (className) {
    document.body.classList.add(className);
    currentThemeClass = className; // Keep track of the new class
  }

  // Apply images
  if (images) {
    await Promise.all(
      Object.keys(images).map(async (cssVar) => {
        const imageData = await localforage.getItem(`images_${themeName}_${cssVar}`);
        const objectURL = URL.createObjectURL(imageData);
        document.documentElement.style.setProperty(cssVar, `url(${objectURL})`);
      })
    );
  }
};
export const listThemes = async () => {
  const themes = await localforage.keys();
  return themes.filter((key) => key.startsWith("css_")).map((key) => key.replace("css_", ""));
};

export const downloadTheme = async (themeName, themeUrl) => {
  console.log(`Fetching theme ${themeName} from ${themeUrl}...`);
  const themeData = await fetchThemeJSON(themeUrl);
  await saveToIndexedDB(themeData, themeName);
  console.log(`Theme ${themeName} saved to IndexedDB`);
};

export const setTheme = async (themeName, themeUrl) => {
  if (!(await themeExistsInDB(themeName))) {
    await downloadTheme(themeName, themeUrl);
  }

  localforage.setItem("selectedTheme", themeName);
  await applyTheme(themeName).catch((error) => {
    console.error(`Failed to apply theme: ${error}`);
  });
};

export const enableCurrentTheme = async () => {
  const currentTheme = localforage.getItem("selectedTheme");
  
  if (currentTheme) {
    console.log(`Enabling current theme: ${currentTheme}`);
    await applyTheme(currentTheme).catch((error) => {
      console.error(`Failed to apply current theme: ${error}`);
    });
  } else {
    console.log("No current theme set in localforage.");
  }
};

export const disableTheme = async () => {
  // Remove current theme's style if it exists
  if (currentThemeStyle) {
    document.head.removeChild(currentThemeStyle);
    currentThemeStyle = null;
    console.log("Current theme's style removed.");
  }

  // Remove current theme's class if it exists
  if (currentThemeClass) {
    document.body.classList.remove(currentThemeClass);
    currentThemeClass = "";
    console.log("Current theme's class removed.");
  }

  // Remove any applied image URLs from the root element
  const currentTheme = localforage.getItem("selectedTheme");
  if (currentTheme) {
    const themeData = await localforage.getItem(`css_${currentTheme}`);
    if (themeData && themeData.images) {
      Object.keys(themeData.images).forEach(cssVar => {
        document.documentElement.style.removeProperty(cssVar);
      });
    }
    console.log("Current theme's images removed.");
  }

  // Clear the selected theme from localforage
  localforage.removeItem("selectedTheme");
  console.log("Current theme disabled.");
};