import type { Browser, BuildTarget, Manifest } from "./types";
import type { AnyCase } from "./utils";

/**
 * Packages a given manifest object with a specific target browser identifier.
 * This function is typically used in multi-browser extension build processes
 * to create a configuration object that pairs the manifest data with the browser
 * it's intended for. The `AnyCase<Browser>` type for the browser parameter
 * implies that browser names like 'chrome', 'firefox', etc., can be provided
 * in various casings.
 *
 * @export
 * @param {Manifest} manifest The core manifest data for the extension,
 *                            compatible with `chrome.runtime.ManifestV3` as defined by the {@link Manifest} type.
 * @param {AnyCase<Browser>} browser The target browser identifier (e.g., 'chrome', 'firefox', 'CHROME').
 *                                   Refers to the {@link Browser} type, allowing for flexible casing.
 * @returns {BuildTarget} An object that pairs the `manifest` with its target `browser`.
 *                        The structure is `{ manifest: Manifest; browser: AnyCase<Browser>; }`
 *                        as defined by the {@link BuildTarget} type.
 */
export function createManifest(
  manifest: Manifest,
  browser: AnyCase<Browser>,
): BuildTarget {
  return {
    manifest,
    browser,
  };
}

/**
 * Defines a base manifest object.
 * This function is typically used to establish a common, shared foundation for an extension's manifest
 * (compatible with `chrome.runtime.ManifestV3` as per the {@link Manifest} type).
 * This base can then be extended or modified for different browsers or specific build configurations.
 * For example, you might define core permissions and properties here, and then add
 * browser-specific keys in subsequent steps.
 *
 * @export
 * @param {Manifest} manifest The core manifest data to be used as a base.
 *                            This should conform to the {@link Manifest} type structure.
 * @returns {Manifest} The provided manifest object, intended to serve as a reusable base.
 */
export function createManifestBase(manifest: Manifest): Manifest {
  return manifest;
}
