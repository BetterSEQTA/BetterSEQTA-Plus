/**
 * Package Chrome/Firefox build folders into Windows-friendly zip files.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function zipDirectory(sourceRel, outRel) {
  const sourceDir = join(root, sourceRel);
  const outZip = join(root, outRel);
  if (!existsSync(sourceDir)) throw new Error(`Missing build output: ${sourceRel}`);

  mkdirSync(dirname(outZip), { recursive: true });
  if (existsSync(outZip)) unlinkSync(outZip);

  if (process.platform === "win32") {
    const esc = (s) => s.replace(/'/g, "''");
    execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        [
          "Add-Type -AssemblyName System.IO.Compression.FileSystem",
          `[IO.Compression.ZipFile]::CreateFromDirectory('${esc(sourceDir)}', '${esc(outZip)}')`,
        ].join("; "),
      ],
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
    : `betterseqtaplus-${version}`;

const chromeZip = `dist/${base}-chrome.zip`;
const firefoxZip = `dist/${base}-firefox.zip`;

zipDirectory("dist/chrome", chromeZip);
zipDirectory("dist/firefox", firefoxZip);
console.log(`Packaged ${chromeZip}\nPackaged ${firefoxZip}`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `chrome_zip=${chromeZip}\nfirefox_zip=${firefoxZip}\n`);
}
