import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SOURCE_URL =
  'https://raw.githubusercontent.com/earthchie/jquery.Thailand.js/master/jquery.Thailand.js/database/raw_database/raw_database.json'

const TARGET_PROVINCES = new Set([
  'กรุงเทพมหานคร',
  'นนทบุรี',
  'ปทุมธานี',
  'สมุทรปราการ',
  'สมุทรสาคร',
  'นครปฐม',
  'ชลบุรี',
  'ระยอง',
])

function sortThai(a, b) {
  return a.localeCompare(b, 'th')
}

async function main() {
  const response = await fetch(SOURCE_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch source data: ${response.status} ${response.statusText}`)
  }

  const raw = await response.json()
  if (!Array.isArray(raw)) {
    throw new Error('Unexpected source format: expected array')
  }

  const dedupe = new Set()
  const cleaned = []

  for (const item of raw) {
    const province = item?.province
    const district = item?.amphoe
    const subDistrict = item?.district

    if (!TARGET_PROVINCES.has(province)) continue
    if (!province || !district || !subDistrict) continue

    const key = `${province}|${district}|${subDistrict}`
    if (dedupe.has(key)) continue
    dedupe.add(key)

    cleaned.push({
      province,
      district,
      subDistrict,
      displayName: `${subDistrict}, ${district}, ${province}`,
    })
  }

  cleaned.sort((a, b) => {
    const provinceCmp = sortThai(a.province, b.province)
    if (provinceCmp !== 0) return provinceCmp

    const districtCmp = sortThai(a.district, b.district)
    if (districtCmp !== 0) return districtCmp

    return sortThai(a.subDistrict, b.subDistrict)
  })

  const finalData = cleaned.map((item, idx) => ({
    id: idx + 1,
    province: item.province,
    district: item.district,
    subDistrict: item.subDistrict,
    displayName: item.displayName,
  }))

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const outputPath = path.join(__dirname, 'src', 'data', 'bkk-surrounding-locations.json')

  await writeFile(outputPath, `${JSON.stringify(finalData, null, 2)}\n`, 'utf8')

  console.log(`Generated ${finalData.length} records -> ${outputPath}`)
  console.log('First 3 records:')
  console.log(JSON.stringify(finalData.slice(0, 3), null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
