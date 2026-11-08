const { createHash } = require('node:crypto')

const SOURCE_COLLECTION = 'messenger_property_sources'
const REFERRAL_FIELDS = 'messages,message_echoes,messaging_referrals,messaging_postbacks'
const text = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : ''

function sourceKey(pageId, kind, value) {
  return createHash('sha256').update(JSON.stringify([pageId, kind, value])).digest('hex')
}

// Referral data is delivered in three shapes. Echoes must never change the customer's house.
function readReferral(event) {
  if (event.message?.is_echo || !event.sender?.id || !event.recipient?.id) return null
  const raw = event.referral || event.message?.referral || event.postback?.referral
  if (!raw || typeof raw !== 'object') return null
  const adId = text(raw.ad_id, 64)
  const postId = text(raw.ads_context_data?.post_id, 100)
  const ref = text(raw.ref)
  if (!adId && !postId && !ref && raw.source !== 'ADS') return null
  const timestamp = Number(event.timestamp)
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) return null
  return {
    adId: adId || null,
    postId: postId || null,
    ref: ref || null,
    source: text(raw.source, 32) || null,
    title: text(raw.ads_context_data?.ad_title, 300) || null,
    // Use the Meta timestamp for ordering and deduplication, never the delivery time.
    timestamp,
  }
}

async function resolveReferral(db, pageId, referral, { transaction } = {}) {
  const read = ref => transaction ? transaction.get(ref) : ref.get()
  // Ad-specific mappings win over a post reused in several ads, then explicit link refs.
  let code = ''
  for (const [kind, value] of [['ad', referral.adId], ['post', referral.postId], ['ref', referral.ref]]) {
    if (!value) continue
    const mapping = (await read(db.collection(SOURCE_COLLECTION).doc(sourceKey(pageId, kind, value)))).data()
    if (mapping) { code = mapping.propertyCode; break }
  }
  // Our own per-house links: m.me/PAGE_ID?ref=property_SPS-TH-1.
  if (!code && referral.ref?.startsWith('property_')) code = referral.ref.slice(9)
  if (!code) return { ...referral, status: 'unmapped', propertyCode: null, propertyId: null, propertyTitle: null }
  const result = await read(db.collection('properties').where('displayId', '==', code).limit(1))
  const property = result.docs[0]?.data()
  if (!property || property.status !== 'available') {
    return { ...referral, status: 'unavailable', propertyCode: code, propertyId: null, propertyTitle: null }
  }
  return { ...referral, status: 'matched', propertyCode: code, propertyId: result.docs[0].id, propertyTitle: text(property.title, 120) }
}

function referralContext(conversation) {
  return JSON.stringify([conversation.facebookReferral || null, conversation.currentPropertyCode || null])
}

function referralNeedsProperty(conversation) {
  return ['unmapped', 'unavailable'].includes(conversation.facebookReferral?.status)
}

module.exports = { SOURCE_COLLECTION, REFERRAL_FIELDS, sourceKey, readReferral, resolveReferral, referralContext, referralNeedsProperty }
