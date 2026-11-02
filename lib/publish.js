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

import { globSync } from "node:fs";
import semver from "semver";
import { execSync } from "node:child_process";

function getLatestVersion(files) {
  console.log("Files passed to getLatestVersion:", files);

  const versions = files
    .map((file) => {
      const match = file.match(/@([\d.]+)-/);
      console.log("Matching file:", file, "Version found:", match ? match[1] : "None");

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
  const latestVersionData = versions.find((v) => v.semverVersion === latestSemver);
  const latestFullVersion = latestVersionData ? latestVersionData.fullVersion : null;

  console.log("Final selected latest version:", latestFullVersion);
  return latestFullVersion;
}

function getLatestFiles(browser) {
  const pattern = `dist/betterseqtaplus@*-*${browser}.zip`;
  console.log("Glob pattern:", pattern);

  const files = globSync(pattern);
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
  const zipCommand = `7zz a ${zipFileName} . ${excludePatterns}`;

  console.log("Zipping project sources with command:", zipCommand);
  execSync(zipCommand, { stdio: "inherit" }); // Execute synchronously and show output

  return zipFileName;
}

function runPublishCommand(browsers) {
  const chromeZip = browsers.includes("chrome") ? getLatestFiles("chrome") : null;
  const firefoxZip = browsers.includes("firefox") ? getLatestFiles("firefox") : null;
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
