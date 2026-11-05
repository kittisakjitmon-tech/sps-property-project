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
const firestore = () => ({ doc: docRef, collection: collectionRef })
firestore.FieldValue = { serverTimestamp: () => SERVER_TS, delete: () => DELETE, arrayUnion: (...items) => items }
firestore.Timestamp = { now: () => ({}) }

const originalLoad = Module._load
Module._load = function patched(request) {
  if (request === 'firebase-admin') return { firestore, app: () => ({ options: { projectId: 'test' } }) }
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
