import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    //outDir: '../../public/popup-dist',
    rollupOptions: {
      output: {
        assetFileNames: 'client/rsc/[ext]/[name][extname]',
        chunkFileNames: 'client/rsc/[chunks]/[name].[hash].js',
        entryFileNames: 'client/rsc/js/client.js'
      }
    }
  }
})
