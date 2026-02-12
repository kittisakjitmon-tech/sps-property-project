/**
 * SPS Property Solution - Cloud Functions
 * 1. AI Image Enhancement Pipeline: เมื่อมีรูปใหม่ใน Storage -> ส่งไป Cloudinary ปรับภาพ -> อัปเดต URL ใน Firestore
 * 2. LINE Notifications: เมื่อมี appointment ใหม่ -> ส่งข้อความแจ้งเตือนไป LINE
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cloudinary = require('cloudinary').v2
const axios = require('axios')

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

/**
 * LINE Messaging API Configuration
 * ใช้ Firebase Secrets (v2):
 * - LINE_TOKEN: Channel Access Token จาก LINE Developers Console (ตั้งเป็น Secret)
 * - LINE_ADMIN_IDS: User IDs ของ Admin ที่ต้องการรับข้อความ (คั่นด้วยลูกน้ำ เช่น 'U123...,U456...')
 * 
 * Setup Secrets:
 * firebase functions:secrets:set LINE_TOKEN
 */
function getLineConfig() {
  const channelAccessToken = process.env.LINE_TOKEN
  const adminIdsString = process.env.LINE_ADMIN_IDS

  if (!channelAccessToken) {
    throw new Error(
      'LINE_TOKEN ไม่พบ กรุณาตั้งค่า Secret:\n' +
      'firebase functions:secrets:set LINE_TOKEN\n' +
      'หรือตั้งค่า Environment Variable: LINE_TOKEN'
    )
  }

  // Parse comma-separated admin IDs
  let adminIds = []
  if (adminIdsString) {
    adminIds = adminIdsString
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
  }

  if (adminIds.length === 0) {
    functions.logger.warn('LINE_ADMIN_IDS ไม่พบหรือว่างเปล่า - ไม่สามารถส่งข้อความได้')
  }

  return { channelAccessToken, adminIds }
}

/**
 * ส่งข้อความไป LINE Messaging API (Multicast Message)
 * รองรับการส่งไปหลาย Admin พร้อมกัน
 */
async function sendLineMessage(adminIds, message) {
  const { channelAccessToken } = getLineConfig()

  // Safety check: ตรวจสอบว่า adminIds มีค่าและไม่ว่างเปล่า
  if (!adminIds || adminIds.length === 0) {
    functions.logger.warn('No Admin IDs configured - ข้ามการส่งข้อความ LINE')
    return
  }

  const LINE_API_URL = 'https://api.line.me/v2/bot/message/multicast'

  try {
    await axios.post(
      LINE_API_URL,
      {
        to: adminIds, // Array of User IDs
        messages: [
          {
            type: 'text',
            text: message,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${channelAccessToken}`,
        },
      }
    )
    functions.logger.info(`ส่งข้อความ LINE สำเร็จไปยัง ${adminIds.length} Admin(s): ${adminIds.join(', ')}`)
  } catch (error) {
    functions.logger.error('ส่งข้อความ LINE ล้มเหลว', {
      error: error.response?.data || error.message,
      adminIds,
      adminCount: adminIds.length,
    })
    throw error
  }
}

/**
 * จัดรูปแบบข้อความสำหรับ Customer Appointment
 */
function formatCustomerMessage(data) {
  return `👤 **ลูกค้าใหม่สนใจจอง!**

📋 รายละเอียด:
• ชื่อ: ${data.contactName}
• เบอร์โทร: ${data.tel}
• รหัสทรัพย์: ${data.propertyId || '-'}
• ชื่อโครงการ: ${data.propertyTitle || '-'}
• วันที่เข้าชม: ${data.date || '-'}
• เวลา: ${data.time || '-'}

📅 สร้างเมื่อ: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
}

/**
 * จัดรูปแบบข้อความสำหรับ Agent Appointment
 */
function formatAgentMessage(data) {
  return `👔 **เอเจนท์พาลูกค้าเข้าชม!**

📋 รายละเอียด:
• ชื่อเอเจนท์: ${data.agentName}
• เบอร์โทรเอเจนท์: ${data.tel}
• ชื่อลูกค้า: ${data.contactName}
• รหัสทรัพย์: ${data.propertyId || '-'}
• ชื่อโครงการ: ${data.propertyTitle || '-'}
• วันที่เข้าชม: ${data.date || '-'}
• เวลา: ${data.time || '-'}

📅 สร้างเมื่อ: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
}

/**
 * Firestore Trigger: เมื่อมี appointment ใหม่ใน collection 'appointments'
 * ส่งข้อความแจ้งเตือนไป LINE ตาม type (Customer หรือ Agent)
 */
exports.onAppointmentCreated = functions
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB',
    secrets: ['LINE_TOKEN'],
  })
  .firestore.document('appointments/{appointmentId}')
  .onCreate(async (snap, context) => {
    const appointmentId = context.params.appointmentId
    const data = snap.data()

    functions.logger.info(`Appointment สร้างใหม่: ${appointmentId}`, { type: data.type })

    try {
      const { adminIds } = getLineConfig()
      
      // Safety check: ตรวจสอบว่า adminIds มีค่าและไม่ว่างเปล่า
      if (!adminIds || adminIds.length === 0) {
        functions.logger.warn(`No Admin IDs configured - ข้ามการส่ง LINE notification สำหรับ appointment ${appointmentId}`)
        return null
      }

      let message = ''

      // จัดรูปแบบข้อความตาม type
      if (data.type === 'Customer') {
        message = formatCustomerMessage(data)
      } else if (data.type === 'Agent') {
        message = formatAgentMessage(data)
      } else {
        functions.logger.warn(`Unknown appointment type: ${data.type}`)
        return null
      }

      // ส่งข้อความไป LINE (Multicast)
      await sendLineMessage(adminIds, message)
      functions.logger.info(`ส่ง LINE notification สำเร็จสำหรับ appointment ${appointmentId} ไปยัง ${adminIds.length} Admin(s)`)

      return null
    } catch (error) {
      functions.logger.error(`ส่ง LINE notification ล้มเหลวสำหรับ appointment ${appointmentId}`, {
        error: error.message,
        stack: error.stack,
      })
      // ไม่ throw error เพื่อไม่ให้ Firestore write ล้มเหลว
      // แต่ log error เพื่อให้ admin ตรวจสอบได้
      return null
    }
  })

/**
 * LINE Webhook Handler - สำหรับหา User ID ของ Admin
 * เมื่อมีคนส่งข้อความมาที่ Official Account จะได้รับ User ID ใน Webhook event
 * 
 * Setup:
 * 1. Deploy function นี้: firebase deploy --only functions:lineWebhook
 * 2. Copy Webhook URL: https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/lineWebhook
 * 3. ไปที่ LINE Developers Console > Messaging API > Webhook settings
 * 4. ใส่ Webhook URL และ Enable Webhook
 * 5. ส่งข้อความมาที่ Official Account
 * 6. ดู User ID ใน Cloud Functions logs: firebase functions:log
 */
exports.lineWebhook = functions
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB',
    secrets: ['LINE_TOKEN'],
  })
  .https
  .onRequest(async (req, res) => {
    // LINE Webhook จะส่ง POST request มา
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }

    try {
      const events = req.body.events || []

      if (!Array.isArray(events) || events.length === 0) {
        functions.logger.info('No events received from LINE webhook')
        res.status(200).send('OK')
        return
      }

      // วนลูป events ที่เข้ามา
      for (const event of events) {
        // ตรวจสอบว่าเป็น message event และมี userId
        if (event.type === 'message' && event.source && event.source.userId) {
          const userId = event.source.userId
          
          // Log User ID ที่พบ
          functions.logger.info(`🚨 USER ID FOUND: ${userId}`)
          console.log(`🚨 USER ID FOUND: ${userId}`)

          // (Optional) Reply กลับไปบอก User ID
          try {
            const { channelAccessToken } = getLineConfig()
            const replyToken = event.replyToken

            if (replyToken && channelAccessToken) {
              const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply'

              await axios.post(
                LINE_REPLY_URL,
                {
                  replyToken: replyToken,
                  messages: [
                    {
                      type: 'text',
                      text: `Your User ID is: ${userId}\n\nคัดลอก ID นี้ไปใส่ใน LINE_ADMIN_IDS เพื่อรับการแจ้งเตือน`,
                    },
                  ],
                },
                {
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${channelAccessToken}`,
                  },
                }
              )
              functions.logger.info(`ส่ง reply สำเร็จไปยัง User ID: ${userId}`)
            }
          } catch (replyError) {
            // ถ้า reply ไม่สำเร็จ ไม่เป็นไร แค่ log error
            functions.logger.warn('Reply failed (ไม่เป็นไร - แค่ log User ID)', {
              error: replyError.message,
              userId,
            })
          }
        } else if (event.type === 'follow') {
          // กรณีที่ user เพิ่มเพื่อน (Follow)
          if (event.source && event.source.userId) {
            const userId = event.source.userId
            functions.logger.info(`🚨 NEW FOLLOWER USER ID: ${userId}`)
            console.log(`🚨 NEW FOLLOWER USER ID: ${userId}`)
          }
        } else {
          // Log event types อื่นๆ (ถ้ามี)
          functions.logger.info(`Received event type: ${event.type}`, {
            eventType: event.type,
            hasUserId: !!(event.source && event.source.userId),
          })
        }
      }

      // ส่ง 200 OK กลับไปเสมอ (LINE ต้องการ response ภายใน 30 วินาที)
      res.status(200).send('OK')
    } catch (error) {
      functions.logger.error('LINE Webhook error:', {
        error: error.message,
        stack: error.stack,
      })
      // ส่ง 200 OK กลับไปเสมอแม้เกิด error (เพื่อไม่ให้ LINE retry)
      res.status(200).send('OK')
    }
  })
