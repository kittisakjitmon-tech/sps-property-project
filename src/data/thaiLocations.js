/**
 * Mock Thai locations for nationwide autocomplete
 * Format: { province, district, subDistrict, displayName }
 */
import locations from '../data/bkk-surrounding-locations.json';

export const thaiLocations = locations

/**
 * Filter locations by search query (province, district, subDistrict, displayName)
 */
export function searchLocations(query) {
  if (!query || typeof query !== 'string') return []
  const q = query.trim().toLowerCase()
  if (q.length < 1) return []
  return thaiLocations.filter(
    (loc) =>
      loc.province.toLowerCase().includes(q) ||
      loc.district.toLowerCase().includes(q) ||
      loc.subDistrict.toLowerCase().includes(q) ||
      loc.displayName.toLowerCase().includes(q)
  )
}
