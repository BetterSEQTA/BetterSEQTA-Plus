import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const transformersDist = join(
  root,
  "node_modules",
  "@huggingface",
  "transformers",
  "dist",
);
const outDir = join(root, "src", "public", "resources", "ort");

mkdirSync(outDir, { recursive: true });

const ortFiles = [
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
];

for (const file of ortFiles) {
  copyFileSync(join(transformersDist, file), join(outDir, file));
}
