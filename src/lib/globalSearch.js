/**
 * Unified Global Search System for SPS Property Solution
 * Centralized filtering function that handles keyword search, category/status filtering, and price range
 * with full backward compatibility support
 */

/**
 * Normalize text for comparison (lowercase, trim, remove extra spaces)
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return ''
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Smart Tokenization: Extract special keywords ('มือ 1', 'มือ 2', 'มือ1', 'มือ2') before splitting
 * @param {string} query - Search query string
 * @returns {Array<string>} Array of tokens including special keywords
 */
function smartTokenize(query) {
  if (!query || typeof query !== 'string') return []
  
  const normalized = normalizeText(query)
  if (!normalized) return []
  
  const tokens = []
  let remainingText = normalized
  
  // Extract special keywords: 'มือ 1', 'มือ 2', 'มือ1', 'มือ2'
  const specialPatterns = [
    /มือ\s*1/g,  // Matches 'มือ 1' or 'มือ1'
    /มือ\s*2/g,  // Matches 'มือ 2' or 'มือ2'
  ]
  
  // Find all special keywords and their positions
  const specialMatches = []
  specialPatterns.forEach((pattern) => {
    let match
    while ((match = pattern.exec(remainingText)) !== null) {
      specialMatches.push({
        text: match[0],
        index: match.index,
      })
    }
  })
  
  // Sort by index (ascending)
  specialMatches.sort((a, b) => a.index - b.index)
  
  // Extract special keywords and remaining text
  let lastIndex = 0
  specialMatches.forEach((match) => {
    // Add text before the special keyword
    if (match.index > lastIndex) {
      const beforeText = remainingText.substring(lastIndex, match.index).trim()
      if (beforeText) {
        // Split the before text by spaces and add to tokens
        const beforeTokens = beforeText.split(/\s+/).filter((t) => t.length > 0)
        tokens.push(...beforeTokens)
      }
    }
    
    // Add the special keyword (normalize to 'มือ 1' or 'มือ 2')
    const normalizedKeyword = match.text.replace(/\s+/g, ' ').trim()
    if (normalizedKeyword === 'มือ1' || normalizedKeyword === 'มือ 1') {
      tokens.push('มือ 1')
    } else if (normalizedKeyword === 'มือ2' || normalizedKeyword === 'มือ 2') {
      tokens.push('มือ 2')
    } else {
      tokens.push(normalizedKeyword)
    }
    
    lastIndex = match.index + match.text.length
  })
  
  // Add remaining text after the last special keyword
  if (lastIndex < remainingText.length) {
    const afterText = remainingText.substring(lastIndex).trim()
    if (afterText) {
      // Split the after text by spaces and add to tokens
      const afterTokens = afterText.split(/\s+/).filter((t) => t.length > 0)
      tokens.push(...afterTokens)
    }
  }
  
  // If no special keywords found, use regular split
  if (specialMatches.length === 0) {
    return normalized.split(/\s+/).filter((t) => t.length > 0)
  }
  
  return tokens.filter((t) => t.length > 0)
}

/**
 * Parse Natural Language Price Query
 * Detects patterns like 'ไม่เกิน 2 ล้าน', '2-3 ล้าน', 'งบ 1.5 ล้าน'
 * @param {string} query - Search query string
 * @returns {{ min: number|null, max: number|null, cleanedQuery: string }}
 */
function parsePriceQuery(query) {
  if (!query || typeof query !== 'string') {
    return { min: null, max: null, cleanedQuery: (query || '').trim() }
  }

  let cleanedQuery = query.trim()
  let min = null
  let max = null

  const LAAN = 1000000
  const SAEN = 100000

  function toAmount(numStr, unit) {
    const num = parseFloat(String(numStr).replace(/,/g, ''))
    if (isNaN(num)) return null
    const u = (unit || '').trim().toLowerCase()
    if (u === 'ล้าน' || u === 'laan') return Math.round(num * LAAN)
    if (u === 'แสน' || u === 'saen') return Math.round(num * SAEN)
    return Math.round(num)
  }

  // Pattern 1: Range "X-Y ล้าน" or "X - Y ล้าน"
  const rangeRe = /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(ล้าน|แสน)/gi
  let rangeMatch = rangeRe.exec(cleanedQuery)
  if (rangeMatch) {
    min = toAmount(rangeMatch[1], rangeMatch[3])
    max = toAmount(rangeMatch[2], rangeMatch[3])
    cleanedQuery = cleanedQuery.replace(rangeMatch[0], ' ')
  }

  // Pattern 2: Max-only "ไม่เกิน X ล้าน", "ต่ำกว่า X ล้าน", "งบ X ล้าน", "ราคา(ไม่เกิน) X ล้าน"
  if (max === null) {
    const maxPatterns = [
      /(?:ไม่เกิน|ต่ำกว่า)\s*(\d+(?:\.\d+)?)\s*(ล้าน|แสน)/gi,
      /งบ\s*(\d+(?:\.\d+)?)\s*(ล้าน|แสน)/gi,
      /ราคา\s*(?:ไม่เกิน|ต่ำกว่า)?\s*(\d+(?:\.\d+)?)\s*(ล้าน|แสน)/gi,
      /ราคา\s*(\d+(?:\.\d+)?)\s*(ล้าน|แสน)/gi,
    ]
    for (const re of maxPatterns) {
      re.lastIndex = 0
      const m = re.exec(cleanedQuery)
      if (m) {
        max = toAmount(m[1], m[2])
        cleanedQuery = cleanedQuery.replace(m[0], ' ')
        break
      }
    }
  }

  // Clean up: collapse spaces, trim
  cleanedQuery = cleanedQuery.replace(/\s+/g, ' ').trim()

  return { min, max, cleanedQuery }
}

/**
 * Check if a value matches a query (case-insensitive, partial match)
 */
function matchesField(value, query) {
  if (!query) return true
  if (!value) return false
  return normalizeText(String(value)).includes(normalizeText(query))
}

/**
 * Check if an array contains a matching value
 */
function matchesArrayField(array, query) {
  if (!query) return true
  if (!Array.isArray(array) || array.length === 0) return false
  return array.some((item) => {
    if (typeof item === 'string') {
      return matchesField(item, query)
    }
    if (item && typeof item === 'object') {
      return matchesField(item.label || item.name || item.value || '', query)
    }
    return false
  })
}

/**
 * Unified filterProperties function
 * @param {Array} properties - Array of property objects
 * @param {Object} filters - Filter object containing:
 *   - keyword: string - Search keyword
 *   - listingType: 'sale' | 'rent' | '' - Transaction type
 *   - subListingType: 'rent_only' | 'installment_only' | '' - Sub-type for rent
 *   - propertyCondition: 'มือ 1' | 'มือ 2' | '' - Property condition for sale
 *   - availability: 'available' | 'sold' | 'reserved' | '' - Availability status
 *   - type: string - Property type (บ้านเดี่ยว, คอนโด, etc.)
 *   - location: string - Location search query
 *   - minPrice: number - Minimum price
 *   - maxPrice: number - Maximum price
 *   - bedrooms: number - Number of bedrooms
 *   - bathrooms: number - Number of bathrooms
 *   - areaMin: number - Minimum area
 *   - areaMax: number - Maximum area
 * @returns {Array} Filtered properties array
 */
export function filterProperties(properties = [], filters = {}) {
  try {
    if (!Array.isArray(properties)) {
      console.warn('filterProperties: properties is not an array')
      return []
    }

    if (properties.length === 0) return []

    const {
      keyword = '',
      listingType = '',
      subListingType = '',
      propertyCondition = '',
      availability = '',
      type = '',
      location = '',
      minPrice: filterMinPrice,
      maxPrice: filterMaxPrice,
      bedrooms,
      bathrooms,
      areaMin,
      areaMax,
    } = filters

    // Parse Natural Language Price from keyword (e.g. "ทาวน์โฮม ไม่เกิน 2 ล้าน")
    const { min: parsedMin, max: parsedMax, cleanedQuery } = parsePriceQuery(keyword)
    const keywordForSearch = cleanedQuery || keyword
    const minPrice = parsedMin ?? filterMinPrice
    const maxPrice = parsedMax ?? filterMaxPrice

    const normalizedKeyword = normalizeText(keywordForSearch)
    const normalizedLocation = normalizeText(location)

    return properties.filter((property) => {
      try {
        if (!property || typeof property !== 'object') return false

        // 1. Keyword Search (Multi-word AND Logic with Smart Tokenization)
        if (normalizedKeyword) {
          // Use smart tokenization to extract special keywords ('มือ 1', 'มือ 2') first
          const keywords = smartTokenize(normalizedKeyword)
          
          if (keywords.length > 0) {
            // Check if ALL keywords match (AND Logic)
            const allKeywordsMatch = keywords.every((keyword) => {
              // For special keywords ('มือ 1', 'มือ 2'), check propertyCondition/propertySubStatus first
              if (keyword === 'มือ 1' || keyword === 'มือ 2') {
                const propertyCond = normalizeText(
                  property.propertyCondition || property.propertySubStatus || ''
                )
                const normalizedKeyword = normalizeText(keyword)
                if (propertyCond === normalizedKeyword) {
                  return true // Exact match for special keywords
                }
                // Also check in other fields as fallback
              }
              
              // Create searchable text from property fields
              const searchableFields = [
                property.title || '',
                property.propertyId || '',
                property.type || '',
                property.locationDisplay || '',
                property.location?.province || '',
                property.location?.district || '',
                property.location?.subDistrict || '',
                property.description || '', // Backward compatibility
              ]
              
              // Combine all fields into one searchable string
              const searchableText = normalizeText(searchableFields.join(' '))
              
              // Check if keyword exists in searchable text
              const matchesInText = searchableText.includes(keyword)
              
              // Check if keyword exists in customTags array
              const matchesInTags = matchesArrayField(property.customTags, keyword)
              
              // Check if keyword exists in nearbyPlace array
              const matchesInNearby = matchesArrayField(property.nearbyPlace, keyword)
              
              return matchesInText || matchesInTags || matchesInNearby
            })
            
            if (!allKeywordsMatch) return false
          }
        }

        // 2. Location Search
        if (normalizedLocation) {
          const locationMatches =
            matchesField(property.locationDisplay, normalizedLocation) ||
            matchesArrayField(property.nearbyPlace, normalizedLocation) ||
            matchesField(property.location?.province, normalizedLocation) ||
            matchesField(property.location?.district, normalizedLocation) ||
            matchesField(property.location?.subDistrict, normalizedLocation)

          if (!locationMatches) return false
        }

        // 3. Category & Status Filtering (New Structure)
        // Listing Type (sale/rent)
        if (listingType) {
          const propertyListingType =
            property.listingType || (property.isRental ? 'rent' : 'sale')

          if (propertyListingType !== listingType) return false

          // Sub-listing Type (for rent: rent_only/installment_only)
          if (listingType === 'rent' && subListingType) {
            const propertySubType = property.subListingType
            // Backward compatibility: check directInstallment
            if (!propertySubType) {
              if (subListingType === 'installment_only' && !property.directInstallment) {
                return false
              }
              if (subListingType === 'rent_only' && property.directInstallment) {
                return false
              }
            } else if (propertySubType !== subListingType) {
              return false
            }
          }

          // Property Condition (for sale: มือ 1/มือ 2)
          if (listingType === 'sale' && propertyCondition) {
            const propertyCond =
              property.propertyCondition || property.propertySubStatus
            if (propertyCond !== propertyCondition) return false
          }
        }

        // Availability Status
        if (availability) {
          const propertyAvailability = property.availability || property.status
          // Map legacy status to new availability
          let mappedAvailability = propertyAvailability
          if (propertyAvailability === 'available' || propertyAvailability === 'ว่าง') {
            mappedAvailability = 'available'
          } else if (propertyAvailability === 'sold' || propertyAvailability === 'ขายแล้ว') {
            mappedAvailability = 'sold'
          } else if (
            propertyAvailability === 'reserved' ||
            propertyAvailability === 'ติดจอง'
          ) {
            mappedAvailability = 'reserved'
          }

          if (mappedAvailability !== availability) return false
        }

        // 4. Property Type Filter
        if (type && property.type !== type) return false

        // 5. Price Range Filtering
        const propertyPrice = Number(property.price)
        if (!isNaN(propertyPrice)) {
          if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
            if (propertyPrice < Number(minPrice)) return false
          }
          if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
            if (propertyPrice > Number(maxPrice)) return false
          }
        }

        // 6. Bedrooms Filter
        if (bedrooms !== undefined && bedrooms !== null && bedrooms !== '') {
          if (Number(property.bedrooms) !== Number(bedrooms)) return false
        }

        // 7. Bathrooms Filter
        if (bathrooms !== undefined && bathrooms !== null && bathrooms !== '') {
          if (Number(property.bathrooms) !== Number(bathrooms)) return false
        }

        // 8. Area Range Filtering
        const propertyArea = Number(property.area)
        if (!isNaN(propertyArea)) {
          if (areaMin !== undefined && areaMin !== null && areaMin !== '') {
            if (propertyArea < Number(areaMin)) return false
          }
          if (areaMax !== undefined && areaMax !== null && areaMax !== '') {
            if (propertyArea > Number(areaMax)) return false
          }
        }

        return true
      } catch (error) {
        console.error('filterProperties: Error filtering property:', error, property)
        return false
      }
    })
  } catch (error) {
    console.error('filterProperties: Critical error:', error)
    return []
  }
}

/**
 * Get unique property types from properties array
 */
export function getUniquePropertyTypes(properties = []) {
  try {
    if (!Array.isArray(properties)) return []
    const types = new Set()
    properties.forEach((p) => {
      if (p && p.type && typeof p.type === 'string') {
        types.add(p.type)
      }
    })
    return Array.from(types).sort()
  } catch (error) {
    console.error('getUniquePropertyTypes error:', error)
    return []
  }
}
