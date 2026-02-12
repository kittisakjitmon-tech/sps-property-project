/**
 * Property ID auto-increment system
 * Format: SPS-{TYPE}-{NN}
 * - บ้านเดี่ยว -> SPS-S-
 * - คอนโดมิเนียม -> SPS-CON-
 * - ทาวน์โฮม -> SPS-TW-
 * - ที่ดิน -> SPS-L-
 * - วิลล่า -> SPS-V-
 * - บ้านเช่า -> SPS-R-
 */

export const TYPE_TO_PREFIX = {
  บ้านเดี่ยว: 'SPS-S-',
  คอนโดมิเนียม: 'SPS-CON-',
  ทาวน์โฮม: 'SPS-TW-',
  ที่ดิน: 'SPS-L-',
  วิลล่า: 'SPS-V-',
  บ้านเช่า: 'SPS-R-',
}

export function getPrefixForType(type) {
  return TYPE_TO_PREFIX[type] ?? 'SPS-X-'
}

export function generatePropertyID(type, allProperties = []) {
  const prefix = getPrefixForType(type)
  const matching = (allProperties || [])
    .filter((p) => p?.propertyId && String(p.propertyId).startsWith(prefix))
    .map((p) => {
      const numStr = String(p.propertyId).slice(prefix.length)
      const num = parseInt(numStr, 10)
      return Number.isFinite(num) ? num : 0
    })
  const maxNum = matching.length > 0 ? Math.max(...matching) : 0
  const nextNum = maxNum + 1
  const padded = String(nextNum).padStart(2, '0')
  return `${prefix}${padded}`
}

export function checkPropertyIdDuplicate(propertyId, excludeId, allProperties = []) {
  if (!propertyId || !String(propertyId).trim()) return false
  const normalized = String(propertyId).trim()
  return (allProperties || []).some(
    (p) => p?.propertyId && String(p.propertyId).trim().toUpperCase() === normalized.toUpperCase() && p.id !== excludeId
  )
}
