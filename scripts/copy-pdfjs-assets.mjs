import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pdfjsRoot = join(root, "node_modules", "pdfjs-dist");
const outDir = join(root, "src", "public", "resources", "pdfjs");

mkdirSync(outDir, { recursive: true });
copyFileSync(
  join(pdfjsRoot, "build", "pdf.worker.min.mjs"),
  join(outDir, "pdf.worker.min.mjs"),
);
copyFileSync(
  join(pdfjsRoot, "legacy", "build", "pdf.min.mjs"),
  join(outDir, "pdf.legacy.min.mjs"),
);
