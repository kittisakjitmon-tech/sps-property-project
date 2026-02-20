import { PROPERTY_TYPES } from '../constants/propertyTypes'

/**
 * Property ID auto-increment system
 * Format: [PREFIX]-[NN]
 * 1. Derives prefix directly from the new `PROPERTY_TYPES` by stripping `-ID` from the end.
 *    Example: 'SPS-S-1CLASS-ID' -> 'SPS-S-1CLASS-'
 * 2. Parses max existing number from either propertyId or displayId to safely increment.
 */

export function getPrefixForType(type) {
  // If explicitly matching an ID struct:
  if (type && type.endsWith('-ID')) {
    return type.slice(0, -2) // keep the trailing '-'
  }

  // Fallback to legacy lookups if an old thai string is somehow passed directly during generation
  const foundType = PROPERTY_TYPES.find((pt) => pt.label === type)
  if (foundType && foundType.id.endsWith('-ID')) {
    return foundType.id.slice(0, -2)
  }

  // Absolute fallback
  return 'SPS-X-'
}

export function generatePropertyID(type, allProperties = []) {
  const prefix = getPrefixForType(type)

  const numbers = (allProperties || []).map((p) => {
    const idToCheck = p.displayId || p.propertyId || ''
    const match = String(idToCheck).match(/\d+$/)
    if (match) {
      const num = parseInt(match[0], 10)
      return Number.isFinite(num) ? num : 0
    }
    return 0
  })

  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0
  const nextNum = maxNum + 1
  const padded = String(nextNum).padStart(3, '0') // Keeping 3 digits minimum per requirement implicitly
  return `${prefix}${padded}`
}

export function checkPropertyIdDuplicate(propertyId, excludeId, allProperties = []) {
  if (!propertyId || !String(propertyId).trim()) return false
  const normalized = String(propertyId).trim().toUpperCase()
  return (allProperties || []).some((p) => {
    if (p.id === excludeId) return false
    const idA = String(p.displayId || '').trim().toUpperCase()
    const idB = String(p.propertyId || '').trim().toUpperCase()
    return idA === normalized || idB === normalized
  })
}
