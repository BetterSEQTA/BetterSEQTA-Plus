import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const resources = join(root, "src", "public", "resources");
const files = [
  ["pdfjs-dist/build/pdf.worker.min.mjs", "pdfjs/pdf.worker.min.mjs"],
  ["pdfjs-dist/legacy/build/pdf.min.mjs", "pdfjs/pdf.legacy.min.mjs"],
  [
    "@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs",
    "ort/ort-wasm-simd-threaded.jsep.mjs",
  ],
  [
    "@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm",
    "ort/ort-wasm-simd-threaded.jsep.wasm",
  ],
];

for (const [source, target] of files) {
  const output = join(resources, target);
  mkdirSync(dirname(output), { recursive: true });
  copyFileSync(join(root, "node_modules", source), output);
}
