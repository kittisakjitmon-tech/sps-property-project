const clean = value => String(value ?? '').trim()
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function withoutProject(value, project) {
  const name = clean(project).replace(/^(?:โครงการ|หมู่บ้าน)\s*/u, '')
  let text = clean(value)
  if (name) text = text.replace(new RegExp(`(?:โครงการ\\s*|หมู่บ้าน\\s*)?${escape(name).replace(/\s+/g, '\\s*')}`, 'giu'), '')
  return text.replace(/โครงการ/gu, '').replace(/[ \t]+/g, ' ').trim()
}

export function quotationGifts(description, project) {
  const lines = clean(description).split(/\r?\n/).map(line => line.replace(/\*\*|__/g, '').trim())
  const heading = /^(?:#{1,6}\s*|🎁\s*)?(?:รายการ\s*)?(?:ของแถม|สิทธิประโยชน์|โปรโมชั่นและของแถม)/u
  const start = lines.findIndex(line => heading.test(line))
  if (start < 0) return ''
  const result = []
  const inline = lines[start].match(/[:：]\s*(.+)$/u)?.[1]
  if (inline) result.push(inline)
  for (const line of lines.slice(start + 1)) {
    if (/^(?:#{1,6}\s*|[•*-]\s*)?(?:หมายเหตุ|เงื่อนไข|รายละเอียดเพิ่มเติม|โปรโมชั่น|ทำเล|พิกัด|ข้อมูลผู้ติดต่อ)(?:[\s:：]|$)/u.test(line)) break
    if (line.trim()) result.push(line.replace(/^\s*(?:[•*-]|\d+[.)])\s*/u, ''))
  }
  return withoutProject(result.join('\n'), project)
}

export function makeQuotationSnapshot(property, details) {
  const price = Number(property.price)
  if (property.price === '' || property.price == null || !Number.isFinite(price) || price < 0) throw new Error('กรุณาระบุราคาหลังส่วนลดให้ถูกต้อง')
  if (!clean(details.customerName) || !clean(details.sellerName)) throw new Error('กรุณากรอกชื่อลูกค้าและผู้เสนอราคา')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(details.date) || !Number.isFinite(Date.parse(`${details.date}T12:00:00`))) throw new Error('กรุณาระบุวันที่ออกเอกสาร')
  const code = clean(property.displayId || property.propertyId)
  if (!code) throw new Error('ทรัพย์นี้ยังไม่มีรหัสทรัพย์')
  const optionalNumber = value => value === '' || value == null ? null : Number(value)
  const snapshot = {
    brand: 'SPS Property Solution', code,
    title: withoutProject(property.title, property.project),
    location: withoutProject(property.locationDisplay, property.project),
    type: property.type, price, priceMax: optionalNumber(property.priceMax), bankPrice: optionalNumber(property.bankPrice),
    bedrooms: optionalNumber(property.bedrooms), bathrooms: optionalNumber(property.bathrooms),
    landAreaSqw: property.area === '' || property.area == null ? null : Number(property.area) / 4,
    usableAreaSqm: optionalNumber(property.usableAreaSqm),
    isRental: property.listingType === 'rent' || Boolean(property.isRental),
    customerName: clean(details.customerName), customerPhone: clean(details.customerPhone),
    sellerName: clean(details.sellerName), sellerPhone: clean(details.sellerPhone), date: details.date,
    gifts: withoutProject(details.gifts, property.project), notes: withoutProject(details.notes, property.project),
    photo: details.photo,
  }
  if (!snapshot.photo) throw new Error('กรุณาเลือกรูปบ้าน 1 รูป')
  for (const field of ['priceMax', 'bankPrice', 'bedrooms', 'bathrooms', 'landAreaSqw', 'usableAreaSqm']) {
    if (snapshot[field] != null && (!Number.isFinite(snapshot[field]) || snapshot[field] < 0)) throw new Error('ราคา พื้นที่ และจำนวนห้องต้องเป็นตัวเลขตั้งแต่ศูนย์ขึ้นไป')
  }
  if (snapshot.priceMax != null && snapshot.priceMax < price) throw new Error('ราคาสูงสุดต้องไม่น้อยกว่าราคาเริ่มต้น')
  return Object.freeze(snapshot)
}
