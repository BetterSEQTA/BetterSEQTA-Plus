import { defineConfig } from "vite";
import { join, resolve } from "path";

import touchGlobalCSSPlugin from "./lib/touchGlobalCSS";
import InlineWorkerPlugin from "./lib/inlineWorker";
import { base64Loader } from "./lib/base64loader";
import type { BuildTarget } from "./lib/types";
import ClosePlugin from "./lib/closePlugin";

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

const mode = process.env.MODE || "chrome"; // Check the environment variable to determine which build type to use.
//const sourcemap = (process.env.SOURCEMAP === "true") || false; // Check whether we want sourcemaps.
export default defineConfig(({ command }) => ({
  plugins: [
    base64Loader,
    InlineWorkerPlugin(),
    svelte({
      emitCss: false,
    }),
    million.vite({ auto: true }),
    crx({
      manifest:
        targets.find((t) => t.browser === mode.toLowerCase())?.manifest ??
        chrome.manifest,
      browser: mode.toLowerCase() === "firefox" ? "firefox" : "chrome",
    }),
    touchGlobalCSSPlugin(),
    ...(command === "build" ? [ClosePlugin()] : []),
  ],
  root: resolve(__dirname, "./src"),
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    hmr: {
      host: "localhost",
      protocol: "ws",
      port: 5173,
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern",
      },
    },
  },
  optimizeDeps: {
    include: [
      "@babel/runtime/helpers/extends",
      "@babel/runtime/helpers/interopRequireDefault",
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
    },
  },
}));
