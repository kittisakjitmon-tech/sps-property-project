const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { VertexAI } = require('@google-cloud/vertexai')
const {
  MAX_CARDS,
  TOOL_DECLARATIONS,
  vertexClientOptions,
  toIndexedProperty,
  searchProperties,
  buildCardElements,
  buildCarouselMessage,
  sanitizeCustomerInfo,
  validateAppointment,
  estimateLoan,
  findPriceLeaks,
  sanitizeUrls,
  replyCharLimit,
  isTooLong,
  hardTrim,
  buildShortenRequest,
  cleanReplyText,
  shouldReply,
  historyToContents,
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
//   }
// Company facts and FAQs live in the messenger_faq collection: { question, answer, active }.
const SETTINGS_DOC = 'messenger_settings/ai'
const FAQ_COLLECTION = 'messenger_faq'
// Change `model` in the settings document if this one is retired.
const DEFAULT_MODEL = 'gemini-2.5-flash'
const DEFAULT_LOCATION = 'us-central1'
const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_FAQ_ENTRIES = 40
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
      direction: data.direction,
      text: data.text || '',
      attachmentCount: Array.isArray(data.attachments) ? data.attachments.length : 0,
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
    generationConfig: { temperature: 0.6, maxOutputTokens: 500 },
  })
  return async contents => {
    const result = await model.generateContent({ contents })
    return result.response?.candidates?.[0]?.content?.parts || []
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
        generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
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

const facebookAiReply = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB', maxInstances: 5, secrets: [...FACEBOOK_SECRETS, 'OPENROUTER_API_KEY'] })
  .firestore.document(`${CONVERSATIONS}/{conversationId}/messages/{messageDocId}`)
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data()
    if (message?.direction !== 'incoming') return null

    const db = admin.firestore()
    const FieldValue = admin.firestore.FieldValue
    const conversationRef = db.collection(CONVERSATIONS).doc(context.params.conversationId)
    const logContext = { conversationId: context.params.conversationId }
    // Which step we were in, so a failure says where it happened.
    let stage = 'settings'

    try {
      const settings = (await db.doc(SETTINGS_DOC).get()).data() || {}
      if (settings.enabled !== true) return null

      stage = 'claim'
      if (!(await claimMessage(snapshot.ref))) return null

      stage = 'history'
      const conversation = (await conversationRef.get()).data()
      if (!conversation?.pageId || !conversation?.participantId) return null

      const recent = await loadRecentMessages(conversationRef)
      const decision = shouldReply({
        settings,
        conversation: { ...conversation, botResumedAtMs: conversation.botResumedAt?.toMillis?.() || 0 },
        text: message.text,
        timestamp: message.timestamp?.toMillis?.() || Date.now(),
        recentMessages: recent,
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
      let lastSearchCodes = []
      const cardCodes = []
      let handoffReason = null
      const servedBy = {}
      let appointmentRequested = false
      const contactUpdates = {}
      let loanRecord = null // set when estimate_loan ran in this reply

      const handlers = {
        search_properties: args => {
          const result = searchProperties(catalog, args, { excludeCodes: shownCodes })
          lastSearchCodes = result.results.map(item => item.code)
          for (const item of result.results) {
            const indexed = catalogByCode.get(item.code)
            if (indexed) seen.set(item.code, indexed)
          }
          return result
        },
        show_property_cards: args => {
          const codes = (Array.isArray(args?.codes) ? args.codes : []).filter(code => catalogByCode.has(code))
          for (const code of codes) if (!cardCodes.includes(code)) cardCodes.push(code)
          cardCodes.splice(MAX_CARDS)
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
        request_appointment: async args => {
          const result = validateAppointment(args, { today: today.iso, knownCodes: catalogByCode })
          if (!result.ok) return { ok: false, error: result.error }
          const existing = await db.collection('appointments')
            .where('conversationId', '==', context.params.conversationId)
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
              conversationId: context.params.conversationId,
              createdAt: FieldValue.serverTimestamp(),
            })
          }
          appointmentRequested = true
          handoffReason = handoffReason || `ขอนัดชม ${result.value.propertyId || ''}`.trim()
          if (!conversation.contact?.name && !contactUpdates.name) contactUpdates.name = result.value.contactName
          if (!conversation.contact?.phone && !contactUpdates.phone) contactUpdates.phone = result.value.tel
          return { ok: true, message: 'บันทึกคำขอนัดแล้ว ทีมงานจะยืนยันเวลากับลูกค้า' }
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
        request_human: args => {
          handoffReason = String(args?.reason || 'requested').slice(0, 200)
          return { ok: true }
        },
      }

      stage = 'gemini'
      const systemInstruction = buildSystemPrompt({
        isFirstReply,
        particle: settings.particle,
        extraInstructions: settings.extraInstructions,
        faq,
        today,
      })
      const { text: rawText } = await runConversation({
        generate: createGenerate({ settings, systemInstruction, info: servedBy }),
        contents: historyToContents(recent),
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
      const allowedUrls = [...allowedCodes].map(code => catalogByCode.get(code)?.url).filter(Boolean)
      let text = sanitizeUrls(replyText, allowedUrls)
      // A price that is public on another listing is not a secret, so don't count it as a leak.
      const visiblePrices = new Set(catalog.filter(p => !p._hidden && p._numericPrice).map(p => p._numericPrice))
      const hiddenPrices = catalog.filter(p => p._hidden && p._numericPrice && !visiblePrices.has(p._numericPrice)).map(p => p._numericPrice)
      const customerText = recent.filter(m => m.direction === 'incoming').map(m => m.text).join(' ')
      let sendCards = cardCodes.length > 0
      if (!text || findPriceLeaks(text, hiddenPrices, customerText)) {
        functions.logger.warn('AI reply blocked by safety check', { ...logContext, empty: !text })
        text = safeFallbackText(settings.particle)
        handoffReason = 'ตรวจพบคำตอบที่อาจเปิดเผยราคาจริง'
        sendCards = false
      }

      stage = 'send'
      const sent = await sendFacebookMessage(conversation.pageId, conversation.participantId, { text })
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
      })

      // Cards are a bonus: a failure here must not undo the reply that was already sent.
      const shown = new Set(cardCodes)
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
      if (!sendCards) for (const code of lastSearchCodes.slice(0, 3)) if (text.includes(code) || /\/p\//.test(text)) shown.add(code)

      stage = 'update'
      const update = {}
      if (shown.size) update.shownCodes = FieldValue.arrayUnion(...shown)
      if (Object.keys(contactUpdates).length) {
        update.contact = contactUpdates
        if (contactUpdates.phone || contactUpdates.email) update.leadCapturedAt = FieldValue.serverTimestamp()
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
    return null
  })

module.exports = {
  facebookAiReply,
  _test: {
    resetCaches() {
      catalogCache = { at: 0, list: [] }
      faqCache = { at: 0, list: [] }
    },
  },
}
