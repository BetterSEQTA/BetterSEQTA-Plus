/** @jest-environment jsdom */
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";

// Compile the actual Vite entry in Node (esbuild cannot run in jsdom's realm).
const bootScript = execFileSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `
  import { readFileSync } from "node:fs";
  import { transformSync } from "esbuild";
  process.stdout.write(transformSync(readFileSync("src/SEQTA.ts", "utf8"), {
    loader: "ts", format: "cjs",
    supported: { "dynamic-import": false },
    define: { "import.meta.env.DEV": "false", "import.meta.hot": "undefined" },
  }).code);
`,
  ],
  { encoding: "utf8" },
);

test.each([
  { onoff: false },
  { "plugin.error-page-kitten.settings": { enabled: false } },
])(
  "disabled 404 customization preserves the native error message: %j",
  async (stored) => {
    document.head.innerHTML = "";
    document.body.innerHTML = '<div class="message">Page not found</div>';
    const mount = jest.fn();
    runInNewContext(bootScript, {
      document,
      window,
      console,
      require: (module: string) => {
        if (module === "webextension-polyfill") {
          return { storage: { local: { get: async () => stored } } };
        }
        if (module.includes("errorPageKitten")) {
          return { isSeqta404Page: () => true, mountErrorPageKitten: mount };
        }
        return {};
      },
    });
    for (let i = 0; i < 10; i++) await Promise.resolve();

    expect(mount).not.toHaveBeenCalled();
    expect(
      window.getComputedStyle(document.querySelector(".message")!).display,
    ).not.toBe("none");
  },
);
