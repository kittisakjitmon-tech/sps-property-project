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
  if (!property?.id) {
    console.warn('Property missing id:', property)
    return ''
  }

  const parts = []

  // เพิ่มการตรวจสอบ location ที่อาจจะเป็น string หรือ object
  let loc = property.location
  if (typeof loc === 'string') {
    // ถ้า location เป็น string ให้ใช้เป็น district
    parts.push(sanitizeSlugPart(loc))
  } else if (loc && typeof loc === 'object') {
    if (loc.district) parts.push(sanitizeSlugPart(loc.district))
    if (loc.province) parts.push(sanitizeSlugPart(loc.province))
  }

  const typeLabel = getPropertyLabel(property.type)
  if (typeLabel) parts.push(sanitizeSlugPart(typeLabel))

  // จัดการกับ listingType - สามารถเป็น string หรือ boolean
  let listingType = property.listingType
  if (!listingType) {
    listingType = property.isRental ? 'rent' : 'sale'
  }
  parts.push(listingType === 'rent' ? 'เช่า' : 'ขาย')

  const priceSlug = formatPriceForSlug(property.price)
  if (priceSlug) parts.push(priceSlug)

  const body = parts.filter(Boolean).join('-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '')
  
  if (!body) {
    console.warn('Empty slug body for property:', property.id, property)
    // ถ้า slug ว่าง ให้ส่งคืนแค่ id เฉพาะ
    return `property--${property.id}`
  }
  
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
  if (!slugParam) {
    console.warn('extractIdFromSlug: empty slug param')
    return null
  }
  
  const slug = String(slugParam).trim()
  const sep = slug.lastIndexOf('--')
  
  if (sep === -1) {
    console.warn('extractIdFromSlug: no -- separator found in slug:', slug)
    return null
  }
  
  const id = slug.substring(sep + 2)
  if (!id) {
    console.warn('extractIdFromSlug: empty id after separator in slug:', slug)
    return null
  }
  
  return id
}
