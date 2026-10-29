import { normalizeListingTitle, listingContentIssues } from '../../lib/propertyContentRules.js'
export const MAX_FILE_SIZE = 4 * 1024 * 1024
export const MAX_TOTAL_SIZE = 6 * 1024 * 1024
export const FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const value = v => v == null ? '' : v

export function draftToForm(draft) {
  const gifts = (draft.gifts || []).map(g => `• ${g.name}${g.detail ? `: ${g.detail}` : ''}`).join('\n')
  const promotions = (draft.promotions || []).map(p => `• ${p}`).join('\n')
  const sections = [draft.description, gifts && `ของแถมและรายละเอียด\n${gifts}`, promotions && `โปรโมชั่น (กรุณาตรวจสอบเงื่อนไขและวันที่)\n${promotions}`]
  return {
    title: normalizeListingTitle(draft.title, draft.project, draft.locationDisplay, draft.location), type: draft.type || '', project: draft.project || '',
    bankPrice: value(draft.bankPrice), commissionRate: 3, price: value(draft.price), priceMax: value(draft.priceMax), showPrice: draft.showPrice !== false,
    bedrooms: value(draft.bedrooms), bathrooms: value(draft.bathrooms),
    area: draft.landAreaSqw == null || draft.landAreaSqw === '' ? '' : Number((Number(draft.landAreaSqw) * 4).toFixed(4)),
    usableAreaSqm: value(draft.usableAreaSqm),
    description: sections.filter(Boolean).join('\n\n'),
    locationDisplay: draft.locationDisplay || '', location: { province: '', district: '', subDistrict: '', ...draft.location },
    mapUrl: draft.mapUrl || '', lat: draft.lat ?? null, lng: draft.lng ?? null,
    listingType: draft.listingType || '', subListingType: draft.listingType === 'rent' ? 'rent_only' : '',
    isRental: draft.listingType === 'rent', propertyCondition: draft.propertyCondition || '',
    // Availability must be explicitly reviewed by a person, never inferred by AI.
    availability: 'pending', status: 'pending', images: [], coverImageUrl: '',
  }
}

export function missingFields(draft) {
  return [!draft.title && 'ชื่อประกาศ', !draft.type && 'ประเภททรัพย์',
    (draft.price == null || draft.price === '') && 'ราคา', !draft.locationDisplay && 'ทำเล',
    !draft.location?.province && 'จังหวัด', !draft.listingType && 'ประเภทการดีล',
    draft.type !== 'SPS-LD-ID' && (draft.bedrooms == null || draft.bedrooms === '') && 'ห้องนอน',
    draft.type !== 'SPS-LD-ID' && (draft.bathrooms == null || draft.bathrooms === '') && 'ห้องน้ำ',
  ].filter(Boolean)
}

export function validateDraft(draft) {
  for (const field of ['price', 'priceMax', 'bankPrice', 'discountAmount', 'landAreaSqw', 'usableAreaSqm', 'bedrooms', 'bathrooms']) {
    const v = draft[field]
    if (v != null && v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0)) throw new Error('ราคา พื้นที่ และจำนวนห้องต้องเป็นตัวเลขตั้งแต่ศูนย์ขึ้นไป')
  }
  for (const field of ['bedrooms', 'bathrooms']) {
    if (draft[field] != null && draft[field] !== '' && !Number.isInteger(Number(draft[field]))) throw new Error('จำนวนห้องต้องเป็นจำนวนเต็ม')
  }
  if (draft.priceMax != null && draft.priceMax !== '' && draft.price != null && Number(draft.priceMax) < Number(draft.price)) throw new Error('ราคาสูงสุดต้องไม่น้อยกว่าราคาเริ่มต้น')
  if (draft.bankPrice != null && draft.bankPrice !== '' && draft.discountAmount != null && draft.discountAmount !== '') {
    const expected = Math.round((Number(draft.bankPrice) - Number(draft.discountAmount)) * 100) / 100
    if (expected < 0 || (draft.price != null && draft.price !== '' && Math.abs(Number(draft.price) - expected) > 0.005)) throw new Error('ราคาหลังส่วนลดต้องเท่ากับราคาก่อนส่วนลดลบส่วนลด กรุณาตรวจตัวเลขของแปลงเดียวกัน')
  }
  const form = draftToForm(draft)
  const issues = listingContentIssues({ ...draft, title: form.title, description: form.description })
  if (issues.length) throw new Error(issues.join('\n'))
}

export function validateFiles(files, current) {
  const all = [...files, ...current]
  if (all.filter(f => f.type.startsWith('image/')).length > 15) throw new Error('แนบรูปบ้านได้สูงสุด 15 รูปต่อชุด')
  if (all.filter(f => f.type === 'application/pdf').length > 2) throw new Error('แนบ PDF ได้สูงสุด 2 ไฟล์ต่อชุด')
  if (files.some(f => !FILE_TYPES.includes(f.type))) throw new Error('รองรับไฟล์ JPG, PNG, WebP และ PDF เท่านั้น')
  if (files.some(f => f.size > MAX_FILE_SIZE || !f.size)) throw new Error('แต่ละไฟล์ต้องมีข้อมูลและขนาดไม่เกิน 4 MB')
  if ([...files, ...current].reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_SIZE) throw new Error('ขนาดไฟล์รวมต้องไม่เกิน 6 MB กรุณาลดขนาดหรือแบ่งชุด')
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`อ่านไฟล์ ${file.name} ไม่สำเร็จ`))
    reader.readAsDataURL(file)
  })
}

export function attachmentToFile(attachment) {
  const [header, base64] = attachment.dataUrl.split(',')
  const type = header.match(/^data:([^;]+);base64$/)?.[1]
  if (!type?.startsWith('image/')) throw new Error('รูปภาพในร่างไม่ถูกต้อง กรุณาแนบใหม่')
  const binary = atob(base64)
  return new File([Uint8Array.from(binary, ch => ch.charCodeAt(0))], attachment.name, { type })
}
