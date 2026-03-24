import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let googleMapsLoadingPromise = null

export function loadGoogleMapsApi({ libraries = [] } = {}) {
  if (typeof window === 'undefined') return Promise.reject(new Error('window is not available'))
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google)
  if (googleMapsLoadingPromise) return googleMapsLoadingPromise

  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_PLACES_API_KEY'))
  }

  // Set the necessary options to load the Maps API
  setOptions({
    key: apiKey,
    version: 'weekly'
  })

  // Start the loading process by importing 'maps', and optionally preload other libraries
  const loaders = ['maps', ...libraries].filter(Boolean).map(lib => importLibrary(lib))

  googleMapsLoadingPromise = Promise.all(loaders)
    .then(() => {
      // Return the globally available window.google after loading is complete
      return window.google
    })
    .catch((error) => {
      googleMapsLoadingPromise = null
      throw error
    })

  return googleMapsLoadingPromise
}
