/**
 * Nearby Places Service (High-Value)
 * - Places API (New) สำหรับดึงสถานที่
 * - Distance Matrix API สำหรับระยะทาง/เวลาเดินทางจริง
 */
import { parseCoordinatesFromUrl } from '../lib/googleMapsUrl'
import { updatePropertyById } from '../lib/firestore'

const PLACES_API = 'https://places.googleapis.com/v1/places:searchNearby'
const TEXT_SEARCH_API = 'https://places.googleapis.com/v1/places:searchText'
const DISTANCE_MATRIX_API = 'https://maps.googleapis.com/maps/api/distancematrix/json'

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
const SEARCH_RADIUS_M = 20000 // 20 กม.
const MAX_PER_CATEGORY = 3
const MAX_CANDIDATES_PER_CATEGORY = 8
const MAX_DISTANCE_KM = 20
const FIELDS = 'places.displayName,places.location,places.formattedAddress,places.types,places.primaryType'

const CATEGORY_META = {
  industrial: { label: 'นิคมอุตสาหกรรม' },
  hospital: { label: 'โรงพยาบาล' },
  mall: { label: 'ห้างสรรพสินค้า' },
  education: { label: 'การศึกษา' },
}

/** Haversine Formula - ระยะเส้นตรงเป็นกิโลเมตร */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

/** ดึงพิกัดจาก property (lat/lng หรือ mapUrl) */
export function getCoordsFromProperty(property) {
  const lat = property.lat != null ? Number(property.lat) : null
  const lng = property.lng != null ? Number(property.lng) : null
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng }
  if (property.mapUrl) return parseCoordinatesFromUrl(property.mapUrl)
  return null
}

function normalizePlace(p, category) {
  return {
    category,
    name: p.displayName?.text || p.formattedAddress || 'สถานที่',
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    address: p.formattedAddress || '',
    types: Array.isArray(p.types) ? p.types : [],
    primaryType: p.primaryType || '',
  }
}

async function searchNearbyByTypes(lat, lng, includedTypes) {
  if (!API_KEY) return []
  try {
    const res = await fetch(PLACES_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': FIELDS,
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 20,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: SEARCH_RADIUS_M,
          },
        },
      }),
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.places || []
  } catch {
    return []
  }
}

async function searchText(lat, lng, textQuery) {
  if (!API_KEY) return []
  try {
    const res = await fetch(TEXT_SEARCH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': FIELDS,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 20,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: SEARCH_RADIUS_M,
          },
        },
      }),
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.places || []
  } catch {
    return []
  }
}

function isHighValueHospital(place) {
  const t = `${place.name} ${place.address}`.toLowerCase()
  return (
    (t.includes('hospital') || t.includes('โรงพยาบาล') || t.includes('medical center')) &&
    !t.includes('clinic') &&
    !t.includes('คลินิก')
  )
}

function isHighValueMall(place) {
  const t = `${place.name} ${place.address}`.toLowerCase()
  const include =
    t.includes('mall') ||
    t.includes('plaza') ||
    t.includes('department') ||
    t.includes('เซ็นทรัล') ||
    t.includes('central') ||
    t.includes('โรบินสัน') ||
    t.includes('robinson') ||
    t.includes('terminal 21') ||
    t.includes('เทอร์มินอล')
  const exclude =
    t.includes('market') ||
    t.includes('ตลาด') ||
    t.includes('mini') ||
    t.includes('โชห่วย')
  return include && !exclude
}

function isHighValueEducation(place) {
  const t = `${place.name} ${place.address}`.toLowerCase()
  return (
    t.includes('university') ||
    t.includes('college') ||
    t.includes('มหาวิทยาลัย') ||
    t.includes('วิทยาลัย') ||
    t.includes('โรงเรียน')
  )
}

function isHighValueIndustrial(place) {
  const t = `${place.name} ${place.address}`.toLowerCase()
  return (
    t.includes('industrial estate') ||
    t.includes('นิคมอุตสาหกรรม') ||
    t.includes('amata') ||
    t.includes('อมตะ')
  )
}

function dedupePlaces(list) {
  const seen = new Set()
  return list.filter((p) => {
    const key = `${p.name}|${Number(p.lat).toFixed(4)}|${Number(p.lng).toFixed(4)}|${p.category}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function enrichWithTravelMetrics(originLat, originLng, places) {
  if (!API_KEY || places.length === 0) return places
  try {
    const destinations = places.map((p) => `${p.lat},${p.lng}`).join('|')
    const params = new URLSearchParams({
      origins: `${originLat},${originLng}`,
      destinations,
      mode: 'driving',
      language: 'th',
      units: 'metric',
      departure_time: 'now',
      key: API_KEY,
    })
    const res = await fetch(`${DISTANCE_MATRIX_API}?${params.toString()}`)
    if (!res.ok) return places
    const json = await res.json()
    const elements = json?.rows?.[0]?.elements || []
    return places.map((p, idx) => {
      const el = elements[idx]
      if (!el || el.status !== 'OK') return p
      const km = typeof el.distance?.value === 'number' ? el.distance.value / 1000 : p.straightDistanceKm
      const durationText = el.duration_in_traffic?.text || el.duration?.text || 'ตรวจสอบจากแผนที่'
      const durationMinutes =
        typeof el.duration_in_traffic?.value === 'number'
          ? Math.round(el.duration_in_traffic.value / 60)
          : typeof el.duration?.value === 'number'
            ? Math.round(el.duration.value / 60)
            : null
      return {
        ...p,
        drivingDistanceKm: km,
        drivingDurationText: durationText,
        drivingDurationMinutes: durationMinutes,
      }
    })
  } catch {
    return places
  }
}

function finalizeCategory(originLat, originLng, category, rawPlaces, predicate) {
  const normalized = rawPlaces
    .map((p) => normalizePlace(p, category))
    .filter((p) => p.name && p.lat != null && p.lng != null)
    .map((p) => ({ ...p, straightDistanceKm: haversineDistance(originLat, originLng, p.lat, p.lng) }))
    .filter((p) => p.straightDistanceKm <= MAX_DISTANCE_KM + 3) // เผื่อระยะถนนจริง
    .filter(predicate)
  return dedupePlaces(normalized)
    .sort((a, b) => a.straightDistanceKm - b.straightDistanceKm)
    .slice(0, MAX_CANDIDATES_PER_CATEGORY)
}

function formatOutputByCategory(candidatesByCategory) {
  return Object.entries(candidatesByCategory).flatMap(([category, places]) => {
    const label = CATEGORY_META[category]?.label || 'สถานที่'
    return places.map((p) => {
      const km = p.drivingDistanceKm ?? p.straightDistanceKm
      const duration = p.drivingDurationText || 'ตรวจสอบจากแผนที่'
      const distanceText = Number.isFinite(km) ? `${km.toFixed(1)} กม.` : 'ตรวจสอบจากแผนที่'
      return {
        name: p.name,
        type: category,
        typeLabel: label,
        distanceKm: Number.isFinite(km) ? Number(km.toFixed(2)) : null,
        distanceText,
        durationText: duration,
        durationMinutes: p.drivingDurationMinutes ?? null,
        displayText: `${p.name} - ${distanceText} (${duration})`,
        travelMode: 'driving',
      }
    })
  })
}

/**
 * ค้นหาและ Cache สถานที่สำคัญใกล้เคียง
 * @param {Object} property - ทรัพย์สิน { id, lat, lng, mapUrl }
 * @param {Object} options
 * @param {boolean} options.forceRefresh - บังคับคำนวณใหม่
 */
export async function fetchAndCacheNearbyPlaces(property, options = {}) {
  const { forceRefresh = false } = options
  const coords = getCoordsFromProperty(property)
  if (!coords || !API_KEY) return []
  if (!forceRefresh && Array.isArray(property.nearbyPlaces) && property.nearbyPlaces.length > 0) {
    return property.nearbyPlaces
  }

  const { lat, lng } = coords
  const [industrialTh, industrialEn, hospitals, malls, schools, universities] = await Promise.all([
    searchText(lat, lng, 'นิคมอุตสาหกรรม'),
    searchText(lat, lng, 'Industrial Estate'),
    searchNearbyByTypes(lat, lng, ['hospital']),
    searchNearbyByTypes(lat, lng, ['shopping_mall']),
    searchNearbyByTypes(lat, lng, ['school']),
    searchNearbyByTypes(lat, lng, ['university']),
  ])

  const industrialCandidates = finalizeCategory(lat, lng, 'industrial', [...industrialTh, ...industrialEn], isHighValueIndustrial)
  const hospitalCandidates = finalizeCategory(lat, lng, 'hospital', hospitals, isHighValueHospital)
  const mallCandidates = finalizeCategory(lat, lng, 'mall', malls, isHighValueMall)
  const educationCandidates = finalizeCategory(lat, lng, 'education', [...schools, ...universities], isHighValueEducation)

  const withTraffic = await Promise.all([
    enrichWithTravelMetrics(lat, lng, industrialCandidates),
    enrichWithTravelMetrics(lat, lng, hospitalCandidates),
    enrichWithTravelMetrics(lat, lng, mallCandidates),
    enrichWithTravelMetrics(lat, lng, educationCandidates),
  ])

  const [industrialWithTraffic, hospitalWithTraffic, mallWithTraffic, educationWithTraffic] = withTraffic

  const selectTop = (list) =>
    list
      .filter((p) => {
        const km = p.drivingDistanceKm ?? p.straightDistanceKm
        return km <= MAX_DISTANCE_KM
      })
      .sort((a, b) => (a.drivingDistanceKm ?? a.straightDistanceKm) - (b.drivingDistanceKm ?? b.straightDistanceKm))
      .slice(0, MAX_PER_CATEGORY)

  const candidatesByCategory = {
    industrial: selectTop(industrialWithTraffic),
    hospital: selectTop(hospitalWithTraffic),
    mall: selectTop(mallWithTraffic),
    education: selectTop(educationWithTraffic),
  }

  const formatted = formatOutputByCategory(candidatesByCategory)

  if (property.id) {
    try {
      await updatePropertyById(property.id, {
        nearbyPlaces: formatted,
        nearbyPlacesMeta: {
          travelMode: 'driving',
          maxDistanceKm: MAX_DISTANCE_KM,
          updatedAtMs: Date.now(),
          version: 2,
        },
      })
    } catch (e) {
      console.warn('[NearbyPlaces] Failed to cache:', e)
    }
  }
  return formatted
}
