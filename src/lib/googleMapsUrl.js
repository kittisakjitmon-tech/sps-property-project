/**
 * Google Maps URL utilities - ดึงและแปลง URL สำหรับแผนที่
 */

/** แบบแผน URL Google Maps ที่ใช้ดึง URL แรกจากข้อความ */
const MAP_URL_PATTERN = /https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl)[^\s"'<>]*/i

/**
 * ดึง URL ออกจาก input (รองรับลิงก์ธรรมดา และโค้ด iframe)
 * กรอง URL ซ้ำที่อาจเกิดจากการ paste
 * @param {string} input - ข้อความที่ผู้ใช้วาง (ลิงก์หรือโค้ด iframe)
 * @returns {{ url: string | null, isEmbed: boolean }}
 */
export function extractMapUrl(input) {
  if (!input || typeof input !== 'string') return { url: null, isEmbed: false }
  const s = input.trim()
  if (!s) return { url: null, isEmbed: false }

  // กรณีเป็นโค้ด iframe: ดึง src="..."
  const iframeMatch = s.match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/i)
  if (iframeMatch) {
    const src = iframeMatch[1].trim()
    if (src && (src.includes('google.com') || src.includes('maps.google'))) {
      return { url: deduplicateUrl(src), isEmbed: src.includes('/embed') }
    }
  }

  // กรณีเป็นลิงก์ธรรมดา - ดึง URL แรกถ้ามีหลายค่า
  const urlMatch = s.match(MAP_URL_PATTERN)
  if (urlMatch) {
    const url = deduplicateUrl(urlMatch[0])
    return { url, isEmbed: url.includes('/embed') }
  }

  return { url: null, isEmbed: false }
}

/** ลบ URL ซ้ำ (เช่น URL+URL) ให้เหลือแค่ URL เดียว */
function deduplicateUrl(url) {
  if (!url || url.length < 20) return url
  const half = Math.floor(url.length / 2)
  if (url.slice(0, half) === url.slice(half)) return url.slice(0, half)
  return url
}

/**
 * แปลงลิงก์ Google Maps เป็น Embed URL
 * @param {string} url
 * @returns {string | null} - Embed URL หรือ null ถ้าไม่ถูกต้อง
 */
export function toEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null
  const s = url.trim()
  if (!s) return null

  try {
    // ถ้าเป็น embed อยู่แล้ว
    if (s.includes('/embed')) return s

    if (s.includes('google.com/maps') || s.includes('maps.google')) {
      // รูปแบบ @lat,lng
      const coordMatch = s.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (coordMatch) {
        const lat = coordMatch[1]
        const lng = coordMatch[2]
        return `https://www.google.com/maps?q=${lat},${lng}&output=embed`
      }
      // รูปแบบ /place/...
      const placeMatch = s.match(/place\/([^/?#]+)/)
      if (placeMatch) {
        const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
        return `https://www.google.com/maps?q=${encodeURIComponent(placeName)}&output=embed`
      }
      // รูปแบบ ?q=...
      const searchMatch = s.match(/[?&]q=([^&]+)/)
      if (searchMatch) {
        const query = decodeURIComponent(searchMatch[1])
        return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
      }
      // Fallback: เพิ่ม output=embed
      const urlObj = new URL(s)
      urlObj.searchParams.set('output', 'embed')
      return urlObj.toString()
    }

    // ลิงก์สั้น goo.gl/maps หรือ maps.app.goo.gl
    if (s.includes('goo.gl/maps') || s.includes('maps.app.goo.gl')) {
      const sep = s.includes('?') ? '&' : '?'
      return `${s}${sep}output=embed`
    }

    return null
  } catch {
    return null
  }
}

/**
 * ตรวจสอบว่าหรือไม่ว่าเป็นลิงก์สั้นที่ฝัง iframe ไม่ได้
 */
export function isShortMapLink(url) {
  if (!url || typeof url !== 'string') return false
  return url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')
}

/**
 * ตรวจสอบและส่งคืน Cleaned URL พร้อม embed
 * @param {string} input
 * @returns {{ cleanedUrl: string | null, embedUrl: string | null, isShortLink: boolean, error: string | null }}
 */
export function processMapInput(input) {
  const { url: extracted } = extractMapUrl(input)
  if (!extracted) {
    if (input && input.trim()) {
      return { cleanedUrl: null, embedUrl: null, isShortLink: false, error: 'ไม่พบ URL ที่ถูกต้องจาก Google Maps' }
    }
    return { cleanedUrl: null, embedUrl: null, isShortLink: false, error: null }
  }

  const shortLink = isShortMapLink(extracted)
  // ลิงก์สั้น maps.app.goo.gl / goo.gl ไม่รองรับ iframe embed (X-Frame-Options)
  const embedUrl = shortLink ? null : toEmbedUrl(extracted)
  if (!shortLink && !embedUrl) {
    return { cleanedUrl: null, embedUrl: null, isShortLink: false, error: 'ไม่สามารถแปลงเป็น Embed URL ได้' }
  }

  return { cleanedUrl: extracted, embedUrl, isShortLink: shortLink, error: null }
}

/**
 * ดึง Latitude, Longitude จาก URL ของ Google Maps
 * @param {string} url
 * @returns {{ lat: number, lng: number } | null}
 */
export function parseCoordinatesFromUrl(url) {
  if (!url || typeof url !== 'string') return null
  const s = url.trim()
  try {
    // รูปแบบ ?q=13.7563,100.5018 หรือ ?q=Place+Name@13.7563,100.5018
    const qMatch = s.match(/[?&]q=([^&]+)/)
    if (qMatch) {
      const q = decodeURIComponent(qMatch[1])
      const coords = q.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/) || q.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (coords) {
        const lat = parseFloat(coords[1])
        const lng = parseFloat(coords[2])
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng }
      }
    }
    // รูปแบบ /@13.7563,100.5018,17z
    const atMatch = s.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (atMatch) {
      const lat = parseFloat(atMatch[1])
      const lng = parseFloat(atMatch[2])
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng }
    }
    // รูปแบบ !3d13.7563!4d100.5018 หรือ !2d100.5018!3d13.7563 (embed)
    const d3 = s.match(/!3d(-?\d+\.?\d*)/)
    const d4 = s.match(/!4d(-?\d+\.?\d*)/)
    const d2 = s.match(/!2d(-?\d+\.?\d*)/)
    if (d3) {
      const lat = parseFloat(d3[1])
      const lngMatch = d4 || d2
      const lng = lngMatch ? parseFloat(lngMatch[1]) : null
      if (!Number.isNaN(lat) && lng != null && !Number.isNaN(lng)) return { lat, lng }
    }
  } catch (_) {}
  return null
}
