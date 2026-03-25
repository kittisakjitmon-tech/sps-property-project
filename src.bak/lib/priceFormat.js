/**
 * Format price for display in a short format (e.g. ฿2.5 ล้าน)
 * @param {number|string} price - Price value
 * @param {boolean|string} isRentalOrListingType - Whether it's rental
 * @param {boolean} [showPrice=true] - If false, mask the price (฿1.xx ล้าน)
 */
export function formatPriceShort(price, isRentalOrListingType, showPrice = true) {
  if (price == null || price === '') return '-'
  const num = Number(price)
  if (!Number.isFinite(num)) return '-'

  const isRental = isRentalOrListingType === true || 
                   isRentalOrListingType === 'rent' ||
                   (typeof isRentalOrListingType === 'string' && isRentalOrListingType.toLowerCase() === 'rent')

  // Case: Masking (แสดงเฉพาะเลขหลักแรก)
  if (showPrice === false) {
    const firstDigit = String(Math.floor(num)).charAt(0)
    if (!isRental && num >= 1000000) {
      return `฿${firstDigit}.xx ล้าน`
    }
    if (isRental) {
      return `฿${firstDigit},xxx/ด.`
    }
    return `฿${firstDigit}xx,xxx`
  }

  // Case: Rental (แสดงราคาเต็มแบบคอมม่า)
  if (isRental) {
    return `฿${num.toLocaleString('th-TH')}/ด.`
  }

  // Case: Sale (แปลงเป็นหลักล้าน)
  if (num >= 1000000) {
    const millions = num / 1000000
    const formatted = parseFloat(millions.toFixed(2)).toString()
    return `฿${formatted} ล้าน`
  }

  // Fallback for sale under 1M
  return `฿${num.toLocaleString('th-TH')}`
}

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
 * Format price for display (Standard format)
 */
export function formatPrice(price, isRentalOrListingType, showPrice = true) {
  if (price == null || price === '') return '-'
  const num = Number(price)
  if (!Number.isFinite(num)) return '-'
  const formatted = num.toLocaleString('th-TH')
  const displayNumber = showPrice !== false ? formatted : maskFormattedNumber(formatted)
  
  const isRental = isRentalOrListingType === true || 
                   isRentalOrListingType === 'rent' ||
                   (typeof isRentalOrListingType === 'string' && isRentalOrListingType.toLowerCase() === 'rent')
  
  return isRental ? `${displayNumber} บาท/เดือน` : `${displayNumber} บาท`
}
