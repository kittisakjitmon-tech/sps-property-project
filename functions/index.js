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
const FIRESTORE_BLOGS = 'blogs'
const SHARE_LINKS = 'share_links'

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
 * Extract ID from slug format: {content}--{id}
 * ใช้สำหรับ dynamicMeta และ blogMeta ในการแตก Document ID จาก URL slug
 * เช่น: 'บางแสน-ชลบุรี-บ้าน-ขาย-2.5m--doc123' → 'doc123'
 */
function extractIdFromSlug(slugParam) {
  if (!slugParam) return null
  const sep = slugParam.lastIndexOf('--')
  return sep !== -1 ? slugParam.substring(sep + 2) : slugParam
}

/**
 * Get property type label in Thai
 */
function getPropertyTypeLabel(type) {
  const typeMap = {
    'บ้าน': '🏠 บ้าน',
    'บ้านเดี่ยว': '🏠 บ้านเดี่ยว',
    'ทาวน์โฮม': '🏘️ ทาวน์โฮม',
    'คอนโด': '🏢 คอนโด',
    'แฟลต': '🏠 แฟลต',
    'เช่า': '🔑 เช่า',
    'ขาย': '💰 ขาย',
  }
  return typeMap[type] || type || 'อสังหาริมทรัพย์'
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

/**
 * Dynamic Sitemap Generator
 * สร้าง sitemap.xml แบบ Real-time เพื่อให้ Google Bot มาดึงข้อมูลประกาศทั้งหมด
 */
exports.sitemap = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .https
  .onRequest(async (req, res) => {
    try {
      const db = admin.firestore()
      let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
      sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

      const baseUrl = 'https://spspropertysolution.com'

      // 1. หน้า Static หลักๆ
      const staticPages = [
        '/',
        '/properties',
        '/blogs',
        '/contact',
        '/loan-services'
      ]

      for (const page of staticPages) {
        sitemap += '  <url>\n'
        sitemap += `    <loc>${baseUrl}${page}</loc>\n`
        sitemap += `    <changefreq>${page === '/' ? 'daily' : 'weekly'}</changefreq>\n`
        sitemap += `    <priority>${page === '/' ? '1.0' : '0.8'}</priority>\n`
        sitemap += '  </url>\n'
      }

      // 2. หน้า Properties (ดึงเฉพาะ status: available)
      const propertiesSnapshot = await db.collection(FIRESTORE_PROPERTIES)
        .where('status', '==', 'available')
        .get()

      propertiesSnapshot.forEach(doc => {
        const id = doc.id
        const updatedAt = doc.data().updatedAt?.toDate() || new Date()
        const formattedDate = updatedAt.toISOString().split('T')[0] // YYYY-MM-DD

        sitemap += '  <url>\n'
        sitemap += `    <loc>${baseUrl}/properties/${id}</loc>\n`
        sitemap += `    <lastmod>${formattedDate}</lastmod>\n`
        sitemap += '    <changefreq>daily</changefreq>\n'
        sitemap += '    <priority>0.9</priority>\n'
        sitemap += '  </url>\n'
      })

      // 3. หน้า Blogs (ดึงเฉพาะ published: true)
      const blogsSnapshot = await db.collection('blogs')
        .where('published', '==', true)
        .get()

      blogsSnapshot.forEach(doc => {
        const id = doc.id
        const updatedAt = doc.data().updatedAt?.toDate() || doc.data().createdAt?.toDate() || new Date()
        const formattedDate = updatedAt.toISOString().split('T')[0] // YYYY-MM-DD

        sitemap += '  <url>\n'
        sitemap += `    <loc>${baseUrl}/blogs/${id}</loc>\n`
        sitemap += `    <lastmod>${formattedDate}</lastmod>\n`
        sitemap += '    <changefreq>monthly</changefreq>\n'
        sitemap += '    <priority>0.7</priority>\n'
        sitemap += '  </url>\n'
      })

      sitemap += '</urlset>'

      res.set('Content-Type', 'application/xml')
      res.status(200).send(sitemap)

    } catch (error) {
      res.status(500).send('Error generating sitemap')
    }
  })

/**
 * Escape HTML special characters to prevent meta tag injection
 * ใช้เพื่อปกป้องจากการทำลาย HTML structure ด้วย special characters ในชื่อ description และ URL
 */
function escapeHtml(str) {
  if (str == null || typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Dynamic OG Meta Tags Generator
 * Intercepts requests for /properties/:id
 * If the request is from a social bot (Facebook, LINE, etc.), it queries Firestore and returns an HTML skeleton with correct Open Graph meta tags.
 * If it's a real user, it serves the Firebase Hosting index.html (SPA).
 */
exports.dynamicMeta = functions
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB',
  })
  .https
  .onRequest(async (req, res) => {
    const userAgent = req.headers['user-agent']?.toLowerCase() || ''

    // Check if the requester is a social bot (use specific crawlers, ไม่ใช้คำว่า 'line' ตรงๆ เพื่อไม่ชนกับ in-app browser)
    const isBot = userAgent.includes('facebookexternalhit') ||
      userAgent.includes('linespider') || // LINE crawler
      userAgent.includes('twitterbot') ||
      userAgent.includes('linkedinbot') ||
      userAgent.includes('whatsapp') ||
      userAgent.includes('telegrambot')

    // เวลา Hosting rewrite มา path อยู่ที่ originalUrl หรือ url (รีเฟรชต้องได้ path ถูก)
    const rawPath = req.originalUrl || (req.url && typeof req.url === 'string' ? req.url : '') || (req.path && typeof req.path === 'string' ? req.path : '') || '/'
    const pathname = String(rawPath).split('?')[0].replace(/^\/+/, '') || ''
    const pathSegments = pathname ? pathname.split('/').filter(Boolean) : []

    // Helper: ส่ง index.html จาก Hosting (ใช้ทั้งกรณี path ผิดหรือไม่ใช่บอท)
    // ใช้โดเมนคงที่เพื่อให้ fetch จาก Cloud Function ไปขอหน้าเว็บจริงได้ (req.headers.host อาจเป็นโดเมนของ Function)
    const serveSpaIndex = async () => {
      try {
        const origin = 'https://spspropertysolution.com'
        const response = await fetch(`${origin}/`)
        const html = await response.text()
        res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
        return res.status(200).send(html)
      } catch (error) {
        functions.logger.error('Error loading page from hosting', error)
        return res.status(500).send('Error loading page')
      }
    }

    // path ต้องขึ้นต้นด้วย properties (rewrite ส่งมาแค่ /properties/**)
    if (pathSegments[0] !== 'properties') {
      return serveSpaIndex()
    }

    // /properties เท่านั้น (หน้ารายการ) → ส่ง SPA
    const propertyId = extractIdFromSlug(pathSegments[1])
    if (!propertyId) {
      return serveSpaIndex()
    }

    if (isBot) {
      try {
        const db = admin.firestore()
        const docRef = db.collection(FIRESTORE_PROPERTIES).doc(propertyId)
        const docSnap = await docRef.get()

        if (!docSnap.exists) {
          return res.status(404).send('Property Not Found')
        }

        const property = docSnap.data()
        const title = `${property.title || 'อสังหาริมทรัพย์'} | SPS Property Solution`
        const description = property.description ? property.description.substring(0, 150) + '...' : 'รายละเอียดอสังหาริมทรัพย์ SPS Property Solution ชลบุรี'
        const imageUrl = property.images && property.images.length > 0 ? property.images[0] : 'https://spspropertysolution.com/icon.png'
        const url = `https://spspropertysolution.com/properties/${propertyId}`

        // Escape HTML to prevent special characters from breaking meta tags
        const safeTitle = escapeHtml(title)
        const safeDesc = escapeHtml(description)
        const safeImage = escapeHtml(imageUrl)
        const safeUrl = escapeHtml(url)

        // Return a full SSR HTML with Tailwind CSS styling that matches the React app
        const priceFormatted = Number(property.price || 0).toLocaleString('th-TH')
        const typeLabel = getPropertyTypeLabel(property.type)
        const statusClass = property.status === 'ว่าง' ? 'bg-emerald-100 text-emerald-700' : 
                          property.status === 'ขายแล้ว' ? 'bg-red-100 text-red-700' : 
                          'bg-amber-100 text-amber-700'
        const bedrooms = property.bedrooms || '-'
        const bathrooms = property.bathrooms || '-'
        const area = property.area || '-'
        
        // Build gallery images HTML
        const galleryImages = property.images && property.images.length > 0 
          ? property.images.slice(0, 6).map((img, idx) => `
              <img 
                src="${escapeHtml(img)}" 
                alt="รูปภาพที่ ${idx + 1}" 
                class="w-20 h-16 object-cover rounded-lg cursor-pointer hover:ring-2 hover:ring-teal-500 transition-all"
                loading="lazy"
              />
            `).join('')
          : ''
        
        // Calculate Cloudinary transformation URL for og:image
        const ogImageUrl = imageUrl.includes('res.cloudinary.com') 
          ? imageUrl.replace('/upload/', '/upload/w=1200,h=630,c_fill,f_auto,q_auto/')
          : imageUrl

        // Full SSR HTML with Tailwind CSS CDN
        const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  
  <!-- Open Graph / Facebook / LINE -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:site_name" content="SPS Property Solution">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${ogImageUrl}">
  
  <!-- Preconnect for performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://res.cloudinary.com">
  
  <!-- Tailwind CSS CDN for styling -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: { 50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 900: '#134e4a' },
            accent: { 500: '#ea6d2d', 600: '#c0571d' }
          }
        }
      }
    }
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .gradient-primary { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); }
    .gradient-accent { background: linear-gradient(135deg, #ea6d2d 0%, #c0571d 100%); }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- Header -->
  <header class="gradient-primary text-white shadow-lg">
    <div class="max-w-6xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-2">
            🏠 SPS Property Solution
          </h1>
          <p class="text-teal-100 text-sm mt-1">บ้านและคอนโดสวย อมตะซิตี้ ชลบุรี</p>
        </div>
        <a href="tel:0890000000" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm font-medium">
          📞 089-000-0000
        </a>
      </div>
    </div>
  </header>
  
  <!-- Breadcrumb -->
  <nav class="max-w-6xl mx-auto px-4 py-4">
    <ol class="flex items-center gap-2 text-sm text-gray-500">
      <li><a href="https://spspropertysolution.com/" class="hover:text-teal-600 transition-colors">หน้าแรก</a></li>
      <li><span class="text-gray-300">/</span></li>
      <li><a href="https://spspropertysolution.com/properties" class="hover:text-teal-600 transition-colors">ทรัพย์สิน</a></li>
      <li><span class="text-gray-300">/</span></li>
      <li class="text-gray-700 truncate max-w-[200px]">${escapeHtml(property.title || '')}</li>
    </ol>
  </nav>
  
  <!-- Main Content -->
  <main class="max-w-6xl mx-auto px-4 pb-12">
    <!-- Property Card -->
    <article class="bg-white rounded-2xl shadow-xl overflow-hidden">
      <!-- Main Image -->
      <div class="relative">
        <img 
          src="${escapeHtml(imageUrl)}" 
          alt="${escapeHtml(property.title || 'รูปภาพทรัพย์สิน')}" 
          class="w-full h-[400px] md:h-[500px] object-cover"
        >
        <!-- Badges Overlay -->
        <div class="absolute top-4 left-4 flex gap-2">
          <span class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
            ${escapeHtml(typeLabel)}
          </span>
          <span class="${statusClass} px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
            ${escapeHtml(property.status || 'ว่าง')}
          </span>
        </div>
        <!-- Price Badge -->
        <div class="absolute bottom-4 right-4 gradient-accent text-white px-6 py-3 rounded-xl shadow-lg">
          <span class="text-sm opacity-90">ราคา</span>
          <p class="text-2xl font-bold">฿${priceFormatted}</p>
        </div>
      </div>
      
      <!-- Property Info -->
      <div class="p-6 md:p-8">
        <!-- Title -->
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          ${escapeHtml(property.title || '')}
        </h2>
        
        <!-- Quick Specs -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          ${bedrooms !== '-' ? `
          <div class="bg-teal-50 rounded-xl p-4 text-center">
            <p class="text-2xl mb-1">🛏️</p>
            <p class="text-sm text-gray-500">ห้องนอน</p>
            <p class="font-bold text-gray-900">${bedrooms}</p>
          </div>
          ` : ''}
          ${bathrooms !== '-' ? `
          <div class="bg-teal-50 rounded-xl p-4 text-center">
            <p class="text-2xl mb-1">🚿</p>
            <p class="text-sm text-gray-500">ห้องน้ำ</p>
            <p class="font-bold text-gray-900">${bathrooms}</p>
          </div>
          ` : ''}
          ${area !== '-' ? `
          <div class="bg-teal-50 rounded-xl p-4 text-center">
            <p class="text-2xl mb-1">📐</p>
            <p class="text-sm text-gray-500">พื้นที่</p>
            <p class="font-bold text-gray-900">${area} ตร.ม.</p>
          </div>
          ` : ''}
          ${property.location ? `
          <div class="bg-teal-50 rounded-xl p-4 text-center">
            <p class="text-2xl mb-1">📍</p>
            <p class="text-sm text-gray-500">ที่ตั้ง</p>
            <p class="font-bold text-gray-900 truncate">${escapeHtml(property.location)}</p>
          </div>
          ` : ''}
        </div>
        
        <!-- Gallery -->
        ${galleryImages ? `
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">📷 รูปภาพเพิ่มเติม</h3>
          <div class="flex gap-3 overflow-x-auto pb-2">
            ${galleryImages}
          </div>
        </div>
        ` : ''}
        
        <!-- Description -->
        <div class="border-t pt-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">📋 รายละเอียด</h3>
          <div class="prose prose-gray max-w-none">
            <p class="text-gray-600 whitespace-pre-wrap leading-relaxed">${escapeHtml(property.description || 'ไม่มีรายละเอียด')}</p>
          </div>
        </div>
        
        <!-- CTA Buttons -->
        <div class="mt-8 flex flex-col sm:flex-row gap-4">
          <a 
            href="https://spspropertysolution.com/properties/${pathSegments[1]}" 
            class="flex-1 gradient-primary text-white text-center py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
          >
            🔍 ดูรายละเอียดเพิ่มเติม
          </a>
          <a 
            href="https://line.me/ti/p/~@spsproperty" 
            class="flex-1 bg-green-500 text-white text-center py-4 rounded-xl font-bold text-lg hover:bg-green-600 transition-colors shadow-lg"
          >
            💬 ติดต่อ Line
          </a>
          <a 
            href="tel:0890000000" 
            class="flex-1 bg-amber-500 text-white text-center py-4 rounded-xl font-bold text-lg hover:bg-amber-600 transition-colors shadow-lg"
          >
            📞 โทร 089-000-0000
          </a>
        </div>
      </div>
    </article>
    
    <!-- Additional Info Cards -->
    <div class="mt-8 grid md:grid-cols-2 gap-6">
      <!-- Contact Card -->
      <div class="bg-white rounded-xl shadow-lg p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">📞 ติดต่อสอบถาม</h3>
        <div class="space-y-3">
          <p class="text-gray-600">ต้องการข้อมูลเพิ่มเติมหรือนัดดูบ้าน?</p>
          <a href="tel:0890000000" class="block w-full bg-teal-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors">
            📞 089-000-0000
          </a>
          <a href="https://line.me/ti/p/~@spsproperty" class="block w-full bg-green-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors">
            💬 แอดไลน์ @spsproperty
          </a>
        </div>
      </div>
      
      <!-- Location Card -->
      ${property.location ? `
      <div class="bg-white rounded-xl shadow-lg p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">📍 ที่ตั้ง</h3>
        <p class="text-gray-600 mb-4">${escapeHtml(property.location)}</p>
        <a 
          href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location || '')}" 
          target="_blank" 
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
        >
          🗺️ ดูแผนที่บน Google Maps →
        </a>
      </div>
      ` : ''}
    </div>
  </main>
  
  <!-- Footer -->
  <footer class="bg-gray-900 text-white mt-12">
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="text-center">
        <h3 class="text-xl font-bold mb-2">🏠 SPS Property Solution</h3>
        <p class="text-gray-400 mb-4">บ้านและคอนโดสวย อมตะซิตี้ ชลบุรี</p>
        <div class="flex justify-center gap-6 text-sm text-gray-400">
          <span>📞 089-000-0000</span>
          <span>💬 Line: @spsproperty</span>
        </div>
        <p class="text-gray-500 text-sm mt-6">© 2026 SPS Property Solution. สงวนลิขสิทธิ์.</p>
      </div>
    </div>
  </footer>
</body>
</html>`

        res.set('Content-Type', 'text/html; charset=utf-8')
        res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
        return res.status(200).send(htmlContent)

      } catch (error) {
        functions.logger.error('Error generating dynamic meta tags:', error)
        return res.status(500).send('Internal Server Error')
      }
    } else {
      // ไม่ใช่บอท (รวมถึงรีเฟรช) → ส่ง SPA เพื่อไม่ให้ขึ้น page not found
      return serveSpaIndex()
    }
  })

/**
 * Dynamic Meta Generator for Share Links
 * ใช้สำหรับ path /share/:token เพื่อให้ LINE / Facebook แสดงรูปบ้านจากทรัพย์ที่ลิงก์แชร์อ้างอิงอยู่
 */
exports.shareMeta = functions
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB',
  })
  .https
  .onRequest(async (req, res) => {
    const userAgent = req.headers['user-agent']?.toLowerCase() || ''
    const isBot = userAgent.includes('facebookexternalhit') ||
      userAgent.includes('linespider') || // LINE crawler
      userAgent.includes('twitterbot') ||
      userAgent.includes('linkedinbot') ||
      userAgent.includes('whatsapp') ||
      userAgent.includes('telegrambot')

    const segments = req.path.split('/').filter(Boolean) // expect ['share', ':token']
    if (segments[0] !== 'share' || !segments[1]) {
      return res.status(404).send('Not Found')
    }
    const token = segments[1]

    const db = admin.firestore()

    if (isBot) {
      try {
        // 1) พยายามหา share link ตาม token ก่อน
        const shareSnap = await db.collection(SHARE_LINKS).doc(token).get()

        let propertyId = null
        if (shareSnap.exists) {
          const shareData = shareSnap.data() || {}
          propertyId = shareData.propertyId || null
        }

        // 2) ถ้าไม่พบ share link หรือไม่มี propertyId ให้ fallback เป็น propertyId = token (ลิงก์เก่า)
        if (!propertyId) {
          propertyId = token
        }

        const propSnap = await db.collection(FIRESTORE_PROPERTIES).doc(propertyId).get()
        if (!propSnap.exists) {
          return res.status(404).send('Property Not Found')
        }

        const property = propSnap.data()
        const title = `${property.title || 'อสังหาริมทรัพย์'} | SPS Property Solution`
        const description = property.description
          ? `${property.description.substring(0, 150)}...`
          : 'รายละเอียดอสังหาริมทรัพย์ SPS Property Solution ชลบุรี'
        const imageUrl = Array.isArray(property.images) && property.images.length > 0
          ? property.images[0]
          : 'https://spspropertysolution.com/icon.png'
        const url = `https://spspropertysolution.com/share/${token}`

        // Full SSR HTML with Tailwind CSS styling for shared properties
        const priceFormatted = Number(property.price || 0).toLocaleString('th-TH')
        const typeLabel = getPropertyTypeLabel(property.type)
        const statusClass = property.status === 'ว่าง' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        
        // Calculate Cloudinary transformation URL for og:image
        const ogImageUrl = imageUrl.includes('res.cloudinary.com') 
          ? imageUrl.replace('/upload/', '/upload/w=1200,h=630,c_fill,f_auto,q_auto/')
          : imageUrl
        
        const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph / Facebook / LINE -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:site_name" content="SPS Property Solution">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${ogImageUrl}">
  
  <!-- Preconnect for performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://res.cloudinary.com">
  
  <!-- Tailwind CSS CDN for styling -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: { 50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 900: '#134e4a' },
            accent: { 500: '#ea6d2d', 600: '#c0571d' }
          }
        }
      }
    }
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .gradient-primary { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); }
    .gradient-accent { background: linear-gradient(135deg, #ea6d2d 0%, #c0571d 100%); }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- Header -->
  <header class="gradient-primary text-white shadow-lg">
    <div class="max-w-6xl mx-auto px-4 py-6 text-center">
      <h1 class="text-2xl font-bold flex items-center justify-center gap-2">
        🏠 SPS Property Solution
      </h1>
      <p class="text-teal-100 text-sm mt-1">บ้านและคอนโดสวย อมตะซิตี้ ชลบุรี</p>
    </div>
  </header>
  
  <!-- Main Content -->
  <main class="max-w-2xl mx-auto px-4 py-8">
    <!-- Shared Property Card -->
    <article class="bg-white rounded-2xl shadow-xl overflow-hidden">
      <!-- Image -->
      <div class="relative">
        <img 
          src="${escapeHtml(imageUrl)}" 
          alt="${escapeHtml(property.title || 'รูปภาพทรัพย์สิน')}" 
          class="w-full h-64 object-cover"
        >
        <div class="absolute top-4 left-4 flex gap-2">
          <span class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow">
            ${escapeHtml(typeLabel)}
          </span>
          <span class="${statusClass} px-3 py-1 rounded-full text-sm font-semibold shadow">
            ${escapeHtml(property.status || 'ว่าง')}
          </span>
        </div>
      </div>
      
      <!-- Content -->
      <div class="p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-2">
          ${escapeHtml(property.title || '')}
        </h2>
        <p class="text-2xl font-bold text-emerald-600 mb-4">฿${priceFormatted}</p>
        
        ${property.description ? `
        <p class="text-gray-600 text-sm mb-4 line-clamp-3">
          ${escapeHtml(property.description.substring(0, 150))}${property.description.length > 150 ? '...' : ''}
        </p>
        ` : ''}
        
        <!-- CTA Buttons -->
        <div class="flex flex-col gap-3">
          <a 
            href="${escapeHtml(url)}" 
            class="w-full gradient-primary text-white text-center py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            🔍 ดูรายละเอียดเพิ่มเติม
          </a>
          <a 
            href="https://line.me/ti/p/~@spsproperty" 
            class="w-full bg-green-500 text-white text-center py-3 rounded-xl font-bold hover:bg-green-600 transition-colors"
          >
            💬 ติดต่อ Line
          </a>
          <a 
            href="tel:0890000000" 
            class="w-full bg-amber-500 text-white text-center py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors"
          >
            📞 โทร 089-000-0000
          </a>
        </div>
      </div>
    </article>
  </main>
  
  <!-- Footer -->
  <footer class="text-center py-6 text-gray-500 text-sm">
    <p>© 2026 SPS Property Solution | 📞 089-000-0000</p>
  </footer>
</body>
</html>`
        
        res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
        return res.status(200).send(htmlContent)

        res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
        return res.status(200).send(htmlContent)
      } catch (error) {
        functions.logger.error('Error generating share meta tags:', error)
        return res.status(500).send('Internal Server Error')
      }
    } else {
      // ผู้ใช้ปกติ: redirect ไปให้ SPA โหลด index.html แล้วให้ React จัดการ route ต่อเอง
      const redirectUrl = `/index.html?share=${encodeURIComponent(token)}`
      return res.redirect(302, redirectUrl)
    }
  })

/**
 * Dynamic OG Meta for Blog Share (Facebook / LINE)
 * เมื่อ bot เข้า /blogs/:id จะได้ HTML ที่มี og:image = รูป cover บทความ
 */
exports.blogMeta = functions
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB',
  })
  .https
  .onRequest(async (req, res) => {
    const userAgent = req.headers['user-agent']?.toLowerCase() || ''
    const isBot = userAgent.includes('facebookexternalhit') ||
      userAgent.includes('linespider') ||
      userAgent.includes('twitterbot') ||
      userAgent.includes('linkedinbot') ||
      userAgent.includes('whatsapp') ||
      userAgent.includes('telegrambot')

    const pathSegments = req.path.split('/').filter(Boolean)
    if (pathSegments[0] !== 'blogs' || !pathSegments[1]) {
      return res.status(404).send('Not Found')
    }
    const blogId = extractIdFromSlug(pathSegments[1])

    if (isBot) {
      try {
        const db = admin.firestore()
        const docSnap = await db.collection(FIRESTORE_BLOGS).doc(blogId).get()

        if (!docSnap.exists) {
          return res.status(404).send('Blog Not Found')
        }

        const blog = docSnap.data()
        if (!blog.published) {
          return res.status(404).send('Blog Not Found')
        }

        const title = `${blog.title || 'บทความ'} | SPS Property Solution`
        const rawDesc = (blog.content || '').substring(0, 160)
        const description = rawDesc ? `${rawDesc}...` : 'บทความจาก SPS Property Solution บ้านคอนโดอมตะซิตี้ ชลบุรี'
        const imageUrl = (blog.images && blog.images.length > 0 && blog.images[0])
          ? blog.images[0]
          : 'https://spspropertysolution.com/icon.png'
        const url = `https://spspropertysolution.com/blogs/${blogId}`

        const safeTitle = escapeHtml(title)
        const safeDesc = escapeHtml(description)
        const safeImage = escapeHtml(imageUrl)
        const safeUrl = escapeHtml(url)

        // Full SSR HTML with Tailwind CSS styling for blogs
        const publishedDate = blog.publishedAt 
          ? new Date(blog.publishedAt.toDate()).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
          : ''
        const authorName = blog.authorName || 'SPS Property'
        const categoryLabel = blog.category || 'บทความ'
        
        // Calculate Cloudinary transformation URL for og:image
        const ogImageUrl = imageUrl.includes('res.cloudinary.com') 
          ? imageUrl.replace('/upload/', '/upload/w=1200,h=630,c_fill,f_auto,q_auto/')
          : imageUrl
        
        const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  
  <!-- Open Graph / Facebook / LINE -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:site_name" content="SPS Property Solution">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${ogImageUrl}">
  
  <!-- Article Meta -->
  <meta property="article:published_time" content="${blog.publishedAt ? blog.publishedAt.toDate().toISOString() : ''}">
  <meta property="article:author" content="${escapeHtml(authorName)}">
  <meta property="article:section" content="${escapeHtml(categoryLabel)}">
  
  <!-- Preconnect for performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://res.cloudinary.com">
  
  <!-- Tailwind CSS CDN for styling -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: { 50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 900: '#134e4a' },
            accent: { 500: '#ea6d2d', 600: '#c0571d' }
          }
        }
      }
    }
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .gradient-primary { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- Header -->
  <header class="gradient-primary text-white shadow-lg">
    <div class="max-w-4xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-2">
            📰 SPS Property Solution
          </h1>
          <p class="text-teal-100 text-sm mt-1">บทความบ้านและคอนโด อมตะซิตี้ ชลบุรี</p>
        </div>
        <a href="https://spspropertysolution.com/" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm font-medium">
          🏠 หน้าแรก
        </a>
      </div>
    </div>
  </header>
  
  <!-- Breadcrumb -->
  <nav class="max-w-4xl mx-auto px-4 py-4">
    <ol class="flex items-center gap-2 text-sm text-gray-500">
      <li><a href="https://spspropertysolution.com/" class="hover:text-teal-600 transition-colors">หน้าแรก</a></li>
      <li><span class="text-gray-300">/</span></li>
      <li><a href="https://spspropertysolution.com/blogs" class="hover:text-teal-600 transition-colors">บทความ</a></li>
      <li><span class="text-gray-300">/</span></li>
      <li class="text-gray-700 truncate">${escapeHtml(blog.title || '')}</li>
    </ol>
  </nav>
  
  <!-- Main Content -->
  <main class="max-w-4xl mx-auto px-4 pb-12">
    <!-- Article Card -->
    <article class="bg-white rounded-2xl shadow-xl overflow-hidden">
      <!-- Cover Image -->
      ${imageUrl !== 'https://spspropertysolution.com/icon.png' ? `
      <img 
        src="${escapeHtml(imageUrl)}" 
        alt="${escapeHtml(blog.title || 'รูปปกบทความ')}" 
        class="w-full h-[300px] md:h-[400px] object-cover"
      >
      ` : ''}
      
      <!-- Article Content -->
      <div class="p-6 md:p-10">
        <!-- Category & Date -->
        <div class="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span class="bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-medium">
            ${escapeHtml(categoryLabel)}
          </span>
          ${publishedDate ? `
          <span class="flex items-center gap-1">
            📅 ${publishedDate}
          </span>
          ` : ''}
          <span class="flex items-center gap-1">
            👤 ${escapeHtml(authorName)}
          </span>
        </div>
        
        <!-- Title -->
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-6 leading-tight">
          ${escapeHtml(blog.title || '')}
        </h1>
        
        ${blog.summary ? `
        <!-- Summary -->
        <div class="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-lg mb-6">
          <p class="text-gray-700 font-medium">${escapeHtml(blog.summary)}</p>
        </div>
        ` : ''}
        
        <!-- Content -->
        <div class="prose prose-lg max-w-none">
          <div class="text-gray-600 whitespace-pre-wrap leading-relaxed">
            ${escapeHtml(blog.content || '')}
          </div>
        </div>
        
        <!-- Share Buttons -->
        <div class="mt-8 pt-6 border-t">
          <p class="text-gray-500 text-sm mb-3">แชร์บทความนี้:</p>
          <div class="flex gap-3">
            <a 
              href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              📘 แชร์ Facebook
            </a>
            <a 
              href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
            >
              💬 แชร์ LINE
            </a>
          </div>
        </div>
      </div>
    </article>
    
    <!-- Back to Articles -->
    <div class="mt-8 text-center">
      <a 
        href="https://spspropertysolution.com/blogs" 
        class="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
      >
        ← กลับไปหน้าบทความทั้งหมด
      </a>
    </div>
  </main>
  
  <!-- Footer -->
  <footer class="bg-gray-900 text-white mt-12">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="text-center">
        <h3 class="text-xl font-bold mb-2">📰 SPS Property Solution</h3>
        <p class="text-gray-400 mb-4">บทความบ้านและคอนโด อมตะซิตี้ ชลบุรี</p>
        <p class="text-gray-500 text-sm">© 2026 SPS Property Solution. สงวนลิขสิทธิ์.</p>
      </div>
    </div>
  </footer>
</body>
</html>`

        res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
        return res.status(200).send(htmlContent)
      } catch (error) {
        functions.logger.error('Error generating blog meta tags:', error)
        return res.status(500).send('Internal Server Error')
      }
    } else {
      // ผู้ใช้ปกติ: ส่ง index.html เพื่อให้ SPA โหลดและ React Router จัดการ /blogs/:id (แก้ refresh 404)
      const origin = req.headers['x-forwarded-host']
        ? `https://${req.headers['x-forwarded-host']}`
        : (req.headers.host && !req.headers.host.includes('cloudfunctions.net'))
          ? `https://${req.headers.host}`
          : 'https://spspropertysolution.com'
      try {
        const response = await fetch(`${origin}/`, { redirect: 'follow' })
        const html = await response.text()
        res.set('Cache-Control', 'public, max-age=0, s-maxage=60')
        res.set('Content-Type', 'text/html; charset=utf-8')
        return res.status(200).send(html)
      } catch (error) {
        functions.logger.error('Error loading page from hosting', error)
        // Fallback: redirect ไป root ให้ SPA โหลด แล้วผู้ใช้สามารถเข้า /blogs ได้จากเมนู
        res.redirect(302, 'https://spspropertysolution.com/')
        return
      }
    }
  })

/**
 * ==================== AI BLOG AUTOMATION ====================
 * ระบบสร้างบทความอัตโนมัติด้วย Google Vertex AI
 * ทำงานทุกวัน เวลา 08:00 น. (เวลาไทย)
 */
const { VertexAI } = require('@google-cloud/vertexai')

// หัวข้อที่ต้องการให้ AI สุ่มเขียน
const BLOG_TOPICS = [
  'ข่าวสารการกู้เงินซื้อบ้านในไทย อัปเดตดอกเบี้ยและนโยบายรัฐ',
  'เทคนิคการเลือกซื้อบ้านและคอนโดสำหรับมือใหม่',
  'สิ่งที่ควรรู้ก่อนกู้ซื้อบ้าน การเตรียมเอกสารและการเดินบัญชี',
  'ไอเดียการแต่งบ้านสไตล์มินิมอลและโมเดิร์นที่ประหยัดงบ',
  'เทรนด์อสังหาริมทรัพย์ไทยในปีนี้ พื้นที่ไหนน่าลงทุน',
  'ความรู้เรื่องกฎหมายบ้านและที่ดินที่เจ้าของบ้านควรรู้'
]

exports.scheduledDailyBlog = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB',
  })
  .pubsub.schedule('0 8 * * *')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    try {
      // 1. Initialize Vertex AI (Using us-central1 for maximum model availability)
      const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || admin.app().options.projectId
      functions.logger.info(`Scheduled Blog: ใช้ Project ID: ${projectId} ใน us-central1`)
      const vertex_ai = new VertexAI({ project: projectId, location: 'us-central1' })
      const model = vertex_ai.getGenerativeModel({ model: 'gemini-1.5-flash-002' })

      const topic = BLOG_TOPICS[Math.floor(Math.random() * BLOG_TOPICS.length)]
      const prompt = `คุณเป็นนักเขียนบล็อกอสังหาริมทรัพย์มืออาชีพในประเทศไทย เขียนบทความคุณภาพสูงเกี่ยวกับ: ${topic} 
        ต้องส่งกลับมาเป็นรูปแบบ JSON เท่านั้น: { "title": "...", "content": "...", "summary": "..." } 
        ห้ามมีข้อความอื่นปนเด็ดขาด`

      const resp = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })

      const resultText = resp.response.candidates[0].content.parts[0].text
      const jsonMatch = resultText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error(`AI ไม่ได้ส่งรูปแบบ JSON กลับมา: ${resultText}`)
      }
      const blogData = JSON.parse(jsonMatch[0])

      const db = admin.firestore()
      const newBlog = {
        ...blogData,
        published: true,
        isFeatured: false,
        images: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        author: 'AI Assistant (Vertex)',
        topic: topic
      }

      const docRef = await db.collection('blogs').add(newBlog)
      functions.logger.info(`สร้างบทความ AI สำเร็จ: ${docRef.id}`)
      return null
    } catch (error) {
      functions.logger.error('การสร้างบทความ AI ล้มเหลว (Vertex)', error)
      return null
    }
  })

/**
 * ฟังก์ชันสำหรับทดสอบสร้าง Blog ทันที (รันผ่าน HTTP) - Vertex AI version
 */

/**
 * checkPropertyLimit — Callable Function (server-side enforcement)
 * ตรวจสอบว่า user มีประกาศเกิน maxPropertiesPerUser หรือไม่
 * เรียกจาก client: httpsCallable(functions, 'checkPropertyLimit')()
 * Response: { allowed: boolean, count: number, limit: number }
 */
exports.checkPropertyLimit = functions
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onCall(async (data, context) => {
    // ต้อง login ก่อนเรียก function นี้
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ต้องเข้าสู่ระบบก่อนตรวจสอบขีดจำกัดประกาศ'
      )
    }

    const uid = context.auth.uid
    const db = admin.firestore()

    // ดึง system_settings เพื่อรู้ค่า maxPropertiesPerUser
    const settingsSnap = await db.collection('system_settings').doc('general').get()
    const limit = settingsSnap.exists
      ? Number(settingsSnap.data().maxPropertiesPerUser) || 10
      : 10

    // นับเฉพาะ properties ของ user นี้ (ใช้ count query ประหยัด reads มากกว่า fetch ทั้ง collection)
    const countSnap = await db
      .collection('properties')
      .where('createdBy', '==', uid)
      .count()
      .get()

    const count = countSnap.data().count

    functions.logger.info(`checkPropertyLimit: uid=${uid} count=${count} limit=${limit}`)

    return { allowed: count < limit, count, limit }
  })

/**
 * React Router v7 Framework Mode SSR Handler
 * Maps Firebase Hosting requests to React Router server-side render function
 */
exports.ssrHandler = functions.https.onRequest(async (req, res) => {
  try {
    // Dynamic import is required because Firebase Functions runs in CommonJS (Node 22)
    // but React Router's build output is an ES Module
    const { createRequestHandler } = await import('@react-router/express');
    
    // Server build will be copied inside functions folder during build process
    const build = await import('./server/index.js');
    
    // We attach build to the Express req object if needed, or pass it directly
    const handler = createRequestHandler({
      build,
      mode: process.env.NODE_ENV || 'production'
    });

    return handler(req, res);
  } catch (error) {
    console.error('SSR Handler Error:', error);
    res.status(500).send('Internal Server Error while rendering the page.');
  }
});
