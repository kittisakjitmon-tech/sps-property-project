export function propertyStatus(property) {
  const normalize = value => ({ 'ว่าง': 'available', 'ติดจอง': 'reserved', 'ขายแล้ว': 'sold', 'รออนุมัติ': 'pending', 'ไม่ว่าง': 'unavailable' })[value] || value
  const current = normalize(property.availability)
  const legacy = normalize(property.status)
  // Older forms defaulted availability to available even for reserved/pending listings.
  // Keep those listings out of available stock until a staff member resolves the status.
  if (current === 'available' && ['reserved', 'sold', 'pending', 'unavailable'].includes(legacy)) return legacy
  return current || legacy || 'available'
}

export function hasCoordinates(property) {
  return typeof property.lat === 'number' && Number.isFinite(property.lat) && Math.abs(property.lat) <= 90 &&
    typeof property.lng === 'number' && Number.isFinite(property.lng) && Math.abs(property.lng) <= 180
}

export function hasImages(property) {
  return Boolean(property.coverImageUrl || property.images?.length)
}

export function searchProperty(property, text, typeLabel = '') {
  const location = property.location
  const fields = [property.title, property.displayId, property.propertyId, property.project, typeLabel,
    property.locationDisplay, property.address, property.province, property.district,
    ...(typeof location === 'object' && location ? Object.values(location) : [location]),
    ...(Array.isArray(property.customTags) ? property.customTags : [])]
  const haystack = fields.filter(value => typeof value === 'string').join(' ').normalize('NFC').toLowerCase()
  return text.trim().normalize('NFC').toLowerCase().split(/\s+/).filter(Boolean).every(word => haystack.includes(word))
}

export function filterByBudget(properties, min, max) {
  return properties.filter(property => {
    if (min === '' && max === '') return true
    if (property.price == null || property.price === '') return false
    const price = Number(property.price)
    return Number.isFinite(price) && (min === '' || price >= Number(min)) && (max === '' || price <= Number(max))
  })
}

function time(value) {
  if (value == null || value === '') return null
  let result
  if (typeof value?.toMillis === 'function') result = value.toMillis()
  else if (typeof value?.seconds === 'number') result = value.seconds * 1000
  else if (typeof value === 'number') result = value
  else result = Date.parse(value)
  return Number.isFinite(result) ? result : null
}

/** Sort the complete filtered list before pagination; missing values stay last. */
export function sortProperties(properties, sort, typeLabel = value => value || '') {
  const statusOrder = ['available', 'reserved', 'sold', 'pending', 'unavailable']
  const compareText = (left, right) => String(left).localeCompare(String(right), 'th', { numeric: true, sensitivity: 'base' })
  return [...properties].sort((a, b) => {
    let left, right
    const ascending = sort.endsWith('-asc')
    if (sort.startsWith('price-')) {
      const price = property => property.price == null || property.price === '' || !Number.isFinite(Number(property.price)) ? null : Number(property.price)
      left = price(a)
      right = price(b)
    } else if (sort.startsWith('title-') || sort.startsWith('type-')) {
      left = sort.startsWith('title-') ? a.title?.trim() : typeLabel(a.type)
      right = sort.startsWith('title-') ? b.title?.trim() : typeLabel(b.type)
      if (!left) return !right ? 0 : 1
      if (!right) return -1
      return compareText(left, right) * (ascending ? 1 : -1)
    } else if (sort.startsWith('status-')) {
      const rank = property => { const index = statusOrder.indexOf(propertyStatus(property)); return index < 0 ? statusOrder.length : index }
      left = rank(a)
      right = rank(b)
    } else if (sort === 'updated' || sort.startsWith('updated-')) {
      left = time(a.updatedAt)
      right = time(b.updatedAt)
    } else {
      left = time(a.createdAt)
      right = time(b.createdAt)
    }
    if (left == null) return right == null ? 0 : 1
    if (right == null) return -1
    return (left - right) * (ascending ? 1 : -1)
  })
}

// Summary totals are computed from the complete visible inventory, independently of search filters.
export function countPropertyStatuses(properties) {
  return properties.reduce((counts, property) => {
    const status = propertyStatus(property)
    counts[status] = (counts[status] || 0) + 1
    return counts
  }, {})
}
