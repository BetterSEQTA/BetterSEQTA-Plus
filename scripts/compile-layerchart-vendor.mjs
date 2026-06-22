/**
 * layerchart ships raw `.svelte` sources in `dist/`. Vite/Svelte compilation is
 * unreliable for this package on CI (Rollup parses vendor sources as JS). Compile
 * to plain `.js` at install/build time and rewrite internal imports.
 */
import { compile } from "svelte/compiler";
import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const layerchartRoot = join(root, "node_modules", "layerchart");
const layerchartDist = join(layerchartRoot, "dist");
const stampPath = join(layerchartDist, ".bsplus-compiled");

function exists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

if (!exists(layerchartDist)) {
  console.log("compile-layerchart-vendor: layerchart not installed, skipping");
  process.exit(0);
}

const COMPILE_ALGO_VERSION = "2";

const layerchartVersion = JSON.parse(
  readFileSync(join(layerchartRoot, "package.json"), "utf8"),
).version;

const stampContent = `${layerchartVersion}\n${COMPILE_ALGO_VERSION}`;

if (
  exists(stampPath) &&
  readFileSync(stampPath, "utf8").trim() === stampContent
) {
  console.log(
    `compile-layerchart-vendor: layerchart@${layerchartVersion} already compiled, skipping`,
  );
  process.exit(0);
}

function walkFiles(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walkFiles(path, files);
    } else {
      files.push(path);
    }
  }
  return files;
}

const importSuffixPattern = /\.svelte(?=['"])/g;

function patchSvelteImports(content) {
  return content.replace(importSuffixPattern, ".js");
}

/** Rollup CJS resolver chokes on TS optional params (`name?`) in vendor `.js`. */
function stripRollupBreakingSyntax(code) {
  return code
    .replace(/(\w+)\?(?=\s*[,)\]])/g, "$1")
    .replace(/(\w+)\?(?=\s*:)/g, "$1");
}

const svelteFiles = walkFiles(layerchartDist).filter((f) => f.endsWith(".svelte"));

for (const sveltePath of svelteFiles) {
  const source = readFileSync(sveltePath, "utf8");
  if (!source.includes("<script")) continue;

  const compiled = compile(source, {
    filename: sveltePath,
    generate: "client",
    css: "injected",
  });

  const jsPath = sveltePath.replace(/\.svelte$/, ".js");
  const jsCode = stripRollupBreakingSyntax(patchSvelteImports(compiled.js.code));
  writeFileSync(jsPath, jsCode);
}

const patchable = walkFiles(layerchartDist).filter((f) =>
  /\.(js|svelte|ts|mjs)$/.test(f),
);

for (const filePath of patchable) {
  const content = readFileSync(filePath, "utf8");
  if (!content.includes(".svelte")) continue;
  const patched = patchSvelteImports(content);
  if (patched !== content) {
    writeFileSync(filePath, patched);
  }
}

writeFileSync(stampPath, stampContent);

console.log(
  `compile-layerchart-vendor: compiled ${svelteFiles.length} Svelte files`,
);
