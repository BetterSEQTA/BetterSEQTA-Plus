import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), sentryVitePlugin({
    org: "personal-771",
    project: "betterseqtaplus-popup"
  })],
  build: {
    //outDir: '../../public/popup-dist',
    rollupOptions: {
      output: {
        assetFileNames: 'client/rsc/[ext]/[name][extname]',
        chunkFileNames: 'client/rsc/[chunks]/[name].[hash].js',
        entryFileNames: 'client/public/client.js'
      }
    },

    sourcemap: true
  }
})