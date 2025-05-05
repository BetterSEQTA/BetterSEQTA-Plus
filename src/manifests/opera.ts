import { createManifest } from "../../lib/createManifest";
import baseManifest from "./manifest.json";
import pkg from "../../package.json";

export const opera = createManifest(
  {
    ...baseManifest,
    version: pkg.version,
    description: pkg.description,
  },
  "opera",
);
