import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import million from "million/compiler"
import manifest from './manifest.json'
import react from '@vitejs/plugin-react-swc'
import { join } from 'path'

export default defineConfig({
  plugins: [
    react(),
    million.vite({
      auto: {
        threshold: 0.005, // default: 0.1,
        skip: [], // default []
      }      
    }),
    crx({ manifest }),
  ],
  server: {
    port: 5173,
    hmr: {
      host: "localhost",
      protocol: "ws",
      port: 5173,
    },
  },
  build: {
    minify: false,
    rollupOptions: {
      input: {
        settings: join(__dirname, 'src', 'interface', 'index.html'),
      }
    },
  },
})
