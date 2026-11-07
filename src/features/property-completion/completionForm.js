export const COMPLETION_LABELS = {
  title: 'ชื่อประกาศ', type: 'ประเภทบ้าน', listingType: 'ขายหรือให้เช่า',
  price: 'ราคา (บาท)', locationDisplay: 'ทำเล / จุดสังเกต',
  province: 'จังหวัด', district: 'อำเภอ / เขต', subDistrict: 'ตำบล / แขวง',
  bedrooms: 'ห้องนอน', bathrooms: 'ห้องน้ำ', area: 'พื้นที่ดิน (ตร.ว.)',
  usableAreaSqm: 'พื้นที่ใช้สอย (ตร.ม.)', mapUrl: 'ลิงก์ Google Maps',
}

export function completionValues(missingFields, values, form = {}) {
  const allowPriceMax = missingFields.includes('price') && (form.priceMax == null || form.priceMax === '')
  const fields = allowPriceMax ? [...missingFields, 'priceMax'] : missingFields
  return Object.fromEntries(fields.filter(key => Object.hasOwn(values, key)).map(key => [
    key, key === 'area' && values[key] !== '' ? Number(values[key]) * 4 : values[key],
  ]))
}

export function completionUrl(origin, token) {
  return `${origin}/complete-property#${encodeURIComponent(token)}`
}

export function completionErrorMessage(error) {
  if (error?.code === 'functions/internal' || /^internal$/i.test(error?.message || '')) {
    return 'ติดต่อบริการเติมข้อมูลบ้านไม่สำเร็จ กรุณาลองใหม่ หากยังพบปัญหาให้ติดต่อผู้ดูแล'
  }
  return error?.message || 'ติดต่อระบบบ้านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
}
