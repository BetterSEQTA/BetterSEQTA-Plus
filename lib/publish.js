import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const args = process.argv.slice(2);
const browsers = args.filter((arg) => arg !== "--b" && arg !== "--dry-run");
if (!browsers.length || browsers.some((browser) => !["chrome", "firefox"].includes(browser))) {
  throw new Error("Usage: npm run publish -- chrome firefox [--dry-run]");
}

const { name, version } = JSON.parse(readFileSync("package.json", "utf8"));
if (browsers.includes("firefox")) {
  execFileSync(
    process.execPath,
    ["scripts/package-extension-zips.mjs", version, "--sources-only"],
    {
      stdio: "inherit",
    },
  );
}

const flags = browsers.flatMap((browser) => [
  `--${browser}-zip`,
  `dist/${name}@${version}-${browser}.zip`,
]);
if (browsers.includes("firefox")) {
  flags.push("--firefox-sources-zip", `dist/${name}@${version}-sources.zip`);
}
if (args.includes("--dry-run")) flags.push("--dry-run");
execFileSync(
  process.execPath,
  [fileURLToPath(import.meta.resolve("publish-browser-extension/cli")), ...flags],
  { stdio: "inherit" },
);
