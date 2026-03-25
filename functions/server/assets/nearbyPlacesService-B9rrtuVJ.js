import { t as updatePropertyById } from "./server-build-C8MEOO73.js";
const MAP_URL_PATTERN = /https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl)[^\s"'<>]*/i;
function extractMapUrl(input) {
  if (!input || typeof input !== "string") return { url: null, isEmbed: false };
  const s = input.trim();
  if (!s) return { url: null, isEmbed: false };
  const iframeMatch = s.match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/i);
  if (iframeMatch) {
    const src = iframeMatch[1].trim();
    if (src && (src.includes("google.com") || src.includes("maps.google"))) {
      return { url: deduplicateUrl(src), isEmbed: src.includes("/embed") };
    }
  }
  const urlMatch = s.match(MAP_URL_PATTERN);
  if (urlMatch) {
    const url = deduplicateUrl(urlMatch[0]);
    return { url, isEmbed: url.includes("/embed") };
  }
  return { url: null, isEmbed: false };
}
function deduplicateUrl(url) {
  if (!url || url.length < 20) return url;
  const half = Math.floor(url.length / 2);
  if (url.slice(0, half) === url.slice(half)) return url.slice(0, half);
  return url;
}
function toEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const s = url.trim();
  if (!s) return null;
  try {
    if (s.includes("/embed")) return s;
    if (s.includes("google.com/maps") || s.includes("maps.google")) {
      let query = "";
      const coordMatch = s.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (coordMatch) {
        query = `${coordMatch[1]},${coordMatch[2]}`;
      } else {
        const placeMatch = s.match(/place\/([^/?#]+)/);
        if (placeMatch) {
          query = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
        } else {
          const searchMatch = s.match(/[?&]q=([^&]+)/);
          if (searchMatch) {
            query = decodeURIComponent(searchMatch[1]);
          } else {
            const pathSearchMatch = s.match(/\/search\/([^/?#]+)/);
            if (pathSearchMatch) {
              query = decodeURIComponent(pathSearchMatch[1].replace(/\+/g, " "));
            }
          }
        }
      }
      if (query) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
      }
      return null;
    }
    if (s.includes("goo.gl/maps") || s.includes("maps.app.goo.gl")) {
      return null;
    }
    return null;
  } catch {
    return null;
  }
}
function isShortMapLink(url) {
  if (!url || typeof url !== "string") return false;
  return url.includes("maps.app.goo.gl") || url.includes("goo.gl/maps");
}
function processMapInput(input) {
  const { url: extracted } = extractMapUrl(input);
  if (!extracted) {
    if (input && input.trim()) {
      return { cleanedUrl: null, embedUrl: null, isShortLink: false, error: "ไม่พบ URL ที่ถูกต้องจาก Google Maps" };
    }
    return { cleanedUrl: null, embedUrl: null, isShortLink: false, error: null };
  }
  const shortLink = isShortMapLink(extracted);
  const embedUrl = shortLink ? null : toEmbedUrl(extracted);
  if (!shortLink && !embedUrl) {
    return { cleanedUrl: null, embedUrl: null, isShortLink: false, error: "ไม่สามารถแปลงเป็น Embed URL ได้" };
  }
  return { cleanedUrl: extracted, embedUrl, isShortLink: shortLink, error: null };
}
function parseCoordinatesFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const s = url.trim();
  try {
    const qMatch = s.match(/[?&]q=([^&]+)/);
    if (qMatch) {
      const q = decodeURIComponent(qMatch[1]);
      const coords = q.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/) || q.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (coords) {
        const lat = parseFloat(coords[1]);
        const lng = parseFloat(coords[2]);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
      }
    }
    const atMatch = s.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
    const d3 = s.match(/!3d(-?\d+\.?\d*)/);
    const d4 = s.match(/!4d(-?\d+\.?\d*)/);
    const d2 = s.match(/!2d(-?\d+\.?\d*)/);
    if (d3) {
      const lat = parseFloat(d3[1]);
      const lngMatch = d4 || d2;
      const lng = lngMatch ? parseFloat(lngMatch[1]) : null;
      if (!Number.isNaN(lat) && lng != null && !Number.isNaN(lng)) return { lat, lng };
    }
  } catch (_) {
  }
  return null;
}
const LONGDO_POI_API = "https://api.longdo.com/POIService/json/search";
const LONGDO_KEY = "e4aec2faf2c8e741e7fce2093b958abc";
const MAX_DISTANCE_KM = 20;
const MAX_PER_CATEGORY = 3;
const SEARCH_SPAN = "20km";
const LIMIT_PER_TAG = 15;
const CATEGORY_META = {
  industrial: { label: "นิคมอุตสาหกรรม", tags: ["industrial_estate", "factory"] },
  hospital: { label: "โรงพยาบาล", tags: ["hospital", "clinic"] },
  mall: { label: "ห้างสรรพสินค้า", tags: ["department_store", "shopping_mall", "mall"] },
  education: { label: "การศึกษา", tags: ["school", "university", "college"] }
};
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1e3;
const memoryCache = /* @__PURE__ */ new Map();
function getCachedNearby(propertyId) {
  const entry = propertyId ? memoryCache.get(propertyId) : null;
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.places;
}
function setCachedNearby(propertyId, places) {
  if (!propertyId) return;
  memoryCache.set(propertyId, { places, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
}
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function getCoordsFromProperty(property) {
  const lat = property.lat != null ? Number(property.lat) : null;
  const lng = property.lng != null ? Number(property.lng) : null;
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  if (property.mapUrl) return parseCoordinatesFromUrl(property.mapUrl);
  return null;
}
async function searchLongdoPOI(lat, lng, tagCsv) {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      span: SEARCH_SPAN,
      tag: tagCsv,
      limit: String(LIMIT_PER_TAG),
      locale: "th",
      key: LONGDO_KEY
    });
    const res = await fetch(`${LONGDO_POI_API}?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    const list = json?.data || [];
    return list.map((p) => ({
      name: p.name || "สถานที่",
      lat: p.lat,
      lng: p.lon,
      address: p.address || "",
      distance: p.distance,
      tag: p.tag
    }));
  } catch {
    return [];
  }
}
function mergeAndSort(originLat, originLng, category, items) {
  const withKm = items.filter((p) => p.name && p.lat != null && p.lng != null).map((p) => ({
    ...p,
    category,
    straightDistanceKm: haversineDistance(originLat, originLng, p.lat, p.lng)
  })).filter((p) => p.straightDistanceKm <= MAX_DISTANCE_KM + 2);
  withKm.sort((a, b) => a.straightDistanceKm - b.straightDistanceKm);
  const seen = /* @__PURE__ */ new Set();
  const deduped = withKm.filter((p) => {
    const key = `${p.name}|${p.lat?.toFixed(4)}|${p.lng?.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.slice(0, MAX_PER_CATEGORY);
}
function formatOutputByCategory(candidatesByCategory) {
  return Object.entries(candidatesByCategory).flatMap(([category, places]) => {
    const label = CATEGORY_META[category]?.label || "สถานที่";
    return places.map((p) => {
      const km = p.straightDistanceKm;
      const distanceText = Number.isFinite(km) ? `${km.toFixed(1)} กม.` : "ประมาณ";
      const durationText = "ตรวจสอบจากแผนที่";
      return {
        name: p.name,
        type: category,
        typeLabel: label,
        distanceKm: Number.isFinite(km) ? Number(km.toFixed(2)) : null,
        distanceText,
        durationText,
        durationMinutes: null,
        displayText: `${p.name} - ${distanceText} (${durationText})`,
        travelMode: "driving"
      };
    });
  });
}
async function fetchAndCacheNearbyPlaces(property, options = {}) {
  const { forceRefresh = false } = options;
  const coords = getCoordsFromProperty(property);
  if (!coords) return [];
  if (!forceRefresh && Array.isArray(property.nearbyPlaces) && property.nearbyPlaces.length > 0) {
    if (property.id) setCachedNearby(property.id, property.nearbyPlaces);
    return property.nearbyPlaces;
  }
  if (!forceRefresh && property.id) {
    const cached = getCachedNearby(property.id);
    if (cached) return cached;
  }
  const { lat, lng } = coords;
  const [industrialRes, hospitalRes, mallRes, educationRes] = await Promise.all([
    searchLongdoPOI(lat, lng, "industrial_estate,factory"),
    searchLongdoPOI(lat, lng, "hospital,clinic"),
    searchLongdoPOI(lat, lng, "department_store,shopping_mall,mall"),
    searchLongdoPOI(lat, lng, "school,university,college")
  ]);
  const candidatesByCategory = {
    industrial: mergeAndSort(lat, lng, "industrial", industrialRes),
    hospital: mergeAndSort(lat, lng, "hospital", hospitalRes),
    mall: mergeAndSort(lat, lng, "mall", mallRes),
    education: mergeAndSort(lat, lng, "education", educationRes)
  };
  const formatted = formatOutputByCategory(candidatesByCategory);
  if (property.id) {
    setCachedNearby(property.id, formatted);
    try {
      await updatePropertyById(property.id, {
        nearbyPlaces: formatted,
        nearbyPlacesMeta: {
          travelMode: "driving",
          maxDistanceKm: MAX_DISTANCE_KM,
          updatedAtMs: Date.now(),
          version: 3,
          source: "longdo_poi"
        }
      });
    } catch (e) {
      console.warn("[NearbyPlaces] Failed to cache:", e);
    }
  }
  return formatted;
}
export {
  parseCoordinatesFromUrl as a,
  fetchAndCacheNearbyPlaces as f,
  getCoordsFromProperty as g,
  processMapInput as p
};
