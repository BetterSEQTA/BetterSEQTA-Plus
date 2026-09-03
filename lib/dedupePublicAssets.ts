import { createHash } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { dirname, relative } from "node:path/posix";
import { globSync } from "glob";
import type { Plugin } from "rollup";

const hash = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

/** Reuse identical files already copied to stable extension paths. */
export default (): Plugin => ({
  name: "dedupe-public-assets",
  writeBundle({ dir }) {
    if (!dir) return;
    const files = globSync("**/*", { cwd: dir, nodir: true });
    const stable = new Map<string, string>();
    const duplicates = new Map<string, string>();
    for (const file of files) {
      if (file.startsWith("resources/"))
        stable.set(hash(resolve(dir, file)), file);
    }
    for (const file of files) {
      const match = file.startsWith("assets/")
        ? stable.get(hash(resolve(dir, file)))
        : undefined;
      if (match) duplicates.set(file, match);
    }
    for (const file of files.filter((file) =>
      /\.(?:css|html|js)$/.test(file),
    )) {
      const path = resolve(dir, file);
      let output = readFileSync(path, "utf8");
      for (const [asset, canonical] of duplicates) {
        output = output.replaceAll(
          relative(dirname(file), asset),
          relative(dirname(file), canonical),
        );
      }
      writeFileSync(path, output);
    }
    for (const file of duplicates.keys()) unlinkSync(resolve(dir, file));

    const manifestPath = resolve(dir, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const entry of manifest.web_accessible_resources ?? []) {
      entry.resources = entry.resources.filter(
        (file: string) => !duplicates.has(file),
      );
    }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  },
});
