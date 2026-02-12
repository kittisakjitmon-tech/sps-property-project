/**
 * Format price for display with optional masking (showPrice = false)
 * Mask format: 2,xxx,xxx (replace digits after first with 'x')
 */

/**
 * Mask a formatted number string (e.g. "2,500,000" -> "2,xxx,xxx")
 */
export function maskFormattedNumber(formatted) {
  if (!formatted) return '-'
  const str = String(formatted)
  const parts = str.split(',')
  if (parts.length <= 1) {
    const chars = str.split('')
    if (chars.length <= 1) return `${chars[0] ?? '-'}x`
    return `${chars[0]}${'x'.repeat(chars.length - 1)}`
  }
  return parts
    .map((part, idx) => (idx === 0 ? part : part.replace(/\d/g, 'x')))
    .join(',')
}

/**
 * Format price for display
 * @param {number|string} price - Price value
 * @param {boolean|string} isRentalOrListingType - Whether it's rental (boolean) or listingType ('rent'/'sale')
 * @param {boolean} [showPrice=true] - If false, mask the price (2,xxx,xxx)
 */
export function formatPrice(price, isRentalOrListingType, showPrice = true) {
  if (price == null || price === '') return '-'
  const num = Number(price)
  if (!Number.isFinite(num)) return '-'
  const formatted = num.toLocaleString('th-TH')
  const displayNumber = showPrice !== false ? formatted : maskFormattedNumber(formatted)
  
  // ตรวจสอบว่าเป็น rental หรือไม่ (รองรับทั้ง boolean และ listingType string)
  const isRental = isRentalOrListingType === true || 
                   isRentalOrListingType === 'rent' ||
                   (typeof isRentalOrListingType === 'string' && isRentalOrListingType.toLowerCase() === 'rent')
  
  return isRental ? `${displayNumber} บาท/เดือน` : `${displayNumber} บาท`
}
