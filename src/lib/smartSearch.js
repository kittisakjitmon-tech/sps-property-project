/**
 * Hybrid Smart Search with AI Recommendations
 * - Global Keyword Search with Weighting
 * - Smart Price Detection
 * - Normalization & Fuzzy Matching
 */
import { getPropertyLabel } from '../constants/propertyTypes'

/** คำค้นหาที่มีน้ำหนักพิเศษ (ปิดหนี้, รวมหนี้, บริการสินเชื่อ) */
export const PRIORITY_KEYWORDS = [
  'ปิดหนี้',
  'รวมหนี้',
  'เงินเหลือ',
  'ฟรีดอกเบี้ย',
  'ปิดภาระ',
]

/**
 * AI Recommendation: Normalize text (lowercase, trim, remove extra spaces)
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/**
 * Normalize property sub-status (มือ 1/มือ 2) - ลบเว้นวรรคทั้งหมดเพื่อการเปรียบเทียบ
 * รองรับทั้ง 'มือ 1', 'มือ1', 'มือ 2', 'มือ2'
 */
function normalizeSubStatus(status) {
  if (!status || typeof status !== 'string') return ''
  return String(status)
    .trim()
    .replace(/\s+/g, '') // ลบเว้นวรรคทั้งหมด
    .toLowerCase()
}

/**
 * AI Recommendation: Tokenize query into searchable tokens
 */
function tokenize(text) {
  const normalized = normalizeText(text)
  if (!normalized) return []
  return normalized
    .split(' ')
    .filter((t) => t.length >= 1)
}

/**
 * AI Recommendation: Smart Price Parser
 * แปลงคำว่า "ล้าน", "m", "M" เป็นตัวเลข
 * เช่น "2.5 ล้าน" -> 2500000, "3m" -> 3000000
 */
function parsePriceFromQuery(query) {
  const normalized = normalizeText(query)
  if (!normalized) return null

  // Pattern: ตัวเลข + "ล้าน" หรือ "m" หรือ "M"
  const millionPattern = /(\d+(?:\.\d+)?)\s*(?:ล้าน|m|M)/i
  const match = normalized.match(millionPattern)
  if (match) {
    const num = parseFloat(match[1])
    if (!isNaN(num)) {
      return Math.round(num * 1_000_000)
    }
  }

  // Pattern: ตัวเลขล้วนๆ (เช่น 2500000)
  const pureNumberPattern = /^\d{6,}$/
  if (pureNumberPattern.test(normalized.replace(/\s/g, ''))) {
    const num = parseInt(normalized.replace(/\s/g, ''), 10)
    if (!isNaN(num) && num >= 100000) {
      return num
    }
  }

  return null
}

/**
 * AI Recommendation: Range Buffering (±10%)
 * หากลูกค้าพิมพ์ราคาตัวเลขเดียว ให้แสดงผลลัพธ์ที่มีราคาบวกลบ 10%
 */
export function getPriceRangeFromQuery(query) {
  const price = parsePriceFromQuery(query)
  if (!price) return null

  const buffer = price * 0.1
  return {
    min: Math.max(0, Math.round(price - buffer)),
    max: Math.round(price + buffer),
  }
}

/**
 * ตรวจสอบว่า query ตรงกับ text แบบ partial (fuzzy)
 */
function partialMatch(query, text) {
  if (!query || !text) return false
  const q = normalizeText(query)
  const t = normalizeText(text)
  if (q.length < 1) return false
  return t.includes(q)
}

function normalizeTag(tag) {
  if (typeof tag === 'string') return tag
  if (tag && typeof tag === 'object') {
    return String(tag.label || tag.name || tag.value || '')
  }
  return String(tag ?? '')
}

function getTagText(property) {
  return (property.customTags || property.tags || [])
    .map((t) => normalizeTag(t))
    .filter(Boolean)
    .join(' ')
}

function getSearchTokens(query) {
  return tokenize(query).filter((token) => token.length >= 2 && !/^\d+$/.test(token))
}

/**
 * AI Recommendation: Weighted Search Score
 * - Property ID: 1000 points (highest priority)
 * - Title: 300 points
 * - Custom Tags: 200 points
 * - Description: 100 points
 * - Type: 50 points
 */
function getSortScore(property, query) {
  const q = normalizeText(query)
  let score = 0

  // 1. รหัสทรัพย์สินตรงกัน → คะแนนสูงสุด (1000)
  const propId = normalizeText(property.propertyId || '')
  if (propId && (propId.includes(q) || q.includes(propId))) {
    score += 1000
    if (propId.startsWith(q) || q === propId) score += 500
  }

  // 2. ชื่อประกาศตรงกัน (300)
  const title = normalizeText(property.title || '')
  if (title && partialMatch(q, title)) {
    score += 300
    if (title.startsWith(q)) score += 100 // Exact start match bonus
  }

  // 3. Custom Tags ตรงกัน (200)
  const tags = normalizeText(getTagText(property))
  const qTokens = getSearchTokens(q)
  const isMultiTokenQuery = qTokens.length > 1
  if (tags && (partialMatch(q, tags) || (!isMultiTokenQuery && qTokens.some((token) => partialMatch(token, tags))))) {
    score += 200
  }

  // 4. รายละเอียดตรงกัน (100)
  const description = normalizeText(property.description || '')
  if (description && partialMatch(q, description)) {
    score += 100
  }

  // 5. Type ตรงกัน (50)
  const type = normalizeText(property.type || '')
  const typeLabel = normalizeText(getPropertyLabel(property.type) || '')
  if ((type && partialMatch(q, type)) || (typeLabel && partialMatch(q, typeLabel))) {
    score += 50
  }

  // Priority keywords bonus
  for (const kw of PRIORITY_KEYWORDS) {
    if (q.includes(kw) || partialMatch(kw, q)) {
      const combinedText = normalizeText([title, description, tags].join(' '))
      if (combinedText.includes(kw)) score += 50
    }
  }

  // Status bonus (ว่าง/มือ 1)
  const availability = property.availability || property.condition || property.subStatus || ''
  const status = property.status || ''
  const isAvailable = String(availability).includes('ว่าง') ||
    String(availability).includes('มือ 1') ||
    status === 'available'
  if (isAvailable) score += 50

  return score
}

/**
 * Detect status keywords in query (มือ 1, มือ 2, มือ1, มือ2)
 */
function extractStatusKeywords(query) {
  try {
    if (!query || typeof query !== 'string') return []
    const normalized = normalizeText(query)
    if (!normalized) return []

    const statusKeywords = []

    // Pattern: มือ 1, มือ 2, มือ1, มือ2
    const statusPatterns = [
      /มือ\s*1/g,
      /มือ\s*2/g,
      /มือ1/g,
      /มือ2/g,
    ]

    statusPatterns.forEach((pattern) => {
      try {
        const matches = normalized.match(pattern)
        if (matches && Array.isArray(matches)) {
          matches.forEach((match) => {
            if (match && typeof match === 'string') {
              const normalizedMatch = normalizeSubStatus(match)
              if (normalizedMatch && !statusKeywords.includes(normalizedMatch)) {
                statusKeywords.push(normalizedMatch)
              }
            }
          })
        }
      } catch (e) {
        // Ignore pattern errors
      }
    })

    return statusKeywords
  } catch (e) {
    console.error('extractStatusKeywords error:', e)
    return []
  }
}

/**
 * Remove status keywords from query to get remaining search terms
 */
function removeStatusKeywords(query, statusKeywords) {
  try {
    if (!query || typeof query !== 'string') return ''
    let cleaned = normalizeText(query)
    if (!cleaned) return ''

    if (Array.isArray(statusKeywords) && statusKeywords.length > 0) {
      statusKeywords.forEach((status) => {
        if (status && typeof status === 'string') {
          // Remove patterns like "มือ 1", "มือ1", "มือ 2", "มือ2"
          cleaned = cleaned.replace(/มือ\s*1/g, '').replace(/มือ\s*2/g, '').replace(/มือ1/g, '').replace(/มือ2/g, '')
        }
      })
    }
    return cleaned.trim()
  } catch (e) {
    console.error('removeStatusKeywords error:', e)
    return normalizeText(query || '')
  }
}

/**
 * ตรวจสอบว่า property ตรงกับ query ในฟิลด์ใดๆ
 * Multi-Keyword Logic: แยกคำด้วยช่องว่าง และใช้ AND Logic
 */
function matchesQuery(property, query) {
  try {
    if (!property || typeof property !== 'object') return false

    const q = normalizeText(query || '')
    if (q.length < 1) return false

    const toStr = (v) => {
      try {
        return normalizeText(String(v ?? ''))
      } catch {
        return ''
      }
    }

    // Extract status keywords (มือ 1, มือ 2) from query
    const statusKeywords = extractStatusKeywords(q)
    const remainingQuery = removeStatusKeywords(q, statusKeywords)

    // Split remaining query into tokens (แยกคำด้วยช่องว่าง)
    let queryTokens = []
    try {
      const tokens = tokenize(remainingQuery || '')
      queryTokens = Array.isArray(tokens) ? tokens.filter((t) => t && typeof t === 'string' && t.length >= 1) : []
    } catch (e) {
      console.error('tokenize error:', e)
      queryTokens = []
    }

    // ถ้ามี status keywords ให้ตรวจสอบ propertySubStatus ก่อน (Exact Match)
    if (statusKeywords.length > 0) {
      try {
        const propertySubStatus = normalizeSubStatus(property.propertySubStatus || '')
        const hasMatchingStatus = statusKeywords.some((status) => {
          return propertySubStatus === status
        })
        // ถ้าไม่มี status ที่ตรงกัน ให้ return false ทันที
        if (!hasMatchingStatus) {
          return false
        }
      } catch (e) {
        console.error('status check error:', e)
        return false
      }
    }

    // ถ้าไม่มี query tokens อื่นๆ และมี status keywords ที่ match แล้ว ให้ return true
    if (queryTokens.length === 0 && statusKeywords.length > 0) {
      return true
    }

    // Multi-Keyword AND Logic: ทุก token ต้อง match กับ property fields
    if (queryTokens.length > 0) {
      try {
        // สร้าง searchable text จาก property fields
        const searchableText = normalizeText([
          property.propertyId || '',
          property.title || '',
          property.description || '',
          getTagText(property),
          property.type || '',
          getPropertyLabel(property.type) || '',
          property.location?.province || '',
          property.location?.district || '',
          property.location?.subDistrict || '',
          property.locationDisplay || '',
        ].join(' '))

        // ตรวจสอบว่าทุก token match กับ searchable text (AND Logic)
        const allTokensMatch = queryTokens.every((token) => {
          if (!token || token.length < 1) return true

          try {
            // Exact match สำหรับ property ID
            const propId = toStr(property.propertyId)
            if (propId && (propId.includes(token) || token.includes(propId))) {
              return true
            }

            // Partial match สำหรับ fields อื่นๆ
            return searchableText.includes(token)
          } catch {
            return false
          }
        })

        // ถ้าไม่ match ทั้งหมด ให้ return false
        if (!allTokensMatch) {
          return false
        }
      } catch (e) {
        console.error('token matching error:', e)
        return false
      }
    }

    // Database Index: searchKeywords (ถ้ามี) - ตรวจสอบว่า query ตรงกับ keywords
    try {
      const keywords = property.searchKeywords || []
      if (Array.isArray(keywords) && keywords.length > 0 && queryTokens.length > 0) {
        const keywordText = normalizeText(keywords.join(' '))
        const allTokensInKeywords = queryTokens.every((token) => keywordText.includes(token))
        if (allTokensInKeywords) return true
      }
    } catch (e) {
      // Ignore keyword check errors
    }

    // ถ้ามี query tokens และผ่าน allTokensMatch check แล้ว ให้ return true
    // หรือถ้ามี status keywords ที่ match แล้ว และไม่มี query tokens อื่นๆ ให้ return true
    return queryTokens.length > 0 || statusKeywords.length > 0
  } catch (e) {
    console.error('matchesQuery error:', e, property, query)
    return false
  }
}

/**
 * Hybrid Search: ค้นหา properties ตาม keyword พร้อม Smart Price Detection
 * @param {Array} properties - รายการทรัพย์สิน
 * @param {string} keyword - คำค้นหา
 * @param {Object} filters - ตัวกรองเพิ่มเติม (location, propertyType, priceMin, priceMax, etc.)
 * @returns {Array} รายการที่ตรงกับคำค้นหา (เรียงตามคะแนน)
 */
export function searchProperties(properties, keyword = '', filters = {}) {
  try {
    if (!Array.isArray(properties)) {
      console.warn('searchProperties: properties is not an array')
      return []
    }

    const q = normalizeText(keyword || '')
    const available = properties.filter((p) => {
      try {
        return p && p.status === 'available'
      } catch {
        return false
      }
    })

    let results = available

    // Keyword Search
    if (q.length > 0) {
      try {
        // Smart Price Detection
        const priceRange = getPriceRangeFromQuery(q)
        if (priceRange) {
          // ถ้าค้นหาด้วยราคา ให้กรองตามราคาก่อน
          results = results.filter((p) => {
            try {
              const price = Number(p?.price) || 0
              return price >= priceRange.min && price <= priceRange.max
            } catch {
              return false
            }
          })
        } else {
          // Keyword matching
          results = results.filter((p) => {
            try {
              return matchesQuery(p, q)
            } catch (e) {
              console.error('matchesQuery error for property:', p?.id, e)
              return false
            }
          })
        }
      } catch (e) {
        console.error('Keyword search error:', e)
        // Continue with all available properties if keyword search fails
      }
    }

    // Apply Filters (AND Logic)
    const toSearchStr = (val) => normalizeText(String(val ?? ''))

    // Location filter
    const location = toSearchStr(filters.location)
    if (location.length > 0) {
      results = results.filter((p) => {
        const province = toSearchStr(p?.location?.province)
        const district = toSearchStr(p?.location?.district)
        return province.includes(location) || district.includes(location)
      })
    }

    // Property Type filter
    const propertyType = toSearchStr(filters.propertyType)
    if (propertyType.length > 0) {
      results = results.filter((p) => {
        const type = toSearchStr(p?.type)
        return type === propertyType
      })
    }

    // Price Range filter
    const priceMin = Number(filters.priceMin) || 0
    const priceMax = Number(filters.priceMax) > 0 ? Number(filters.priceMax) : Infinity
    if (priceMin > 0 || priceMax < Infinity) {
      results = results.filter((p) => {
        const price = Number(p?.price) || 0
        return price >= priceMin && price <= priceMax
      })
    }

    // Bedrooms filter
    const bedrooms = filters.bedrooms ? Number(filters.bedrooms) : null
    if (bedrooms !== null) {
      results = results.filter((p) => {
        const pBedrooms = Number(p?.bedrooms) || 0
        if (bedrooms === 5) return pBedrooms >= 5
        return pBedrooms === bedrooms
      })
    }

    // Bathrooms filter
    const bathrooms = filters.bathrooms ? Number(filters.bathrooms) : null
    if (bathrooms !== null) {
      results = results.filter((p) => {
        const pBathrooms = Number(p?.bathrooms) || 0
        if (bathrooms === 4) return pBathrooms >= 4
        return pBathrooms === bathrooms
      })
    }

    // Area Range filter
    const areaMin = Number(filters.areaMin) || 0
    const areaMax = Number(filters.areaMax) > 0 ? Number(filters.areaMax) : Infinity
    if (areaMin > 0 || areaMax < Infinity) {
      results = results.filter((p) => {
        const area = Number(p?.area) || 0
        return area >= areaMin && area <= areaMax
      })
    }

    // Buy/Rent filter
    if (filters.isRental !== null && filters.isRental !== undefined) {
      results = results.filter((p) => Boolean(p.isRental) === filters.isRental)
    }

    // Property Sub-status filter (มือ 1/มือ 2)
    // ใช้ normalizeSubStatus เพื่อรองรับทั้งแบบมีและไม่มีเว้นวรรค
    const subStatus = normalizeSubStatus(filters.propertySubStatus)
    if (subStatus.length > 0) {
      results = results.filter((p) => {
        const pSubStatus = normalizeSubStatus(p?.propertySubStatus)
        return pSubStatus === subStatus
      })
    }

    // Direct Installment filter (ผ่อนตรง)
    // Strict Boolean/Tag Check: ตรวจสอบจากฟิลด์เฉพาะเท่านั้น
    if (filters.feature === 'directInstallment' || filters.directInstallment === true) {
      results = results.filter((p) => {
        try {
          // ตรวจสอบจากฟิลด์ directInstallment (Boolean) ก่อน
          if (p?.directInstallment === true) {
            return true
          }

          // ตรวจสอบจาก tags array (ถ้ามี)
          const tags = p?.tags || p?.customTags || []
          if (Array.isArray(tags) && tags.length > 0) {
            const tagText = tags.map((t) => {
              if (typeof t === 'string') return normalizeText(t)
              if (t && typeof t === 'object') return normalizeText(t.label || t.name || t.value || '')
              return ''
            }).join(' ')
            if (tagText.includes('ผ่อนตรง')) {
              return true
            }
          }

          // Fallback: ตรวจสอบจาก description ด้วย Negative Lookbehind Logic
          // เฉพาะกรณีที่ข้อมูลยังไม่ได้แยก Field ชัดเจน
          const description = normalizeText(p?.description || '')
          if (description.includes('ผ่อนตรง')) {
            // Negative Lookbehind: ต้องไม่เจอคำว่า 'ไม่รับ', 'งด', 'ไม่' อยู่ข้างหน้า
            const negativePatterns = [
              /ไม่รับ\s*ผ่อนตรง/i,
              /งด\s*ผ่อนตรง/i,
              /ไม่\s*ผ่อนตรง/i,
              /ไม่มี\s*ผ่อนตรง/i,
              /ไม่สามารถ\s*ผ่อนตรง/i,
            ]

            // ตรวจสอบว่ามี negative patterns หรือไม่
            const hasNegative = negativePatterns.some((pattern) => pattern.test(description))
            if (hasNegative) {
              return false // ถ้ามี negative pattern ให้ return false
            }

            // ถ้าไม่มี negative pattern และเจอคำว่า 'ผ่อนตรง' ให้ return true
            return true
          }

          return false
        } catch {
          return false
        }
      })
    }

    // Sort by relevance score
    if (q.length > 0) {
      try {
        results = results.sort((a, b) => {
          try {
            return getSortScore(b, q) - getSortScore(a, q)
          } catch {
            return 0
          }
        })
      } catch (e) {
        console.error('Sort error:', e)
      }
    }

    // Ensure result is always an array
    return Array.isArray(results) ? results : []
  } catch (error) {
    console.error('searchProperties error:', error)
    return []
  }
}

/**
 * Autocomplete - ค้นหา properties เบื้องต้นเมื่อพิมพ์ 2 ตัวอักษรขึ้นไป
 */
export function getPropertySuggestions(properties, query, limit = 6) {
  const q = normalizeText(query)
  if (q.length < 2) return []

  const available = properties.filter((p) => p.status === 'available')
  const matched = available.filter((p) => matchesQuery(p, q))

  return matched
    .sort((a, b) => getSortScore(b, q) - getSortScore(a, q))
    .slice(0, limit)
}
