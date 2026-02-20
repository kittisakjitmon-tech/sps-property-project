import { Loader } from '@googlemaps/js-api-loader'

let googleMapsLoadingPromise = null

export function loadGoogleMapsApi({ libraries = [] } = {}) {
  if (typeof window === 'undefined') return Promise.reject(new Error('window is not available'))
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google)
  if (googleMapsLoadingPromise) return googleMapsLoadingPromise

  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_PLACES_API_KEY'))
  }

  const loader = new Loader({
    apiKey,
    version: 'weekly',
    libraries: Array.from(new Set([...libraries, 'marker', 'places']))
  })

  googleMapsLoadingPromise = loader.load()
    .then(() => {
      // Ensure importLibrary is available for components that rely on it
      // Since we preload 'marker' and 'places', they will be available synchronously
      if (window.google.maps && !window.google.maps.importLibrary) {
        window.google.maps.importLibrary = (lib) => Promise.resolve(window.google.maps[lib])
      }
      return window.google
    })
    .catch((error) => {
      googleMapsLoadingPromise = null
      throw error
    })

  return googleMapsLoadingPromise
}
