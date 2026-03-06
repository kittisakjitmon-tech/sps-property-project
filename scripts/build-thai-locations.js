/**
 * Build location dataset for 7 provinces from kongvut/thai-province-data.
 * Output format: { id, province, district, subDistrict, displayName }
 * Provinces: ชลบุรี ระยอง จันทบุรี ตราด ฉะเชิงเทรา ปราจีนบุรี สระแก้ว
 *
 * Usage: node scripts/build-thai-locations.js
 * Requires: Node 18+ (native fetch)
 */

const BASE = 'https://raw.githubusercontent.com/kongvut/thai-province-data/master/data/raw'
const PROVINCE_NAMES = [
  'ชลบุรี',
  'ระยอง',
  'จันทบุรี',
  'ตราด',
  'ฉะเชิงเทรา',
  'ปราจีนบุรี',
  'สระแก้ว',
]

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json()
}

async function main() {
  console.log('Fetching provinces, districts, sub_districts...')
  const [provinces, districts, subDistricts] = await Promise.all([
    fetchJson(`${BASE}/provinces.json`),
    fetchJson(`${BASE}/districts.json`),
    fetchJson(`${BASE}/sub_districts.json`),
  ])

  const provinceById = Object.fromEntries(provinces.map((p) => [p.id, p]))
  const districtById = Object.fromEntries(districts.map((d) => [d.id, d]))

  const allowedProvinceIds = new Set(
    provinces.filter((p) => PROVINCE_NAMES.includes(p.name_th)).map((p) => p.id)
  )
  const allowedDistrictIds = new Set(
    districts.filter((d) => allowedProvinceIds.has(d.province_id)).map((d) => d.id)
  )

  const rows = []
  let id = 1
  for (const sub of subDistricts) {
    if (!allowedDistrictIds.has(sub.district_id)) continue
    const district = districtById[sub.district_id]
    const province = district && provinceById[district.province_id]
    if (!district || !province) continue
    const provinceName = province.name_th
    const districtName = district.name_th
    const subDistrictName = sub.name_th
    rows.push({
      id: id++,
      province: provinceName,
      district: districtName,
      subDistrict: subDistrictName,
      displayName: `${subDistrictName}, ${districtName}, ${provinceName}`,
    })
  }

  const fs = await import('fs')
  const { fileURLToPath } = await import('url')
  const path = await import('path')
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const outPath = path.join(__dirname, '..', 'src', 'data', 'bkk-surrounding-locations.json')
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf8')
  console.log(`Wrote ${rows.length} rows to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
