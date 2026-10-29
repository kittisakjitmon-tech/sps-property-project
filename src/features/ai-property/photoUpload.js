import { compressImage } from '../../lib/imageCompressor.js'
import { FILE_TYPES, MAX_FILE_SIZE, MAX_TOTAL_SIZE } from './propertyDraft.js'

export const MAX_PHOTOS = 15
export const MAX_PDFS = 2
export function validateAttachmentCounts(files) {
  if (files.filter(f => f.type?.startsWith('image/')).length > MAX_PHOTOS) throw new Error('เพิ่มรูปบ้านได้สูงสุด 15 รูปต่อชุด')
  if (files.filter(f => f.type === 'application/pdf').length > MAX_PDFS) throw new Error('แนบ PDF ได้สูงสุด 2 ไฟล์ต่อชุด')
  if (files.some(f => !FILE_TYPES.includes(f.type))) throw new Error('รองรับ JPG, PNG, WebP และ PDF เท่านั้น')
}

export async function shrinkPhoto(file, maxBytes, compressor = compressImage) {
  if (!(maxBytes >= 24 * 1024)) throw new Error('พื้นที่ไฟล์ไม่พอสำหรับรูป กรุณาลดขนาด PDF หรือแบ่งข้อมูลเป็นชุด')
  for (const width of [1600, 1280, 1024, 800, 640]) {
    const result = await compressor(file, { maxWidth: width, maxHeight: width, quality: 0.82, maxSizeMB: maxBytes / 1024 / 1024 })
    if (result.size > 0 && result.size <= maxBytes) return result
  }
  throw new Error(`ย่อรูป ${file.name} ให้เล็กพอไม่ได้ กรุณาเลือกไฟล์อื่น`)
}

export async function prepareIntakeFiles(incoming, current = [], compressor = compressImage) {
  validateAttachmentCounts([...current, ...incoming])
  if (incoming.some(f => !f.size || (f.type === 'application/pdf' ? f.size > MAX_FILE_SIZE : f.size > 30 * 1024 * 1024))) throw new Error('รูปต้นฉบับต้องไม่เกิน 30 MB และ PDF ต้องไม่เกิน 4 MB ต่อไฟล์')
  const imageCount = incoming.filter(f => f.type.startsWith('image/')).length
  const reserved = current.reduce((sum, f) => sum + f.size, 0) + incoming.filter(f => f.type === 'application/pdf').reduce((sum, f) => sum + f.size, 0)
  const budget = Math.min(180 * 1024, Math.floor((MAX_TOTAL_SIZE - reserved) * 0.95 / Math.max(imageCount, 1)))
  if (reserved > MAX_TOTAL_SIZE) throw new Error('PDF และไฟล์เดิมมีขนาดรวมเกิน 6 MB กรุณาลดขนาดหรือแบ่งชุด')
  const prepared = []
  // Process one image at a time to avoid decoding 15 large photos simultaneously.
  for (const original of incoming) {
    const file = original.type.startsWith('image/') ? await shrinkPhoto(original, budget, compressor) : original
    prepared.push({ file, originalSize: original.size })
  }
  return prepared
}

export async function compressUploadFiles(files, occupied = 0, compressor = compressImage) {
  if (files.length + occupied > MAX_PHOTOS) throw new Error('รูปในประกาศรวมภาพหน้าปกต้องไม่เกิน 15 รูป')
  if (files.some(f => !f.type?.startsWith('image/') || !FILE_TYPES.includes(f.type))) throw new Error('กรุณาเลือกไฟล์รูป JPG, PNG หรือ WebP')
  const result = []
  for (const file of files) result.push(await shrinkPhoto(file, 300 * 1024, compressor))
  return result
}
