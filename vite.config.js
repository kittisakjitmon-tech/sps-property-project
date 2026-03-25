import { defineConfig } from 'vite'
import { reactRouter } from "@react-router/dev/vite"
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // React Router Framework Mode plugin
    reactRouter(),
    // Optimize images
    ViteImageOptimizer({
      test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
      includePublic: true,
      logStats: true,
      png: { quality: 85 },
      jpeg: { quality: 85 },
      webp: { quality: 85 },
    }),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    modulePreload: false,
  },
})
