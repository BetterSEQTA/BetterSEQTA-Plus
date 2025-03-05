const glob = require('glob');
const semver = require('semver');
const { execSync } = require('child_process');
const path = require('path');

function getLatestVersion(files) {
  console.log('Files passed to getLatestVersion:', files);

  const versions = files.map(file => {
    const match = file.match(/@([\d\.]+)-/);
    console.log('Matching file:', file, 'Version found:', match ? match[1] : 'None');

    if (!match) return null;

    const fullVersion = match[1]; // Original version (e.g., 3.4.5.1)
    const semverVersion = fullVersion.split('.').slice(0, 3).join('.'); // Trim to 3.4.5

    return { fullVersion, semverVersion };
  }).filter(Boolean);

  console.log('Extracted versions:', versions.map(v => v.semverVersion));

  // Find latest version using the trimmed semver format
  const latestSemver = semver.maxSatisfying(versions.map(v => v.semverVersion), '*');
  console.log('Latest SemVer-compatible version:', latestSemver);

  // Get the full version that matches the latest SemVer version
  const latestVersion = versions.find(v => v.semverVersion === latestSemver)?.fullVersion || null;

  console.log('Final selected latest version:', latestVersion);
  return latestVersion;
}

function getLatestFiles(browser) {
  const pattern = `dist/betterseqtaplus@*-*${browser}.zip`;
  console.log('Glob pattern:', pattern);
  
  const files = glob.sync(pattern);
  console.log('Files found for browser', browser, ':', files);
  
  const latestVersion = getLatestVersion(files);

  // Find the exact file by matching the original full version
  const latestFile = files.find(file => file.includes(`@${latestVersion}-`));

  console.log('Latest file for browser', browser, ':', latestFile);
  return latestFile;
}

function zipSources() {
  const zipFileName = `dist/betterseqtaplus@latest-sources.zip`;

  const excludePatterns = [
    'node_modules',
    'dist',
    '.env*',
    '.git',
    '.github',
    '.vscode',
    'LICENSE',
    'package.json'
  ].map(pattern => `-x!${pattern}`).join(' ');

  const zipCommand = `7z a ${zipFileName} . ${excludePatterns}`;

  console.log('Zipping project sources with command:', zipCommand);
  execSync(zipCommand, { stdio: 'inherit' });

  return zipFileName;
}

function runPublishCommand(browsers) {
  const chromeZip = browsers.includes('chrome') ? getLatestFiles('chrome') : null;
  const firefoxZip = browsers.includes('firefox') ? getLatestFiles('firefox') : null;
  const firefoxSourcesZip = browsers.includes('firefox') ? zipSources() : null;

  console.log('Chrome zip:', chromeZip);
  console.log('Firefox zip:', firefoxZip);
  console.log('Firefox sources zip:', firefoxSourcesZip);

  if (browsers.length === 0) {
    console.log('No browsers specified. Exiting.');
    process.exit(0);
  }

  if ((browsers.includes('chrome') && !chromeZip) || (browsers.includes('firefox') && (!firefoxZip || !firefoxSourcesZip))) {
    console.error('Could not find required zip files for specified browsers.');
    process.exit(1);
  }

  let command = 'publish-extension';
  if (chromeZip) {
    command += ` --chrome-zip ${chromeZip}`;
  }
  if (firefoxZip && firefoxSourcesZip) {
    command += ` --firefox-zip ${firefoxZip} --firefox-sources-zip ${firefoxSourcesZip}`;
  }

  console.log('Running command:', command);
  execSync(command, { stdio: 'inherit' });
}

// Parse command-line arguments
const args = process.argv.slice(2);
const browserIndex = args.indexOf('--b');
const browsers = browserIndex !== -1 ? args.slice(browserIndex + 1) : [];

runPublishCommand(browsers);