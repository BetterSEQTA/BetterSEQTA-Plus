import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
try {
  unlinkSync(join(root, "src", "wasm", "pkg", ".gitignore"));
} catch {
  /* ignore */
}
