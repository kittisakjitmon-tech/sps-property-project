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
          
          // แยก Firebase เป็น chunk ย่อย — โหลดแบบขนาน ลด main-thread parse ครั้งเดียว
          if (id.includes('firebase')) {
            if (id.includes('firebase/app')) return 'firebase-app'
            if (id.includes('firebase/auth')) return 'firebase-auth'
            if (id.includes('firebase/firestore')) return 'firebase-firestore'
            if (id.includes('firebase/storage')) return 'firebase-storage'
            return 'vendor-firebase'
          }
          
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
