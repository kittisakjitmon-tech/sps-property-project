import { getPropertyLabel } from '../constants/propertyTypes'

function sanitizeSlugPart(str) {
  return String(str)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\-.]/g, '')
}

function formatPriceForSlug(price) {
  const num = Number(price)
  if (!Number.isFinite(num) || num <= 0) return ''
  if (num >= 1_000_000) {
    const m = parseFloat((num / 1_000_000).toFixed(2))
    return `${m}m`
  }
  if (num >= 1_000) {
    const k = parseFloat((num / 1_000).toFixed(1))
    return `${k}k`
  }
  return String(num)
}

/**
 * Build a URL-safe slug from property data.
 * Format: {district}-{province}-{typeLabel}-{ขาย|เช่า}-{price}--{id}
 */
export function generatePropertySlug(property) {
  if (!property?.id) return ''

  const parts = []

  const loc = property.location || {}
  if (loc.district) parts.push(sanitizeSlugPart(loc.district))
  if (loc.province) parts.push(sanitizeSlugPart(loc.province))

  const typeLabel = getPropertyLabel(property.type)
  if (typeLabel) parts.push(sanitizeSlugPart(typeLabel))

  const listingType = property.listingType || (property.isRental ? 'rent' : 'sale')
  parts.push(listingType === 'rent' ? 'เช่า' : 'ขาย')

  const priceSlug = formatPriceForSlug(property.price)
  if (priceSlug) parts.push(priceSlug)

  const body = parts.filter(Boolean).join('-').replace(/-{2,}/g, '-')
  return `${body}--${property.id}`
}

/** Full path for a property detail page */
export function getPropertyPath(property) {
  if (!property?.id) return '/properties'
  const slug = generatePropertySlug(property)
  return `/properties/${slug}`
}

/** Extract Firestore document ID from a slug param (backward-compatible) */
export function extractIdFromSlug(slugParam) {
  if (!slugParam) return null
  const sep = slugParam.lastIndexOf('--')
  return sep !== -1 ? slugParam.substring(sep + 2) : slugParam
}
