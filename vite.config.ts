import { defineConfig } from 'vite';
import { join } from 'path';
import fs from 'fs';
import mime from 'mime-types';

import manifest from './manifest.json';
import firefoxManifest from './manifest.firefox.json';

import react from '@vitejs/plugin-react-swc';
//import MillionLint from '@million/lint';
import { crx } from '@crxjs/vite-plugin';
import million from "million/compiler";

const isFirefox = process.env.VITE_TARGET === 'firefox';

const base64Loader = {
  name: "base64-loader",
  transform(_: any, id: string) {
    const [filePath, query] = id.split("?");
    if (query !== "base64") return null;

    console.log('Converting: ', filePath);

    const data = fs.readFileSync(filePath, { encoding: 'base64' });
    const mimeType = mime.lookup(filePath);
    const dataURL = `data:${mimeType};base64,${data}`;

    // Print out first 40 chars for debugging
    console.log('Converted: ', dataURL.slice(0, 40));

    return `export default '${dataURL}';`;
  },
};

const plugins = [
  react(),
  base64Loader,
  million.vite({ auto: true }),
  //MillionLint.vite(), /* enable for testing and debugging performance */
  crx({
    manifest: isFirefox ? firefoxManifest : manifest,
    browser: isFirefox ? 'firefox' : 'chrome'
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