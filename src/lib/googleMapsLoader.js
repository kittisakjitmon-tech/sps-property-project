const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-sdk'
let googleMapsLoadingPromise = null

function getApiKey() {
  return import.meta.env.VITE_GOOGLE_PLACES_API_KEY
}

function buildScriptUrl(libraries = []) {
  const key = getApiKey()
  if (!key) {
    throw new Error('Missing VITE_GOOGLE_PLACES_API_KEY')
  }
  const libs = Array.from(new Set(libraries.filter(Boolean)))
  const params = new URLSearchParams({
    key,
  })
  if (libs.length > 0) params.set('libraries', libs.join(','))
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`
}

export function loadGoogleMapsApi({ libraries = [] } = {}) {
  if (typeof window === 'undefined') return Promise.reject(new Error('window is not available'))
  if (window.google?.maps) return Promise.resolve(window.google)
  if (googleMapsLoadingPromise) return googleMapsLoadingPromise

  googleMapsLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')), { once: true })
      return
    }

    let scriptUrl = ''
    try {
      scriptUrl = buildScriptUrl(libraries)
    } catch (error) {
      googleMapsLoadingPromise = null
      reject(error)
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = scriptUrl
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = () => {
      googleMapsLoadingPromise = null
      reject(new Error('Failed to load Google Maps script'))
    }

    document.head.appendChild(script)
  })

  return googleMapsLoadingPromise
}
