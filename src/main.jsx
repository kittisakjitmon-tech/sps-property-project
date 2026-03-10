import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

// ─── Auto-reload on stale chunk after new deployment ─────────────────────────
// เมื่อ deploy ใหม่ → hash ของ chunk เปลี่ยน → browser โหลด chunk เก่าไม่ได้
// Vite จะ emit event นี้ให้ → reload หน้าครั้งเดียว แทนที่จะ throw error
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  // หลีกเลี่ยง reload loop โดย track ว่าเคย reload แล้วหรือยัง
  const reloaded = sessionStorage.getItem('chunk-reload')
  if (!reloaded) {
    sessionStorage.setItem('chunk-reload', '1')
    window.location.reload()
  } else {
    sessionStorage.removeItem('chunk-reload')
  }
})

// Defer non-critical work after first paint to improve INP (e.g. future Firebase Analytics)
function DeferredInit() {
  useEffect(() => {
    const useIdle = typeof requestIdleCallback !== 'undefined'
    const cb = () => {
      // Optional: dynamic import and init analytics here to avoid blocking main thread
    }
    const id = useIdle ? requestIdleCallback(cb, { timeout: 2000 }) : setTimeout(cb, 1)
    return () => (useIdle ? cancelIdleCallback(id) : clearTimeout(id))
  }, [])
  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
        <DeferredInit />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
