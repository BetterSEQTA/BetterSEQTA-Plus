import { defineConfig } from 'vite';
import { join, resolve } from 'path';

import { updateManifestPlugin } from './lib/patchPackage';
import { base64Loader } from './lib/base64loader';
import type { BuildTarget } from './lib/types';

import react from '@vitejs/plugin-react-swc';
import million from "million/compiler";
//import MillionLint from '@million/lint';

import { chrome } from './src/manifests/chrome';
import { brave } from './src/manifests/brave';
import { edge } from './src/manifests/edge';
import { firefox } from './src/manifests/firefox';
import { opera } from './src/manifests/opera';
import { safari } from './src/manifests/safari';
import { crx } from '@crxjs/vite-plugin';

const targets: BuildTarget[] = [
  chrome, brave, edge, firefox, opera, safari
]

const mode = process.env.MODE || 'chrome';

export default defineConfig({
  plugins: [
    base64Loader,
    react(),
    million.vite({ auto: true }),
    //MillionLint.vite(), /* enable for testing and debugging performance */
    crx({
      manifest: targets.find(t => t.browser === mode.toLowerCase())?.manifest ?? chrome.manifest,
      browser: mode.toLowerCase() === "firefox" ? "firefox" : "chrome"
    }),
    updateManifestPlugin()
  ],
  root: resolve(__dirname, './src'),
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    },
  },
  server: {
    port: 5173,
    hmr: {
      host: "localhost",
      protocol: "ws",
      port: 5173
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist', mode),
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: {
        settings: join(__dirname, 'src', 'interface', 'index.html'),
        backgrounds: join(__dirname, 'src', 'seqta', 'ui', 'background', 'background.html')
      }
    }
  }
});