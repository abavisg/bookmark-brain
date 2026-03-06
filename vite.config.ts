import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
})
