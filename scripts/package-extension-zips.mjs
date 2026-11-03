/**
 * Package Chrome/Firefox build folders into Windows-friendly zip files.
 */
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function zipDirectory(sourceRel, outRel) {
  const sourceDir = join(root, sourceRel);
  const outZip = join(root, outRel);
  if (!existsSync(sourceDir)) throw new Error(`Missing build output: ${sourceRel}`);
  const manifest = JSON.parse(readFileSync(join(sourceDir, "manifest.json"), "utf8"));
  if (manifest.version !== version) throw new Error(`Rebuild ${sourceRel} for version ${version}`);

  mkdirSync(dirname(outZip), { recursive: true });
  if (existsSync(outZip)) unlinkSync(outZip);

  if (process.platform === "win32") {
    execFileSync(
      join(process.env.SystemRoot, "System32", "tar.exe"),
      ["-a", "-cf", outZip, "-C", sourceDir, "--", ...readdirSync(sourceDir)],
      { stdio: "inherit" },
    );
  } else {
    execFileSync("zip", ["-r", "-q", outZip, "."], { cwd: sourceDir, stdio: "inherit" });
  }
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = process.argv[2] || pkg.version;
const updateChannel = process.env.UPDATE_CHANNEL || "stable";
const buildLabel = process.env.BUILD_LABEL || "";
const base =
  updateChannel === "nightly" && buildLabel
    ? `betterseqtaplus-nightly-${buildLabel}`
    : `${pkg.name}@${version}`;

const chromeZip = `dist/${base}-chrome.zip`;
const firefoxZip = `dist/${base}-firefox.zip`;

if (!process.argv.includes("--sources-only")) {
  zipDirectory("dist/chrome", chromeZip);
  zipDirectory("dist/firefox", firefoxZip);
  console.log(`Packaged ${chromeZip}\nPackaged ${firefoxZip}`);
}

const sourcesZip = `dist/${base}-sources.zip`;
if (process.argv.includes("--sources") || process.argv.includes("--sources-only")) {
  // Archive the committed source only, never local credentials or dependency folders.
  execFileSync("git", ["diff", "--quiet", "HEAD", "--"], { cwd: root, stdio: "inherit" });
  mkdirSync(join(root, "dist"), { recursive: true });
  const instructions =
    `Build environment: ${process.platform} ${process.arch}, Node.js ${process.version}.\n` +
    "On Windows, run these commands in Git Bash:\n\n" +
    "npm ci\n" +
    "GH_RELEASE_UPDATE_CHECK=false UPDATE_CHANNEL=stable npm run build\n\n" +
    "Firefox output: dist/firefox. No .env file is required.\n";
  execFileSync(
    "git",
    [
      "archive",
      "--format=zip",
      "--output",
      join(root, sourcesZip),
      `--add-virtual-file=BUILD.txt:${instructions}`,
      "HEAD",
    ],
    { cwd: root, stdio: "inherit" },
  );
  console.log(`Packaged ${sourcesZip}`);
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `chrome_zip=${chromeZip}\nfirefox_zip=${firefoxZip}\nsources_zip=${sourcesZip}\n`,
  );
}
