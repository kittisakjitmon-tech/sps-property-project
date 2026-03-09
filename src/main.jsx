import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

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
