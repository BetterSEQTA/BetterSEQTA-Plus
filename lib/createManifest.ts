import type { Browser, BuildTarget, Manifest } from "./types.ts";

export function createManifest(manifest: Manifest, browser: Browser): BuildTarget {
  return { manifest, browser };
}
