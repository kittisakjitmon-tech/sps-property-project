// Finding a database property for a chat by its code, name, project, area or a nearby place
// (the picker in PropertyBar). Pure functions so they can be tested without a browser.

// nearbyPlace is a list of strings or of { label | name | value } objects.
export function placeNames(value) {
  const list = Array.isArray(value) ? value : (typeof value === 'string' ? [value] : [])
  return list
    .map(item => (typeof item === 'string' ? item : (item?.label || item?.name || item?.value || '')))
    .map(name => String(name).trim())
    .filter(Boolean)
}

function locationText(property) {
  if (typeof property.locationDisplay === 'string' && property.locationDisplay.trim()) return property.locationDisplay.trim()
  const location = property.location
  if (typeof location === 'string') return location.trim()
  if (!location || typeof location !== 'object') return ''
  return [location.subDistrict, location.district, location.province].filter(part => typeof part === 'string' && part).join(' ')
}

// Thai is typed with or without spaces, and แ is often typed as เเ.
const normalize = value => String(value || '').toLowerCase().replace(/เเ/g, 'แ').trim()
const compact = value => normalize(value).replace(/\s+/g, '')

// One option per available property, with what can be searched.
export function toPropertyOption(property) {
  const option = {
    code: String(property.displayId || '').trim(),
    title: String(property.title || '').trim(),
    project: String(property.project || '').trim(),
    location: locationText(property),
    nearby: placeNames(property.nearbyPlace),
  }
  return option
}

// Where a query word was found, best first; used to rank and to say why a property matched.
const FIELDS = [
  { key: 'code', label: 'รหัส', weight: 5 },
  { key: 'title', label: 'ชื่อ', weight: 4 },
  { key: 'project', label: 'โครงการ', weight: 3 },
  { key: 'location', label: 'ทำเล', weight: 2 },
  { key: 'nearby', label: 'ใกล้', weight: 1 },
]

function fieldValues(option, key) {
  return key === 'nearby' ? option.nearby : [option[key]]
}

// Every word of the query must be found somewhere in the property. Ranked by the best field each
// word was found in, an exact or starting code first. Returns [{ option, matched: { label, text } }].
export function searchPropertyOptions(options, query, limit = 8) {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const results = []
  for (const option of options || []) {
    let score = 0
    let matched = null
    let all = true
    for (const word of words) {
      let best = null
      for (const field of FIELDS) {
        const hit = fieldValues(option, field.key).find(value => normalize(value).includes(word) || compact(value).includes(compact(word)))
        if (hit && (!best || field.weight > best.field.weight)) best = { field, text: hit }
      }
      if (!best) { all = false; break }
      score += best.field.weight
      if (!matched || best.field.weight < matched.weight) matched = { weight: best.field.weight, label: best.field.label, text: best.text }
    }
    if (!all) continue
    const code = normalize(option.code)
    const whole = normalize(query)
    if (code === whole) score += 100
    else if (code.startsWith(whole)) score += 50
    results.push({ option, score, matched: matched && matched.label !== 'รหัส' && matched.label !== 'ชื่อ' ? { label: matched.label, text: matched.text } : null })
  }
  return results
    .sort((a, b) => b.score - a.score || a.option.code.localeCompare(b.option.code))
    .slice(0, limit)
    .map(({ option, matched }) => ({ option, matched }))
}
