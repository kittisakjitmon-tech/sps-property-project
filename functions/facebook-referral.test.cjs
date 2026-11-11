const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const crypto = require('node:crypto')
const { readReferral, resolveReferral, sourceKey, SOURCE_COLLECTION, REFERRAL_FIELDS } = require('./facebook-referral.cjs')

const DELETE = Symbol('delete')
class Ts { constructor(ms) { this.ms = ms } toMillis() { return this.ms } }
let store, messageWrites, subscriptions
const apply = (old, data) => {
  const result = { ...old }
  for (const [key, value] of Object.entries(data)) {
    if (value === DELETE) delete result[key]
    else result[key] = value
  }
  return result
}
const doc = path => ({
  path, id: path.split('/').pop(), collection: name => collection(`${path}/${name}`),
  async get() { const data = store.get(path); return { exists: !!data, data: () => data, get: key => data?.[key], id: path.split('/').pop() } },
  async set(data, options = {}) {
    if (path.includes('/messages/')) messageWrites.push({ path, conversation: { ...store.get(path.split('/messages/')[0]) } })
    store.set(path, apply(options.merge ? store.get(path) : {}, data))
  },
  async update(data) { await this.set(data, { merge: true }) },
  async delete() { store.delete(path) },
})
const fieldValue = (data, field) => field.split('.').reduce((value, key) => value?.[key], data)
const collection = (path, filters = [], max = Infinity, cursor = null, ordered = false) => ({
  doc: id => doc(`${path}/${id}`),
  async add(data) { const ref = doc(`${path}/auto${store.size}`); await ref.set(data); return ref },
  where: (key, op, value) => collection(path, [...filters, { key, op, value }], max, cursor, ordered),
  limit: count => collection(path, filters, count, cursor, ordered),
  orderBy: () => collection(path, filters, max, cursor, true),
  startAfter: value => collection(path, filters, max, value, ordered),
  async get() {
    let entries = [...store.entries()].filter(([key, data]) => key.split('/').slice(0, -1).join('/') === path && filters.every(f => f.op === 'in' ? f.value.includes(fieldValue(data, f.key)) : fieldValue(data, f.key) === f.value))
    if (ordered) entries.sort(([a], [b]) => a.localeCompare(b))
    if (cursor) entries = entries.filter(([key]) => key.split('/').pop() > cursor)
    const docs = entries.slice(0, max).map(([key, data]) => ({ id: key.split('/').pop(), ref: doc(key), data: () => data }))
    return { docs, empty: !docs.length }
  },
})
const db = { doc, collection, async runTransaction(run) {
  const writes = []
  let writing = false
  const result = await run({
    get: ref => { assert.equal(writing, false, 'Firestore reads must precede writes'); return ref.get() },
    set: (ref, data, options) => { writing = true; writes.push(() => ref.set(data, options)) },
    update: (ref, data) => { writing = true; writes.push(() => ref.update(data)) },
  })
  for (const write of writes) await write()
  return result
} }
const firestore = () => db
firestore.FieldValue = { delete: () => DELETE, serverTimestamp: () => new Ts(Date.now()), arrayUnion: (...values) => values }
firestore.FieldPath = { documentId: () => '__name__' }
firestore.Timestamp = { fromMillis: ms => new Ts(ms), now: () => new Ts(Date.now()) }
const originalLoad = Module._load
Module._load = function(request) {
  if (request === 'firebase-admin') return { firestore }
  if (request === 'axios') return { post: async (url, body, options) => { subscriptions.push({ url, options }); return { data: { success: true } } }, get: async () => { throw new Error('Unexpected network request') } }
  return originalLoad.apply(this, arguments)
}
const { _private, facebookWebhook } = require('./facebook-messenger')
const { runBackfill, backfillConversation, JOBS } = require('./facebook-referral-backfill')
Module._load = originalLoad
const { persistReferral, adminActions } = _private
const PAGE = '12345', USER = '67890', TIME = Date.now()
const CID = _private.conversationId(PAGE, USER)
const path = `messenger_conversations/${CID}`
const current = () => store.get(path)
const event = (raw = { ad_id: '101', source: 'ADS' }, timestamp = TIME) => ({ sender: { id: USER }, recipient: { id: PAGE }, timestamp, referral: raw })
const mapping = (kind = 'ad', value = '101', code = 'SPS-TH-1', pageId = PAGE) => store.set(`${SOURCE_COLLECTION}/${sourceKey(pageId, kind, value)}`, { pageId, kind, value, propertyCode: code })

beforeEach(() => {
  store = new Map(); messageWrites = []; subscriptions = []
  store.set('properties/p1', { displayId: 'SPS-TH-1', title: 'บ้านหนึ่ง', status: 'available' })
  store.set('properties/p2', { displayId: 'SPS-TH-2', title: 'บ้านสอง', status: 'available' })
  store.set(path, { pageId: PAGE, participantId: USER, profileFetchedAt: new Ts(TIME) })
  store.set(`messenger_pages/${PAGE}`, { name: 'เพจทดสอบ' })
})

test('all three referral shapes are recognized and echoes or ordinary messages are ignored', () => {
  const raw = { ad_id: '101', ads_context_data: { ad_title: 'บ้านสวย', post_id: '123_456' } }
  for (const shape of [{ referral: raw }, { message: { referral: raw } }, { postback: { referral: raw } }]) {
    const result = readReferral({ ...event(), referral: undefined, ...shape })
    assert.equal(result.adId, '101'); assert.equal(result.postId, '123_456'); assert.equal(result.title, 'บ้านสวย')
  }
  assert.equal(readReferral({ ...event(raw), message: { is_echo: true } }), null)
  assert.equal(readReferral({ ...event(), referral: {} }), null)
  assert.equal(readReferral({ message: { text: 'สวัสดี' } }), null)
})

test('ad, post and ref mappings are isolated by page, with ad taking priority', async () => {
  mapping('ad', '101', 'SPS-TH-2', '999')
  assert.equal((await resolveReferral(db, PAGE, readReferral(event()))).status, 'unmapped')
  mapping('post', '123_456', 'SPS-TH-2')
  mapping('ad', '101')
  const result = await resolveReferral(db, PAGE, readReferral(event({ ad_id: '101', ads_context_data: { post_id: '123_456' } })))
  assert.equal(result.propertyCode, 'SPS-TH-1'); assert.equal(result.propertyId, 'p1')
  mapping('ref', 'campaign1')
  assert.equal((await resolveReferral(db, PAGE, readReferral(event({ ref: 'campaign1' })))).propertyCode, 'SPS-TH-1')
})

test('per-house links resolve exactly, without guessing from ad titles or prices', async () => {
  assert.equal((await resolveReferral(db, PAGE, readReferral(event({ ref: 'property_SPS-TH-2' })))).propertyId, 'p2')
  assert.equal((await resolveReferral(db, PAGE, readReferral(event({ ad_id: '101', ads_context_data: { ad_title: 'SPS-TH-1' } })))).status, 'unmapped')
})

test('sold and deleted properties cannot be selected by referrals', async () => {
  mapping()
  store.get('properties/p1').status = 'sold'
  assert.equal((await resolveReferral(db, PAGE, readReferral(event()))).status, 'unavailable')
  store.delete('properties/p1')
  assert.equal((await resolveReferral(db, PAGE, readReferral(event()))).status, 'unavailable')
})

test('a matched click sets the property before a message exists and does not count as a customer message', async () => {
  mapping()
  await persistReferral(PAGE, 'เพจ', event())
  assert.equal(current().currentPropertyCode, 'SPS-TH-1')
  assert.equal(current().currentPropertySetBy, 'facebook-referral')
  assert.equal(current().facebookReferral.status, 'matched')
  assert.equal(current().lastInboundAt, undefined)
  assert.equal(current().unreadCount, undefined)
  assert.equal(messageWrites.length, 0)
})

test('unknown new ads clear the old house and wait, even if the chat has manual notes', async () => {
  store.set(path, { ...current(), currentPropertyCode: 'SPS-TH-2', staffNote: 'บ้านเก่า' })
  await persistReferral(PAGE, 'เพจ', event())
  assert.equal(current().currentPropertyCode, undefined)
  assert.equal(current().needsProperty, true)
  assert.equal(current().staffNote, 'บ้านเก่า')
  assert.equal(current().facebookReferral.status, 'unmapped')
})

test('duplicates and delayed clicks do not undo staff corrections, but a newer ad changes house', async () => {
  mapping(); mapping('ad', '102', 'SPS-TH-2')
  await persistReferral(PAGE, 'เพจ', event())
  await adminActions.setConversationProperty({ conversationId: CID, propertyCode: 'SPS-TH-2' }, { uid: 'staff' })
  await persistReferral(PAGE, 'เพจ', event())
  await persistReferral(PAGE, 'เพจ', event({ ad_id: '101' }, TIME - 1))
  assert.equal(current().currentPropertySetBy, 'staff')
  await persistReferral(PAGE, 'เพจ', event({ ad_id: '102' }, TIME + 1))
  assert.equal(current().currentPropertyCode, 'SPS-TH-2')
  assert.equal(current().currentPropertySetBy, 'facebook-referral')
})

test('a late matched referral queues a normal-rules retry only for a chat waiting for a house', async () => {
  mapping()
  store.set(path, { ...current(), needsProperty: true, lastInboundAt: new Ts(TIME - 1000) })
  await persistReferral(PAGE, 'เพจ', event())
  let requests = [...store.entries()].filter(([key]) => key.startsWith('ai_retry_requests/'))
  assert.equal(requests.length, 1); assert.equal(requests[0][1].automaticReferral, true)
  await persistReferral(PAGE, 'เพจ', event())
  requests = [...store.entries()].filter(([key]) => key.startsWith('ai_retry_requests/'))
  assert.equal(requests.length, 1)
})

test('old referrals before a context reset cannot reattach the previous house', async () => {
  mapping(); store.set(path, { ...current(), contextResetAt: new Ts(TIME + 1) })
  await persistReferral(PAGE, 'เพจ', event())
  assert.equal(current().facebookReferral, undefined)
})

test('authenticated actions save, list, remove mappings and reject invalid or unavailable houses', async () => {
  const admin = { uid: 'staff' }
  await adminActions.savePropertySource({ pageId: PAGE, kind: 'ad', value: '101', propertyCode: 'SPS-TH-1' }, admin)
  assert.equal((await adminActions.listPropertySources({ pageId: PAGE })).sources[0].propertyCode, 'SPS-TH-1')
  await assert.rejects(adminActions.savePropertySource({ pageId: PAGE, kind: 'ad', value: 'bad', propertyCode: 'SPS-TH-1' }, admin), error => error.status === 400)
  await assert.rejects(adminActions.savePropertySource({ pageId: PAGE, kind: 'ad', value: '101', propertyCode: 'MISSING' }, admin), error => error.status === 409)
  await adminActions.savePropertySource({ pageId: PAGE, kind: 'ad', value: '101', propertyCode: '' }, admin)
  assert.equal((await adminActions.listPropertySources({ pageId: PAGE })).sources.length, 0)
})

test('a mapping created for an unresolved chat can be applied immediately', async () => {
  await persistReferral(PAGE, 'เพจ', event())
  mapping()
  await adminActions.applyConversationReferral({ conversationId: CID })
  assert.equal(current().facebookReferral.status, 'matched')
  assert.equal(current().currentPropertyCode, 'SPS-TH-1')
  assert.equal(current().needsProperty, undefined)
})

test('existing pages can subscribe to all required referral fields with their own token', async () => {
  store.set(`messenger_page_tokens/${PAGE}`, { accessToken: 'test-token' })
  await adminActions.enableReferralTracking({ pageId: PAGE })
  assert.equal(subscriptions[0].options.params.subscribed_fields, REFERRAL_FIELDS)
  assert.equal(subscriptions[0].options.params.access_token, 'test-token')
})

test('signed webhook pre-processes a separate referral even when it follows the first message', async () => {
  mapping()
  const message = { ...event(), referral: undefined, message: { mid: 'mid1', text: 'ยังอยู่ไหม' } }
  const body = { object: 'page', entry: [{ id: PAGE, messaging: [message, event()] }] }
  process.env.FACEBOOK_APP_SECRET = 'test-secret'
  const rawBody = Buffer.from(JSON.stringify(body))
  const signature = `sha256=${crypto.createHmac('sha256', 'test-secret').update(rawBody).digest('hex')}`
  const response = { status(code) { this.code = code; return this }, json(value) { this.body = value; return this } }
  await facebookWebhook({ method: 'POST', body, rawBody, get: () => signature }, response)
  assert.equal(response.code, 200)
  assert.equal(messageWrites.length, 1)
  assert.equal(messageWrites[0].conversation.currentPropertyCode, 'SPS-TH-1')
  assert.equal(messageWrites[0].conversation.facebookReferral.status, 'matched')
})

test('ads without identifiers still wait for a house and malformed timestamps are ignored', async () => {
  const source = readReferral(event({ source: 'ADS' }))
  assert.equal(source.adId, null)
  await persistReferral(PAGE, 'เพจ', event({ source: 'ADS' }))
  assert.equal(current().needsProperty, true)
  assert.equal(readReferral(event({ ad_id: '101' }, NaN)), null)
})

test('a referral accompanying a postback sets the house before the button message is saved', async () => {
  mapping()
  const click = { ...event(), referral: undefined, postback: { title: 'สนใจบ้านหลังนี้', payload: 'INTEREST', referral: { ad_id: '101' } } }
  await persistReferral(PAGE, 'เพจ', click, { queueRetry: false })
  await _private.handleMessagingEvent(PAGE, 'เพจ', click)
  await _private.handleMessagingEvent(PAGE, 'เพจ', click)
  assert.equal(messageWrites.length, 1)
  assert.equal(messageWrites[0].conversation.currentPropertyCode, 'SPS-TH-1')
  const messages = [...store.entries()].filter(([key]) => key.includes('/messages/'))
  assert.equal(messages[0][1].text, 'สนใจบ้านหลังนี้')
})

test('webhook batches with a new message do not queue a second automatic reply', async () => {
  mapping()
  store.set(path, { ...current(), needsProperty: true, lastInboundAt: new Ts(TIME - 1000) })
  const incoming = { ...event(), referral: undefined, message: { mid: 'mid2', text: 'ขอรายละเอียด' } }
  const body = { object: 'page', entry: [{ id: PAGE, messaging: [incoming] }, { id: PAGE, messaging: [event()] }] }
  process.env.FACEBOOK_APP_SECRET = 'test-secret'
  const rawBody = Buffer.from(JSON.stringify(body))
  const signature = `sha256=${crypto.createHmac('sha256', 'test-secret').update(rawBody).digest('hex')}`
  const response = { status(code) { this.code = code; return this }, json(value) { this.body = value; return this } }
  await facebookWebhook({ method: 'POST', body, rawBody, get: () => signature }, response)
  assert.equal(response.code, 200)
  assert.equal(messageWrites[0].conversation.currentPropertyCode, 'SPS-TH-1')
  assert.equal([...store.keys()].filter(key => key.startsWith('ai_retry_requests/')).length, 0)
})

async function queueMapping({ kind = 'ad', value = '101', propertyCode = 'SPS-TH-1' } = {}) {
  await adminActions.savePropertySource({ pageId: PAGE, kind, value, propertyCode }, { uid: 'staff' })
  return [...store.keys()].filter(key => key.startsWith(`${JOBS}/`)).at(-1)
}
function oldChat(id, extra = {}) {
  const record = {
    pageId: PAGE, participantId: id,
    facebookReferral: { adId: '101', postId: null, ref: null, source: 'ADS', status: 'unmapped', timestamp: TIME },
    needsProperty: true, ...extra,
  }
  store.set(`messenger_conversations/${id}`, record)
  return record
}

test('saving a source atomically queues backfill, which updates old chats without sending or resuming bots', async () => {
  oldChat('old1', { botPaused: true, lastInboundAt: new Ts(TIME - 1000) })
  oldChat('old2')
  const job = await queueMapping()
  assert.ok(job)
  assert.equal(store.get(`${SOURCE_COLLECTION}/${sourceKey(PAGE, 'ad', '101')}`).backfill.status, 'queued')
  const counts = await runBackfill(doc(job))
  assert.equal(counts.updated, 2)
  for (const id of ['old1', 'old2']) {
    const chat = store.get(`messenger_conversations/${id}`)
    assert.equal(chat.currentPropertyCode, 'SPS-TH-1')
    assert.equal(chat.facebookReferral.status, 'matched')
    assert.equal(chat.needsProperty, undefined)
  }
  assert.equal(store.get('messenger_conversations/old1').botPaused, true)
  assert.equal(messageWrites.length, 0)
  assert.equal([...store.keys()].filter(key => key.startsWith('ai_retry_requests/')).length, 0)
})

test('backfill preserves manual selections, customer switches, staff details, reset chats and other pages', async () => {
  oldChat('manual', { currentPropertyCode: 'SPS-TH-2', currentPropertySetBy: 'staff' })
  oldChat('customer', { currentPropertyCode: 'SPS-TH-2' })
  oldChat('notes', { staffNote: 'บ้านที่ทีมยืนยัน' })
  oldChat('listings', { staffListings: [{ id: 'one' }] })
  oldChat('otherPage', { pageId: '999' })
  oldChat('reset', { contextResetAt: new Ts(TIME + 1) })
  store.set('messenger_conversations/noSource', { pageId: PAGE })
  const job = await queueMapping()
  const counts = await runBackfill(doc(job))
  assert.equal(counts.updated, 0)
  assert.equal(counts.skipped, 6)
  assert.equal(store.get('messenger_conversations/manual').currentPropertyCode, 'SPS-TH-2')
  assert.equal(store.get('messenger_conversations/customer').currentPropertyCode, 'SPS-TH-2')
  assert.equal(store.get('messenger_conversations/noSource').currentPropertyCode, undefined)
})

test('an ad-specific mapping takes priority over a shared post during backfill', async () => {
  oldChat('post', { facebookReferral: { adId: '101', postId: '123_456', timestamp: TIME, status: 'unmapped' } })
  mapping('ad', '101', 'SPS-TH-2')
  const job = await queueMapping({ kind: 'post', value: '123_456' })
  const result = await runBackfill(doc(job))
  assert.equal(result.updated, 0)
  assert.equal(result.skipped, 1)
  assert.equal(store.get('messenger_conversations/post').currentPropertyCode, undefined)
})

test('changing or deleting a mapping cancels outdated backfills', async () => {
  oldChat('old')
  const first = await queueMapping()
  const second = await queueMapping({ propertyCode: 'SPS-TH-2' })
  await runBackfill(doc(first))
  assert.equal(store.get(first).status, 'cancelled')
  await runBackfill(doc(second))
  assert.equal(store.get('messenger_conversations/old').currentPropertyCode, 'SPS-TH-2')
  const third = await queueMapping()
  await adminActions.savePropertySource({ pageId: PAGE, kind: 'ad', value: '101', propertyCode: '' }, { uid: 'staff' })
  await runBackfill(doc(third))
  assert.equal(store.get(third).status, 'cancelled')
})

test('a house sold after saving the mapping is never applied to old chats', async () => {
  oldChat('old')
  const job = await queueMapping()
  store.get('properties/p1').status = 'sold'
  const result = await runBackfill(doc(job))
  assert.equal(result.updated, 0)
  assert.equal(store.get('messenger_conversations/old').currentPropertyCode, undefined)
})

test('a newer source is rechecked transactionally instead of using a stale scan result', async () => {
  oldChat('old')
  await queueMapping()
  const mappingId = sourceKey(PAGE, 'ad', '101')
  const revision = store.get(`${SOURCE_COLLECTION}/${mappingId}`).revision
  store.get('messenger_conversations/old').facebookReferral.adId = '202'
  assert.equal(await backfillConversation(db, doc('messenger_conversations/old'), mappingId, revision), 'skipped')
})

test('backfill continues beyond one page, totals results, and ignores repeated delivery', async () => {
  for (let index = 0; index < 105; index++) oldChat(`old${String(index).padStart(3, '0')}`)
  const first = await queueMapping()
  const firstCounts = await runBackfill(doc(first))
  assert.equal(firstCounts.updated, 100)
  const second = [...store.keys()].find(key => key.startsWith(`${JOBS}/`) && key !== first)
  assert.ok(second)
  const finalCounts = await runBackfill(doc(second))
  assert.equal(finalCounts.updated, 105)
  const result = store.get(`${SOURCE_COLLECTION}/${sourceKey(PAGE, 'ad', '101')}`).backfill
  assert.equal(result.status, 'completed')
  assert.equal(result.updated, 105)
  assert.equal(await runBackfill(doc(first)), null)
  assert.equal(await runBackfill(doc(second)), null)
})

test('a post pasted with the page profile ID is saved under the webhook page and matches either prefix', async () => {
  const PROFILE = '61595039907598'
  oldChat('viaProfile', { facebookReferral: { adId: null, postId: `${PROFILE}_456`, ref: null, source: 'ADS', status: 'unmapped', timestamp: TIME } })
  oldChat('viaPage', { facebookReferral: { adId: null, postId: `${PAGE}_456`, ref: null, source: 'ADS', status: 'unmapped', timestamp: TIME } })
  const job = await queueMapping({ kind: 'post', value: `${PROFILE}_456` })
  const saved = store.get(`${SOURCE_COLLECTION}/${sourceKey(PAGE, 'post', `${PAGE}_456`)}`)
  assert.equal(saved.value, `${PAGE}_456`)
  assert.deepEqual(saved.aliases, [`${PROFILE}_456`])
  const counts = await runBackfill(doc(job))
  assert.equal(counts.updated, 2)
  for (const postId of [`${PROFILE}_456`, `${PAGE}_456`]) {
    const result = await resolveReferral(db, PAGE, readReferral(event({ ads_context_data: { post_id: postId }, source: 'ADS' })))
    assert.equal(result.propertyCode, 'SPS-TH-1')
  }
})
