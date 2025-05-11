import { createManifest } from "../../lib/createManifest"; // Imports the createManifest function from a local module.
import baseManifest from "./manifest.json"; // Imports the base manifest configuration from a JSON file.
import pkg from "../../package.json"; // Imports package information, including version and description.

// Creates a new manifest by combining the base manifest, version, and description from the package.json.
export const opera = createManifest(
  {
    ...baseManifest, // Spreads the base manifest properties into the new object.
    version: pkg.version, // Sets the version from the package.json.
    description: pkg.description, // Sets the description from the package.json.
  },
  "opera", // Specifies the platform (opera) for the manifest creation.
);
