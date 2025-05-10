import { createManifest } from "../../lib/createManifest"; // Import function to create a manifest file
import baseManifest from "./manifest.json"; // Import the base manifest file (JSON format)
import pkg from "../../package.json"; // Import package.json to access project details

// Create a manifest for the Brave browser extension, merging base manifest with version and description from package.json
export const brave = createManifest(
  {
    ...baseManifest, // Spread properties from the base manifest
    version: pkg.version, // Set the version from package.json
    description: pkg.description, // Set the description from package.json
  },
  "brave", // Specify "brave" as the target platform
);
