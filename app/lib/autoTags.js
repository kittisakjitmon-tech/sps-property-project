/**
 * Auto-Generated Tags System for SPS Property Solution
 * Generates tags automatically from property data to enhance searchability
 */

/**
 * Convert price number to readable tag (e.g., 1500000 -> '1.5 ล้าน')
 */
function formatPriceTag(price) {
  if (!price || price === '' || isNaN(Number(price))) return null
  
  const numPrice = Number(price)
  if (numPrice < 1000) return null
  
  // Convert to millions
  if (numPrice >= 1000000) {
    const millions = numPrice / 1000000
    if (millions % 1 === 0) {
      return `${millions} ล้าน`
    } else {
      return `${millions.toFixed(1)} ล้าน`
    }
  }
  
  // Convert to thousands
  if (numPrice >= 1000) {
    const thousands = numPrice / 1000
    if (thousands % 1 === 0) {
      return `${thousands} พัน`
    } else {
      return `${thousands.toFixed(1)} พัน`
    }
  }
  
  return null
}

/**
 * Convert listingType to readable tag
 */
function formatListingTypeTag(listingType) {
  if (!listingType) return null
  
  switch (listingType) {
    case 'sale':
      return 'ขาย'
    case 'rent':
      return 'เช่า'
    default:
      return null
  }
}

/**
 * Convert availability to readable tag
 */
function formatAvailabilityTag(availability) {
  if (!availability) return null
  
  switch (availability) {
    case 'available':
    case 'ว่าง':
      return 'ว่าง'
    case 'reserved':
    case 'ติดจอง':
      return 'ติดจอง'
    case 'sold':
    case 'ขายแล้ว':
      return 'ขายแล้ว'
    case 'unavailable':
    case 'ไม่ว่าง':
      return 'ไม่ว่าง'
    default:
      return null
  }
}

/**
 * Generate auto tags from property data
 * @param {Object} property - Property data object
 * @returns {Array<string>} Array of auto-generated tags
 */
export function generateAutoTags(property) {
  try {
    if (!property || typeof property !== 'object') {
      return []
    }

    const tags = []

    // 1. Property ID
    if (property.propertyId && typeof property.propertyId === 'string') {
      const cleanId = property.propertyId.trim()
      if (cleanId) {
        tags.push(cleanId)
      }
    }

    // 2. Type (เช่น ทาวน์โฮม)
    if (property.type && typeof property.type === 'string') {
      const cleanType = property.type.trim()
      if (cleanType) {
        tags.push(cleanType)
      }
    }

    // 3. Location Display (เช่น เมืองชลบุรี)
    if (property.locationDisplay && typeof property.locationDisplay === 'string') {
      const cleanLocation = property.locationDisplay.trim()
      if (cleanLocation) {
        tags.push(cleanLocation)
      }
    }

    // 4. Nearby Places (กระจายค่าจาก Array ออกมาเป็น Tag เดี่ยวๆ)
    if (Array.isArray(property.nearbyPlace) && property.nearbyPlace.length > 0) {
      property.nearbyPlace.forEach((place) => {
        if (place && typeof place === 'string') {
          const cleanPlace = place.trim()
          if (cleanPlace) {
            tags.push(cleanPlace)
          }
        } else if (place && typeof place === 'object') {
          // Handle object format (e.g., { label: '...', name: '...' })
          const placeLabel = place.label || place.name || place.value || ''
          if (placeLabel && typeof placeLabel === 'string') {
            const cleanPlace = placeLabel.trim()
            if (cleanPlace) {
              tags.push(cleanPlace)
            }
          }
        }
      })
    }

    // 5. Listing Type (แปลง sale -> 'ขาย', rent -> 'เช่า')
    const listingTypeTag = formatListingTypeTag(property.listingType)
    if (listingTypeTag) {
      tags.push(listingTypeTag)
    }

    // 6. Sub Listing Type (ถ้าเป็น installment_only -> เพิ่ม Tag 'ผ่อนตรง')
    if (property.subListingType === 'installment_only') {
      tags.push('ผ่อนตรง')
    } else if (property.subListingType === 'rent_only') {
      // Optional: Add 'เช่าเท่านั้น' tag if needed
      // tags.push('เช่าเท่านั้น')
    }

    // Backward compatibility: Check directInstallment
    if (property.directInstallment === true && !tags.includes('ผ่อนตรง')) {
      tags.push('ผ่อนตรง')
    }

    // 7. Availability (แปลง available -> 'ว่าง', reserved -> 'ติดจอง')
    const availabilityTag = formatAvailabilityTag(property.availability || property.status)
    if (availabilityTag) {
      tags.push(availabilityTag)
    }

    // 8. Price (แปลงตัวเลขเป็นคำ เช่น 1500000 -> '1.5 ล้าน')
    const priceTag = formatPriceTag(property.price)
    if (priceTag) {
      tags.push(priceTag)
    }

    // 9. Property Condition (มือ 1/มือ 2) - สำหรับ sale
    if (property.propertyCondition) {
      const condition = String(property.propertyCondition).trim()
      if (condition === 'มือ 1' || condition === 'มือ1') {
        tags.push('มือ 1')
      } else if (condition === 'มือ 2' || condition === 'มือ2') {
        tags.push('มือ 2')
      }
    }

    // Backward compatibility: Check propertySubStatus
    if (!property.propertyCondition && property.propertySubStatus) {
      const subStatus = String(property.propertySubStatus).trim()
      if (subStatus === 'มือ 1' || subStatus === 'มือ1') {
        tags.push('มือ 1')
      } else if (subStatus === 'มือ 2' || subStatus === 'มือ2') {
        tags.push('มือ 2')
      }
    }

    // Filter out empty strings and null/undefined values
    return tags.filter((tag) => tag && typeof tag === 'string' && tag.trim().length > 0)
  } catch (error) {
    console.error('generateAutoTags error:', error)
    return []
  }
}

/**
 * Merge custom tags with auto-generated tags, removing duplicates
 * @param {Array<string>} customTags - User-provided custom tags
 * @param {Array<string>} autoTags - Auto-generated tags
 * @returns {Array<string>} Merged array without duplicates
 */
export function mergeTags(customTags = [], autoTags = []) {
  try {
    // Combine both arrays
    const allTags = [...(Array.isArray(customTags) ? customTags : []), ...(Array.isArray(autoTags) ? autoTags : [])]
    
    // Use Set to remove duplicates (case-insensitive)
    const uniqueTags = new Set()
    const normalizedTags = new Set()
    
    allTags.forEach((tag) => {
      if (!tag || typeof tag !== 'string') return
      
      const trimmedTag = tag.trim()
      if (!trimmedTag) return
      
      // Normalize for comparison (lowercase, remove extra spaces)
      const normalized = trimmedTag.toLowerCase().replace(/\s+/g, ' ')
      
      // Only add if not already present (case-insensitive)
      if (!normalizedTags.has(normalized)) {
        normalizedTags.add(normalized)
        uniqueTags.add(trimmedTag) // Keep original case
      }
    })
    
    return Array.from(uniqueTags)
  } catch (error) {
    console.error('mergeTags error:', error)
    return Array.isArray(customTags) ? customTags : []
  }
}
