import { reactRouter } from "@react-router/dev/vite";
import { cloudflareDevProxy } from "@react-router/dev/vite/cloudflare";
import { defineConfig } from 'vite'
import compression from 'vite-plugin-compression'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Cloudflare Workers dev proxy - MUST come BEFORE reactRouter()
    cloudflareDevProxy(),
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
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    modulePreload: false,
  },
})
