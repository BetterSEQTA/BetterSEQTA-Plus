import localforage from "localforage";

// 🎨 Theme Management Functions 🎨

// Fetch theme details (CSS, images, className) from a given URL
async function fetchThemeJSON(url) {
  console.log("Fetching theme from:", url);
  const response = await fetch(url);
  const data = await response.json();
  
  const cssResponse = await fetch(data.css);
  const cssText = await cssResponse.text();
  
  return {
    css: cssText,
    images: data.images,
    className: data.className
  };
}

// Save theme details to storage via localForage
async function saveToIndexedDB(theme, themeName) {
  console.log("Saving theme to IndexedDB:", themeName);
  await localforage.setItem(`css_${themeName}`, { css: theme.css, className: theme.className, images: theme.images });

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

// Apply theme from storage via localForage to document
async function applyTheme(themeName) {
  console.log("Applying theme:", themeName);
  const themeData = await localforage.getItem(`css_${themeName}`);
  console.log("Retrieved Theme Data:", themeData); // Debugging info
  
  const style = document.createElement("style");
  style.innerHTML = themeData.css;
  document.head.appendChild(style);

  document.body.className = themeData.className;

  if (themeData.images) {
    for (const cssVar of Object.keys(themeData.images)) {
      const imageData = await localforage.getItem(`images_${themeName}_${cssVar}`);
      console.log(imageData);
      const objectURL = URL.createObjectURL(imageData);
      console.log("Applying image:", objectURL);
      document.documentElement.style.setProperty(cssVar, `url(${objectURL})`);
    }
  } else {
    console.error("themeData.images is not defined!");
  }
}

// Save available themes to localStorage
function saveAvailableThemes(themeList) {
  localStorage.setItem("availableThemes", JSON.stringify(themeList));
}

// Set the currently selected theme in localStorage
function setSelectedTheme(themeName) {
  localStorage.setItem("selectedTheme", themeName);
}

// 🚀 Main function to orchestrate everything 🚀
export async function EnableThemes() {
  console.log("Enabling themes!");
  const availableThemes = [
    { name: "dark", url: "https://raw.githubusercontent.com/SethBurkart123/BetterSEQTA-Themes/main/themes/test.json" }
  ];

  saveAvailableThemes(availableThemes);

  const themeToApply = availableThemes[0].name;
  const themeData = await fetchThemeJSON(availableThemes[0].url);

  await saveToIndexedDB(themeData, themeToApply);
  setSelectedTheme(themeToApply);
  await applyTheme(themeToApply).catch((error) => {
    console.error("Error while applying theme:", error);
  });
}