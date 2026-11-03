import { defaultClientConditions, defineConfig, loadEnv } from "vite";
import { join, resolve } from "node:path";

import InlineWorkerPlugin from "./lib/inlineWorker.ts";
import { base64Loader } from "./lib/base64loader.ts";
import type { BuildTarget, Manifest } from "./lib/types.ts";
import fixCrxWorkerLiveReload from "./lib/fixCrxWorkerLiveReload.ts";
import stabilizeCrxDevHmr from "./lib/stabilizeCrxDevHmr.ts";
import { firefoxStripFunctionProbe } from "./lib/firefoxStripFunctionProbe.ts";
import { extensionChunkUrls } from "./lib/extensionChunkUrls.ts";

import { svelte } from "@sveltejs/vite-plugin-svelte";

import { chrome } from "./src/manifests/chrome.ts";
import { brave } from "./src/manifests/brave.ts";
import { edge } from "./src/manifests/edge.ts";
import { firefox } from "./src/manifests/firefox.ts";
import { opera } from "./src/manifests/opera.ts";
import { safari } from "./src/manifests/safari.ts";
import { crx } from "@crxjs/vite-plugin";

const targets: BuildTarget[] = [chrome, brave, edge, firefox, opera, safari];

const DEV_SERVER_PORT = 5173;

/** Vite HMR needs localhost script + ws origins; only applied during `vite dev`. */
function withDevManifestCsp(manifest: Manifest, command: string): Manifest {
  if (command !== "serve") return manifest;

  const extensionPages = manifest.content_security_policy?.extension_pages;
  if (!extensionPages) return manifest;

  const localhost = `http://localhost:${DEV_SERVER_PORT}`;
  const localhostWs = `ws://localhost:${DEV_SERVER_PORT}`;
  const loopback = `http://127.0.0.1:${DEV_SERVER_PORT}`;
  const loopbackWs = `ws://127.0.0.1:${DEV_SERVER_PORT}`;

  return {
    ...manifest,
    content_security_policy: {
      ...manifest.content_security_policy,
      extension_pages: extensionPages
        .replace("script-src 'self'", `script-src 'self' ${localhost} ${loopback}`)
        .replace(
          /connect-src ([^;]+)/,
          `connect-src $1 ${localhost} ${localhostWs} ${loopback} ${loopbackWs}`,
        ),
    },
  };
}

const mode = process.env.MODE || "chrome";
const repoRoot = import.meta.dirname;

export default defineConfig(({ command, mode: viteMode }) => {
  // `.env` lives at repo root (not `src/`). Required for `npm run dev` and builds.
  const env = loadEnv(viteMode, repoRoot, "");

  return {
    base: command === "build" ? "./" : "/",
    define: {
      __ENABLE_GH_RELEASE_UPDATE_CHECK__: JSON.stringify(
        process.env.GH_RELEASE_UPDATE_CHECK === "true",
      ),
      __GH_RELEASE_REPO__: JSON.stringify(
        process.env.GH_RELEASE_REPO ?? "BetterSEQTA/BetterSEQTA-Plus",
      ),
      __UPDATE_CHANNEL__: JSON.stringify(process.env.UPDATE_CHANNEL ?? "stable"),
      __BUILD_LABEL__: JSON.stringify(process.env.BUILD_LABEL ?? ""),
      __GOOGLE_OAUTH_CLIENT_ID__: JSON.stringify(env.GOOGLE_OAUTH_CLIENT_ID ?? ""),
      __OUTLOOK_OAUTH_CLIENT_ID__: JSON.stringify(env.OUTLOOK_OAUTH_CLIENT_ID ?? ""),
    },
    envDir: repoRoot,
    plugins: [
      svelte({
        emitCss: false,
        configFile: join(repoRoot, "src", "svelte.config.js"),
      }),
      extensionChunkUrls(),
      base64Loader,
      InlineWorkerPlugin(),
      crx({
        manifest: withDevManifestCsp(
          targets.find((t) => t.browser === mode.toLowerCase())?.manifest ?? chrome.manifest,
          command,
        ),
        browser: mode.toLowerCase() === "firefox" ? "firefox" : "chrome",
      }),
      fixCrxWorkerLiveReload(),
      stabilizeCrxDevHmr(),
      ...(command === "build" ? [firefoxStripFunctionProbe()] : []),
    ],
    root: resolve(repoRoot, "./src"),
    resolve: {
      alias: {
        "@": resolve(repoRoot, "./src"),
      },
      conditions: ["onnxruntime-web-use-extern-wasm", ...defaultClientConditions],
      dedupe: ["@huggingface/transformers", "onnxruntime-common", "onnxruntime-web"],
    },
    server: {
      port: DEV_SERVER_PORT,
      strictPort: true,
      hmr: {
        host: "localhost",
        protocol: "ws",
        port: DEV_SERVER_PORT,
      },
    },
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
    optimizeDeps: {
      include: ["layerchart", "d3-scale", "d3-shape", "d3-array", "d3-format", "d3-time"],
    },
    legacy: {
      skipWebSocketTokenCheck: true,
    },
    worker: {
      format: "es",
    },
    build: {
      outDir: resolve(repoRoot, "dist", mode),
      emptyOutDir: true,
      minify: true,
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        input: {
          settings: join(repoRoot, "src", "interface", "index.html"),
          pageState: join(repoRoot, "src", "pageState.js"),
        },
        output: {
          assetFileNames: "assets/[name]-[hash][extname]",
          // Extension packages are versioned; stable chunk names keep source rebuilds identical.
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name].js",
          manualChunks(id) {
            const normalized = id.replace(/\\/g, "/");
            // Keep the Svelte mount helper out of the settings entry chunk so
            // content-script `import("@/interface/main")` does not execute
            // settings-page bootstrap (which requires #app).
            if (
              normalized.endsWith("/interface/main.ts") ||
              normalized.endsWith("/interface/main.js")
            ) {
              return "interface-main";
            }
          },
        },
        onwarn(warning, warn) {
          if (warning.code === "FILE_NAME_CONFLICT") return;
          warn(warning);
        },
      },
    },
  };
});
