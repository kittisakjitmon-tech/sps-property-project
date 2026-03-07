import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Optimize images in public/ and imported assets (PNG, JPEG, WebP, SVG)
    ViteImageOptimizer({
      test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
      includePublic: true,
      logStats: true,
      png: { quality: 85 },
      jpeg: { quality: 85 },
      webp: { quality: 85 },
    }),
    // Gzip compression — ลด bundle size ~60-70% สำหรับ static hosting
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // บีบอัดไฟล์ที่ใหญ่กว่า 10KB
    }),
    // Brotli compression — ดีกว่า gzip สำหรับ browser สมัยใหม่
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
    }),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false, // ปิด sourcemap ใน prod เพื่อลด build size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          
          // แยก Firebase ออกมาเป็นก้อนใหญ่ 1 ก้อน (เพราะใช้หลายที่)
          if (id.includes('firebase')) return 'vendor-firebase'
          
          // แยก Lucide icons — ป้องกันไม่ให้ไปรวมกับ vendor หลัก
          if (id.includes('lucide-react')) return 'vendor-icons'
          
          // แยกส่วนที่ใช้เฉพาะใน Admin
          if (id.includes('@dnd-kit') || id.includes('recharts')) {
            return 'vendor-admin-tools'
          }
          
          if (id.includes('swiper')) return 'vendor-swiper'
          if (id.includes('react-router')) return 'vendor-router'
          
          return 'vendor'
        },
      },
    },
  },
})
