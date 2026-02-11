/**
 * SPS Property Solution - Cloud Functions
 * AI Image Enhancement Pipeline: เมื่อมีรูปใหม่ใน Storage -> ส่งไป Cloudinary ปรับภาพ -> อัปเดต URL ใน Firestore
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cloudinary = require('cloudinary').v2

admin.initializeApp()

// โฟลเดอร์ใน Storage ที่ต้องการให้ trigger (รูปทรัพย์สิน)
const PROPERTY_IMAGES_PREFIX = 'properties/'
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/jpg']
const FIRESTORE_PROPERTIES = 'properties'

/**
 * ตั้งค่า Cloudinary จาก Environment Config (ไม่ hardcode)
 * ใช้คำสั่ง: firebase functions:config:set cloudinary.cloud_name="xxx" cloudinary.api_key="xxx" cloudinary.api_secret="xxx"
 */
function getCloudinaryConfig() {
  const config = functions.config().cloudinary
  if (!config || !config.cloud_name || !config.api_key || !config.api_secret) {
    throw new Error(
      'Cloudinary config ไม่ครบ กรุณารัน: firebase functions:config:set cloudinary.cloud_name="..." cloudinary.api_key="..." cloudinary.api_secret="..."'
    )
  }
  return config
}

/**
 * สร้าง URL ของรูปที่ผ่านการปรับแต่งจาก Cloudinary
 * ใช้: e_improve:outdoor, a_auto, q_auto, f_auto
 */
function buildEnhancedImageUrl(cloudName, publicId, format) {
  const trans = 'e_improve:outdoor,a_auto,q_auto,f_auto'
  return `https://res.cloudinary.com/${cloudName}/image/upload/${trans}/${publicId}.${format}`
}

/**
 * Storage Trigger: เมื่อมีไฟล์รูปใหม่ใน properties/{propertyId}/...
 * 1) กรองเฉพาะรูปภาพในโฟลเดอร์ properties/
 * 2) ดาวน์โหลดไฟล์ -> อัปโหลดไป Cloudinary พร้อม AI enhancement
 * 3) อัปเดต Firestore property document: แทนที่ URL เดิมด้วย URL ที่แต่งแล้ว
 */
exports.onPropertyImageFinalized = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB',
  })
  .storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name
    const contentType = object.contentType || ''

    // กรองเฉพาะโฟลเดอร์ properties/ และเป็นรูปภาพ
    if (!filePath.startsWith(PROPERTY_IMAGES_PREFIX)) {
      return null
    }
    if (!ALLOWED_MIME.includes(contentType)) {
      functions.logger.info(`ข้ามไฟล์ที่ไม่ใช่รูปภาพ: ${filePath} (${contentType})`)
      return null
    }

    const pathParts = filePath.split('/')
    if (pathParts.length < 3) {
      return null
    }
    const propertyId = pathParts[1]

    try {
      const cloudConfig = getCloudinaryConfig()
      cloudinary.config({
        cloud_name: cloudConfig.cloud_name,
        api_key: cloudConfig.api_key,
        api_secret: cloudConfig.api_secret,
      })

      const bucket = admin.storage().bucket(object.bucket)
      const file = bucket.file(filePath)
      const [buffer] = await file.download()
      const mime = contentType.includes('png') ? 'png' : 'jpeg'
      const dataUri = `data:image/${mime};base64,${buffer.toString('base64')}`

      // อัปโหลดไป Cloudinary (ได้ public_id กลับมา)
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: 'sps-property',
        resource_type: 'image',
      })

      const publicId = uploadResult.public_id
      const format = uploadResult.format || 'jpg'
      const enhancedUrl = buildEnhancedImageUrl(cloudConfig.cloud_name, publicId, format)

      // ค้นหาและแทนที่ URL ใน Firestore โดย match ตามชื่อไฟล์ (path ส่วนท้าย) หรือ append ถ้าไม่เจอ
      const fileName = pathParts[pathParts.length - 1]
      const db = admin.firestore()
      const propRef = db.collection(FIRESTORE_PROPERTIES).doc(propertyId)
      const doc = await propRef.get()
      if (!doc.exists) {
        functions.logger.warn(`ไม่พบ property document: ${propertyId}`)
        return null
      }

      const data = doc.data()
      const images = Array.isArray(data.images) ? [...data.images] : []
      const idx = images.findIndex((url) => typeof url === 'string' && url.includes(fileName))
      if (idx >= 0) {
        images[idx] = enhancedUrl
      } else {
        images.push(enhancedUrl)
        functions.logger.info(`เพิ่ม URL ใหม่ใน property ${propertyId} (ไม่พบ URL เดิมใน document)`)
      }
      await propRef.update({ images, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      functions.logger.info(`อัปเดตรูป property ${propertyId} เป็น URL ที่แต่งแล้ว`)
      return null
    } catch (err) {
      functions.logger.error('AI Image Enhancement ล้มเหลว', { filePath, error: err.message })
      throw err
    }
  })
