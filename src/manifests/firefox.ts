import { createManifest } from "../../lib/createManifest"; // Import function to create a manifest file
import baseManifest from "./manifest.json"; // Import the base manifest file (JSON format)
import pkg from "../../package.json"; // Import package.json to access project details

// Define the updated manifest for the Firefox browser extension
const updatedFirefoxManifest = {
  ...baseManifest, // Spread properties from the base manifest
  version: pkg.version, // Set the version from package.json
  description: pkg.description, // Set the description from package.json
  background: {
    scripts: [baseManifest.background.service_worker], // Use the service worker from the base manifest for the background script
  },
  action: {
    default_popup: "interface/index.html#settings", // Set the default popup for the browser action
  },
  browser_specific_settings: {
    gecko: {
      id: pkg.author.email, // Set the Firefox-specific ID using the author's email from package.json
    },
  },
};

// Create a manifest for the Firefox browser extension
export const firefox = createManifest(updatedFirefoxManifest, "firefox");
