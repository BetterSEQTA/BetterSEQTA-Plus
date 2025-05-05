import { createManifest } from "../../lib/createManifest";
import baseManifest from "./manifest.json";
import pkg from "../../package.json";

export const brave = createManifest(
  {
    ...baseManifest,
    version: pkg.version,
    description: pkg.description,
  },
  "brave",
);
