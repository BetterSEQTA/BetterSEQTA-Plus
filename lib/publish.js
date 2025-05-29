/**
 * @fileoverview
 * This script is a command-line utility for publishing the BetterSEQTA+ extension.
 * It automates the process of finding the latest built extension ZIP files for specified
 * browsers, zipping the project source code (for Firefox), and then invoking the
 * `publish-extension` tool with the appropriate arguments.
 *
 * To use this script, invoke it with Node.js followed by browser arguments:
 * e.g., `node lib/publish.js --b chrome firefox`
 * or `node lib/publish.js --b chrome`
 * or `node lib/publish.js --b firefox`
 */

const glob = require("glob");
const semver = require("semver");
const { execSync } = require("child_process");
const path = require("path");

/**
 * Determines the latest version string from a list of filenames that include version numbers.
 * Filenames are expected to follow a pattern like `betterseqtaplus@3.4.5.1-chrome.zip`.
 * This function handles potential 4-part versions (e.g., `3.4.5.1`) by trimming them
 * to 3 parts (e.g., `3.4.5`) for comparison using the `semver` library. After identifying
 * the latest semver-compatible version, it returns the original full version string
 * (e.g., "3.4.5.1") that corresponds to this latest version.
 *
 * @param {string[]} files An array of filenames.
 * @returns {string | null} The latest version string (e.g., "3.4.5.1") found among the files,
 *                          or `null` if no valid version numbers are found or no files are provided.
 */
function getLatestVersion(files) {
  console.log("Files passed to getLatestVersion:", files);

  const versions = files
    .map((file) => {
      const match = file.match(/@([\d\.]+)-/);
      console.log(
        "Matching file:",
        file,
        "Version found:",
        match ? match[1] : "None",
      );

      if (!match) return null;

      const fullVersion = match[1]; // Original version (e.g., 3.4.5.1)
      // Trim to 3 parts for semver comparison, as semver typically handles X.Y.Z
      const semverVersion = fullVersion.split(".").slice(0, 3).join(".");

      return { fullVersion, semverVersion };
    })
    .filter(Boolean); // Remove null entries if any file didn't match

  console.log(
    "Extracted versions:",
    versions.map((v) => v.semverVersion),
  );

  if (versions.length === 0) {
    console.log("No versions extracted.");
    return null;
  }

  // Find latest version using the trimmed semver format
  const latestSemver = semver.maxSatisfying(
    versions.map((v) => v.semverVersion),
    "*", // Satisfy any version, effectively finding the max
  );
  console.log("Latest SemVer-compatible version:", latestSemver);

  if (!latestSemver) {
    console.log("Could not determine latest semver version.");
    return null;
  }

  // Get the original full version string that matches the identified latest SemVer version
  const latestVersionData = versions.find(
    (v) => v.semverVersion === latestSemver,
  );
  const latestFullVersion = latestVersionData ? latestVersionData.fullVersion : null;

  console.log("Final selected latest version:", latestFullVersion);
  return latestFullVersion;
}

/**
 * Finds the path to the latest built ZIP file for a specific browser.
 * It constructs a glob pattern based on the browser name (e.g., `dist/betterseqtaplus@*-*chrome.zip`),
 * finds all matching files, and then uses `getLatestVersion` to identify the version string
 * of the most recent file. Finally, it returns the full path to that specific file.
 *
 * @param {string} browser A string indicating the target browser (e.g., "chrome", "firefox").
 * @returns {string | undefined} The filepath string to the latest ZIP file for the specified browser,
 *                               or `undefined` if no matching file is found or if the latest version
 *                               cannot be determined.
 */
function getLatestFiles(browser) {
  const pattern = `dist/betterseqtaplus@*-*${browser}.zip`;
  console.log("Glob pattern:", pattern);

  const files = glob.sync(pattern);
  console.log("Files found for browser", browser, ":", files);

  if (files.length === 0) {
    console.log("No files found for browser", browser);
    return undefined;
  }

  const latestVersion = getLatestVersion(files);
  if (!latestVersion) {
    console.log("Could not determine latest version for browser", browser);
    return undefined;
  }

  // Find the exact file by matching the original full version string
  const latestFile = files.find((file) => file.includes(`@${latestVersion}-`));

  console.log("Latest file for browser", browser, ":", latestFile);
  return latestFile;
}

/**
 * Creates a ZIP file of the project's source code, excluding specified development-related
 * files and directories such as `node_modules`, `dist`, `.git`, etc.
 * It uses the `7z` command-line tool to perform the archiving.
 * The output filename is fixed as `dist/betterseqtaplus@latest-sources.zip`.
 *
 * @returns {string} The filename of the created ZIP file (e.g., `dist/betterseqtaplus@latest-sources.zip`).
 */
function zipSources() {
  const zipFileName = `dist/betterseqtaplus@latest-sources.zip`;

  const excludePatterns = [
    "node_modules",
    "dist",
    ".env*",
    ".git",
    ".github",
    ".vscode",
    "LICENSE",
    "package.json",
  ]
    .map((pattern) => `-x!${pattern}`) // Format for 7z exclude syntax
    .join(" ");

  // Command to zip the current directory's contents into zipFileName, applying exclude patterns
  const zipCommand = `7z a ${zipFileName} . ${excludePatterns}`;

  console.log("Zipping project sources with command:", zipCommand);
  execSync(zipCommand, { stdio: "inherit" }); // Execute synchronously and show output

  return zipFileName;
}

/**
 * Orchestrates the extension publishing process for the specified browsers.
 * This function performs the following steps:
 * 1. Calls `getLatestFiles` to find the latest built ZIP for Chrome if "chrome" is in `browsers`.
 * 2. Calls `getLatestFiles` to find the latest built ZIP for Firefox if "firefox" is in `browsers`.
 * 3. Calls `zipSources` to create a source code ZIP if "firefox" is in `browsers` (required for Mozilla Add-ons).
 * 4. Validates that all required files were found and that at least one browser was specified. Exits if not.
 * 5. Constructs the `publish-extension` command-line string with the appropriate arguments
 *    based on the found ZIP files for the specified browsers.
 * 6. Executes the constructed `publish-extension` command.
 *
 * @param {string[]} browsers An array of browser strings (e.g., ["chrome", "firefox"]) for which to publish the extension.
 */
function runPublishCommand(browsers) {
  const chromeZip = browsers.includes("chrome")
    ? getLatestFiles("chrome")
    : null;
  const firefoxZip = browsers.includes("firefox")
    ? getLatestFiles("firefox")
    : null;
  // Sources are typically only needed for Firefox submissions
  const firefoxSourcesZip = browsers.includes("firefox") ? zipSources() : null;

  console.log("Chrome zip:", chromeZip);
  console.log("Firefox zip:", firefoxZip);
  console.log("Firefox sources zip:", firefoxSourcesZip);

  if (browsers.length === 0) {
    console.log("No browsers specified. Exiting.");
    process.exit(0); // Exit gracefully if no action is needed
  }

  // Check if required files are missing for the specified browsers
  if (
    (browsers.includes("chrome") && !chromeZip) ||
    (browsers.includes("firefox") && (!firefoxZip || !firefoxSourcesZip))
  ) {
    console.error("Could not find required zip files for specified browsers.");
    process.exit(1); // Exit with error status
  }

  let command = "publish-extension";
  if (chromeZip) {
    command += ` --chrome-zip ${chromeZip}`;
  }
  if (firefoxZip && firefoxSourcesZip) {
    command += ` --firefox-zip ${firefoxZip} --firefox-sources-zip ${firefoxSourcesZip}`;
  }

  console.log("Running command:", command);
  execSync(command, { stdio: "inherit" }); // Execute and show output
}

// Parse command-line arguments to determine which browsers to publish for
const args = process.argv.slice(2);
const browserIndex = args.indexOf("--b"); // Find the --b flag
// If --b is found, take all subsequent arguments as browser names
const browsers = browserIndex !== -1 ? args.slice(browserIndex + 1) : [];

runPublishCommand(browsers);
