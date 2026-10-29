const crypto = require('node:crypto')
const axios = require('axios')
const admin = require('firebase-admin')
const functions = require('firebase-functions')

const CONVERSATIONS = 'messenger_conversations'
const PAGES = 'messenger_pages'
// Page access tokens live in their own collection that clients can never read.
const PAGE_TOKENS = 'messenger_page_tokens'
const FACEBOOK_SECRETS = [
  'FACEBOOK_APP_SECRET',
  'FACEBOOK_PAGE_ACCESS_TOKEN',
  'FACEBOOK_WEBHOOK_VERIFY_TOKEN',
]
const DEFAULT_FACEBOOK_APP_ID = '1510008041042328'
const REQUIRED_SCOPES = ['pages_messaging', 'pages_manage_metadata', 'pages_read_engagement']
const PROFILE_REFRESH_MS = 24 * 60 * 60 * 1000
const PAGE_INFO_CACHE_MS = 10 * 60 * 1000
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024
const MAX_OUTGOING_IMAGE_BYTES = 8 * 1024 * 1024
const OUTGOING_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

function conversationId(pageId, participantId) {
  return crypto.createHash('sha256')
    .update(`facebook:${pageId}:${participantId}`)
    .digest('hex')
}

function messageId(externalId) {
  return crypto.createHash('sha256')
    .update(`facebook-message:${externalId}`)
    .digest('hex')
}

function verifyFacebookSignature(rawBody, signature, appSecret) {
  if (!signature || !signature.startsWith('sha256=') || !appSecret) return false
  const expected = `sha256=${crypto.createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex')}`
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(signature)
  return expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
}

function fallbackDisplayName(participantId) {
  return `ผู้ใช้ Facebook · ${participantId.slice(-6)}`
}

function messagePreview(text, attachments) {
  if (text.trim()) return text.trim()
  if (attachments.some(item => item.type === 'image')) return '[รูปภาพ]'
  if (attachments.some(item => item.type === 'video')) return '[วิดีโอ]'
  if (attachments.some(item => item.type === 'audio')) return '[ข้อความเสียง]'
  if (attachments.length) return '[ไฟล์แนบ]'
  return '[ข้อความ]'
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
// Thai mobiles (0[689]x-xxx-xxxx, +66) and landlines (0[2-7]x-xxx-xxx).
const PHONE_PATTERN = /(?:\+66[\s-]?|0)[689](?:[\s-]?\d){8}|0[2-7](?:[\s-]?\d){7}/g

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  return digits.startsWith('66') ? `0${digits.slice(2)}` : digits
}

function extractContacts(text) {
  if (!text) return { emails: [], phones: [] }
  const emails = [...new Set((text.match(EMAIL_PATTERN) || []).map(item => item.toLowerCase()))]
  const phones = [...new Set((text.match(PHONE_PATTERN) || []).map(normalizePhone))]
  return { emails, phones }
}

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function graphUrl(path) {
  const version = process.env.FACEBOOK_GRAPH_API_VERSION || 'v24.0'
  return `https://graph.facebook.com/${version}/${path}`
}

function describeGraphError(error) {
  const fbError = error.response?.data?.error
  if (!fbError) return null
  // 10 / 2018278: outside the 24-hour standard messaging window.
  if (fbError.code === 10 || fbError.error_subcode === 2018278) {
    return 'ส่งไม่ได้ เพราะลูกค้าทักมาล่าสุดเกิน 24 ชั่วโมง (ข้อจำกัดของ Facebook) ต้องรอให้ลูกค้าทักมาก่อน'
  }
  if (fbError.code === 190) return 'โทเค็นของเพจหมดอายุหรือถูกยกเลิก กรุณาเพิ่มเพจใหม่ในเมนู "จัดการเพจ"'
  return `Facebook แจ้งว่า: ${fbError.message}`
}

// ─── Storage ─────────────────────────────────────────────────────────────────

async function saveBufferToStorage(path, buffer, contentType) {
  const bucket = admin.storage().bucket()
  const downloadToken = crypto.randomUUID()
  await bucket.file(path).save(buffer, {
    resumable: false,
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`
}

// Facebook CDN URLs expire, so keep our own copy of media and avatars.
async function copyRemoteToStorage(url, path) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    maxContentLength: MAX_DOWNLOAD_BYTES,
  })
  const contentType = String(response.headers['content-type'] || 'application/octet-stream').split(';')[0]
  return saveBufferToStorage(path, Buffer.from(response.data), contentType)
}

// ─── Pages ───────────────────────────────────────────────────────────────────

async function getPageTokenInfo(pageId) {
  const snapshot = await admin.firestore().collection(PAGE_TOKENS).doc(pageId).get()
  const stored = snapshot.data()?.accessToken
  const token = stored || process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!token) throw httpError(503, 'ยังไม่มีโทเค็นของเพจนี้ กรุณาเพิ่มเพจในเมนู "จัดการเพจ"')
  return { token, source: stored ? 'page-manager' : 'secret' }
}

async function getPageToken(pageId) {
  return (await getPageTokenInfo(pageId)).token
}

// Turn an opaque Graph error into an actionable Thai explanation.
async function diagnoseProfileError(pageId, tokenInfo, rawReason) {
  let inspected
  try {
    inspected = await inspectToken(tokenInfo.token)
  } catch (error) {
    return `ตรวจสอบโทเค็นไม่สำเร็จ: ${describeGraphError(error) || error.message} (รายละเอียดจาก Facebook: ${rawReason})`
  }
  if (!inspected.valid) {
    return `โทเค็นของเพจใช้งานไม่ได้ (${inspected.error || 'หมดอายุ'}) ให้สร้างโทเค็นใหม่แล้วเพิ่มในเมนู "จัดการเพจ"`
  }
  if (inspected.pageId && inspected.pageId !== pageId) {
    return `โทเค็นที่ใช้อยู่เป็นของเพจ ${inspected.pageId} ไม่ใช่เพจของแชทนี้ (${pageId}) ` +
      'ให้สร้างโทเค็นของเพจที่ถูกต้อง แล้วเพิ่มในเมนู "จัดการเพจ"'
  }
  return 'โทเค็นตรงกับเพจแล้ว แต่ Facebook ไม่ให้ดึงโปรไฟล์ ให้ตรวจว่าเพิ่ม "Business Asset User Profile Access" แล้ว ' +
    `และสร้างโทเค็นใหม่หลังเพิ่ม (สิทธิ์ในโทเค็นตอนนี้: ${inspected.scopes.join(', ') || 'ไม่มี'}; รายละเอียดจาก Facebook: ${rawReason})`
}

// Uses the app token, so it works even when the page token lacks page-read permissions.
async function inspectToken(token) {
  const appId = process.env.FACEBOOK_APP_ID || DEFAULT_FACEBOOK_APP_ID
  const response = await axios.get(graphUrl('debug_token'), {
    params: {
      input_token: token,
      access_token: `${appId}|${process.env.FACEBOOK_APP_SECRET}`,
    },
    timeout: 15000,
  })
  const data = response.data?.data || {}
  return {
    valid: data.is_valid === true,
    type: data.type,
    pageId: data.profile_id || null,
    scopes: data.scopes || [],
    error: data.error?.message || null,
  }
}

async function fetchPageProfile(token) {
  try {
    const response = await axios.get(graphUrl('me'), {
      params: { fields: 'id,name,picture.type(large){url}', access_token: token },
      timeout: 15000,
    })
    return response.data
  } catch (error) {
    // Name/picture need pages_read_engagement; the page ID alone does not.
    if (error.response?.data?.error?.code !== 100) throw error
    const response = await axios.get(graphUrl('me'), {
      params: { fields: 'id', access_token: token },
      timeout: 15000,
    })
    return { id: response.data.id, name: response.data.id, nameUnavailable: true }
  }
}

async function savePageInfo(page) {
  let pictureUrl = page.picture?.data?.url || null
  if (pictureUrl) {
    pictureUrl = await copyRemoteToStorage(pictureUrl, `messenger/pages/${page.id}.jpg`)
      .catch(() => pictureUrl)
  }
  const info = {
    pageId: page.id,
    ...(page.nameUnavailable ? {} : { name: page.name || page.id }),
    pictureUrl,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }
  if (page.nameUnavailable) {
    const existing = await admin.firestore().collection(PAGES).doc(page.id).get()
    info.name = existing.data()?.name || page.id
    if (!pictureUrl) delete info.pictureUrl
  }
  await admin.firestore().collection(PAGES).doc(page.id).set(info, { merge: true })
  return info
}

const pageInfoCache = new Map()

async function ensurePageInfo(pageId) {
  const cached = pageInfoCache.get(pageId)
  if (cached && cached.expiresAt > Date.now()) return cached.info

  const snapshot = await admin.firestore().collection(PAGES).doc(pageId).get()
  let info = snapshot.data()
  if (!info?.name || info.name === pageId) {
    try {
      const token = await getPageToken(pageId)
      const page = await fetchPageProfile(token)
      // The fallback token may belong to another page; only trust a match.
      info = page.id === pageId
        ? await savePageInfo(page)
        : { pageId, name: pageId, pictureUrl: null }
    } catch (error) {
      functions.logger.warn('Unable to load Facebook page info', { pageId, message: error.message })
      info = { pageId, name: pageId, pictureUrl: null }
    }
  }
  pageInfoCache.set(pageId, { info, expiresAt: Date.now() + PAGE_INFO_CACHE_MS })
  return info
}

// ─── Customer profile ────────────────────────────────────────────────────────

async function refreshCustomerProfile(id, { force = false } = {}) {
  const conversationRef = admin.firestore().collection(CONVERSATIONS).doc(id)
  const snapshot = await conversationRef.get()
  const data = snapshot.data()
  if (!data) return null

  const fetchedAt = data.profileFetchedAt?.toMillis?.() || 0
  if (!force && Date.now() - fetchedAt < PROFILE_REFRESH_MS) return data

  let tokenInfo = null
  try {
    tokenInfo = await getPageTokenInfo(data.pageId)
    const token = tokenInfo.token
    const response = await axios.get(graphUrl(data.participantId), {
      params: { fields: 'first_name,last_name,profile_pic', access_token: token },
      timeout: 15000,
    })
    const { first_name: firstName = '', last_name: lastName = '', profile_pic: profilePic } = response.data
    const fullName = `${firstName} ${lastName}`.trim()
    const profilePicUrl = profilePic
      ? await copyRemoteToStorage(profilePic, `messenger/avatars/${id}.jpg`).catch(() => profilePic)
      : data.profilePicUrl || null

    const update = {
      firstName,
      lastName,
      displayName: fullName || data.displayName || fallbackDisplayName(data.participantId),
      profilePicUrl,
      profileFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      profileError: admin.firestore.FieldValue.delete(),
    }
    await conversationRef.set(update, { merge: true })
    return { ...data, ...update }
  } catch (error) {
    // Profile access needs "Business Asset User Profile Access"; keep messaging working without it.
    const rawReason = error.response?.data?.error?.message || error.message
    const reason = tokenInfo && error.response
      ? await diagnoseProfileError(data.pageId, tokenInfo, rawReason)
      : rawReason
    functions.logger.warn('Unable to load Messenger user profile', { conversationId: id, reason })
    await conversationRef.set({
      profileFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      profileError: reason,
    }, { merge: true })
    if (force) throw httpError(502, reason)
    return data
  }
}

// ─── Persistence ─────────────────────────────────────────────────────────────

async function storeMessengerMessage({
  pageId,
  pageName,
  participantId,
  externalId,
  direction,
  text,
  attachments,
  timestamp,
  sentBy,
}) {
  const db = admin.firestore()
  const id = conversationId(pageId, participantId)
  const conversationRef = db.collection(CONVERSATIONS).doc(id)
  const messageRef = conversationRef.collection('messages').doc(messageId(externalId))
  const messageTimestamp = admin.firestore.Timestamp.fromMillis(timestamp)
  const preview = messagePreview(text, attachments)
  const contacts = direction === 'incoming' ? extractContacts(text) : { emails: [], phones: [] }

  await db.runTransaction(async transaction => {
    const existingMessage = await transaction.get(messageRef)
    if (existingMessage.exists) return

    const existingConversation = await transaction.get(conversationRef)
    const current = existingConversation.data() || {}
    const previousMessageAt = current.lastMessageAt?.toMillis?.() || 0
    const isLatest = timestamp >= previousMessageAt

    transaction.set(messageRef, {
      channel: 'facebook',
      externalId,
      direction,
      text,
      attachments,
      timestamp: messageTimestamp,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: direction === 'incoming' ? 'received' : 'sent',
      ...(sentBy ? { sentBy } : {}),
    })

    const conversationData = {
      channel: 'facebook',
      pageId,
      participantId,
      displayName: current.displayName || fallbackDisplayName(participantId),
      unreadCount: direction === 'incoming'
        ? (current.unreadCount || 0) + 1
        : (current.unreadCount || 0),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(pageName ? { pageName } : {}),
      ...(direction === 'incoming'
        ? { lastInboundAt: messageTimestamp }
        : { lastOutboundAt: messageTimestamp }),
    }
    if (contacts.emails.length) {
      conversationData.detectedEmails = admin.firestore.FieldValue.arrayUnion(...contacts.emails)
    }
    if (contacts.phones.length) {
      conversationData.detectedPhones = admin.firestore.FieldValue.arrayUnion(...contacts.phones)
    }
    if (!existingConversation.exists) {
      conversationData.createdAt = admin.firestore.FieldValue.serverTimestamp()
    }
    if (isLatest) {
      conversationData.lastMessageText = preview
      conversationData.lastMessageAt = messageTimestamp
      conversationData.lastDirection = direction
    }

    transaction.set(conversationRef, conversationData, { merge: true })
  })

  return { conversationId: id, messageId: messageRef.id }
}

async function persistIncomingAttachments(id, externalId, attachments) {
  return Promise.all(attachments.map(async (attachment, index) => {
    if (!attachment.url) return attachment
    try {
      const storedUrl = await copyRemoteToStorage(
        attachment.url,
        `messenger/${id}/${messageId(externalId)}-${index}`,
      )
      return { ...attachment, url: storedUrl }
    } catch (error) {
      functions.logger.warn('Unable to copy Messenger attachment', { conversationId: id, message: error.message })
      return attachment
    }
  }))
}

// ─── Send API ────────────────────────────────────────────────────────────────

async function sendFacebookMessage(pageId, recipientId, message) {
  const accessToken = await getPageToken(pageId)
  const response = await axios.post(graphUrl(`${pageId}/messages`), {
    messaging_type: 'RESPONSE',
    recipient: { id: recipientId },
    message,
  }, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  })

  if (!response.data?.message_id) throw new Error('Facebook ไม่ยอมรับข้อความที่ส่ง')
  return response.data
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

function summarizeWebhook(body) {
  return {
    object: body.object,
    entries: (body.entry || []).map(entry => ({
      pageId: entry.id,
      messaging: (entry.messaging || []).map(event => Object.keys(event).join(',')),
      standby: (entry.standby || []).length,
      changes: (entry.changes || []).map(change => change.field),
    })),
  }
}

async function handleMessagingEvent(pageId, pageName, event) {
  const message = event.message
  const senderId = event.sender?.id
  const recipientId = event.recipient?.id
  if (!message?.mid || !senderId || !recipientId) return

  const isEcho = message.is_echo === true
  const participantId = isEcho ? recipientId : senderId
  const id = conversationId(pageId, participantId)

  // Replies sent from this admin panel come back as echoes and are already stored.
  const existing = await admin.firestore()
    .collection(CONVERSATIONS).doc(id)
    .collection('messages').doc(messageId(message.mid))
    .get()
  if (existing.exists) return

  const rawAttachments = (message.attachments || []).map(item => ({
    type: item.type || 'file',
    ...(item.payload?.url ? { url: item.payload.url } : {}),
    ...(item.payload?.sticker_id ? { stickerId: item.payload.sticker_id } : {}),
  }))
  const attachments = await persistIncomingAttachments(id, message.mid, rawAttachments)

  await storeMessengerMessage({
    pageId,
    pageName,
    participantId,
    externalId: message.mid,
    direction: isEcho ? 'outgoing' : 'incoming',
    text: message.text || '',
    attachments,
    timestamp: Number(event.timestamp) || Date.now(),
  })

  if (!isEcho) await refreshCustomerProfile(id)
}

const facebookWebhook = functions
  .runWith({ timeoutSeconds: 60, memory: '512MB', secrets: FACEBOOK_SECRETS })
  .https.onRequest(async (req, res) => {
    if (req.method === 'GET') {
      const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN
      if (!verifyToken) return res.status(503).json({ error: 'Verify token is not configured' })

      const valid = req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === verifyToken &&
        req.query['hub.challenge']
      return valid
        ? res.status(200).send(req.query['hub.challenge'])
        : res.status(403).json({ error: 'Webhook verification failed' })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const appSecret = process.env.FACEBOOK_APP_SECRET
    if (!appSecret) return res.status(503).json({ error: 'App secret is not configured' })

    const rawBody = req.rawBody
      ? req.rawBody.toString('utf8')
      : JSON.stringify(req.body || {})
    const signature = req.get('x-hub-signature-256')
    if (!verifyFacebookSignature(rawBody, signature, appSecret)) {
      functions.logger.warn('Facebook webhook rejected: invalid signature')
      return res.status(401).json({ error: 'Invalid signature' })
    }

    const body = req.body || {}
    functions.logger.info('Facebook webhook received', summarizeWebhook(body))
    if (body.object !== 'page') return res.status(200).json({ received: true })

    try {
      for (const entry of body.entry || []) {
        const pageId = entry.id
        if (!pageId || !(entry.messaging || []).length) continue
        const page = await ensurePageInfo(pageId)

        for (const event of entry.messaging) {
          await handleMessagingEvent(pageId, page.name, event)
        }
      }
      return res.status(200).json({ received: true })
    } catch (error) {
      functions.logger.error('Facebook webhook processing failed', error)
      return res.status(500).json({ error: 'Unable to process webhook' })
    }
  })

// ─── Admin API ───────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  'https://sps-property.web.app',
  'https://sps-property.firebaseapp.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

function setAdminCors(req, res) {
  const origin = req.get('origin')
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
  }
  res.set('Vary', 'Origin')
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
}

async function requireAdmin(req) {
  const authorization = req.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) throw httpError(401, 'กรุณาเข้าสู่ระบบผู้ดูแล')

  let decoded
  try {
    decoded = await admin.auth().verifyIdToken(token)
  } catch {
    throw httpError(401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')
  }

  const userSnapshot = await admin.firestore().collection('users').doc(decoded.uid).get()
  const role = userSnapshot.data()?.role
  if (role !== 'admin' && role !== 'super_admin') {
    throw httpError(403, 'บัญชีนี้ไม่มีสิทธิ์จัดการข้อความ')
  }
  return decoded
}

async function loadConversation(id) {
  if (!id || typeof id !== 'string') throw httpError(400, 'ไม่พบรหัสห้องสนทนา')
  const conversationRef = admin.firestore().collection(CONVERSATIONS).doc(id)
  const snapshot = await conversationRef.get()
  if (!snapshot.exists) throw httpError(404, 'ไม่พบห้องสนทนา')
  return { conversationRef, data: snapshot.data() }
}

function cleanField(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

const adminActions = {
  async read({ conversationId: id }) {
    const { conversationRef } = await loadConversation(id)
    await conversationRef.set({ unreadCount: 0 }, { merge: true })
    return { success: true }
  },

  async reply({ conversationId: id, text: rawText }, adminUser) {
    const { data } = await loadConversation(id)
    const text = cleanField(rawText, 2001)
    if (!text) throw httpError(400, 'กรุณาพิมพ์ข้อความ')
    if (text.length > 2000) throw httpError(400, 'ข้อความต้องไม่เกิน 2,000 ตัวอักษร')

    const result = await sendFacebookMessage(data.pageId, data.participantId, { text })
    await storeMessengerMessage({
      pageId: data.pageId,
      participantId: data.participantId,
      externalId: result.message_id,
      direction: 'outgoing',
      text,
      attachments: [],
      timestamp: Date.now(),
      sentBy: adminUser.uid,
    })
    return { success: true }
  },

  async replyImage({ conversationId: id, imageBase64, mimeType }, adminUser) {
    const { data } = await loadConversation(id)
    const extension = OUTGOING_IMAGE_TYPES[mimeType]
    if (!extension) throw httpError(400, 'รองรับเฉพาะไฟล์ JPG, PNG หรือ GIF')
    if (typeof imageBase64 !== 'string' || !imageBase64) throw httpError(400, 'ไม่พบไฟล์รูปภาพ')

    const buffer = Buffer.from(imageBase64, 'base64')
    if (!buffer.length) throw httpError(400, 'ไฟล์รูปภาพไม่ถูกต้อง')
    if (buffer.length > MAX_OUTGOING_IMAGE_BYTES) throw httpError(400, 'รูปภาพต้องมีขนาดไม่เกิน 8 MB')

    const url = await saveBufferToStorage(
      `messenger/${id}/out-${crypto.randomUUID()}.${extension}`,
      buffer,
      mimeType,
    )
    const result = await sendFacebookMessage(data.pageId, data.participantId, {
      attachment: { type: 'image', payload: { url, is_reusable: false } },
    })
    await storeMessengerMessage({
      pageId: data.pageId,
      participantId: data.participantId,
      externalId: result.message_id,
      direction: 'outgoing',
      text: '',
      attachments: [{ type: 'image', url }],
      timestamp: Date.now(),
      sentBy: adminUser.uid,
    })
    return { success: true }
  },

  async updateContact({ conversationId: id, contact = {} }, adminUser) {
    const { conversationRef } = await loadConversation(id)
    const email = cleanField(contact.email, 200)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'รูปแบบอีเมลไม่ถูกต้อง')

    await conversationRef.set({
      contact: {
        name: cleanField(contact.name, 120),
        phone: cleanField(contact.phone, 40),
        email,
        lineId: cleanField(contact.lineId, 80),
        interest: cleanField(contact.interest, 300),
        note: cleanField(contact.note, 2000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: adminUser.uid,
      },
    }, { merge: true })
    return { success: true }
  },

  async refreshProfile({ conversationId: id }) {
    await loadConversation(id)
    await refreshCustomerProfile(id, { force: true })
    return { success: true }
  },

  async addPage({ pageAccessToken }) {
    const token = cleanField(pageAccessToken, 1000)
    if (!token) throw httpError(400, 'กรุณาวางโทเค็นของเพจ')

    let tokenInfo
    try {
      tokenInfo = await inspectToken(token)
    } catch (error) {
      throw httpError(400, `ตรวจสอบโทเค็นไม่สำเร็จ: ${describeGraphError(error) || error.message}`)
    }
    if (!tokenInfo.valid) throw httpError(400, `โทเค็นใช้งานไม่ได้: ${tokenInfo.error || 'หมดอายุหรือถูกยกเลิก'}`)
    if (tokenInfo.type !== 'PAGE' || !tokenInfo.pageId) {
      throw httpError(400, 'โทเค็นนี้ไม่ใช่โทเค็นของเพจ ให้กด "สร้างโทเค็น" ข้างชื่อเพจในหน้า การตั้งค่า Messenger API')
    }
    const pageId = tokenInfo.pageId
    const missingScopes = REQUIRED_SCOPES.filter(scope => !tokenInfo.scopes.includes(scope))
    const warnings = []

    try {
      await axios.post(graphUrl(`${pageId}/subscribed_apps`), null, {
        params: { subscribed_fields: 'messages,message_echoes', access_token: token },
        timeout: 15000,
      })
    } catch (error) {
      // Subscribing from the dashboard works too, so don't block on this.
      warnings.push(`เชื่อม Webhook อัตโนมัติไม่สำเร็จ (${describeGraphError(error) || error.message}) ให้กด "เพิ่มการสมัครรับข้อมูล" ในหน้า การตั้งค่า Messenger API เอง`)
    }

    await admin.firestore().collection(PAGE_TOKENS).doc(pageId).set({
      accessToken: token,
      scopes: tokenInfo.scopes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    let page = { id: pageId, name: pageId, nameUnavailable: true }
    try {
      page = await fetchPageProfile(token)
    } catch (error) {
      functions.logger.warn('Unable to read page name', { pageId, message: error.message })
    }
    const info = await savePageInfo({ ...page, id: pageId })
    pageInfoCache.delete(pageId)

    if (missingScopes.length) {
      warnings.push(`โทเค็นยังขาดสิทธิ์: ${missingScopes.join(', ')} ให้เพิ่มในเมนู สิทธิ์การอนุญาตและฟีเจอร์ แล้วสร้างโทเค็นใหม่`)
    }
    return { success: true, page: { pageId, name: info.name }, warnings }
  },

  async removePage({ pageId }) {
    const id = cleanField(pageId, 64)
    if (!id) throw httpError(400, 'ไม่พบรหัสเพจ')
    const tokenSnapshot = await admin.firestore().collection(PAGE_TOKENS).doc(id).get()
    const token = tokenSnapshot.data()?.accessToken
    if (token) {
      await axios.delete(graphUrl(`${id}/subscribed_apps`), {
        params: { access_token: token },
        timeout: 15000,
      }).catch(error => functions.logger.warn('Unable to unsubscribe page', { pageId: id, message: error.message }))
    }
    await Promise.all([
      admin.firestore().collection(PAGE_TOKENS).doc(id).delete(),
      admin.firestore().collection(PAGES).doc(id).delete(),
    ])
    pageInfoCache.delete(id)
    return { success: true }
  },
}

const facebookMessengerAdmin = functions
  .runWith({ timeoutSeconds: 60, memory: '512MB', secrets: FACEBOOK_SECRETS })
  .https.onRequest(async (req, res) => {
    setAdminCors(req, res)
    if (req.method === 'OPTIONS') return res.status(204).send('')
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    try {
      const adminUser = await requireAdmin(req)
      const body = req.body || {}
      const handler = Object.hasOwn(adminActions, body.action) ? adminActions[body.action] : null
      if (!handler) return res.status(400).json({ error: 'คำสั่งไม่ถูกต้อง' })

      const result = await handler(body, adminUser)
      return res.status(200).json(result)
    } catch (error) {
      const graphMessage = describeGraphError(error)
      const status = error.status || (error.response ? 502 : 500)
      const message = graphMessage ||
        (error.status ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      functions.logger.error('Facebook Messenger admin request failed', {
        action: req.body?.action,
        status,
        message: error.message,
        facebook: error.response?.data?.error,
      })
      return res.status(status).json({ error: message })
    }
  })

module.exports = {
  facebookWebhook,
  facebookMessengerAdmin,
  _private: {
    conversationId,
    messageId,
    verifyFacebookSignature,
    messagePreview,
    extractContacts,
    describeGraphError,
  },
}
