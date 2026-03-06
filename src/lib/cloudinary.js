/**
 * Cloudinary CDN helpers — สร้าง URL สำหรับแสดงรูปด้วย resize/format ฝั่ง CDN
 * ใช้กับรูปที่อัปโหลดผ่าน Cloudinary (res.cloudinary.com)
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
const CDN_BASE = CLOUD_NAME ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload` : ''
const FETCH_BASE = CLOUD_NAME ? `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/` : ''

/**
 * ตรวจว่าเป็น URL ของ Cloudinary หรือไม่
 */
export function isCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return false
  return url.includes('res.cloudinary.com') && url.includes('/image/upload')
}

/**
 * ตรวจว่าเป็น URL รูปที่ใช้ได้ (ไม่พัง/ไม่มีช่องว่าง)
 * ป้องกัน GET ไปที่ URL ที่ truncate หรือผิดรูปแบบ (เช่น firebasestorage.ap_rates 5d78bf3888.webp)
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (trimmed.length < 20 || trimmed.includes(' ')) return false
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    if (url.includes('firebasestorage.googleapis.com') && !url.includes('appspot.com')) return false
    return true
  } catch {
    return false
  }
}

/**
 * แยก path หลัง /image/upload/ เป็น [transforms, publicId]
 * เช่น /image/upload/e_improve,a_auto,q_auto,f_auto/abc123 -> ['e_improve,a_auto,q_auto,f_auto', 'abc123']
 */
function parseCloudinaryPath(fullUrl) {
  if (!isCloudinaryUrl(fullUrl)) return null
  try {
    const u = new URL(fullUrl)
    const match = u.pathname.match(/\/image\/upload\/(.+)/)
    if (!match) return null
    const afterUpload = match[1]
    const parts = afterUpload.split('/')
    if (parts.length >= 2) {
      const publicId = parts.slice(1).join('/')
      return { transform: parts[0], publicId }
    }
    return { transform: '', publicId: afterUpload }
  } catch {
    return null
  }
}

/**
 * สร้าง Cloudinary URL สำหรับแสดงรูป พร้อม resize/format ผ่าน CDN
 * @param {string} url - URL เต็มจาก Cloudinary (หรือ URL อื่น จะได้คืนตามเดิม)
 * @param {object} options - { width, height, crop, quality, format }
 *   - width, height: จำนวนพิกเซล (ถ้าไม่ใส่ใช้ของเดิม)
 *   - crop: 'fill' | 'fit' | 'scale' | 'thumb' (default 'fill' เมื่อมี width/height)
 *   - quality: 'auto' หรือตัวเลข
 *   - format: 'auto' ให้ CDN เลือก (webp/avif ตาม browser)
 */
export function getCloudinaryImageUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return url
  if (!isCloudinaryUrl(url)) return url
  if (!CDN_BASE) return url

  const parsed = parseCloudinaryPath(url)
  if (!parsed) return url

  const { width, height, crop = 'fill', quality = 'auto', format = 'auto' } = options
  const transforms = []
  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  if ((width || height) && crop) transforms.push(`c_${crop}`)
  transforms.push(`q_${quality}`)
  transforms.push(`f_${format}`)

  const transformStr = transforms.join(',')
  const newPath = transformStr ? `${transformStr}/${parsed.publicId}` : `${parsed.transform}/${parsed.publicId}`

  return `${CDN_BASE}/${newPath}`
}

/**
 * รูปที่เก็บใน Cloudinary จะได้ resize + WebP
 * รูปที่เก็บที่อื่น (เช่น Firebase Storage) จะถูกดึงผ่าน Cloudinary fetch → WebP + resize
 * @param {string} url - URL รูป (Cloudinary หรือ external)
 * @param {object} options - { width, height, crop, quality } (format เป็น webp เสมอ)
 */
export function getOptimizedImageUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return url
  const opts = { ...options, format: 'webp', quality: options.quality ?? 'auto' }
  if (isCloudinaryUrl(url)) {
    return getCloudinaryImageUrl(url, opts)
  }
  if (!FETCH_BASE) return url
  const { width, height, crop = 'fill' } = opts
  const parts = ['f_webp', 'q_auto']
  if (width) parts.push(`w_${width}`)
  if (height) parts.push(`h_${height}`)
  if ((width || height) && crop) parts.push(`c_${crop}`)
  const transformStr = parts.join(',')
  return `${FETCH_BASE}${transformStr}/${encodeURIComponent(url)}`
}

/**
 * URL รูป thumbnail สำหรับ card/list — WebP, ขนาดพอดีช่อง 4:3
 */
export function getCloudinaryThumbUrl(url) {
  return getCloudinaryImageUrl(url, { width: 400, height: 300, crop: 'fill', format: 'webp' })
}

/**
 * URL รูปขนาดกลาง สำหรับ slider/detail — WebP
 */
export function getCloudinaryMediumUrl(url) {
  return getCloudinaryImageUrl(url, { width: 800, height: 450, crop: 'fill', format: 'webp' })
}

/**
 * URL รูปขนาดใหญ่ สำหรับหน้า detail gallery — WebP
 */
export function getCloudinaryLargeUrl(url) {
  return getCloudinaryImageUrl(url, { width: 1200, height: 675, crop: 'fill', format: 'webp' })
}
