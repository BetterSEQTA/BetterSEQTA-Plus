import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`[smoke-test] ${message}`);
  process.exit(1);
}

function assertManifest(browserDir) {
  const manifestPath = path.join(root, "dist", browserDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    fail(`Missing ${manifestPath} — run npm run build first`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!manifest.manifest_version) fail(`${browserDir} manifest missing manifest_version`);
  if (!manifest.name) fail(`${browserDir} manifest missing name`);
  if (!manifest.version) fail(`${browserDir} manifest missing version`);

  const sw =
    manifest.background?.service_worker ??
    manifest.background?.scripts?.[0] ??
    null;
  if (sw) {
    const swPath = path.join(root, "dist", browserDir, sw);
    if (!fs.existsSync(swPath)) {
      fail(`${browserDir} service worker not found on disk: ${sw}`);
    }
  }
}

function assertAssets(browserDir) {
  const assetsDir = path.join(root, "dist", browserDir, "assets");
  if (!fs.existsSync(assetsDir)) {
    fail(`Missing assets directory: dist/${browserDir}/assets`);
  }
  const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".js"));
  if (jsFiles.length === 0) {
    fail(`No JS assets in dist/${browserDir}/assets`);
  }
}

for (const browser of ["chrome", "firefox"]) {
  assertManifest(browser);
  assertAssets(browser);
}

console.log("[smoke-test] dist/chrome and dist/firefox look OK");
