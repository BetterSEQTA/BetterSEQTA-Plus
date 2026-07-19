import { defineConfig, loadEnv } from "vite";
import { join, resolve } from "path";

import touchGlobalCSSPlugin from "./lib/touchGlobalCSS";
import InlineWorkerPlugin from "./lib/inlineWorker";
import { base64Loader } from "./lib/base64loader";
import type { BuildTarget, Manifest } from "./lib/types";
import ClosePlugin from "./lib/closePlugin";
import fixCrxWorkerLiveReload from "./lib/fixCrxWorkerLiveReload";
import { firefoxStripFunctionProbe } from "./lib/firefoxStripFunctionProbe";
import { extensionChunkUrls } from "./lib/extensionChunkUrls";

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
const repoRoot = __dirname;

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
      configFile: join(__dirname, "src", "svelte.config.js"),
    }),
    extensionChunkUrls(),
    base64Loader,
    InlineWorkerPlugin(),
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
};
});
