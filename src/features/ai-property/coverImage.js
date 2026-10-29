import { normalizeListingTitle, listingContentIssues, descriptionPriceIssues } from '../../lib/propertyContentRules.js'

export function coverTitle(property) {
  return normalizeListingTitle(property.coverText || property.title, property.project, property.locationDisplay)
}

export function orderedPropertyImages(property, files) {
  const byId = new Map(files.filter(f => f.type.startsWith('image/')).map(f => [f.id, f]))
  const ids = [...new Set(property.imageIds || [])].filter(id => byId.has(id))
  if (!ids.length) return []
  if (!ids.includes(property.coverImageId)) throw new Error('กรุณาเลือกรูปหน้าปกของทรัพย์นี้ หรือให้ AI ช่วยเลือกจากรูปที่แนบ')
  return [property.coverImageId, ...ids.filter(id => id !== property.coverImageId)].map(id => byId.get(id))
}

export function validateCover(property) {
  const title = coverTitle(property)
  if (!title) throw new Error('กรุณาระบุข้อความประกาศสำหรับภาพหน้าปก')
  const issues = [...listingContentIssues({ ...property, title, description: '' }), ...descriptionPriceIssues(title, [property.price, property.priceMax, property.bankPrice])]
  if (issues.length) throw new Error(issues.join('\n'))
  return title
}

// Grapheme segmentation keeps Thai vowel/tone marks with the character they belong to.
export function wrapCoverText(text, measure, width) {
  const segments = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(text)].map(s => s.segment)
    : Array.from(text)
  const lines = []
  let line = ''
  for (const part of segments) {
    if (line && measure(line + part) > width) { lines.push(line.trim()); line = part.trimStart() }
    else line += part
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

export function coverFacts(property) {
  return [
    property.bedrooms != null && property.bedrooms !== '' && `${property.bedrooms} ห้องนอน`,
    property.bathrooms != null && property.bathrooms !== '' && `${property.bathrooms} ห้องน้ำ`,
    property.landAreaSqw != null && property.landAreaSqw !== '' && `ที่ดิน ${property.landAreaSqw} ตร.ว.`,
  ].filter(Boolean).join('   •   ')
}

export function photoLayout(imageWidth, imageHeight, frameWidth = 1600, frameHeight = 850) {
  if (!(imageWidth > 0 && imageHeight > 0)) throw new Error('ขนาดรูปหน้าปกไม่ถูกต้อง')
  const ratio = Math.min(frameWidth / imageWidth, frameHeight / imageHeight)
  const width = imageWidth * ratio, height = imageHeight * ratio
  return { x: (frameWidth - width) / 2, y: (frameHeight - height) / 2, width, height }
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('เปิดรูปหน้าปกไม่สำเร็จ กรุณาเลือกรูปอื่น'))
    image.src = dataUrl
  })
}

export async function renderCoverImage(property, attachment) {
  const title = validateCover(property)
  if (!attachment?.type.startsWith('image/')) throw new Error('กรุณาเลือกรูปบ้านสำหรับภาพหน้าปก')
  if (document.fonts) await document.fonts.ready
  const image = await loadImage(attachment.dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = 1600; canvas.height = 1200
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('เบราว์เซอร์ไม่รองรับการสร้างภาพหน้าปก')
  const photoHeight = 850
  ctx.fillStyle = '#eef2f7'; ctx.fillRect(0, 0, 1600, 1200)
  // Fit the whole real photograph. Never crop out part of the property or alter it.
  const { x, y, width, height } = photoLayout(image.naturalWidth, image.naturalHeight)
  ctx.drawImage(image, x, y, width, height)
  ctx.fillStyle = '#172e69'; ctx.fillRect(0, photoHeight, 1600, 350)
  ctx.fillStyle = '#facc15'; ctx.fillRect(0, photoHeight, 1600, 9)
  const font = '"Noto Sans Thai", "Sarabun", Tahoma, sans-serif'
  ctx.fillStyle = '#fde68a'; ctx.font = `600 23px ${font}`
  ctx.fillText(`${property.listingType === 'sale' ? 'ประกาศขาย' : property.listingType === 'rent' ? 'ประกาศให้เช่า' : 'ประกาศบ้าน'}  /  SPS PROPERTY`, 64, 906)
  let fontSize = 56, lines
  do {
    ctx.font = `700 ${fontSize}px ${font}`
    lines = wrapCoverText(title, t => ctx.measureText(t).width, 1472)
    if (lines.length <= 3) break
    fontSize -= 2
  } while (fontSize >= 22)
  if (lines.length > 3) throw new Error('ข้อความหน้าปกยาวเกินไป กรุณาย่อชื่อประกาศ')
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic'
  lines.forEach((line, i) => ctx.fillText(line, 64, 978 + i * (fontSize + 13)))
  const facts = coverFacts(property)
  if (facts) {
    let factsSize = 26
    do { ctx.font = `400 ${factsSize}px ${font}`; if (ctx.measureText(facts).width <= 1472) break; factsSize -= 1 } while (factsSize > 16)
    ctx.fillStyle = '#cbd5e1'; ctx.fillText(facts, 64, 1172)
  }
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
  if (!dataUrl.startsWith('data:image/jpeg;base64,')) throw new Error('สร้างไฟล์ภาพหน้าปกไม่สำเร็จ')
  return { id: `cover-${attachment.id}`, name: 'property-announcement-cover.jpg', type: 'image/jpeg', size: Math.floor(dataUrl.split(',')[1].length * 3 / 4), dataUrl }
}

export async function preparePropertyPhotos(property, files, renderer = renderCoverImage) {
  const originals = orderedPropertyImages(property, files)
  if (!originals.length) return { files: [], coverGenerated: false }
  if (property.coverOverlay === false) return { files: originals, coverGenerated: false }
  const cover = await renderer(property, originals[0])
  // Generated cover goes first. Replace the chosen original in the gallery so the total stays at 15; its source stays in the local draft.
  return { files: [cover, ...originals.slice(1)], coverGenerated: true }
}
