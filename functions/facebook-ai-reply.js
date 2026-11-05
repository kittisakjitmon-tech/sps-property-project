const functions = require('firebase-functions')
const admin = require('firebase-admin')
const axios = require('axios')
const calendarRules = require('./facebook-ai-calendar.cjs')
const { createGoogleCalendarClient } = require('./google-calendar')
const { VertexAI } = require('@google-cloud/vertexai')
const {
  MAX_CARDS,
  DEFAULT_CARDS,
  asksForOtherHouses,
  extractPropertyMentions,
  buildAttachedElements,
  TOOL_DECLARATIONS,
  vertexClientOptions,
  toIndexedProperty,
  searchProperties,
  buildCardElements,
  buildCarouselMessage,
  sanitizeCustomerInfo,
  validateAppointment,
  sanitizeCreditProfile,
  estimateLoan,
  findFocusProperties,
  findPropertyByRef,
  presentProperty,
  findPriceLeaks,
  sanitizeUrls,
  replyCharLimit,
  isTooLong,
  hardTrim,
  buildShortenRequest,
  cleanReplyText,
  publicListingText,
  completeStaffListing,
  shouldReply,
  replyDelayMs,
  hasNewerCustomerMessage,
  unansweredCustomerMessages,
  historyToContents,
  imageSettings,
  pickImageAttachments,
  withImages,
  IMAGE_MIME_TYPES,
  buildSystemPrompt,
  runConversation,
} = require('./facebook-ai-core.cjs')
const { createOpenRouterGenerate } = require('./facebook-ai-openrouter')
const {
  CONVERSATIONS,
  FACEBOOK_SECRETS,
  sendFacebookMessage,
  storeMessengerMessage,
} = require('./facebook-messenger')

// The switch lives in Firestore so it can be flipped without a deploy:
//   messenger_settings/ai = {
//     enabled: true,             // OFF unless exactly true
//     model: '...',              // Gemini model id
//     provider: 'vertex' | 'openrouter',   // who answers (default vertex)
//     location: 'global',        // Vertex AI region (vertex only)
//     openrouterModel: '...',    // pin a free OpenRouter model (optional; otherwise picked automatically)
//     openrouterDataCollection: 'deny', // only use providers that don't keep prompts (may leave no free model)
//     particle: 'ครับ' | 'ค่ะ',   // how the bot ends sentences
//     extraInstructions: '...',  // tone / brand notes added to the prompt
//     maxRepliesPerHour: 8,
//     maxReplyChars: 220,        // longer replies are shortened before sending (80-1000)
//     replyDelaySeconds: 6,      // wait for more messages typed in a row before answering (0-30, 0 = off)
//   }
// Company facts and FAQs live in the messenger_faq collection: { question, answer, active }.
const SETTINGS_DOC = 'messenger_settings/ai'
const FAQ_COLLECTION = 'messenger_faq'
// Change `model` in the settings document if this one is retired.
const DEFAULT_MODEL = 'gemini-2.5-flash'
const DEFAULT_LOCATION = 'us-central1'
const CACHE_TTL_MS = 5 * 60 * 1000
const OUTPUT_TOKENS = 2048
const MAX_FAQ_ENTRIES = 40
const MAX_HOUSE_IMAGES = 4
const CATALOG_FIELDS = [
  'status', 'displayId', 'title', 'type', 'listingType', 'isRental', 'subListingType',
  'bedrooms', 'bathrooms', 'locationDisplay', 'location', 'project', 'price', 'showPrice',
  'description', 'searchKeywords', 'featured', 'hotDeal', 'coverImageUrl', 'propertySubStatus',
  'nearbyPlace',
]

let catalogCache = { at: 0, list: [] }
let faqCache = { at: 0, list: [] }

async function loadCatalog() {
  if (Date.now() - catalogCache.at < CACHE_TTL_MS) return catalogCache.list
  const snapshot = await admin.firestore()
    .collection('properties')
    .where('status', '==', 'available')
    .select(...CATALOG_FIELDS)
    .get()
  const list = snapshot.docs
    .map(doc => toIndexedProperty(doc.id, doc.data()))
    .filter(Boolean)
  catalogCache = { at: Date.now(), list }
  return list
}

async function loadFaq() {
  if (Date.now() - faqCache.at < CACHE_TTL_MS) return faqCache.list
  const snapshot = await admin.firestore().collection(FAQ_COLLECTION).limit(MAX_FAQ_ENTRIES * 2).get()
  const list = snapshot.docs
    .map(doc => doc.data())
    .filter(item => item.active !== false && typeof item.question === 'string' && typeof item.answer === 'string')
    .slice(0, MAX_FAQ_ENTRIES)
    .map(item => ({ question: item.question.trim().slice(0, 150), answer: item.answer.trim().slice(0, 500) }))
  faqCache = { at: Date.now(), list }
  return list
}

// Tests replace this so they do not really wait.
let sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function bangkokToday() {
  const now = new Date()
  return {
    iso: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(now),
    text: new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(now),
  }
}

async function claimMessage(ref) {
  // Firestore triggers are at-least-once; only the first run may answer.
  return admin.firestore().runTransaction(async transaction => {
    const current = await transaction.get(ref)
    if (!current.exists || current.get('aiHandledAt')) return false
    transaction.update(ref, { aiHandledAt: admin.firestore.FieldValue.serverTimestamp() })
    return true
  })
}

async function loadRecentMessages(conversationRef) {
  const snapshot = await conversationRef.collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(20)
    .get()
  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      direction: data.direction,
      text: data.text || '',
      attachmentCount: Array.isArray(data.attachments) ? data.attachments.length : 0,
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      sentBy: data.sentBy || null,
      kind: data.kind || null,
      timestamp: data.timestamp?.toMillis?.() || 0,
    }
  })
}

function createGenerate({ settings, systemInstruction, info }) {
  if (settings.provider === 'openrouter') return createOpenRouterGenerate({ settings, systemInstruction, info })
  const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId
  const vertex = new VertexAI(vertexClientOptions(settings, projectId, DEFAULT_LOCATION))
  const model = vertex.getGenerativeModel({
    model: settings.model || DEFAULT_MODEL,
    systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    // Gemini 2.5 counts its "thinking" against maxOutputTokens, so a small budget can leave
    // nothing for the answer. Reply length is enforced in code (replyCharLimit), not here.
    generationConfig: { temperature: 0.6, maxOutputTokens: OUTPUT_TOKENS },
  })
  return async contents => {
    const result = await model.generateContent({ contents })
    const candidate = result.response?.candidates?.[0]
    const parts = candidate?.content?.parts || []
    if (!parts.some(part => part.text || part.functionCall)) {
      functions.logger.warn('Gemini returned no answer', { finishReason: candidate?.finishReason || null })
    }
    return parts
  }
}

// Asks the model to rewrite a too-long reply; falls back to a plain cut if that fails.
async function shortenReply(settings, text, maxChars) {
  try {
    const request = buildShortenRequest(text, maxChars, settings.particle)
    let parts
    if (settings.provider === 'openrouter') {
      const generate = createOpenRouterGenerate({ settings, systemInstruction: request.systemInstruction, withTools: false })
      parts = await generate(request.contents)
    } else {
      const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId
      const vertex = new VertexAI(vertexClientOptions(settings, projectId, DEFAULT_LOCATION))
      const model = vertex.getGenerativeModel({
        model: settings.model || DEFAULT_MODEL,
        systemInstruction: { role: 'system', parts: [{ text: request.systemInstruction }] },
        generationConfig: { temperature: 0.3, maxOutputTokens: OUTPUT_TOKENS },
      })
      const result = await model.generateContent({ contents: request.contents })
      parts = result.response?.candidates?.[0]?.content?.parts || []
    }
    const shorter = cleanReplyText(parts.map(part => part.text || '').join(''))
    if (shorter && !isTooLong(shorter, maxChars * 1.3)) return shorter
  } catch (error) {
    functions.logger.warn('AI shorten failed', { reason: error.message })
  }
  return hardTrim(text, maxChars)
}

// Used instead of an AI answer when a safety check fails; a human takes over.
function safeFallbackText(particle) {
  const p = particle === 'ค่ะ' ? 'ค่ะ' : 'ครับ'
  return `ขอให้ทีมงานช่วยยืนยันรายละเอียดตรงนี้ให้นะ${p} เดี๋ยวทีมงานติดต่อกลับโดยเร็วที่สุด${p}`
}

// ─── Google Calendar bookings ────────────────────────────────────────────────

// Tests replace this; in production it impersonates the function's own service account.
let calendarClientFactory = (cfg, projectId) => createGoogleCalendarClient({
  serviceAccount: cfg.serviceAccount || `${projectId}@appspot.gserviceaccount.com`,
})

const HOLD_MS = 2 * 60 * 1000

// A short "someone is booking this slot right now" hold, so two customers asking for the
// same time at once cannot both get it. It only covers the moment between checking the
// calendar and the event appearing there; after that the calendar itself is the truth.
async function holdSlot(db, date, startMinute, endMinute, owner) {
  return db.runTransaction(async transaction => {
    const ref = db.collection('appointment_locks').doc(date)
    const snapshot = await transaction.get(ref)
    const now = Date.now()
    const holds = (snapshot.exists ? snapshot.data().holds || [] : []).filter(hold => hold.expiresAt > now)
    if (holds.some(hold => calendarRules.overlaps(hold.start, hold.end, startMinute, endMinute))) return false
    holds.push({ start: startMinute, end: endMinute, owner, expiresAt: now + HOLD_MS })
    transaction.set(ref, { holds })
    return true
  })
}

async function releaseSlot(db, date, owner) {
  try {
    await db.runTransaction(async transaction => {
      const ref = db.collection('appointment_locks').doc(date)
      const snapshot = await transaction.get(ref)
      if (!snapshot.exists) return
      transaction.set(ref, { holds: (snapshot.data().holds || []).filter(hold => hold.owner !== owner) })
    })
  } catch (error) {
    functions.logger.warn('Could not release appointment hold', { date, reason: error.message })
  }
}

const isValidDate = (value, today) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false
  const limit = new Date(new Date(`${today}T00:00:00Z`).getTime() + 90 * 86400000).toISOString().slice(0, 10)
  return value >= today && value <= limit
}

const REASON_TEXT = {
  'bad-time': 'เวลาต้องเป็นช่วงครึ่งชั่วโมง เช่น 10:00 หรือ 10:30',
  closed: 'วันนั้นไม่รับนัด',
  'outside-hours': 'เวลานั้นอยู่นอกเวลารับนัด หรือไม่พอสำหรับการนัดหนึ่งครั้ง',
  'too-soon': 'เวลานั้นใกล้เกินไป ต้องนัดล่วงหน้าอย่างน้อยตามที่กำหนด',
  busy: 'เวลานั้นไม่ว่างแล้ว',
}

// Fetch one picture for the model. Tests replace this so nothing touches the network.
let imageFetcher = async (url, maxBytes) => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 10000,
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
  })
  return {
    mimeType: String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase(),
    buffer: Buffer.from(response.data),
  }
}

// Pictures the model can read. One that cannot be fetched, is too big or is not a
// picture is skipped: the reply must never fail because of an image.
async function loadImageParts(urls, maxBytes, logContext) {
  const parts = []
  for (const url of urls) {
    try {
      const { mimeType, buffer } = await imageFetcher(url, maxBytes)
      if (!IMAGE_MIME_TYPES.includes(mimeType) || !buffer.length || buffer.length > maxBytes) {
        functions.logger.warn('AI image skipped', { ...logContext, mimeType, bytes: buffer.length })
        continue
      }
      parts.push({ mimeType, data: buffer.toString('base64') })
    } catch (error) {
      functions.logger.warn('AI image failed', { ...logContext, reason: error.message })
    }
  }
  return parts
}

// The whole answer to a customer's message. Used for a new message (the Firestore trigger) and
// when the team asks the AI to answer what is still waiting (retry), for example after adding
// the house information the AI was waiting for. A retry skips the "too old", "a person answered
// recently" and hourly-limit rules, because the team asked for it, but never answers a chat
// that is already answered.
async function answerCustomer({ conversationId, message, messageRef, retry = false }) {
  if (message?.direction !== 'incoming') return null

  const db = admin.firestore()
  const FieldValue = admin.firestore.FieldValue
  const conversationRef = db.collection(CONVERSATIONS).doc(conversationId)
  const logContext = { conversationId, ...(retry ? { retry: true } : {}) }
  // Which step we were in, so a failure says where it happened.
  let stage = 'settings'
  let replied = false

  try {
    const settings = (await db.doc(SETTINGS_DOC).get()).data() || {}
    if (settings.enabled !== true) return null

    stage = 'claim'
    if (!retry && !(await claimMessage(messageRef))) return null

    // Give the customer a moment to finish typing (see replyDelayMs).
    const delayMs = retry ? 0 : replyDelayMs(settings)
    if (delayMs > 0) {
      stage = 'wait'
      await sleep(delayMs)
    }

    stage = 'history'
    const conversation = (await conversationRef.get()).data()
    if (!conversation?.pageId || !conversation?.participantId) return null

    const imageCfg = imageSettings(settings)
    const calendarCfg = calendarRules.calendarSettings(settings)
    let calendarClientInstance = null
    const calendarClient = () => {
      calendarClientInstance = calendarClientInstance || calendarClientFactory(calendarCfg, process.env.GCLOUD_PROJECT || admin.app().options.projectId)
      return calendarClientInstance
    }

    // "Start testing again" hides everything before the reset: the AI does not see it.
    const resetAtMs = conversation.contextResetAt?.toMillis?.() || 0
    const recent = (await loadRecentMessages(conversationRef)).filter(item => item.timestamp >= resetAtMs)
    const messageTimestamp = message.timestamp?.toMillis?.() || 0
    if (!retry && hasNewerCustomerMessage(recent, { id: messageRef?.id, timestamp: messageTimestamp })) {
      // The run for the newer message answers all of them together.
      functions.logger.info('AI reply skipped', { ...logContext, reason: 'newer-message' })
      return null
    }
    // Pictures from every message the customer sent since the last reply, not only this one.
    const waiting = unansweredCustomerMessages(recent)
    const burstAttachments = (waiting.length ? waiting : [message]).flatMap(item => item.attachments || [])
    const incomingImages = imageCfg.enabled ? pickImageAttachments(burstAttachments, imageCfg.maxImages) : []
    if (retry) {
      const newest = [...recent].sort((first, second) => second.timestamp - first.timestamp)[0]
      if (!newest || newest.direction !== 'incoming') {
        functions.logger.info('AI retry skipped', { ...logContext, reason: 'already-answered' })
        return null
      }
    }
    const decision = shouldReply({
      settings,
      conversation: { ...conversation, botResumedAtMs: conversation.botResumedAt?.toMillis?.() || 0 },
      // Every message the customer sent since the last reply counts: questions followed by a
      // picture (which the AI may not be able to read) must still be answered.
      text: [...waiting.map(item => item.text || ''), message.text || ''].join('\n'),
      timestamp: message.timestamp?.toMillis?.() || Date.now(),
      recentMessages: recent,
      hasImages: incomingImages.length > 0,
      override: retry,
    })
    if (!decision.reply) {
      functions.logger.info('AI reply skipped', { ...logContext, reason: decision.reason })
      return null
    }

    stage = 'catalog'
    const isFirstReply = !recent.some(m => m.direction === 'outgoing' && m.sentBy === 'ai')
    const [catalog, faq] = await Promise.all([loadCatalog(), loadFaq()])
    const catalogByCode = new Map(catalog.filter(p => p.code).map(p => [p.code, p]))
    const shownCodes = Array.isArray(conversation.shownCodes) ? conversation.shownCodes : []
    const today = bangkokToday()

    // Everything the model may reference in this reply.
    const seen = new Map() // code -> indexed property (from search results)
    // Listings the customer named (link or code) or that we were already discussing.
    const staffNote = typeof conversation.staffNote === 'string' ? conversation.staffNote.trim() : ''
    const staffListings = (Array.isArray(conversation.staffListings) ? conversation.staffListings : [])
      .filter(item => item && typeof item.id === 'string')
      .map(completeStaffListing)
    const hasTeamInfo = Boolean(staffNote || staffListings.length)
    // A property the AI itself remembered from an earlier answer must not push aside the house
    // the team wrote down for this chat; one the team picked in the inbox still counts.
    const currentCode = hasTeamInfo && !conversation.currentPropertySetBy ? null : conversation.currentPropertyCode
    const focus = findFocusProperties({ messages: recent, catalog, currentCode })
    for (const property of focus) seen.set(property.code, property)
    let focusCode = focus[0]?.code || null

    // "Property first" mode: the AI waits until the chat has a property (set by the team,
    // named by the customer with a link or code) or house details written by the team. The inbox shows a badge meanwhile.
    if (settings.requirePropertyForBot === true && !focus.length && !staffNote && !staffListings.length) {
      functions.logger.info('AI reply skipped', { ...logContext, reason: 'no-property' })
      await conversationRef.set({ needsProperty: true }, { merge: true })
      return null
    }
    let lastSearchCodes = []
    const cardCodes = []
    let handoffReason = null
    const servedBy = {}
    let appointmentRequested = false
    const contactUpdates = {}
    let loanRecord = null // set when estimate_loan ran in this reply
    let creditProfileUpdate = {} // what the customer said about their finances this reply
    const staffImages = (Array.isArray(conversation.staffImages) ? conversation.staffImages : [])
      .filter(image => typeof image?.url === 'string')
    let houseImagesToSend = []

    // Which houses are "attached" to this chat: set by the team, typed in by the team, or named by
    // the customer (link or code). A property the AI only remembers from earlier does not count.
    const namedByCustomer = new Set(
      recent.filter(item => item.direction === 'incoming')
        .flatMap(item => extractPropertyMentions(item.text, catalog))
        .map(property => property.code),
    )
    const attachedProperties = focus.filter(property => (
      (conversation.currentPropertySetBy && property.code === conversation.currentPropertyCode) || namedByCustomer.has(property.code)
    ))
    const attachedCodes = attachedProperties.map(property => property.code)
    const hasAttached = attachedProperties.length > 0 || staffListings.length > 0
    // House details the team only wrote as a note hold other houses back too.
    const holdsOthers = hasAttached || Boolean(staffNote)
    // Other houses are held back until the customer asks for them (and stay open after that).
    const latestCustomerText = [...recent].filter(item => item.direction === 'incoming').sort((a, b) => b.timestamp - a.timestamp)[0]?.text || ''
    const unlockedBefore = !holdsOthers || (conversation.othersRequestedAt?.toMillis?.() || 0) > resetAtMs
    let othersUnlocked = unlockedBefore || asksForOtherHouses(latestCustomerText)
    const othersRequestedNow = () => holdsOthers && !unlockedBefore && othersUnlocked
    const cardCap = () => ((holdsOthers && othersUnlocked) || asksForOtherHouses(latestCustomerText) ? MAX_CARDS : DEFAULT_CARDS)
    let attachedToSend = null // { properties, listings } to show as cards after the text
    const blockedOthers = () => ({
      ok: false,
      blocked: true,
      total: 0,
      results: [],
      error: hasAttached
        ? 'ลูกค้ายังไม่ได้ขอดูบ้านหลังอื่น ห้ามเสนอหรือค้นบ้านหลังอื่น ให้แนะนำเฉพาะบ้านที่ทีมงานแนบไว้ด้วย show_attached_houses ถ้าลูกค้าถามหาบ้านอื่นค่อยค้นใหม่และตั้ง customerAskedForOtherHouses เป็น true'
        : 'ลูกค้ายังไม่ได้ขอดูบ้านหลังอื่น ห้ามเสนอหรือค้นบ้านหลังอื่น ให้ตอบจากรายละเอียดบ้านที่ทีมงานเขียนไว้ ("บ้านของแชทนี้") ถ้าลูกค้าถามหาบ้านอื่นค่อยค้นใหม่และตั้ง customerAskedForOtherHouses เป็น true',
    })

    const handlers = {
      search_properties: args => {
        // The model says the customer asked for other houses; the customer's own words count too.
        if (args?.customerAskedForOtherHouses === true) othersUnlocked = true
        if (holdsOthers && !othersUnlocked) return blockedOthers()
        const result = searchProperties(
          catalog,
          { ...args, limit: holdsOthers ? MAX_CARDS : args?.limit },
          { excludeCodes: [...shownCodes, ...attachedCodes] },
        )
        lastSearchCodes = result.results.map(item => item.code)
        for (const item of result.results) {
          const indexed = catalogByCode.get(item.code)
          if (indexed) seen.set(item.code, indexed)
        }
        return result
      },
      get_property: args => {
        const property = findPropertyByRef({ code: args?.code, url: args?.url }, catalog)
        if (!property) {
          return { ok: false, error: 'ไม่พบทรัพย์นี้ในรายการที่ยังว่าง (อาจรหัสผิดหรือขายแล้ว) ให้ถามลูกค้ายืนยันรหัสหรือเสนอค้นหาแบบอื่น' }
        }
        seen.set(property.code, property)
        focusCode = property.code
        return { ok: true, property: presentProperty(property) }
      },
      show_attached_houses: args => {
        if (!hasAttached) return { ok: false, error: 'ทีมงานยังไม่ได้แนบบ้านในแชทนี้' }
        const ids = Array.isArray(args?.listingIds) ? args.listingIds : []
        const codes = Array.isArray(args?.codes) ? args.codes : []
        const chosen = ids.length || codes.length
          ? {
            properties: attachedProperties.filter(property => codes.includes(property.code)),
            listings: staffListings.filter(listing => ids.includes(listing.id)),
          }
          : { properties: attachedProperties, listings: staffListings }
        if (!chosen.properties.length && !chosen.listings.length) {
          return { ok: false, error: 'ไม่พบบ้านตาม id หรือรหัสที่ระบุ ใช้ id หรือรหัสจากรายการบ้านที่ทีมงานแนบเท่านั้น หรือไม่ระบุเพื่อส่งทุกหลัง' }
        }
        attachedToSend = chosen
        return { ok: true, queued: chosen.properties.length + chosen.listings.length }
      },
      show_property_cards: args => {
        let codes = (Array.isArray(args?.codes) ? args.codes : []).filter(code => catalogByCode.has(code))
        if (holdsOthers && !othersUnlocked) {
          codes = codes.filter(code => attachedCodes.includes(code))
          if (!codes.length) return blockedOthers()
        }
        for (const code of codes) if (!cardCodes.includes(code)) cardCodes.push(code)
        cardCodes.splice(cardCap())
        if (cardCodes.length === 1) focusCode = cardCodes[0]
        return { ok: cardCodes.length > 0, queued: cardCodes.length }
      },
      save_customer_info: args => {
        const info = sanitizeCustomerInfo(args)
        const existing = conversation.contact || {}
        const saved = []
        for (const [key, value] of Object.entries(info)) {
          // Never overwrite what a teammate already filled in.
          if (!existing[key] && !contactUpdates[key]) {
            contactUpdates[key] = value
            saved.push(key)
          }
        }
        return { ok: Object.keys(info).length > 0, saved }
      },
      check_availability: async args => {
        if (!calendarCfg.enabled) {
          return { ok: false, unavailable: true, error: 'ยังไม่ได้เปิดระบบตรวจปฏิทิน ให้ใช้ request_appointment ส่งคำขอให้ทีมงานยืนยันเวลา' }
        }
        const date = typeof args?.date === 'string' ? args.date.trim() : ''
        if (!isValidDate(date, today.iso)) {
          return { ok: false, error: 'วันที่ไม่ถูกต้อง ใช้รูปแบบ YYYY-MM-DD และเป็นวันนี้ถึงไม่เกิน 90 วันข้างหน้า' }
        }
        const schedule = calendarRules.describeSchedule(calendarCfg)
        if (!calendarRules.candidateStarts(calendarCfg, date).length) {
          return { ok: true, date, open: false, message: `วันนั้นไม่รับนัด (รับนัด ${schedule})` }
        }
        let busy
        try {
          const { timeMin, timeMax } = calendarRules.dayRange(date)
          busy = await calendarClient().freeBusy(calendarCfg.calendarId, timeMin, timeMax)
        } catch (error) {
          functions.logger.warn('Calendar check failed', { ...logContext, reason: error.message })
          return { ok: false, unavailable: true, error: 'ตรวจปฏิทินไม่ได้ชั่วคราว ให้บอกลูกค้าว่าส่งคำขอนัดให้ทีมงานยืนยัน แล้วใช้ request_appointment' }
        }
        const free = calendarRules.freeStarts(calendarCfg, date, busy)
        const suggestions = calendarRules.suggestStarts(calendarCfg, free).map(calendarRules.fromMinutes)
        return {
          ok: true,
          date,
          open: true,
          durationMinutes: calendarCfg.slotMinutes,
          freeStartTimes: suggestions,
          anyFreeStartTimes: free.map(calendarRules.fromMinutes),
          message: free.length ? undefined : 'วันนั้นไม่มีเวลาว่างแล้ว ให้เสนอวันอื่น',
        }
      },
      request_appointment: async args => {
        const result = validateAppointment(args, { today: today.iso, knownCodes: catalogByCode })
        if (!result.ok) return { ok: false, error: result.error }

        // The request that existed before the calendar: a pending appointment for a person to confirm.
        const requestForTeam = async message => {
          const existing = await db.collection('appointments')
            .where('conversationId', '==', conversationId)
            .limit(10)
            .get()
          const cutoff = Date.now() - 30 * 60 * 1000
          const duplicate = existing.docs.some(doc => {
            const data = doc.data()
            return data.propertyId === result.value.propertyId && (data.createdAt?.toMillis?.() || 0) > cutoff
          })
          if (!duplicate) {
            await db.collection('appointments').add({
              type: 'Customer',
              ...result.value,
              status: 'pending',
              source: 'messenger-ai',
              conversationId: conversationId,
              createdAt: FieldValue.serverTimestamp(),
            })
          }
          appointmentRequested = true
          handoffReason = handoffReason || `ขอนัดชม ${result.value.propertyId || ''}`.trim()
          if (!conversation.contact?.name && !contactUpdates.name) contactUpdates.name = result.value.contactName
          if (!conversation.contact?.phone && !contactUpdates.phone) contactUpdates.phone = result.value.tel
          return { ok: true, confirmed: false, message: message || 'บันทึกคำขอนัดแล้ว ทีมงานจะยืนยันเวลากับลูกค้า' }
        }

        if (!calendarCfg.enabled) return requestForTeam()

        const { date, time, propertyId, contactName, tel } = result.value
        if (!date || !time) {
          return { ok: false, confirmed: false, error: 'ต้องมีวันที่และเวลาที่จะนัด (ภายใน 90 วัน) ถามลูกค้า แล้วเรียก check_availability ก่อน' }
        }
        const eventId = calendarRules.eventIdFor(conversationId, date, time, propertyId)

        // The same booking asked again (customer repeats, or a retry) is the same booking.
        const earlier = await db.collection('appointments')
          .where('conversationId', '==', conversationId)
          .limit(20)
          .get()
        const same = earlier.docs.map(doc => doc.data())
          .find(data => data.calendarEventId === eventId && data.status !== 'cancelled')
        const confirmedResult = (endTime, minutes) => ({
          ok: true,
          confirmed: true,
          date,
          time,
          endTime,
          durationMinutes: minutes,
          propertyCode: propertyId || undefined,
          message: 'นัดเรียบร้อยและลงปฏิทินแล้ว ให้ยืนยันวันและเวลานี้กับลูกค้าตรงตัว',
        })
        if (same) {
          const minutes = calendarCfg.slotMinutes
          return confirmedResult(same.endTime || calendarRules.fromMinutes(calendarRules.toMinutes(time) + minutes), minutes)
        }

        const refuse = (reason, busy) => {
          const free = calendarRules.freeStarts(calendarCfg, date, busy || [])
          return {
            ok: false,
            confirmed: false,
            reason,
            error: `${REASON_TEXT[reason] || 'นัดเวลานี้ไม่ได้'} ห้ามบอกลูกค้าว่านัดแล้ว ให้เสนอเวลาอื่นที่ว่าง`,
            freeStartTimes: calendarRules.suggestStarts(calendarCfg, free).map(calendarRules.fromMinutes),
          }
        }

        const client = calendarClient()
        const { timeMin, timeMax } = calendarRules.dayRange(date)
        let busy
        try {
          busy = await client.freeBusy(calendarCfg.calendarId, timeMin, timeMax)
        } catch (error) {
          functions.logger.warn('Calendar check failed', { ...logContext, reason: error.message })
          return requestForTeam('ตรวจปฏิทินไม่ได้ชั่วคราว จึงยังไม่ยืนยันเวลา ส่งคำขอให้ทีมงานแล้ว ทีมงานจะติดต่อยืนยัน ห้ามบอกลูกค้าว่านัดแล้ว')
        }
        const check = calendarRules.checkSlot(calendarCfg, date, time, busy)
        if (!check.ok) return refuse(check.reason, busy)

        if (!(await holdSlot(db, date, check.minute, check.endMinute, eventId))) return refuse('busy', busy)
        try {
          // Look again now that we hold the slot: an earlier booking may have just landed.
          const fresh = await client.freeBusy(calendarCfg.calendarId, timeMin, timeMax)
          const recheck = calendarRules.checkSlot(calendarCfg, date, time, fresh)
          if (!recheck.ok) return refuse(recheck.reason, fresh)

          const listing = propertyId ? catalogByCode.get(propertyId) : null
          const endTime = calendarRules.fromMinutes(check.endMinute)
          const event = await client.insertEvent(calendarCfg.calendarId, {
            id: eventId,
            summary: `นัดชม ${propertyId || 'ทรัพย์'} · ${contactName}`,
            description: [
              `ลูกค้า: ${contactName}`,
              `เบอร์โทร: ${tel}`,
              propertyId ? `ทรัพย์: ${propertyId}${result.value.propertyTitle ? ` ${result.value.propertyTitle}` : ''}` : '',
              listing?.url ? `ลิงก์: ${listing.url}` : '',
              result.value.note ? `หมายเหตุ: ${result.value.note}` : '',
              'ช่องทาง: Messenger (นัดโดยผู้ช่วย AI)',
            ].filter(Boolean).join('\n'),
            start: { dateTime: `${date}T${time}:00${calendarRules.TZ_OFFSET}`, timeZone: 'Asia/Bangkok' },
            end: { dateTime: `${date}T${endTime}:00${calendarRules.TZ_OFFSET}`, timeZone: 'Asia/Bangkok' },
            extendedProperties: { private: { source: 'messenger-ai', conversationId: conversationId } },
          })
          try {
            await db.collection('appointments').add({
              type: 'Customer',
              ...result.value,
              endTime,
              durationMinutes: calendarCfg.slotMinutes,
              status: 'confirmed',
              source: 'messenger-ai',
              conversationId: conversationId,
              calendarEventId: event.id,
              calendarEventLink: event.htmlLink || '',
              createdAt: FieldValue.serverTimestamp(),
            })
          } catch (error) {
            // No record of the booking: take the event back rather than leave a ghost.
            await client.deleteEvent(calendarCfg.calendarId, event.id).catch(() => {})
            throw error
          }
          appointmentRequested = true
          if (!conversation.contact?.name && !contactUpdates.name) contactUpdates.name = contactName
          if (!conversation.contact?.phone && !contactUpdates.phone) contactUpdates.phone = tel
          return confirmedResult(endTime, calendarCfg.slotMinutes)
        } catch (error) {
          functions.logger.warn('Calendar booking failed', { ...logContext, reason: error.message })
          return requestForTeam('ลงปฏิทินไม่สำเร็จ จึงยังไม่ยืนยันเวลา ส่งคำขอให้ทีมงานแล้ว ทีมงานจะติดต่อยืนยัน ห้ามบอกลูกค้าว่านัดแล้ว')
        } finally {
          await releaseSlot(db, date, eventId)
        }
      },
      estimate_loan: args => {
        const code = typeof args?.propertyCode === 'string' ? args.propertyCode.trim() : ''
        let price = args?.price
        if (code) {
          const listing = catalogByCode.get(code)
          if (!listing) return { ok: false, needsTeam: true, error: 'ไม่พบรหัสทรัพย์นี้ ให้ใช้รหัสจากผลการค้นหาเท่านั้น หรือถามงบจากลูกค้า' }
          // A monthly instalment would reveal the price, so hidden prices are never used.
          if (listing._hidden || !listing._numericPrice) {
            loanRecord = { needsTeam: true, verdict: 'unknown', reason: 'price-hidden' }
            return {
              ok: false,
              needsTeam: true,
              error: 'ทรัพย์นี้ไม่เปิดเผยราคา ห้ามใช้ราคาจริงคำนวณ ให้ถามลูกค้าว่างบหรือราคาที่ต้องการประมาณเท่าไหร่ หรือบอกว่าทีมงานกำลังดำเนินการให้ และขอเบอร์ติดต่อ',
            }
          }
          price = listing._numericPrice
        }
        const result = estimateLoan({ ...args, price }, settings)
        loanRecord = {
          needsTeam: result.needsTeam === true,
          verdict: result.verdict || 'unknown',
          ...(result.ok ? {
            price: result.assumptions.price,
            monthlyPayment: result.monthlyPayment,
            years: result.assumptions.years,
            downPayment: result.assumptions.downPayment,
            monthlyIncome: Number(args?.monthlyIncome) > 0 ? Math.round(Number(args.monthlyIncome)) : null,
            monthlyDebt: Number(args?.monthlyDebt) > 0 ? Math.round(Number(args.monthlyDebt)) : 0,
            dsrPercent: result.dsrPercent ?? null,
          } : {}),
        }
        return result
      },
      save_credit_profile: args => {
        const profile = sanitizeCreditProfile(args)
        if (!Object.keys(profile).length) return { ok: false, error: 'ไม่มีข้อมูลที่ใช้ได้ ใส่เฉพาะสิ่งที่ลูกค้าบอก' }
        creditProfileUpdate = { ...creditProfileUpdate, ...profile }
        return { ok: true, saved: Object.keys(profile) }
      },
      send_house_images: args => {
        const wantedId = typeof args?.listingId === 'string' ? args.listingId.trim() : ''
        let pictures
        if (wantedId) {
          const listing = staffListings.find(item => item.id === wantedId)
          if (!listing) return { ok: false, error: 'ไม่พบบ้านรายการนี้ ใช้ id จากรายการบ้านที่ทีมงานกรอกเท่านั้น' }
          pictures = Array.isArray(listing.images) ? listing.images : []
        } else if (staffImages.length) {
          pictures = staffImages
        } else {
          const withPictures = staffListings.filter(item => Array.isArray(item.images) && item.images.length)
          if (withPictures.length > 1) {
            return { ok: false, error: 'มีรูปของบ้านหลายหลัง ให้ระบุ listingId ของหลังที่ลูกค้าถาม' }
          }
          pictures = withPictures[0]?.images || []
        }
        pictures = pictures.filter(image => typeof image?.url === 'string')
        if (!pictures.length) {
          return { ok: false, error: 'ทีมงานยังไม่ได้แนบรูปแบบบ้านนี้ ให้บอกลูกค้าว่าทีมงานจะส่งให้ และขอเบอร์ติดต่อ' }
        }
        houseImagesToSend = pictures.slice(0, MAX_HOUSE_IMAGES)
        return { ok: true, queued: houseImagesToSend.length }
      },
      request_human: args => {
        handoffReason = String(args?.reason || 'requested').slice(0, 200)
        return { ok: true }
      },
    }

    stage = 'images'
    const imageParts = incomingImages.length ? await loadImageParts(incomingImages, imageCfg.maxBytes, logContext) : []

    stage = 'gemini'
    const systemInstruction = buildSystemPrompt({
      isFirstReply,
      particle: settings.particle,
      extraInstructions: settings.extraInstructions,
      faq,
      today,
      focus,
      imagesEnabled: imageCfg.enabled,
      staffNote,
      staffListings,
      attachedProperty: attachedProperties.length > 0,
      creditChecklist: settings.creditChecklist,
      staffImages,
      calendar: calendarCfg.enabled ? { scheduleText: calendarRules.describeSchedule(calendarCfg) } : null,
    })
    const { text: rawText, calls: toolCalls } = await runConversation({
      generate: createGenerate({ settings, systemInstruction, info: servedBy }),
      contents: withImages(historyToContents(recent), imageParts),
      handlers,
    })

    if (!rawText) {
      functions.logger.warn('AI produced no reply text', logContext)
      return null
    }

    // A loan estimate the bot could not settle goes to a teammate, but only once we
    // have a phone number to call (otherwise the bot keeps asking for it).
    const loanNeedsTeam = loanRecord ? loanRecord.needsTeam : conversation.loanEstimate?.needsTeam === true
    const knownPhone = conversation.contact?.phone || contactUpdates.phone
    const loanHandoff = Boolean(loanNeedsTeam && knownPhone)
    if (loanHandoff) handoffReason = handoffReason || 'ประเมินสินเชื่อไม่ได้ ต้องให้ทีมงานติดต่อกลับ'

    // Keep it chat-sized: a too-long answer is rewritten shorter before anything else.
    stage = 'shorten'
    const maxChars = replyCharLimit(settings)
    const replyText = isTooLong(rawText, maxChars) ? await shortenReply(settings, rawText, maxChars) : rawText

    // Safety checks run in code, not just in the prompt.
    stage = 'guard'
    const allowedCodes = new Set([...seen.keys(), ...shownCodes, ...cardCodes])
    // Links the team wrote themselves (e.g. a Google Maps pin in the house details) may be sent.
    // Only what the AI was shown: a post whose price is "do not tell" has its money lines removed.
    const teamText = [staffNote, ...staffListings.map(publicListingText)].join(' ')
    const teamUrls = (teamText.match(/https?:\/\/[!-(*-~]+/g) || []).map(url => url.replace(/[.,;!?]+$/, ''))
    const allowedUrls = [...[...allowedCodes].map(code => catalogByCode.get(code)?.url).filter(Boolean), ...teamUrls]
    let text = sanitizeUrls(replyText, allowedUrls)
    // A price that is public on another listing is not a secret, so don't count it as a leak.
    const visiblePrices = new Set(catalog.filter(p => !p._hidden && p._numericPrice).map(p => p._numericPrice))
    for (const item of staffListings) if (item.priceVisible !== false && item.price > 0) visiblePrices.add(item.price)
    const hiddenPrices = [
      ...catalog.filter(p => p._hidden && p._numericPrice && !visiblePrices.has(p._numericPrice)).map(p => p._numericPrice),
      ...staffListings.filter(item => item.priceVisible === false && item.price > 0 && !visiblePrices.has(item.price)).map(item => item.price),
    ]
    // A price the customer typed, or that the team wrote in this chat's house details, is not a leak.
    const customerText = [...recent.filter(m => m.direction === 'incoming').map(m => m.text), teamText].join(' ')
    let sendCards = cardCodes.length > 0
    let blockedByGuard = false
    if (!text || findPriceLeaks(text, hiddenPrices, customerText)) {
      functions.logger.warn('AI reply blocked by safety check', { ...logContext, empty: !text })
      text = safeFallbackText(settings.particle)
      handoffReason = 'ตรวจพบคำตอบที่อาจเปิดเผยราคาจริง'
      sendCards = false
      blockedByGuard = true
    }

    stage = 'send'
    const sent = await sendFacebookMessage(conversation.pageId, conversation.participantId, { text })
    replied = true
    stage = 'store'
    await storeMessengerMessage({
      pageId: conversation.pageId,
      pageName: conversation.pageName,
      participantId: conversation.participantId,
      externalId: sent.message_id,
      direction: 'outgoing',
      text,
      attachments: [],
      timestamp: Date.now(),
      sentBy: 'ai',
      // What this answer was based on, so the team can see whether the AI had the house
      // information (shown under the AI message in the inbox).
      extra: {
        aiContext: {
          properties: [...new Set(focus.map(property => property.code))],
          listings: staffListings.length,
          note: Boolean(staffNote),
          pictures: staffImages.length + staffListings.reduce((total, item) => total + (Array.isArray(item.images) ? item.images.length : 0), 0),
          tools: [...new Set((toolCalls || []).map(call => call.name))],
        },
      },
    })

    // The houses the team attached come first: shown on the first answer of the chat (or when the
    // model asks for them), before any other house. A failure here must not undo the reply.
    const shown = new Set(cardCodes)
    let attachedSent = false
    if (hasAttached && !blockedByGuard) {
      const shownBefore = (conversation.attachedShownAt?.toMillis?.() || 0) > resetAtMs
      if (!attachedToSend && !shownBefore) attachedToSend = { properties: attachedProperties, listings: staffListings }
    }
    if (attachedToSend && !blockedByGuard) {
      try {
        stage = 'attached-houses'
        const elements = buildAttachedElements(attachedToSend)
        if (elements.length) {
          const carousel = await sendFacebookMessage(conversation.pageId, conversation.participantId, buildCarouselMessage(elements))
          const names = [
            ...attachedToSend.properties.map(property => property.code),
            ...attachedToSend.listings.map(listing => [listing.type, listing.title].filter(Boolean).join(' ') || 'บ้าน'),
          ]
          await storeMessengerMessage({
            pageId: conversation.pageId,
            pageName: conversation.pageName,
            participantId: conversation.participantId,
            externalId: carousel.message_id,
            direction: 'outgoing',
            text: `🏠 ส่งบ้านที่แนบไว้: ${names.join(', ')}`,
            attachments: [],
            timestamp: Date.now(),
            sentBy: 'ai',
            extra: { kind: 'cards' },
          })
          attachedSent = true
          for (const property of attachedToSend.properties) shown.add(property.code)
        }
      } catch (error) {
        functions.logger.warn('AI attached houses failed', { ...logContext, reason: error.message })
      }
    }
    if (sendCards) {
      try {
        stage = 'cards'
        const properties = cardCodes.map(code => catalogByCode.get(code)).filter(Boolean)
        const cards = await sendFacebookMessage(
          conversation.pageId,
          conversation.participantId,
          buildCarouselMessage(buildCardElements(properties)),
        )
        await storeMessengerMessage({
          pageId: conversation.pageId,
          pageName: conversation.pageName,
          participantId: conversation.participantId,
          externalId: cards.message_id,
          direction: 'outgoing',
          text: `📋 ส่งการ์ดทรัพย์: ${properties.map(p => p.code).join(', ')}`,
          attachments: [],
          timestamp: Date.now(),
          sentBy: 'ai',
          extra: { kind: 'cards' },
        })
      } catch (error) {
        functions.logger.warn('AI cards failed', { ...logContext, reason: error.message })
      }
    }
    // Team-attached house pictures, only when the customer asked (the model called the tool).
    // Like the cards, a failure here must not undo the reply that was already sent.
    if (houseImagesToSend.length && !blockedByGuard) {
      stage = 'house-images'
      for (const image of houseImagesToSend) {
        try {
          const result = await sendFacebookMessage(conversation.pageId, conversation.participantId, {
            attachment: { type: 'image', payload: { url: image.url, is_reusable: false } },
          })
          await storeMessengerMessage({
            pageId: conversation.pageId,
            pageName: conversation.pageName,
            participantId: conversation.participantId,
            externalId: result.message_id,
            direction: 'outgoing',
            text: '',
            attachments: [{ type: 'image', url: image.url }],
            timestamp: Date.now(),
            sentBy: 'ai',
            extra: { kind: 'images' },
          })
        } catch (error) {
          functions.logger.warn('AI house image failed', { ...logContext, reason: error.message })
          break
        }
      }
    }
    if (!sendCards) for (const code of lastSearchCodes.slice(0, 3)) if (text.includes(code) || /\/p\//.test(text)) shown.add(code)

    stage = 'update'
    const update = {}
    if (shown.size) update.shownCodes = FieldValue.arrayUnion(...shown)
    if (attachedSent) update.attachedShownAt = FieldValue.serverTimestamp()
    if (othersRequestedNow()) update.othersRequestedAt = FieldValue.serverTimestamp()
    if (focusCode && focusCode !== conversation.currentPropertyCode) {
      update.currentPropertyCode = focusCode
      // The saved title/owner belonged to the previous property.
      update.currentPropertyId = FieldValue.delete()
      update.currentPropertyTitle = FieldValue.delete()
      update.currentPropertySetBy = FieldValue.delete()
    }
    if (conversation.needsProperty) update.needsProperty = FieldValue.delete()
    if (Object.keys(contactUpdates).length) {
      update.contact = contactUpdates
      if (contactUpdates.phone || contactUpdates.email) update.leadCapturedAt = FieldValue.serverTimestamp()
    }
    if (Object.keys(creditProfileUpdate).length) {
      update.creditProfile = { ...creditProfileUpdate, updatedAt: FieldValue.serverTimestamp() }
    }
    if (loanRecord || loanHandoff) {
      // Once handed over, clear the flag so resuming the bot does not hand over again.
      update.loanEstimate = {
        ...(loanRecord || {}),
        ...(loanHandoff ? { needsTeam: false, handedOffAt: FieldValue.serverTimestamp() } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      }
    }
    if (handoffReason) {
      update.botPaused = true
      update.needsHuman = true
      update.handoffReason = handoffReason
      update.handoffAt = FieldValue.serverTimestamp()
    }
    if (Object.keys(update).length) await conversationRef.set(update, { merge: true })

    functions.logger.info('AI reply sent', {
      ...logContext,
      provider: settings.provider === 'openrouter' ? 'openrouter' : 'vertex',
      model: servedBy.model || settings.model || DEFAULT_MODEL,
      cards: sendCards ? cardCodes.length : 0,
      handoff: Boolean(handoffReason),
      appointment: appointmentRequested,
    })
  } catch (error) {
    // Don't use a field called "message": the Firebase logger overwrites it.
    functions.logger.error('AI reply failed', {
      ...logContext,
      stage,
      reason: error.message,
      code: error.code,
      status: error.status || error.response?.status,
      facebook: error.response?.data?.error,
    })
  }
  return replied ? { replied: true } : null
}

const AI_RUNTIME = { timeoutSeconds: 120, memory: '512MB', maxInstances: 5, secrets: [...FACEBOOK_SECRETS, 'OPENROUTER_API_KEY'] }

const facebookAiReply = functions
  .runWith(AI_RUNTIME)
  .firestore.document(`${CONVERSATIONS}/{conversationId}/messages/{messageDocId}`)
  .onCreate((snapshot, context) => answerCustomer({
    conversationId: context.params.conversationId,
    message: snapshot.data(),
    messageRef: snapshot.ref,
  }))

const RETRY_LOCK_MS = 90 * 1000

// Two requests close together (a note, then a house) must not both answer.
async function claimRetryLock(conversationRef) {
  return admin.firestore().runTransaction(async transaction => {
    const current = await transaction.get(conversationRef)
    if (!current.exists) return false
    if ((current.get('aiRetryLockUntil') || 0) > Date.now()) return false
    transaction.update(conversationRef, { aiRetryLockUntil: Date.now() + RETRY_LOCK_MS })
    return true
  })
}

// "Answer what is waiting": the admin panel writes a document to ai_retry_requests when the
// team adds house information to a chat the AI was waiting on, or presses the button. The
// newest customer message is answered as if it had just arrived.
const facebookAiRetry = functions
  .runWith(AI_RUNTIME)
  .firestore.document('ai_retry_requests/{requestId}')
  .onCreate(async snapshot => {
    const request = snapshot.data() || {}
    const conversationId = typeof request.conversationId === 'string' ? request.conversationId : ''
    if (!conversationId || !(await claimMessage(snapshot.ref))) return null
    try {
      const conversationRef = admin.firestore().collection(CONVERSATIONS).doc(conversationId)
      if (!(await claimRetryLock(conversationRef))) {
        functions.logger.info('AI retry skipped', { conversationId, reason: 'already-running' })
        return null
      }
      let result = null
      try {
        const latest = await conversationRef.collection('messages').orderBy('timestamp', 'desc').limit(20).get()
        const newest = latest.docs[0]
        if (!newest || newest.get('direction') !== 'incoming') {
          functions.logger.info('AI retry skipped', { conversationId, reason: 'nothing-waiting' })
          return null
        }
        result = await answerCustomer({ conversationId, message: newest.data(), messageRef: newest.ref, retry: true })
        return result
      } finally {
        // Not answered (skipped or failed): let the team's next "answer what is waiting" through
        // instead of ignoring it for 90 seconds. After an answer the lock stays, so a second
        // request close behind cannot answer the same message again.
        if (!result?.replied) await conversationRef.set({ aiRetryLockUntil: admin.firestore.FieldValue.delete() }, { merge: true })
      }
    } catch (error) {
      functions.logger.error('AI retry failed', { conversationId, reason: error.message })
      return null
    }
  })

module.exports = {
  facebookAiReply,
  facebookAiRetry,
  answerCustomer,
  _test: {
    resetCaches() {
      catalogCache = { at: 0, list: [] }
      faqCache = { at: 0, list: [] }
    },
    setImageFetcher(fn) { imageFetcher = fn },
    setSleep(fn) { sleep = fn },
    setCalendarClientFactory(fn) { calendarClientFactory = fn },
    holdSlot,
    releaseSlot,
  },
}
