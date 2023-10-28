/* global localforage */

/**
 * 🎨 Theme Management Functions 🎨
 */

/**
 * Fetches theme details (CSS, images, className) from a given URL.
 * @param {string} url - The URL to fetch theme JSON from.
 * @returns {Object} - Theme details including CSS, images, and class name.
 */
async function fetchThemeJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch theme JSON: ${response.statusText}`);
  }
  const data = await response.json();

  const cssResponse = await fetch(data.css);
  if (!cssResponse.ok) {
    throw new Error(`Failed to fetch CSS: ${cssResponse.statusText}`);
  }
  const cssText = await cssResponse.text();

  return {
    css: cssText,
    images: data.images,
    className: data.className,
  };
}

/**
 * Saves theme details to IndexedDB storage via localForage.
 * @param {Object} theme - Theme details to be saved.
 * @param {string} themeName - The name to identify the theme.
 */
async function saveToIndexedDB(theme, themeName) {
  await localforage.setItem(`css_${themeName}`, {
    css: theme.css,
    className: theme.className,
    images: theme.images,
  });

  for (const [cssVar, imageUrl] of Object.entries(theme.images)) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error(`Failed to fetch image: ${response.statusText}`);
        continue;
      }
      const blob = await response.blob();
      await localforage.setItem(`images_${themeName}_${cssVar}`, blob);
    } catch (error) {
      console.error(`Error while handling image for ${cssVar}: ${error}`);
    }
  }
}

/**
 * Applies theme from storage to the document.
 * @param {string} themeName - The name of the theme to apply.
 */
async function applyTheme(themeName) {
  const themeData = await localforage.getItem(`css_${themeName}`);
  if (!themeData) {
    throw new Error(`No theme data found for ${themeName}`);
  }

  const style = document.createElement("style");
  style.innerHTML = themeData.css;
  document.head.appendChild(style);

  document.body.className = themeData.className;

  if (themeData.images) {
    for (const cssVar of Object.keys(themeData.images)) {
      const imageData = await localforage.getItem(`images_${themeName}_${cssVar}`);
      const objectURL = URL.createObjectURL(imageData);
      document.documentElement.style.setProperty(cssVar, `url(${objectURL})`);
    }
  } else {
    console.error("themeData.images is not defined!");
  }
}

/**
 * 🛠️ Utility Functions 🛠️
 */

/**
 * Saves the list of available themes to local storage.
 * @param {Array} themeList - An array of available themes.
 */
function saveAvailableThemes(themeList) {
  localStorage.setItem("availableThemes", JSON.stringify(themeList));
}

/**
 * Sets the currently selected theme in local storage.
 * @param {string} themeName - The name of the selected theme.
 */
function setSelectedTheme(themeName) {
  localStorage.setItem("selectedTheme", themeName);
}

/**
 * 🚀 Main Function to Orchestrate Everything 🚀
 */
(async () => {
  try {
    const availableThemes = [
      { name: "dark", url: "https://raw.githubusercontent.com/SethBurkart123/BetterSEQTA-Themes/main/themes/test.json" },
    ];

    saveAvailableThemes(availableThemes);

    const themeToApply = availableThemes[0].name;
    const themeData = await fetchThemeJSON(availableThemes[0].url);

    await saveToIndexedDB(themeData, themeToApply);
    setSelectedTheme(themeToApply);
    await applyTheme(themeToApply);
  } catch (error) {
    console.error(`An error occurred: ${error}`);
  }
})();