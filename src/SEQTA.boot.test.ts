/** @jest-environment jsdom */
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";

// Compile the actual Vite entry and the 404 boot it loads in Node (esbuild
// cannot run in jsdom's realm).
const [bootScript, errorPageScript]: string[] = JSON.parse(
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
  import { readFileSync } from "node:fs";
  import { transformSync } from "esbuild";
  const compile = (file) => transformSync(readFileSync(file, "utf8"), {
    loader: "ts", format: "cjs",
    supported: { "dynamic-import": false },
    define: { "import.meta.env.DEV": "false", "import.meta.hot": "undefined" },
  }).code;
  process.stdout.write(JSON.stringify(["src/SEQTA.ts", "src/seqta/bootErrorPage.ts"].map(compile)));
`,
    ],
    { encoding: "utf8" },
  ),
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
    const requireMock = (module: string): unknown => {
      if (module === "@/seqta/bootErrorPage") {
        const loaded = { exports: {} };
        runInNewContext(errorPageScript, {
          document,
          window,
          console,
          module: loaded,
          exports: loaded.exports,
          require: requireMock,
        });
        return loaded.exports;
      }
      if (module === "webextension-polyfill") {
        return { storage: { local: { get: async () => stored } } };
      }
      if (module.includes("errorPageKitten")) {
        return { isSeqta404Page: () => true, mountErrorPageKitten: mount };
      }
      return {};
    };
    runInNewContext(bootScript, {
      document,
      window,
      console,
      require: requireMock,
    });
    for (let i = 0; i < 10; i++) await Promise.resolve();

    expect(mount).not.toHaveBeenCalled();
    expect(
      window.getComputedStyle(document.querySelector(".message")!).display,
    ).not.toBe("none");
  },
);
