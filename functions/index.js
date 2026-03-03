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

    // Only process /properties/:id paths
    const pathSegments = req.path.split('/').filter(Boolean)
    if (pathSegments[0] !== 'properties' || !pathSegments[1]) {
      // Not a property detail page, handle as normal or return 404
      return res.status(404).send('Not Found')
    }

    const propertyId = pathSegments[1]

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

        // Return a basic HTML structure with only the meta tags bots care about
        const htmlContent = `
          <!DOCTYPE html>
          <html lang="th">
          <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <meta name="description" content="${description}">
            
            <!-- Open Graph / Facebook / LINE -->
            <meta property="og:type" content="article">
            <meta property="og:title" content="${title}">
            <meta property="og:description" content="${description}">
            <meta property="og:image" content="${imageUrl}">
            <meta property="og:url" content="${url}">
            
            <!-- Twitter -->
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${title}">
            <meta name="twitter:description" content="${description}">
            <meta name="twitter:image" content="${imageUrl}">
          </head>
          <body>
            <h1>${title}</h1>
            <p>${description}</p>
            <img src="${imageUrl}" alt="${title}">
          </body>
          </html>
        `

        res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
        return res.status(200).send(htmlContent)

      } catch (error) {
        functions.logger.error('Error generating dynamic meta tags:', error)
        return res.status(500).send('Internal Server Error')
      }
    } else {
      // Not a bot. Serve the standard SPA React index file.
      // Fetch index.html from the current hosting origin (root path),
      // which is rewritten to /index.html by Firebase Hosting (no infinite loop).
      try {
        const origin = req.headers.host ? `https://${req.headers.host}` : 'https://spspropertysolution.com'
        const response = await fetch(`${origin}/`)
        const html = await response.text()
        res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
        return res.status(200).send(html)
      } catch (error) {
        functions.logger.error('Error loading page from hosting', error)
        return res.status(500).send('Error loading page')
      }
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

        const htmlContent = `
          <!DOCTYPE html>
          <html lang="th">
          <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <meta name="description" content="${description}">

            <!-- Open Graph / Facebook / LINE -->
            <meta property="og:type" content="article">
            <meta property="og:title" content="${title}">
            <meta property="og:description" content="${description}">
            <meta property="og:image" content="${imageUrl}">
            <meta property="og:url" content="${url}">

            <!-- Twitter -->
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${title}">
            <meta name="twitter:description" content="${description}">
            <meta name="twitter:image" content="${imageUrl}">

            <!-- Optional: redirect real users to SPA share page -->
            <meta http-equiv="refresh" content="0; url=${url}">
          </head>
          <body>
            <h1>${title}</h1>
            <p>${description}</p>
            <img src="${imageUrl}" alt="${title}">
          </body>
          </html>
        `

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

