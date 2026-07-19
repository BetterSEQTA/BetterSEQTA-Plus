import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const transformersDist = dirname(require.resolve("@huggingface/transformers"));
const outDir = join(root, "src", "public", "resources", "ort");

mkdirSync(outDir, { recursive: true });

const ortFiles = [
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
];

for (const file of ortFiles) {
  const src = join(transformersDist, file);
  if (!existsSync(src)) {
    throw new Error(
      `Missing ONNX Runtime WASM asset: ${src}\n` +
        "Ensure @huggingface/transformers is installed (direct dependency).",
    );
  }
  copyFileSync(src, join(outDir, file));
}
