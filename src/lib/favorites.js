// Favorites System using localStorage
const FAVORITES_KEY = 'sps_property_favorites'

export function getFavorites() {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function addFavorite(propertyId) {
  const favorites = getFavorites()
  if (!favorites.includes(propertyId)) {
    favorites.push(propertyId)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  }
}

export function removeFavorite(propertyId) {
  const favorites = getFavorites()
  const updated = favorites.filter((id) => id !== propertyId)
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated))
}

export function isFavorite(propertyId) {
  const favorites = getFavorites()
  return favorites.includes(propertyId)
}

export function toggleFavorite(propertyId) {
  if (isFavorite(propertyId)) {
    removeFavorite(propertyId)
    return false
  } else {
    addFavorite(propertyId)
    return true
  }
}
