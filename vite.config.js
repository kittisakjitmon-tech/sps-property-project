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
    // ป้องกัน preload ไปยัง chunk ที่ hash เปลี่ยนหลัง deploy (ลดโอกาส "Unable to preload CSS" บน live)
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          
          // รวม Firebase ทั้งหมดไว้ใน chunk เดียว — ป้องกัน circular dependency TDZ error
          // (การแยก firebase/app ออกจาก firebase/auth, firestore ฯลฯ ทำให้เกิด
          //  "Cannot access 'v' before initialization" ใน minified bundle)
          if (id.includes('firebase')) return 'vendor-firebase'
          
          if (id.includes('lucide-react')) return 'vendor-icons'
          
          if (id.includes('@dnd-kit') || id.includes('recharts')) {
            return 'vendor-admin-tools'
          }
          
          if (id.includes('react-router')) return 'vendor-router'
          
          return 'vendor'
        },
      },
    },
  },
})
