import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from 'vite'
import compression from 'vite-plugin-compression'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // React Router Framework Mode plugin (แทน @vitejs/plugin-react)
    reactRouter(),
    // Optimize images in public/ and imported assets
    ViteImageOptimizer({
      test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
      includePublic: true,
      logStats: true,
      png: { quality: 85 },
      jpeg: { quality: 85 },
      webp: { quality: 85 },
    }),
    // Gzip compression
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240,
    }),
    // Brotli compression
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
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
