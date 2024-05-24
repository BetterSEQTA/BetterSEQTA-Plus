//import MillionLint from '@million/lint';
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import million from "million/compiler";
import manifest from './manifest.json';
import react from '@vitejs/plugin-react-swc';
import { join } from 'path';

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
    minify: false,
    rollupOptions: {
      input: {
        settings: join(__dirname, 'src', 'interface', 'index.html')
      }
    }
  }
});