import "./index.css"; // Import global styles for the application
import Settings from "./pages/settings.svelte"; // Import the Settings page component (Svelte)
import IconFamily from "@/resources/fonts/IconFamily.woff"; // Import custom icon font file (woff format)
import browser from "webextension-polyfill"; // Import webextension-polyfill for cross-browser compatibility
import renderSvelte from "./main"; // Import the function to render a Svelte component

// Function to inject custom icons into the document by creating a style tag
function InjectCustomIcons() {
  console.info("[BetterSEQTA+] Injecting Icons"); // Log info message to console

  const style = document.createElement("style"); // Create a new <style> element
  style.setAttribute("type", "text/css"); // Set the type attribute to CSS
  style.innerHTML = `
    @font-face {
      font-family: 'IconFamily'; /* Define font family name */
      src: url('${browser.runtime.getURL(IconFamily)}') format('woff'); /* Set the font file source */
      font-weight: normal; /* Set font weight */
      font-style: normal; /* Set font style */
    }`;
  document.head.appendChild(style); // Append the style to the document's head
}

const mountPoint = document.getElementById("app"); // Get the element with id 'app' for mounting the Svelte app
if (!mountPoint) {
  console.error("Mount point #app not found"); // Log error if the mount point is not found
  throw new Error("Mount point #app not found"); // Throw an error to stop execution
}

InjectCustomIcons(); // Call the function to inject custom icons into the document
renderSvelte(Settings, mountPoint, { standalone: true }); // Render the Settings component to the mount point with standalone option
