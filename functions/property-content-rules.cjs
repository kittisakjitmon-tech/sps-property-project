// Listing copy rules. Exact financial values belong in the dedicated price fields.
const clean = value => String(value || '').normalize('NFC').trim()
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const thaiDigits = value => value.replace(/[๐-๙]/g, ch => String(ch.charCodeAt(0) - 0x0e50))
const comparable = value => clean(value).replace(/\s+/g, '').toLocaleLowerCase('th')

// The dropdown address is for filtering; the title may end with the local area and soi.
function titleLocation(title, locationDisplay, location = {}) {
  const display = clean(locationDisplay)
  if (display && comparable(title).endsWith(comparable(display))) return display
  location = location || {}
  const canonical = [location.subDistrict, location.district, location.province].filter(Boolean).join(', ')
  if (canonical && comparable(display) === comparable(canonical)) {
    const locality = clean(location.subDistrict || location.district || location.province)
    const pattern = escape(locality).replace(/\s+/g, '\\s*')
    const match = clean(title).match(new RegExp(`(?:^|\\s)(${pattern}(?:\\s*(?:ซอย|ซ\\.)\\s*[\\p{L}\\p{M}0-9๐-๙/ .-]+)?)$`, 'u'))
    if (match) return match[1].trim()
    return locality
  }
  return display
}

function normalizeListingTitle(title, project, locationDisplay, selectedLocation = {}) {
  let result = clean(title)
  const projectName = clean(project).replace(/^(?:โครงการ|หมู่บ้าน)\s*/u, '')
  if (projectName) {
    const pattern = escape(projectName).replace(/\s+/g, '\\s*')
    result = result.replace(new RegExp(`(?:โครงการ\\s*|หมู่บ้าน\\s*)?${pattern}`, 'giu'), ' ')
  }
  const location = titleLocation(result, locationDisplay, selectedLocation)
  if (location) result = result.replace(new RegExp(escape(location).replace(/\s+/g, '\\s*'), 'giu'), ' ')
  result = result.replace(/\s+/g, ' ').replace(/^[\s|,–—-]+|[\s|,–—-]+$/g, '').trim()
  return result ? [result, location].filter(Boolean).join(' ') : ''
}

function descriptionPriceIssues(description, prices = []) {
  const text = thaiDigits(clean(description))
  const issues = []
  if (/ราคา\s*(?:สุทธิ|เต็ม)/u.test(text)) issues.push('รายละเอียดห้ามระบุราคาเต็มหรือราคาสุทธิ')
  // Masked prices such as 1.6x–1.9x ล้านบาท are allowed. Dimensions and percentages are untouched.
  const amounts = text.match(/\d[\d,.xX×*]*(?:\s*[–—-]\s*\d[\d,.xX×*]*)?\s*(?:ล้าน(?:บาท)?|บาท|฿)/gu) || []
  if (amounts.some(amount => amount.replace(/(?:ล้าน(?:บาท)?|บาท|฿)/u, '').split(/[–—-]/u).some(part => !/[xX×*]/u.test(part)))) issues.push('รายละเอียดมีราคาเต็ม กรุณาลบออกหรือใช้ช่วงราคาปกปิด เช่น 1.6x–1.9x ล้านบาท')
  const numbers = text.match(/\d[\d,]*(?:\.\d+)?/g) || []
  const exact = prices.filter(p => p != null && p !== '' && Number(p) > 0).map(Number)
  if (numbers.some(raw => exact.includes(Number(raw.replaceAll(',', ''))))) issues.push('รายละเอียดมีตัวเลขตรงกับราคาเต็มในช่องราคา กรุณาลบออก')
  return [...new Set(issues)]
}

function listingContentIssues({ title, project, locationDisplay, location, description, price, priceMax, bankPrice }) {
  const issues = []
  const projectName = comparable(project).replace(/^(?:โครงการ|หมู่บ้าน)/u, '')
  if ((projectName && comparable(title).includes(projectName)) || /โครงการ/u.test(clean(title))) issues.push('ชื่อประกาศห้ามมีชื่อโครงการ กรุณาเก็บไว้ในช่องชื่อโครงการเท่านั้น')
  if (!clean(locationDisplay)) issues.push('กรุณาระบุทำเลเพื่อนำไปต่อท้ายชื่อประกาศ')
  else if (!comparable(title).endsWith(comparable(titleLocation(title, locationDisplay, location)))) issues.push('ชื่อประกาศต้องลงท้ายด้วยทำเลที่ระบุ')
  return [...issues, ...descriptionPriceIssues(description, [price, priceMax, bankPrice])]
}

module.exports = { normalizeListingTitle, descriptionPriceIssues, listingContentIssues }
