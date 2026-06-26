import { defineConfig } from "vite";
import { join, resolve } from "path";

import touchGlobalCSSPlugin from "./lib/touchGlobalCSS";
import InlineWorkerPlugin from "./lib/inlineWorker";
import { base64Loader } from "./lib/base64loader";
import type { BuildTarget, Manifest } from "./lib/types";
import ClosePlugin from "./lib/closePlugin";
import fixCrxWorkerLiveReload from "./lib/fixCrxWorkerLiveReload";
import { firefoxStripFunctionProbe } from "./lib/firefoxStripFunctionProbe";
import { extensionChunkUrls } from "./lib/extensionChunkUrls";

import million from "million/compiler";

import { svelte } from "@sveltejs/vite-plugin-svelte";

import { chrome } from "./src/manifests/chrome";
import { brave } from "./src/manifests/brave";
import { edge } from "./src/manifests/edge";
import { firefox } from "./src/manifests/firefox";
import { opera } from "./src/manifests/opera";
import { safari } from "./src/manifests/safari";
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
        .replace(
          "script-src 'self'",
          `script-src 'self' ${localhost} ${loopback}`,
        )
        .replace(
          /connect-src ([^;]+)/,
          `connect-src $1 ${localhost} ${localhostWs} ${loopback} ${loopbackWs}`,
        ),
    },
  };
}

const mode = process.env.MODE || "chrome"; // Check the environment variable to determine which build type to use.
//const sourcemap = (process.env.SOURCEMAP === "true") || false; // Check whether we want sourcemaps.
/** Million's compiler can emit `new Function()`, which Firefox extension pages block (strict CSP, no unsafe-eval). */
const useMillion = mode.toLowerCase() !== "firefox";

export default defineConfig(({ command }) => ({
  // Content scripts run on the host page; absolute `/assets/...` URLs would
  // resolve against SEQTA instead of chrome-extension://. Relative base makes
  // Vite emit import.meta.url-relative chunk/CSS URLs at runtime.
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
  },
  plugins: [
    svelte({
      emitCss: false,
      configFile: join(__dirname, "src", "svelte.config.js"),
    }),
    extensionChunkUrls(),
    base64Loader,
    InlineWorkerPlugin(),
    ...(useMillion && command !== "build"
      ? [
          million.vite({
            auto: true,
            filter: {
              exclude: [
                "**/*.svelte",
                "node_modules/**/*.{jsx,tsx,ts,js,mjs,cjs}",
              ],
            },
          }),
        ]
      : []),
    crx({
      manifest: withDevManifestCsp(
        targets.find((t) => t.browser === mode.toLowerCase())?.manifest ??
          chrome.manifest,
        command,
      ),
      browser: mode.toLowerCase() === "firefox" ? "firefox" : "chrome",
    }),
    fixCrxWorkerLiveReload(),
    touchGlobalCSSPlugin(),
    ...(command === "build" ? [ClosePlugin(), firefoxStripFunctionProbe()] : []),
  ],
  root: resolve(__dirname, "./src"),
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
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
    include: [
      "@babel/runtime/helpers/extends",
      "@babel/runtime/helpers/interopRequireDefault",
      "layerchart",
      "d3-scale",
      "d3-shape",
      "d3-array",
      "d3-format",
      "d3-time",
    ],
  },
  legacy: {
    skipWebSocketTokenCheck: true,
  },
  worker: {
    format: "es",
  },
  build: {
    outDir: resolve(__dirname, "dist", mode),
    emptyOutDir: false,
    minify: true,
    //sourcemap: sourcemap,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        settings: join(__dirname, "src", "interface", "index.html"),
        pageState: join(__dirname, "src", "pageState.js"),
      },
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
      },
      onwarn(warning, warn) {
        if (warning.code === "FILE_NAME_CONFLICT") return;
        warn(warning);
      },
    },
  },
}));
