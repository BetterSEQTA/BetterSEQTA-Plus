/**
 * Pre-compile layerchart `.svelte` sources to `.js` so Rollup/Vite CI builds succeed.
 */
import { compile } from "svelte/compiler";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const layerchartRoot = join(root, "node_modules", "layerchart");
const layerchartDist = join(layerchartRoot, "dist");
const stampPath = join(layerchartDist, ".bsplus-compiled");
const COMPILE_ALGO_VERSION = "2";
const importSuffixPattern = /\.svelte(?=['"])/g;

const exists = (path) => {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
};

if (!exists(layerchartDist)) {
  console.log("compile-layerchart-vendor: layerchart not installed, skipping");
  process.exit(0);
}

const layerchartVersion = JSON.parse(
  readFileSync(join(layerchartRoot, "package.json"), "utf8"),
).version;
const stampContent = `${layerchartVersion}\n${COMPILE_ALGO_VERSION}`;

if (exists(stampPath) && readFileSync(stampPath, "utf8").trim() === stampContent) {
  console.log(`compile-layerchart-vendor: layerchart@${layerchartVersion} already compiled, skipping`);
  process.exit(0);
}

const walkFiles = (dir, files = []) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkFiles(path, files);
    else files.push(path);
  }
  return files;
};

const patchSvelteImports = (content) => content.replace(importSuffixPattern, ".js");
const stripRollupBreakingSyntax = (code) =>
  code
    .replace(/(\w+)\?(?=\s*[,)\]])/g, "$1")
    .replace(/(\w+)\?(?=\s*:)/g, "$1");

const svelteFiles = walkFiles(layerchartDist).filter((f) => f.endsWith(".svelte"));

for (const sveltePath of svelteFiles) {
  const source = readFileSync(sveltePath, "utf8");
  if (!source.includes("<script")) continue;
  const compiled = compile(source, {
    filename: sveltePath,
    generate: "client",
    css: "injected",
  });
  writeFileSync(
    sveltePath.replace(/\.svelte$/, ".js"),
    stripRollupBreakingSyntax(patchSvelteImports(compiled.js.code)),
  );
}

for (const filePath of walkFiles(layerchartDist).filter((f) => /\.(js|svelte|ts|mjs)$/.test(f))) {
  const content = readFileSync(filePath, "utf8");
  if (!content.includes(".svelte")) continue;
  const patched = patchSvelteImports(content);
  if (patched !== content) writeFileSync(filePath, patched);
}

writeFileSync(stampPath, stampContent);
console.log(`compile-layerchart-vendor: compiled ${svelteFiles.length} Svelte files`);
