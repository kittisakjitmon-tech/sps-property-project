/**
 * Nearby Places Service – ใช้ Longdo POI API
 * Admin กดอัปเดต → ดึงสถานที่ใกล้เคียงจาก Longdo → cache ลง Firestore (nearbyPlaces)
 */
import { parseCoordinatesFromUrl } from '../lib/googleMapsUrl'
import { updatePropertyById } from '../lib/firestore'

const LONGDO_POI_API = 'https://api.longdo.com/POIService/json/search'
const LONGDO_KEY = import.meta.env.VITE_LONGDO_MAP_KEY
const MAX_DISTANCE_KM = 20
const MAX_PER_CATEGORY = 3
const SEARCH_SPAN = '20km'
const LIMIT_PER_TAG = 15

const CATEGORY_META = {
  industrial: { label: 'นิคมอุตสาหกรรม', tags: ['industrial_estate', 'factory'] },
  hospital: { label: 'โรงพยาบาล', tags: ['hospital', 'clinic'] },
  mall: { label: 'ห้างสรรพสินค้า', tags: ['department_store', 'shopping_mall', 'mall'] },
  education: { label: 'การศึกษา', tags: ['school', 'university', 'college'] },
}

/** Cache ในหน่วยความจำ (TTL 5 นาที) ลดการอ่าน Firestore / เรียก Longdo POI ซ้ำใน session เดียวกัน */
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000
const memoryCache = new Map()

function getCachedNearby(propertyId) {
  const entry = propertyId ? memoryCache.get(propertyId) : null
  if (!entry || Date.now() > entry.expiresAt) return null
  return entry.places
}

function setCachedNearby(propertyId, places) {
  if (!propertyId) return
  memoryCache.set(propertyId, { places, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS })
}

/** Haversine – ระยะเส้นตรง (กม.) */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function getCoordsFromProperty(property) {
  const lat = property.lat != null ? Number(property.lat) : null
  const lng = property.lng != null ? Number(property.lng) : null
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng }
  if (property.mapUrl) return parseCoordinatesFromUrl(property.mapUrl)
  return null
}

/** เรียก Longdo POI search ตาม tag */
async function searchLongdoPOI(lat, lng, tagCsv) {
  if (!LONGDO_KEY) return []
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      span: SEARCH_SPAN,
      tag: tagCsv,
      limit: String(LIMIT_PER_TAG),
      locale: 'th',
      key: LONGDO_KEY,
    })
    const res = await fetch(`${LONGDO_POI_API}?${params.toString()}`)
    if (!res.ok) return []
    const json = await res.json()
    const list = json?.data || []
    return list.map((p) => ({
      name: p.name || 'สถานที่',
      lat: p.lat,
      lng: p.lon,
      address: p.address || '',
      distance: p.distance,
      tag: p.tag,
    }))
  } catch {
    return []
  }
}

/** รวมผลจากหลาย tag แล้วคำนวณระยะ Haversine เรียงใกล้สุด */
function mergeAndSort(originLat, originLng, category, items) {
  const withKm = items
    .filter((p) => p.name && p.lat != null && p.lng != null)
    .map((p) => ({
      ...p,
      category,
      straightDistanceKm: haversineDistance(originLat, originLng, p.lat, p.lng),
    }))
    .filter((p) => p.straightDistanceKm <= MAX_DISTANCE_KM + 2)
  withKm.sort((a, b) => a.straightDistanceKm - b.straightDistanceKm)
  const seen = new Set()
  const deduped = withKm.filter((p) => {
    const key = `${p.name}|${p.lat?.toFixed(4)}|${p.lng?.toFixed(4)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return deduped.slice(0, MAX_PER_CATEGORY)
}

/** แปลงเป็นรูปแบบเดียวกับเดิม (ให้ NeighborhoodData / ฟอร์มใช้ได้) */
function formatOutputByCategory(candidatesByCategory) {
  return Object.entries(candidatesByCategory).flatMap(([category, places]) => {
    const label = CATEGORY_META[category]?.label || 'สถานที่'
    return places.map((p) => {
      const km = p.straightDistanceKm
      const distanceText = Number.isFinite(km) ? `${km.toFixed(1)} กม.` : 'ประมาณ'
      const durationText = 'ตรวจสอบจากแผนที่'
      return {
        name: p.name,
        type: category,
        typeLabel: label,
        distanceKm: Number.isFinite(km) ? Number(km.toFixed(2)) : null,
        distanceText,
        durationText,
        durationMinutes: null,
        displayText: `${p.name} - ${distanceText} (${durationText})`,
        travelMode: 'driving',
      }
    })
  })
}

/**
 * ค้นหาและ cache สถานที่ใกล้เคียงจาก Longdo POI
 * Admin กดปุ่มอัปเดต → เรียก fetchAndCacheNearbyPlaces(property, { forceRefresh: true })
 */
export async function fetchAndCacheNearbyPlaces(property, options = {}) {
  const { forceRefresh = false } = options
  const coords = getCoordsFromProperty(property)
  if (!coords) return []
  if (!LONGDO_KEY) {
    console.warn('[NearbyPlaces] Missing VITE_LONGDO_MAP_KEY')
    return []
  }
  if (!forceRefresh && Array.isArray(property.nearbyPlaces) && property.nearbyPlaces.length > 0) {
    if (property.id) setCachedNearby(property.id, property.nearbyPlaces)
    return property.nearbyPlaces
  }
  if (!forceRefresh && property.id) {
    const cached = getCachedNearby(property.id)
    if (cached) return cached
  }

  const { lat, lng } = coords

  const [industrialRes, hospitalRes, mallRes, educationRes] = await Promise.all([
    searchLongdoPOI(lat, lng, 'industrial_estate,factory'),
    searchLongdoPOI(lat, lng, 'hospital,clinic'),
    searchLongdoPOI(lat, lng, 'department_store,shopping_mall,mall'),
    searchLongdoPOI(lat, lng, 'school,university,college'),
  ])

  const candidatesByCategory = {
    industrial: mergeAndSort(lat, lng, 'industrial', industrialRes),
    hospital: mergeAndSort(lat, lng, 'hospital', hospitalRes),
    mall: mergeAndSort(lat, lng, 'mall', mallRes),
    education: mergeAndSort(lat, lng, 'education', educationRes),
  }

  const formatted = formatOutputByCategory(candidatesByCategory)

  if (property.id) {
    setCachedNearby(property.id, formatted)
    try {
      await updatePropertyById(property.id, {
        nearbyPlaces: formatted,
        nearbyPlacesMeta: {
          travelMode: 'driving',
          maxDistanceKm: MAX_DISTANCE_KM,
          updatedAtMs: Date.now(),
          version: 3,
          source: 'longdo_poi',
        },
      })
    } catch (e) {
      console.warn('[NearbyPlaces] Failed to cache:', e)
    }
  }
  return formatted
}
