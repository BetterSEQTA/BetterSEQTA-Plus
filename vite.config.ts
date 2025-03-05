import { defineConfig } from 'vite';
import { join, resolve } from 'path';

import { updateManifestPlugin } from './lib/patchPackage';
import { base64Loader } from './lib/base64loader';
import type { BuildTarget } from './lib/types';
import ClosePlugin from './lib/closePlugin';
// import ckeditor5 from '@ckeditor/vite-plugin-ckeditor5';

import react from '@vitejs/plugin-react';
import million from "million/compiler";
//import MillionLint from '@million/lint';

import { svelte } from '@sveltejs/vite-plugin-svelte'

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

export default defineConfig(({ command }) => ({
  plugins: [
    base64Loader,
    react(),
    svelte({
      emitCss: false
    }),
    //ckeditor5( { theme: require.resolve( '@ckeditor/ckeditor5-theme-lark' ) } ),
    million.vite({ auto: true }),
    //MillionLint.vite(), /* enable for testing and debugging performance */
    crx({
      manifest: targets.find(t => t.browser === mode.toLowerCase())?.manifest ?? chrome.manifest,
      browser: mode.toLowerCase() === "firefox" ? "firefox" : "chrome"
    }),
    updateManifestPlugin(),
    ...(command === 'build' ? [ClosePlugin()] : [])
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
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern'
      }
    }
  },
  optimizeDeps: {
    include: ['@babel/runtime/helpers/extends', '@babel/runtime/helpers/interopRequireDefault'],
  },
  legacy: {
    skipWebSocketTokenCheck: true,
  },
  build: {
    outDir: resolve(__dirname, 'dist', mode),
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      input: {
        settings: join(__dirname, 'src', 'interface', 'index.html'),
        migration: join(__dirname, 'src', 'seqta', 'utils', 'migration', 'migrate.html'),
        pageState: join(__dirname, 'src', 'pageState.js'),
      }
    }
  }
}));
