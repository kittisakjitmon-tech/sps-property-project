// Favorites System using localStorage - SSR Safe

const FAVORITES_KEY = 'sps_property_favorites'

// Check if we're on the client
function isClient() {
  return typeof window !== 'undefined'
}

// Safely access localStorage
function safeLocalStorage() {
  if (!isClient()) return null
  return window.localStorage
}

export function getFavorites() {
  try {
    const storage = safeLocalStorage()
    if (!storage) return []
    const stored = storage.getItem(FAVORITES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function addFavorite(propertyId) {
  const storage = safeLocalStorage()
  if (!storage) return
  
  const favorites = getFavorites()
  if (!favorites.includes(propertyId)) {
    favorites.push(propertyId)
    storage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  }
}

export function removeFavorite(propertyId) {
  const storage = safeLocalStorage()
  if (!storage) return
  
  const favorites = getFavorites()
  const updated = favorites.filter((id) => id !== propertyId)
  storage.setItem(FAVORITES_KEY, JSON.stringify(updated))
}

export function isFavorite(propertyId) {
  if (!isClient()) return false
  const favorites = getFavorites()
  return favorites.includes(propertyId)
}

export function toggleFavorite(propertyId) {
  if (!isClient()) return false
  
  if (isFavorite(propertyId)) {
    removeFavorite(propertyId)
    return false
  } else {
    addFavorite(propertyId)
    return true
  }
}