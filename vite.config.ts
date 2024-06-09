import { defineConfig } from 'vite';
import { join } from 'path';

import manifest from './manifest.json';

import react from '@vitejs/plugin-react-swc';
//import MillionLint from '@million/lint';
import { crx } from '@crxjs/vite-plugin';
import million from "million/compiler";

const plugins = [
  react(),
  million.vite({ auto: true }),
  //MillionLint.vite(), /* enable for testing and debugging performance */
  crx({
  manifest
  })
];

export default defineConfig({
  plugins: plugins,
  server: {
    port: 5173,
    hmr: {
      host: "localhost",
      protocol: "ws",
      port: 5173
    }
  },
  build: {
    minify: true,
    rollupOptions: {
      input: {
        settings: join(__dirname, 'src', 'interface', 'index.html'),
        backgrounds: join(__dirname, 'src', 'seqta', 'ui', 'background', 'background.html')
      }
    }
  }
});