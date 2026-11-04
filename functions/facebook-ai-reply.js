const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { VertexAI } = require('@google-cloud/vertexai')
const {
  TOOL_DECLARATIONS,
  toIndexedProperty,
  searchProperties,
  shouldReply,
  historyToContents,
  buildSystemPrompt,
  runConversation,
  vertexClientOptions,
} = require('./facebook-ai-core.cjs')
const {
  CONVERSATIONS,
  FACEBOOK_SECRETS,
  sendFacebookMessage,
  storeMessengerMessage,
} = require('./facebook-messenger')

// The switch lives in Firestore so it can be flipped without a deploy:
//   messenger_settings/ai = { enabled: true, model: '...', maxRepliesPerHour: 8 }
// It is OFF unless the document says enabled === true.
const SETTINGS_DOC = 'messenger_settings/ai'
// Change `model` in the settings document if this one is retired.
const DEFAULT_MODEL = 'gemini-2.5-flash'
const DEFAULT_LOCATION = 'us-central1'
const CATALOG_TTL_MS = 5 * 60 * 1000
const CATALOG_FIELDS = [
  'status', 'displayId', 'title', 'type', 'listingType', 'isRental', 'subListingType',
  'bedrooms', 'bathrooms', 'locationDisplay', 'location', 'project', 'price', 'showPrice',
  'description', 'searchKeywords', 'featured', 'hotDeal',
]

let catalogCache = { at: 0, list: [] }

async function loadCatalog() {
  if (Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.list
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
      timestamp: data.timestamp?.toMillis?.() || 0,
    }
  })
}

function createGenerate({ settings, systemInstruction }) {
  const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId
  const vertex = new VertexAI(vertexClientOptions(settings, projectId, DEFAULT_LOCATION))
  const model = vertex.getGenerativeModel({
    model: settings.model || DEFAULT_MODEL,
    systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
  })
  return async contents => {
    const result = await model.generateContent({ contents })
    return result.response?.candidates?.[0]?.content?.parts || []
  }
}

const facebookAiReply = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB', maxInstances: 5, secrets: FACEBOOK_SECRETS })
  .firestore.document(`${CONVERSATIONS}/{conversationId}/messages/{messageDocId}`)
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data()
    if (message?.direction !== 'incoming') return null

    const db = admin.firestore()
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
      const catalog = await loadCatalog()
      let handoffReason = null

      stage = 'gemini'
      const { text } = await runConversation({
        generate: createGenerate({ settings, systemInstruction: buildSystemPrompt({ isFirstReply }) }),
        contents: historyToContents(recent),
        handlers: {
          search_properties: args => searchProperties(catalog, args),
          request_human: args => {
            handoffReason = String(args?.reason || 'requested').slice(0, 200)
            return { ok: true }
          },
        },
      })

      if (!text) {
        functions.logger.warn('AI produced no reply text', logContext)
        return null
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

      if (handoffReason) {
        await conversationRef.set({
          botPaused: true,
          needsHuman: true,
          handoffReason,
          handoffAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true })
      }
      functions.logger.info('AI reply sent', { ...logContext, handoff: Boolean(handoffReason) })
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

module.exports = { facebookAiReply }
