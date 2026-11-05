// Admin actions of the Messenger inbox (property per chat, "property first" switch),
// run against an in-memory Firestore. No network, no credentials.
const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')

const DELETE = Symbol('delete')
const SERVER_TS = Symbol('serverTimestamp')
let store

function applyData(existing, data) {
  const result = { ...(existing || {}) }
  for (const [key, value] of Object.entries(data)) {
    if (value === DELETE) delete result[key]
    else result[key] = value === SERVER_TS ? 'TS' : value
  }
  return result
}

const docRef = path => ({
  path,
  id: path.split('/').pop(),
  async get() {
    const data = store.get(path)
    return { exists: data !== undefined, data: () => (data ? { ...data } : undefined), get: field => data?.[field], id: path.split('/').pop() }
  },
  async set(data, options = {}) { store.set(path, applyData(options.merge ? store.get(path) : {}, data)) },
})
const collectionRef = (name, filters = [], max = Infinity) => ({
  doc: id => docRef(`${name}/${id}`),
  async add(data) { const id = `auto${store.size}`; store.set(`${name}/${id}`, applyData({}, data)); return docRef(`${name}/${id}`) },
  where: (field, op, value) => collectionRef(name, [...filters, { field, value }], max),
  limit: n => collectionRef(name, filters, n),
  async get() {
    const docs = [...store.entries()]
      .filter(([path]) => path.startsWith(`${name}/`) && path.split('/').length === 2)
      .filter(([, data]) => filters.every(({ field, value }) => data[field] === value))
      .slice(0, max)
      .map(([path, data]) => ({ id: path.split('/').pop(), data: () => ({ ...data }), ref: docRef(path) }))
    return { empty: docs.length === 0, docs }
  },
})
const files = new Map()
const storage = () => ({
  bucket: () => ({
    name: 'bucket',
    file: path => ({
      save: async (buffer, options) => { files.set(path, { buffer, options }) },
      delete: async () => { if (!files.delete(path)) throw new Error('not found') },
    }),
  }),
})
const firestore = () => ({ doc: docRef, collection: collectionRef })
firestore.FieldValue = { serverTimestamp: () => SERVER_TS, delete: () => DELETE, arrayUnion: (...items) => items }
firestore.Timestamp = { now: () => ({}) }

const originalLoad = Module._load
Module._load = function patched(request) {
  if (request === 'firebase-admin') return { firestore, storage, app: () => ({ options: { projectId: 'test' } }) }
  return originalLoad.apply(this, arguments)
}
const { _private } = require('./facebook-messenger.js')
Module._load = originalLoad
const { adminActions } = _private

const CONV = 'messenger_conversations/c1'
const conversation = () => store.get(CONV)
const ADMIN = { uid: 'u1', role: 'admin' }
const SUPER = { uid: 'u2', role: 'super_admin' }
const reject = (promise, status) => assert.rejects(promise, error => error.status === status)

beforeEach(() => {
  files.clear()
  store = new Map()
  store.set(CONV, { pageId: 'P1', participantId: 'U1', botPaused: true, needsProperty: true })
  store.set('properties/prop1', { status: 'available', displayId: 'SPS-TH-1', title: 'ทาวน์โฮมสวย' })
  store.set('properties/prop2', { status: 'sold', displayId: 'SPS-TH-2', title: 'ขายแล้ว' })
})

test('setConversationProperty saves the listing on the chat and clears the waiting flag', async () => {
  const result = await adminActions.setConversationProperty({ conversationId: 'c1', propertyCode: ' SPS-TH-1 ' }, ADMIN)
  assert.equal(result.code, 'SPS-TH-1')
  assert.equal(conversation().currentPropertyCode, 'SPS-TH-1')
  assert.equal(conversation().currentPropertyId, 'prop1')
  assert.equal(conversation().currentPropertyTitle, 'ทาวน์โฮมสวย')
  assert.equal(conversation().currentPropertySetBy, 'u1')
  assert.equal(conversation().needsProperty, undefined)
})

test('setConversationProperty refuses unknown or unavailable listings and an unknown chat', async () => {
  await reject(adminActions.setConversationProperty({ conversationId: 'c1', propertyCode: 'NOPE' }, ADMIN), 404)
  await reject(adminActions.setConversationProperty({ conversationId: 'c1', propertyCode: 'SPS-TH-2' }, ADMIN), 409)
  await reject(adminActions.setConversationProperty({ conversationId: 'missing', propertyCode: 'SPS-TH-1' }, ADMIN), 404)
  assert.equal(conversation().currentPropertyCode, undefined)
})

test('an empty code clears the property from the chat', async () => {
  await adminActions.setConversationProperty({ conversationId: 'c1', propertyCode: 'SPS-TH-1' }, ADMIN)
  const result = await adminActions.setConversationProperty({ conversationId: 'c1', propertyCode: '' }, ADMIN)
  assert.equal(result.cleared, true)
  for (const key of ['currentPropertyCode', 'currentPropertyId', 'currentPropertyTitle', 'currentPropertySetBy']) {
    assert.equal(conversation()[key], undefined)
  }
})

test('with "property first" on, the AI cannot be switched on for a chat without a property', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  await reject(adminActions.setBotPaused({ conversationId: 'c1', paused: false }), 409)
  assert.equal(conversation().botPaused, true)
  await adminActions.setConversationProperty({ conversationId: 'c1', propertyCode: 'SPS-TH-1' }, ADMIN)
  await adminActions.setBotPaused({ conversationId: 'c1', paused: false })
  assert.equal(conversation().botPaused, false)
})

test('pausing is always allowed, and resuming is free when "property first" is off', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  await adminActions.setBotPaused({ conversationId: 'c1', paused: true })
  assert.equal(conversation().botPaused, true)
  store.set('messenger_settings/ai', { enabled: true })
  await adminActions.setBotPaused({ conversationId: 'c1', paused: false })
  assert.equal(conversation().botPaused, false)
  store.delete('messenger_settings/ai') // missing settings document behaves like "off"
  await adminActions.setBotPaused({ conversationId: 'c1', paused: true })
  await adminActions.setBotPaused({ conversationId: 'c1', paused: false })
  assert.equal(conversation().botPaused, false)
})

test('only a super admin can change "property first", and the value must be a boolean', async () => {
  await reject(adminActions.setRequireProperty({ required: true }, ADMIN), 403)
  await reject(adminActions.setRequireProperty({ required: 'yes' }, SUPER), 400)
  await adminActions.setRequireProperty({ required: true }, SUPER)
  assert.equal(store.get('messenger_settings/ai').requirePropertyForBot, true)
  await adminActions.setRequireProperty({ required: false }, SUPER)
  assert.equal(store.get('messenger_settings/ai').requirePropertyForBot, false)
})

test('setConversationNote saves the team\'s house details, trims and caps them, and clears on empty', async () => {
  const result = await adminActions.setConversationNote({ conversationId: 'c1', note: '  บ้านหลังริม ใกล้สวนสาธารณะ  ' }, ADMIN)
  assert.equal(result.success, true)
  assert.equal(conversation().staffNote, 'บ้านหลังริม ใกล้สวนสาธารณะ')
  assert.equal(conversation().staffNoteBy, 'u1')
  assert.equal(conversation().needsProperty, undefined)
  await adminActions.setConversationNote({ conversationId: 'c1', note: 'ก'.repeat(5000) }, ADMIN)
  assert.equal(conversation().staffNote.length, 1500)
  const cleared = await adminActions.setConversationNote({ conversationId: 'c1', note: '   ' }, ADMIN)
  assert.equal(cleared.cleared, true)
  assert.equal(conversation().staffNote, undefined)
  await reject(adminActions.setConversationNote({ conversationId: 'c1', note: { a: 1 } }, ADMIN), 400)
  await reject(adminActions.setConversationNote({ conversationId: 'missing', note: 'x' }, ADMIN), 404)
})

test('with "property first" on, house details written by the team also let the AI be switched on', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  await reject(adminActions.setBotPaused({ conversationId: 'c1', paused: false }), 409)
  await adminActions.setConversationNote({ conversationId: 'c1', note: 'ทาวน์โฮม 2 ชั้น ใกล้นิคม' }, ADMIN)
  await adminActions.setBotPaused({ conversationId: 'c1', paused: false })
  assert.equal(conversation().botPaused, false)
})


const PNG_BASE64 = Buffer.from('89504e470d0a1a0a0000', 'hex').toString('base64')

test('a house picture is stored, listed on the chat with its caption, and can be removed', async () => {
  const added = await adminActions.addConversationImage({ conversationId: 'c1', imageBase64: PNG_BASE64, mimeType: 'image/png', caption: '  แปลนชั้น 1  ' }, ADMIN)
  assert.equal(added.image.caption, 'แปลนชั้น 1')
  assert.match(added.image.url, /^https:\/\/firebasestorage\.googleapis\.com\//)
  assert.match(added.image.path, /^messenger\/c1\/staff-.*\.png$/)
  assert.equal(files.has(added.image.path), true)
  assert.equal(conversation().staffImages.length, 1)
  assert.equal(conversation().staffImages[0].addedBy, 'u1')

  await adminActions.addConversationImage({ conversationId: 'c1', imageBase64: PNG_BASE64, mimeType: 'image/jpeg' }, ADMIN)
  assert.equal(conversation().staffImages.length, 2)

  await adminActions.removeConversationImage({ conversationId: 'c1', url: added.image.url })
  assert.deepEqual(conversation().staffImages.map(image => image.caption), [''])
  assert.equal(files.has(added.image.path), false)
  await reject(adminActions.removeConversationImage({ conversationId: 'c1', url: added.image.url }), 404)
})

test('house pictures: only real picture types, a size cap, and a limit of six per chat', async () => {
  const add = (extra = {}) => adminActions.addConversationImage({ conversationId: 'c1', imageBase64: PNG_BASE64, mimeType: 'image/png', ...extra }, ADMIN)
  await reject(add({ mimeType: 'application/pdf' }), 400)
  await reject(add({ imageBase64: '' }), 400)
  await reject(add({ imageBase64: Buffer.alloc(9 * 1024 * 1024).toString('base64') }), 400)
  await reject(adminActions.addConversationImage({ conversationId: 'missing', imageBase64: PNG_BASE64, mimeType: 'image/png' }, ADMIN), 404)
  assert.equal(files.size, 0)
  for (let n = 0; n < 6; n += 1) await add()
  await reject(add(), 409)
  assert.equal(conversation().staffImages.length, 6)
  assert.equal(files.size, 6)
})

test('only a super admin edits what the AI is told about credit checks; empty text clears it', async () => {
  await reject(adminActions.setAiGuidance({ creditChecklist: 'x' }, ADMIN), 403)
  await adminActions.setAiGuidance({ creditChecklist: '  ถามอาชีพก่อน  ', extraInstructions: 'เรียกลูกค้าว่าพี่' }, SUPER)
  assert.equal(store.get('messenger_settings/ai').creditChecklist, 'ถามอาชีพก่อน')
  assert.equal(store.get('messenger_settings/ai').extraInstructions, 'เรียกลูกค้าว่าพี่')
  await adminActions.setAiGuidance({ creditChecklist: '   ' }, SUPER)
  assert.equal(store.get('messenger_settings/ai').creditChecklist, undefined)
  assert.equal(store.get('messenger_settings/ai').extraInstructions, 'เรียกลูกค้าว่าพี่') // untouched
  await reject(adminActions.setAiGuidance({ creditChecklist: 'ก'.repeat(4001) }, SUPER), 400)
  await reject(adminActions.setAiGuidance({ extraInstructions: 'ก'.repeat(2001) }, SUPER), 400)
  await reject(adminActions.setAiGuidance({ creditChecklist: 123 }, SUPER), 400)
  await reject(adminActions.setAiGuidance({}, SUPER), 400)
})

// ─── Houses typed in by the team ─────────────────────────────────────────────
const house = (extra = {}) => ({ title: 'บ้านเดี่ยว สวนสวย', type: 'บ้านเดี่ยว', price: '2,490,000', bedrooms: 3, details: 'ที่จอดรถ 2 คัน', ...extra })

test('houses typed in by the team are added, edited in place, and removed', async () => {
  const first = await adminActions.saveConversationListing({ conversationId: 'c1', listing: house() }, ADMIN)
  assert.match(first.listing.id, /^[0-9a-f]{10}$/)
  assert.equal(first.listing.price, 2490000)
  assert.equal(first.listing.priceVisible, true)
  assert.deepEqual(first.listing.images, [])
  assert.equal(conversation().needsProperty, undefined)
  const second = await adminActions.saveConversationListing({ conversationId: 'c1', listing: house({ title: 'บ้านแฝด สุขใจ', type: 'บ้านแฝด', price: 1850000, priceVisible: false }) }, ADMIN)
  assert.equal(conversation().staffListings.length, 2)
  assert.equal(second.listing.priceVisible, false)

  const edited = await adminActions.saveConversationListing({ conversationId: 'c1', listing: { ...house({ price: 2590000 }), id: first.listing.id } }, ADMIN)
  assert.equal(edited.listing.id, first.listing.id)
  assert.equal(conversation().staffListings.length, 2)
  assert.equal(conversation().staffListings[0].price, 2590000)

  await adminActions.removeConversationListing({ conversationId: 'c1', listingId: first.listing.id })
  assert.deepEqual(conversation().staffListings.map(item => item.title), ['บ้านแฝด สุขใจ'])
  await reject(adminActions.removeConversationListing({ conversationId: 'c1', listingId: first.listing.id }), 404)
})

test('a typed-in house must be valid, an unknown one cannot be edited, and there is a limit of ten', async () => {
  await reject(adminActions.saveConversationListing({ conversationId: 'c1', listing: {} }, ADMIN), 400)
  await reject(adminActions.saveConversationListing({ conversationId: 'c1', listing: house({ price: 'abc' }) }, ADMIN), 400)
  await reject(adminActions.saveConversationListing({ conversationId: 'c1', listing: { ...house(), id: 'nope' } }, ADMIN), 404)
  await reject(adminActions.saveConversationListing({ conversationId: 'missing', listing: house() }, ADMIN), 404)
  for (let n = 0; n < 10; n += 1) await adminActions.saveConversationListing({ conversationId: 'c1', listing: house({ title: `บ้าน ${n}` }) }, ADMIN)
  await reject(adminActions.saveConversationListing({ conversationId: 'c1', listing: house() }, ADMIN), 409)
})

test('pictures can be attached to one typed-in house, kept through edits, and are deleted with the house', async () => {
  const saved = await adminActions.saveConversationListing({ conversationId: 'c1', listing: house() }, ADMIN)
  const listingId = saved.listing.id
  const added = await adminActions.addConversationImage({ conversationId: 'c1', listingId, imageBase64: PNG_BASE64, mimeType: 'image/png', caption: 'แปลน' }, ADMIN)
  assert.equal(conversation().staffListings[0].images.length, 1)
  assert.equal(conversation().staffImages, undefined) // not on the chat itself
  assert.equal(files.has(added.image.path), true)

  // editing the text keeps the pictures, and the client cannot overwrite them
  await adminActions.saveConversationListing({ conversationId: 'c1', listing: { ...house({ title: 'ชื่อใหม่' }), id: listingId, images: [{ url: 'https://evil.example/x.png' }] } }, ADMIN)
  assert.equal(conversation().staffListings[0].title, 'ชื่อใหม่')
  assert.deepEqual(conversation().staffListings[0].images.map(image => image.url), [added.image.url])

  await adminActions.addConversationImage({ conversationId: 'c1', listingId, imageBase64: PNG_BASE64, mimeType: 'image/png' }, ADMIN)
  await adminActions.removeConversationImage({ conversationId: 'c1', listingId, url: added.image.url })
  assert.equal(conversation().staffListings[0].images.length, 1)
  assert.equal(files.has(added.image.path), false)

  await reject(adminActions.addConversationImage({ conversationId: 'c1', listingId: 'nope', imageBase64: PNG_BASE64, mimeType: 'image/png' }, ADMIN), 404)
  await reject(adminActions.removeConversationImage({ conversationId: 'c1', listingId, url: 'https://x/none' }), 404)

  const before = files.size
  await adminActions.removeConversationListing({ conversationId: 'c1', listingId })
  assert.equal(files.size, before - 1) // the remaining picture's file went with the house
})

test('each house holds at most six pictures', async () => {
  const { listing } = await adminActions.saveConversationListing({ conversationId: 'c1', listing: house() }, ADMIN)
  const add = () => adminActions.addConversationImage({ conversationId: 'c1', listingId: listing.id, imageBase64: PNG_BASE64, mimeType: 'image/png' }, ADMIN)
  for (let n = 0; n < 6; n += 1) await add()
  await reject(add(), 409)
  assert.equal(conversation().staffListings[0].images.length, 6)
})

test('with "property first" on, a typed-in house lets the AI be switched on', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  await reject(adminActions.setBotPaused({ conversationId: 'c1', paused: false }), 409)
  await adminActions.saveConversationListing({ conversationId: 'c1', listing: house() }, ADMIN)
  await adminActions.setBotPaused({ conversationId: 'c1', paused: false })
  assert.equal(conversation().botPaused, false)
})

// ─── Start testing a chat again ──────────────────────────────────────────────
test('resetting a chat clears what the AI remembered, keeps the team\'s own entries, and is for super admins only', async () => {
  store.set(CONV, {
    pageId: 'P1', participantId: 'U1', botPaused: true, needsHuman: true, handoffReason: 'ขอคุยกับคน', needsProperty: true,
    shownCodes: ['SPS-TH-1'], currentPropertyCode: 'SPS-TH-1', currentPropertyTitle: 'x', loanEstimate: { verdict: 'likely' },
    creditProfile: { age: 30 }, leadCapturedAt: 'ts', contact: { name: 'สมชาย', phone: '0812345678' },
    staffNote: 'โน้ตของทีม', staffListings: [{ id: 'a1', title: 'บ้าน' }], staffImages: [{ url: 'u' }],
  })
  await reject(adminActions.resetConversationContext({ conversationId: 'c1' }, ADMIN), 403)
  assert.equal(conversation().botPaused, true)

  await adminActions.resetConversationContext({ conversationId: 'c1' }, SUPER)
  const after = conversation()
  assert.ok(after.contextResetAt)
  assert.ok(after.botResumedAt)
  assert.equal(after.botPaused, false)
  assert.equal(after.needsHuman, false)
  for (const field of ['handoffReason', 'needsProperty', 'shownCodes', 'currentPropertyCode', 'currentPropertyTitle', 'loanEstimate', 'creditProfile', 'leadCapturedAt']) {
    assert.equal(after[field], undefined, field)
  }
  assert.equal(after.contact.phone, '0812345678')
  assert.equal(after.staffNote, 'โน้ตของทีม')
  assert.equal(after.staffListings.length, 1)
  assert.equal(after.staffImages.length, 1)
  await reject(adminActions.resetConversationContext({ conversationId: 'missing' }, SUPER), 404)
})


// ─── Answering what is waiting ───────────────────────────────────────────────
const retryRequests = () => [...store.entries()].filter(([path]) => path.startsWith('ai_retry_requests/')).map(([, data]) => data)
const waiting = (extra = {}) => store.set(CONV, { pageId: 'P1', participantId: 'U1', needsProperty: true, lastInboundAt: 2000, lastOutboundAt: 1000, ...extra })

test('house information added to a chat the AI was waiting on asks the AI to answer', async () => {
  waiting()
  const set = await adminActions.setConversationProperty({ conversationId: 'c1', propertyCode: 'SPS-TH-1' }, ADMIN)
  assert.equal(set.answering, true)
  assert.deepEqual(retryRequests().map(request => [request.conversationId, request.reason, request.requestedBy]), [['c1', 'property-set', 'u1']])

  waiting()
  assert.equal((await adminActions.setConversationNote({ conversationId: 'c1', note: 'ราคา 2.19 ล้าน' }, ADMIN)).answering, true)
  waiting()
  assert.equal((await adminActions.saveConversationListing({ conversationId: 'c1', listing: { title: 'บ้านแฝด', price: 2190000 } }, ADMIN)).answering, true)
  assert.deepEqual(retryRequests().map(request => request.reason).sort(), ['listing-saved', 'note-saved', 'property-set'])
})

test('no retry when the AI was not waiting, when the note is cleared, or when nothing valid was saved', async () => {
  store.set(CONV, { pageId: 'P1', participantId: 'U1', lastInboundAt: 2000, lastOutboundAt: 3000 }) // already answered
  assert.equal((await adminActions.setConversationNote({ conversationId: 'c1', note: 'x' }, ADMIN)).answering, false)
  waiting()
  await adminActions.setConversationNote({ conversationId: 'c1', note: '   ' }, ADMIN) // clearing
  waiting()
  await reject(adminActions.saveConversationListing({ conversationId: 'c1', listing: {} }, ADMIN), 400)
  await reject(adminActions.setConversationProperty({ conversationId: 'c1', propertyCode: 'NOPE' }, ADMIN), 404)
  assert.equal(retryRequests().length, 0)
})

test('the button asks the AI to answer a waiting message, and says why when it cannot', async () => {
  store.set('messenger_settings/ai', { enabled: true })
  waiting({ needsProperty: undefined })
  await adminActions.askAiToReply({ conversationId: 'c1' }, ADMIN)
  assert.deepEqual(retryRequests().map(request => request.reason), ['manual'])

  store.set(CONV, { pageId: 'P1', participantId: 'U1', lastInboundAt: 2000, lastOutboundAt: 3000 })
  await reject(adminActions.askAiToReply({ conversationId: 'c1' }, ADMIN), 409) // nothing waiting
  waiting({ botPaused: true })
  await reject(adminActions.askAiToReply({ conversationId: 'c1' }, ADMIN), 409) // paused
  waiting()
  store.set('messenger_settings/ai', { enabled: false })
  await reject(adminActions.askAiToReply({ conversationId: 'c1' }, ADMIN), 409) // off everywhere
  store.delete('messenger_settings/ai')
  await reject(adminActions.askAiToReply({ conversationId: 'c1' }, ADMIN), 409)
  await reject(adminActions.askAiToReply({ conversationId: 'missing' }, ADMIN), 404)
  assert.equal(retryRequests().length, 1)
})

test('lastInboundAt and lastOutboundAt can be stored as timestamps or numbers', async () => {
  store.set('messenger_settings/ai', { enabled: true })
  store.set(CONV, { pageId: 'P1', participantId: 'U1', lastInboundAt: { toMillis: () => 5000 }, lastOutboundAt: { toMillis: () => 4000 } })
  await adminActions.askAiToReply({ conversationId: 'c1' }, ADMIN)
  assert.equal(retryRequests().length, 1)
})

test('resetting a chat also makes the AI forget what it showed first and that other houses were asked for', async () => {
  store.set(CONV, { pageId: 'P1', participantId: 'U1', attachedShownAt: 't1', othersRequestedAt: 't2', staffListings: [{ id: 'a1', title: 'บ้าน' }] })
  await adminActions.resetConversationContext({ conversationId: 'c1' }, SUPER)
  assert.equal(conversation().attachedShownAt, undefined)
  assert.equal(conversation().othersRequestedAt, undefined)
  assert.equal(conversation().staffListings.length, 1)
})

// ─── A pasted house post, read by the AI ─────────────────────────────────────
const extract = require('./facebook-ai-extract')
const POST = `🏡 บ้านเเฝด 🗺️แยกมาบโป่ง เฟส8-10
2 ห้องนอน 2 ห้องน้ำ 1 ครัว 2 จอดรถ
✅ฟรีถังสำรองน้ำ 1,000 ลิตร
พิกัด 📍 https://maps.app.goo.gl/38ManFKLBfZc8vE5A?g_st=ipc
ราคา 2.19 ล้าน`

test('a pasted post is read by the AI into the fields a card needs, and the post is kept', async () => {
  let asked
  extract._test.setGenerate(async (settings, request) => {
    asked = request.contents[0].parts[0].text
    return '{"title":"แยกมาบโป่ง เฟส8-10","type":"บ้านแฝด","listing":"sale","location":"แยกมาบโป่ง ชลบุรี","bedrooms":2,"bathrooms":2,"price":2190000,"priceNote":""}'
  })
  try {
    const result = await adminActions.saveConversationListing({ conversationId: 'c1', listing: { details: POST, priceVisible: false }, extract: true }, ADMIN)
    assert.match(asked, /แยกมาบโป่ง/)
    assert.equal(result.readBy, 'ai')
    const [saved] = conversation().staffListings
    assert.equal(saved.type, 'บ้านแฝด')
    assert.equal(saved.title, 'แยกมาบโป่ง เฟส8-10')
    assert.equal(saved.location, 'แยกมาบโป่ง ชลบุรี')
    assert.equal(saved.bedrooms, 2)
    assert.equal(saved.price, 2190000)
    assert.equal(saved.priceVisible, false)
    assert.equal(saved.readBy, 'ai')
    assert.match(saved.details, /\n/) // the post keeps its lines
    assert.equal(conversation().needsProperty, undefined)

    // the team corrects what was read: saved as sent, marked as checked by the team
    await adminActions.saveConversationListing({ conversationId: 'c1', listing: { ...saved, title: 'มาบโป่ง เฟส 9', fieldsEdited: true } }, ADMIN)
    assert.equal(conversation().staffListings[0].title, 'มาบโป่ง เฟส 9')
    assert.equal(conversation().staffListings[0].readBy, 'team')
  } finally {
    extract._test.setGenerate(null)
  }
})

test('when the AI cannot read the post, the fields are read from the text and it still saves', async () => {
  extract._test.setGenerate(async () => { throw new Error('model unavailable') })
  try {
    const result = await adminActions.saveConversationListing({ conversationId: 'c1', listing: { details: POST }, extract: true }, ADMIN)
    assert.equal(result.readBy, 'text')
    const [saved] = conversation().staffListings
    assert.equal(saved.type, 'บ้านแฝด')
    assert.equal(saved.bedrooms, 2)
    assert.equal(saved.price, 2190000)
    assert.equal(saved.priceVisible, true)
  } finally {
    extract._test.setGenerate(null)
  }
  await reject(adminActions.saveConversationListing({ conversationId: 'c1', listing: { details: '   ' }, extract: true }, ADMIN), 400)
})
