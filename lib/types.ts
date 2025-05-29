import type { ManifestV3Export } from "@crxjs/vite-plugin";
import { type AnyCase, createEnum, ObjectValues } from "./utils";

/**
 * Enumerates supported JavaScript frameworks for project generation or configuration.
 */
export const FrameworkEnum = {
  React: "React",
  Vanilla: "Vanilla",
  Preact: "Preact",
  Lit: "Lit",
  Svelte: "Svelte",
  Vue: "Vue",
} as const;

/**
 * Enumerates supported web browsers, typically for targeting builds or configurations.
 */
export const BrowserEnum = {
  Chrome: "Chrome",
  Brave: "Brave",
  Opera: "Opera",
  Edge: "Edge",
  Firefox: "Firefox",
  Safari: "Safari",
} as const;

/**
 * @private
 * Enumerates supported programming languages for project setup.
 * This enum is not exported, suggesting it's for internal use within this module or related modules.
 */
const LanguageEnum = {
  TypeScript: "TypeScript",
  JavaScript: "JavaScript",
} as const;

/**
 * Enumerates supported styling options or libraries.
 */
export const StyleEnum = {
  Tailwind: "Tailwind",
} as const;

/**
 * Enumerates supported package managers.
 */
export const PackageManagerEnum = {
  Bun: "Bun",
  PnPm: "PnPm",
  Npm: "Npm",
  Yarn: "Yarn",
} as const;

/**
 * Defines the structure for browser-specific settings within a web extension manifest.
 * This is particularly used for Firefox (gecko) extensions to specify properties like
 * an extension ID, and minimum/maximum supported browser versions.
 * The structure is based on common manifest extensions for Firefox.
 * See: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings
 * The link in the original code (// see: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/firefox-webext-browser/index.d.ts)
 * also points to type definitions that include this structure.
 *
 * @property {object} [browser_specific_settings] - Container for browser-specific settings.
 * @property {object} [browser_specific_settings.gecko] - Settings specific to Gecko-based browsers (e.g., Firefox).
 * @property {string} [browser_specific_settings.gecko.id] - The unique identifier for the extension in Firefox.
 * @property {string} [browser_specific_settings.gecko.strict_min_version] - The minimum version of Firefox the extension is compatible with.
 * @property {string} [browser_specific_settings.gecko.strict_max_version] - The maximum version of Firefox the extension is compatible with.
 */
export type BrowserSpecificSettings = {
  browser_specific_settings?: {
    gecko?: {
      id: string;
      strict_min_version?: string;
      strict_max_version?: string;
    };
  };
};

/**
 * Represents the structure of a Chrome Manifest V3 file.
 * This type is an alias for `ManifestV3Export` from the `@crxjs/vite-plugin`,
 * which provides a comprehensive definition for Chrome extension manifests.
 */
export type Manifest = ManifestV3Export;

/** Alias for the `icons` property within a Chrome Manifest V3. */
export type ManifestIcons = chrome.runtime.ManifestIcons;
/** Alias for the `background` property within a Chrome Manifest V3. */
export type ManifestBackground = chrome.runtime.ManifestV3["background"];
/** Alias for the `content_scripts` property within a Chrome Manifest V3. */
export type ManifestContentScripts =
  chrome.runtime.ManifestV3["content_scripts"];
/** Alias for the `web_accessible_resources` property within a Chrome Manifest V3. */
export type ManifestWebAccessibleResources =
  chrome.runtime.ManifestV3["web_accessible_resources"];
/** Alias for the `commands` property within a Chrome Manifest V3. */
export type ManifestCommands = chrome.runtime.ManifestV3["commands"];
/** Alias for the `action` property (or `browser_action`/`page_action`) within a Chrome Manifest V3. */
export type ManifestAction = chrome.runtime.ManifestV3["action"];
/** Alias for the `permissions` property within a Chrome Manifest V3. */
export type ManifestPermissions = chrome.runtime.ManifestV3["permissions"];
/** Alias for the `options_ui` property within a Chrome Manifest V3. */
export type ManifestOptionsUI = chrome.runtime.ManifestV3["options_ui"];
/** Alias for the `chrome_url_overrides` property within a Chrome Manifest V3. */
export type ManifestURLOverrides =
  chrome.runtime.ManifestV3["chrome_url_overrides"];

/**
 * Creates a type that accepts a string literal `T` in either its capitalized or lowercase form.
 * Useful for defining types that should be case-insensitive for specific known strings.
 * @template T - A string literal type.
 */
export type BrowserName<T extends string> = Capitalize<T> | Lowercase<T>;

/**
 * Creates a record type where both keys and values are derived from a string literal `T`,
 * specifically using `BrowserName<T>` which allows for capitalized or lowercase forms.
 * This could be used to define an object where, for example, keys are 'Chrome' or 'chrome'
 * and values are also 'Chrome' or 'chrome'.
 * @template T - A string literal type, typically representing a browser name.
 */
export type BrowserEnumType<T extends string> = {
  [browser in BrowserName<T>]: BrowserName<T>;
};

/**
 * Represents the target browser for a build, allowing for various casings of browser names
 * (e.g., "chrome", "Chrome", "CHROME") through the `AnyCase<Browser>` utility type.
 * `Browser` itself is a union of specific browser name strings (e.g., "Chrome" | "Firefox").
 */
export type BuildMode = AnyCase<Browser>;

/**
 * Defines an object structure that pairs a web extension `Manifest`
 * with its target `browser` (represented as `AnyCase<Browser>`).
 * This is commonly used in build processes to manage configurations for different browsers.
 */
export type BuildTarget = {
  manifest: Manifest;
  browser: AnyCase<Browser>;
};

/**
 * Defines the configuration options for a build process.
 * @property {"build" | "serve"} [command] - The type of build command (e.g., 'build' for production, 'serve' for development).
 * @property {AnyCase<Browser> | string | undefined} [mode] - The target build mode, typically a browser name (allowing various casings)
 *                                                           or potentially other custom mode strings.
 */
export type BuildConfig = {
  command?: "build" | "serve";
  mode?: AnyCase<Browser> | string | undefined;
};

/**
 * Defines the structure for repository information, commonly found in `package.json`.
 * @property {string} type - The type of the repository (e.g., "git").
 * @property {string} [url] - The URL of the repository.
 * @property {Bugs} [bugs] - An object containing information about where to report bugs.
 */
export interface Repository {
  type: string;
  url?: string;
  bugs?: Bugs;
}

/**
 * Defines the structure for bug reporting information, often part of the `Repository` interface.
 * @property {string} [url] - The URL of the issue tracker.
 * @property {string} [email] - The email address for reporting bugs.
 */
export interface Bugs {
  url?: string;
  email?: string;
}

/**
 * A string literal union type representing supported browser names, derived from the values of `BrowserEnum`.
 * e.g., "Chrome" | "Firefox" | ...
 */
export type Browser = ObjectValues<typeof BrowserEnum>;

/**
 * A constant intended to provide access to browser names, potentially in various casings.
 * Its type `AnyCase<Browser>` suggests it can be used where case-insensitivity for browser names is needed.
 * The `createEnum(BrowserEnum)` call aims to produce a representation of browser names from `BrowserEnum`.
 * Note: `createEnum` from `lib/utils.ts` has a declared return type of `ObjectValues<T>` (a union of values),
 * while its implementation uses `Object.values()` which returns an array. This constant will hold the
 * runtime array value, but its JSDoc type refers to the more restrictive `AnyCase<Browser>` union type.
 */
export const Browser: AnyCase<Browser> = createEnum(BrowserEnum);

/**
 * A string literal union type representing supported package managers, derived from the values of `PackageManagerEnum`.
 * e.g., "Bun" | "PnPm" | "Npm" | "Yarn"
 */
export type PackageManager = ObjectValues<typeof PackageManagerEnum>;
/**
 * A constant intended to provide access to package manager names, potentially in various casings.
 * Its type `AnyCase<PackageManager>` suggests it can be used where case-insensitivity for package manager names is needed.
 * Utilizes `createEnum(PackageManagerEnum)`. Refer to notes on `Browser` constant regarding `createEnum` behavior.
 */
export const PackageManager: AnyCase<PackageManager> =
  createEnum(PackageManagerEnum);

/**
 * A string literal union type representing supported JavaScript frameworks, derived from the values of `FrameworkEnum`.
 * e.g., "React" | "Vanilla" | ...
 */
export type Framework = ObjectValues<typeof FrameworkEnum>;
/**
 * A constant intended to provide access to framework names, potentially in various casings.
 * Its type `AnyCase<Framework>` suggests it can be used where case-insensitivity for framework names is needed.
 * Utilizes `createEnum(FrameworkEnum)`. Refer to notes on `Browser` constant regarding `createEnum` behavior.
 */
export const Framework: AnyCase<Framework> = createEnum(FrameworkEnum);

/**
 * A string literal union type representing supported styling options, derived from the values of `StyleEnum`.
 * e.g., "Tailwind"
 */
export type Style = ObjectValues<typeof StyleEnum>;
/**
 * A constant intended to provide access to style option names, potentially in various casings.
 * Its type `AnyCase<Style>` suggests it can be used where case-insensitivity for style names is needed.
 * Utilizes `createEnum(StyleEnum)`. Refer to notes on `Browser` constant regarding `createEnum` behavior.
 */
export const Style: AnyCase<Style> = createEnum(StyleEnum);

/**
 * A string literal union type representing supported programming languages, derived from the values of `LanguageEnum`.
 * e.g., "TypeScript" | "JavaScript"
 */
export type Language = ObjectValues<typeof LanguageEnum>;
/**
 * A constant intended to provide access to programming language names, potentially in various casings.
 * Its type `AnyCase<Language>` suggests it can be used where case-insensitivity for language names is needed.
 * Utilizes `createEnum(LanguageEnum)`. Refer to notes on `Browser` constant regarding `createEnum` behavior.
 */
export const Language: AnyCase<Language> = createEnum(LanguageEnum);
