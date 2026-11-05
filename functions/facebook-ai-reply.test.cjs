// End-to-end test of the Firestore trigger with an in-memory Firestore, a scripted
// Gemini and a recording Messenger client. No network, no credentials.
const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')

// ─── In-memory Firestore ─────────────────────────────────────────────────────
class Ts {
  constructor(ms) { this.ms = ms }
  toMillis() { return this.ms }
}
const SERVER_TS = Symbol('serverTimestamp')
class ArrayUnion { constructor(items) { this.items = items } }
const DELETE = Symbol('delete')

let store
// structuredClone would strip Ts's methods; real Firestore keeps Timestamp objects.
function cloneData(value) {
  if (value instanceof Ts) return new Ts(value.ms)
  if (Array.isArray(value)) return value.map(cloneData)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cloneData(v)]))
  return value
}
const parentOf = path => path.split('/').slice(0, -1).join('/')
const resolve = value => (value === SERVER_TS ? new Ts(Date.now()) : value)

function applyData(existing, data, merge) {
  const result = merge ? { ...(existing || {}) } : {}
  for (const [key, raw] of Object.entries(data)) {
    if (raw === DELETE) { delete result[key]; continue }
    if (raw instanceof ArrayUnion) {
      const current = Array.isArray(result[key]) ? result[key] : []
      result[key] = [...new Set([...current, ...raw.items])]
    } else if (merge && raw && typeof raw === 'object' && !(raw instanceof Ts) && !Array.isArray(raw) && raw !== SERVER_TS) {
      result[key] = applyData(result[key], raw, true)
    } else {
      result[key] = resolve(raw)
    }
  }
  return result
}

class DocRef {
  constructor(path) { this.path = path; this.id = path.split('/').pop() }
  snap() {
    const data = store.get(this.path)
    return { id: this.id, ref: this, exists: data !== undefined, data: () => (data ? cloneData(data) : undefined), get: field => data?.[field] }
  }
  async get() { return this.snap() }
  async set(data, options = {}) { store.set(this.path, applyData(store.get(this.path), data, options.merge === true)) }
  async update(data) { store.set(this.path, applyData(store.get(this.path), data, true)) }
  collection(name) { return new Query(`${this.path}/${name}`) }
}

class Query {
  constructor(path, filters = [], order = null, max = Infinity) { Object.assign(this, { path, filters, order, max }) }
  doc(id) { return new DocRef(`${this.path}/${id}`) }
  async add(data) {
    const ref = this.doc(`auto${store.size}`)
    await ref.set(data)
    return ref
  }
  where(field, op, value) { return new Query(this.path, [...this.filters, { field, op, value }], this.order, this.max) }
  orderBy(field, dir = 'asc') { return new Query(this.path, this.filters, { field, dir }, this.max) }
  limit(max) { return new Query(this.path, this.filters, this.order, max) }
  select() { return this }
  async get() {
    let docs = [...store.entries()]
      .filter(([path]) => parentOf(path) === this.path)
      .map(([path, data]) => ({ path, data }))
      .filter(({ data }) => this.filters.every(({ field, value }) => data[field] === value))
    if (this.order) {
      const key = d => { const v = d.data[this.order.field]; return v instanceof Ts ? v.ms : v }
      docs.sort((a, b) => (this.order.dir === 'desc' ? key(b) - key(a) : key(a) - key(b)))
    }
    docs = docs.slice(0, this.max)
    return { docs: docs.map(({ path }) => new DocRef(path).snap()) }
  }
}

const firestore = () => ({
  collection: name => new Query(name),
  doc: path => new DocRef(path),
  runTransaction: async run => {
    const updates = []
    const transaction = {
      get: async ref => ref.snap(),
      update: (ref, data) => updates.push([ref, data, 'update']),
      set: (ref, data) => updates.push([ref, data, 'set']),
    }
    const result = await run(transaction)
    for (const [ref, data, kind] of updates) await (kind === 'set' ? ref.set(data) : ref.update(data))
    return result
  },
})
firestore.FieldValue = {
  serverTimestamp: () => SERVER_TS,
  arrayUnion: (...items) => new ArrayUnion(items),
  delete: () => DELETE,
}
firestore.Timestamp = { fromMillis: ms => new Ts(ms), now: () => new Ts(Date.now()) }

// ─── Fakes injected before the module under test loads ───────────────────────
let modelScript
let sent
let stored

const fakes = {
  'firebase-admin': { firestore, app: () => ({ options: { projectId: 'test' } }) },
  '@google-cloud/vertexai': {
    VertexAI: class {
      getGenerativeModel() {
        return { generateContent: async ({ contents }) => ({ response: { candidates: [{ content: { parts: await modelScript.shift()(contents) } }] } }) }
      }
    },
  },
}
const messengerPath = require.resolve('./facebook-messenger.js')
const originalLoad = Module._load
Module._load = function patched(request, parent, isMain) {
  if (fakes[request]) return fakes[request]
  if (parent && Module._resolveFilename(request, parent, isMain) === messengerPath) {
    return {
      CONVERSATIONS: 'messenger_conversations',
      FACEBOOK_SECRETS: [],
      sendFacebookMessage: async (pageId, recipientId, message) => {
        sent.push({ pageId, recipientId, message })
        return { message_id: `mid${sent.length}` }
      },
      storeMessengerMessage: async args => { stored.push(args) },
    }
  }
  return originalLoad.apply(this, arguments)
}
const { facebookAiReply, facebookAiRetry, _test } = require('./facebook-ai-reply.js')
Module._load = originalLoad

// ─── Fixtures ────────────────────────────────────────────────────────────────
const CID = 'conv1'
const NOW = Date.now()
const property = (extra = {}) => ({
  status: 'available', displayId: 'SPS-TH-1', title: 'ทาวน์โฮมสวย', type: 'SPS-TH-1CLASS-ID', listingType: 'sale',
  bedrooms: 3, bathrooms: 2, locationDisplay: 'พานทอง, ชลบุรี', price: 2150000, showPrice: false,
  description: 'บ้านใหม่ ใกล้นิคม', coverImageUrl: 'https://img.example/a.jpg', ...extra,
})

let slept
beforeEach(() => {
  _test.resetCaches()
  slept = []
  _test.setSleep(async ms => { slept.push(ms) })
  store = new Map()
  sent = []
  stored = []
  modelScript = []
  store.set('messenger_settings/ai', { enabled: true })
  store.set(`messenger_conversations/${CID}`, { pageId: 'P1', participantId: 'U1', pageName: 'เพจ' })
  store.set('properties/prop1', property())
  store.set('properties/prop2', property({ displayId: 'SPS-CD-9', type: 'SPS-CD-ID', price: 1500000, showPrice: true, locationDisplay: 'ศรีราชา, ชลบุรี' }))
})

async function receive(text, { at = NOW } = {}) {
  const id = `m${store.size}`
  store.set(`messenger_conversations/${CID}/messages/${id}`, { direction: 'incoming', text, attachments: [], timestamp: new Ts(at) })
  const snapshot = new DocRef(`messenger_conversations/${CID}/messages/${id}`).snap()
  await facebookAiReply.run(snapshot, { params: { conversationId: CID, messageDocId: id } })
  return id
}
const conversation = () => store.get(`messenger_conversations/${CID}`)
const model = (...steps) => { modelScript = steps.map(step => async () => step) }

test('does nothing while the bot is off', async () => {
  store.set('messenger_settings/ai', { enabled: false })
  model([{ text: 'x' }])
  await receive('สวัสดี')
  assert.equal(sent.length, 0)
  assert.equal(modelScript.length, 1, 'model was never called')
})

test('answers a plain question with one text message', async () => {
  model([{ text: 'สวัสดีครับ ผมเป็นผู้ช่วย AI ของ SPS ยินดีช่วยครับ' }])
  await receive('สวัสดี')
  assert.equal(sent.length, 1)
  assert.match(sent[0].message.text, /ผู้ช่วย AI/)
  assert.equal(sent[0].recipientId, 'U1')
  assert.equal(stored[0].sentBy, 'ai')
  assert.equal(conversation().botPaused, undefined)
})

test('searches, shows masked prices, sends cards and remembers what it showed', async () => {
  model(
    [{ functionCall: { name: 'search_properties', args: { location: 'พานทอง' } } }],
    [{ functionCall: { name: 'show_property_cards', args: { codes: ['SPS-TH-1'] } } }],
    [{ text: 'มีทาวน์โฮมสวยที่พานทองครับ 3 นอน 2 น้ำ ราคาประมาณ 2.1xxx ล้านบาท ดูได้ที่ https://spspropertysolution.com/p/prop1 เลยครับ' }],
  )
  await receive('มีทาวน์โฮมพานทองไหม')
  assert.equal(sent.length, 2)
  assert.match(sent[0].message.text, /2\.1xxx ล้านบาท/)
  assert.ok(sent[0].message.text.includes('https://spspropertysolution.com/p/prop1'))
  const element = sent[1].message.attachment.payload.elements[0]
  assert.equal(element.buttons[0].url, 'https://spspropertysolution.com/p/prop1')
  assert.match(element.subtitle, /2\.1xxx/)
  assert.ok(!JSON.stringify(sent).includes('2150000'))
  assert.equal(stored[1].extra.kind, 'cards')
  assert.deepEqual(conversation().shownCodes, ['SPS-TH-1'])
})

test('a reply that leaks the exact hidden price is replaced and a human is called in', async () => {
  model([{ text: 'ราคา 2,150,000 บาทครับ' }])
  await receive('ราคาเท่าไหร่')
  assert.equal(sent.length, 1)
  assert.ok(!sent[0].message.text.includes('2,150,000'))
  assert.match(sent[0].message.text, /ทีมงาน/)
  assert.equal(conversation().botPaused, true)
  assert.equal(conversation().needsHuman, true)
})

test('links the model invented are removed from the reply', async () => {
  model(
    [{ functionCall: { name: 'search_properties', args: {} } }],
    [{ text: 'ดูที่ https://spspropertysolution.com/p/prop1 หรือ https://phishing.example/x ครับ' }],
  )
  await receive('ขอลิงก์หน่อย')
  assert.ok(sent[0].message.text.includes('/p/prop1'))
  assert.ok(!sent[0].message.text.includes('phishing'))
})

test('saves what the customer says into the contact without overwriting a teammate', async () => {
  store.set(`messenger_conversations/${CID}`, { pageId: 'P1', participantId: 'U1', contact: { name: 'ชื่อที่ทีมงานกรอก' } })
  model(
    [{ functionCall: { name: 'save_customer_info', args: { name: 'สมชาย', phone: '081-234-5678', budget: 'ไม่เกิน 2 ล้าน' } } }],
    [{ text: 'ขอบคุณครับ' }],
  )
  await receive('เบอร์ 081-234-5678 งบไม่เกิน 2 ล้าน')
  const contact = conversation().contact
  assert.equal(contact.name, 'ชื่อที่ทีมงานกรอก')
  assert.equal(contact.phone, '0812345678')
  assert.equal(contact.interest, 'ไม่เกิน 2 ล้าน')
  assert.ok(conversation().leadCapturedAt)
})

test('creates an appointment request, notifies via the existing trigger collection and hands off', async () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
  const date = new Date(`${today}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 3)
  const when = date.toISOString().slice(0, 10)
  model(
    [{ functionCall: { name: 'request_appointment', args: { name: 'สมชาย', phone: '0812345678', propertyCode: 'SPS-TH-1', date: when, time: '14:00' } } }],
    [{ text: 'ส่งคำขอนัดให้ทีมงานแล้วครับ ทีมงานจะยืนยันเวลากลับนะครับ' }],
  )
  await receive('อยากนัดชมครับ')
  const appointments = [...store.entries()].filter(([path]) => path.startsWith('appointments/'))
  assert.equal(appointments.length, 1)
  const [, appointment] = appointments[0]
  assert.equal(appointment.type, 'Customer')
  assert.equal(appointment.contactName, 'สมชาย')
  assert.equal(appointment.tel, '0812345678')
  assert.equal(appointment.propertyId, 'SPS-TH-1')
  assert.equal(appointment.date, when)
  assert.equal(appointment.status, 'pending')
  assert.equal(appointment.source, 'messenger-ai')
  assert.equal(appointment.conversationId, CID)
  assert.equal(conversation().botPaused, true)
  assert.equal(conversation().needsHuman, true)
  assert.match(conversation().handoffReason, /ขอนัดชม/)
  assert.equal(conversation().contact.phone, '0812345678')
})

test('a second identical appointment request does not create a duplicate', async () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
  const args = { name: 'สมชาย', phone: '0812345678', propertyCode: 'SPS-TH-1', date: today, time: '16:00' }
  store.set('appointments/existing', { conversationId: CID, propertyId: 'SPS-TH-1', createdAt: new Ts(Date.now() - 60_000) })
  model([{ functionCall: { name: 'request_appointment', args } }], [{ text: 'ได้ครับ' }])
  await receive('นัดอีกครั้ง')
  assert.equal([...store.keys()].filter(path => path.startsWith('appointments/')).length, 1)
})

test('appointment requests with a made-up property code or bad phone are refused', async () => {
  model(
    [{ functionCall: { name: 'request_appointment', args: { name: 'ก', phone: '123', propertyCode: 'FAKE-1' } } }],
    [{ text: 'ขอเบอร์โทรอีกครั้งได้ไหมครับ' }],
  )
  await receive('นัดหน่อย')
  assert.equal([...store.keys()].filter(path => path.startsWith('appointments/')).length, 0)
  assert.equal(conversation().botPaused, undefined)
})

test('stays quiet when a teammate has been answering', async () => {
  store.set(`messenger_conversations/${CID}/messages/human`, { direction: 'outgoing', text: 'สวัสดีครับ', sentBy: 'uid-admin', timestamp: new Ts(NOW - 60_000) })
  model([{ text: 'x' }])
  await receive('ขอดูบ้านหน่อย')
  assert.equal(sent.length, 0)
})

test('a failure while sending the cards does not undo the text reply', async () => {
  model(
    [{ functionCall: { name: 'search_properties', args: {} } }],
    [{ functionCall: { name: 'show_property_cards', args: { codes: ['SPS-CD-9'] } } }],
    [{ text: 'มีคอนโดสวยครับ' }],
  )
  const original = sent.push.bind(sent)
  let count = 0
  sent.push = item => { count += 1; if (count === 2) throw new Error('image rejected'); return original(item) }
  await receive('มีคอนโดไหม')
  assert.equal(count, 2)
  assert.equal(stored.length, 1, 'only the text reply was stored')
})

test('uses the persona and FAQ from settings in the prompt it sends', async () => {
  store.set('messenger_settings/ai', { enabled: true, particle: 'ค่ะ', extraInstructions: 'เรียกลูกค้าว่าพี่' })
  store.set('messenger_faq/q1', { question: 'โอนบ้านกี่วัน', answer: 'ประมาณ 1 วันค่ะ', active: true })
  store.set('messenger_faq/q2', { question: 'ซ่อนอยู่', answer: 'ไม่ควรโผล่', active: false })
  let prompt = ''
  const { VertexAI } = fakes['@google-cloud/vertexai']
  const original = VertexAI.prototype.getGenerativeModel
  VertexAI.prototype.getGenerativeModel = function patched(options) {
    prompt = options.systemInstruction.parts[0].text
    return original.call(this, options)
  }
  try {
    model([{ text: 'ได้ค่ะ' }])
    await receive('สวัสดี')
  } finally {
    VertexAI.prototype.getGenerativeModel = original
  }
  assert.match(prompt, /คำลงท้าย "ค่ะ"/)
  assert.match(prompt, /โอนบ้านกี่วัน/)
  assert.ok(!prompt.includes('ไม่ควรโผล่'))
  assert.match(prompt, /เรียกลูกค้าว่าพี่/)
})


const LONG = 'ก'.repeat(300)

test('a reply over the limit is rewritten shorter by the model before it is sent', async () => {
  model([{ text: LONG }], [{ text: 'มีครับ 3 นอน ราคาประมาณ 2.1xxx ล้านบาท สนใจดูไหมครับ' }])
  await receive('มีบ้านไหม')
  assert.equal(sent.length, 1)
  assert.equal(sent[0].message.text, 'มีครับ 3 นอน ราคาประมาณ 2.1xxx ล้านบาท สนใจดูไหมครับ')
  assert.equal(modelScript.length, 0, 'both model calls were used')
})

test('if the rewrite is still too long or fails, the reply is cut instead', async () => {
  const words = Array.from({ length: 80 }, (_, i) => `คำที่${i}`).join(' ')
  model([{ text: words }], [{ text: words }])
  const first = await receive('ถามยาวๆ')
  assert.ok(sent[0].message.text.length <= 220)
  assert.ok(words.startsWith(sent[0].message.text))

  sent.length = 0
  store.delete(`messenger_conversations/${CID}/messages/${first}`) // answered (stored replies are not kept by this fake)
  model([{ text: words }], [])
  modelScript.push(async () => { throw new Error('model down') })
  await receive('ถามอีกที')
  assert.ok(sent[0].message.text.length <= 220)
})

test('a reply within the limit is sent as is with no extra model call', async () => {
  model([{ text: 'สวัสดีครับ ผมเป็นผู้ช่วย AI ของ SPS ครับ' }])
  await receive('สวัสดี')
  assert.equal(sent.length, 1)
  assert.equal(modelScript.length, 0)
})

test('the limit comes from settings and links do not count toward it', async () => {
  store.set('messenger_settings/ai', { enabled: true, maxReplyChars: 100 })
  model([{ text: 'ก'.repeat(150) }], [{ text: 'สั้นลงแล้วครับ' }])
  await receive('x')
  assert.equal(sent[0].message.text, 'สั้นลงแล้วครับ')

  sent.length = 0
  store.set('messenger_settings/ai', { enabled: true })
  model(
    [{ functionCall: { name: 'search_properties', args: {} } }],
    [{ text: `${'ก'.repeat(150)} https://spspropertysolution.com/p/prop1` }],
  )
  await receive('มีไหม')
  assert.ok(sent[0].message.text.includes('/p/prop1'), 'a link must not force a rewrite')
  assert.equal(modelScript.length, 0)
})


// ─── Loan estimate through the trigger ───────────────────────────────────────

test('estimates a loan from a public price and keeps the bot on when it is clear', async () => {
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ' })
  model(
    [{ functionCall: { name: 'search_properties', args: { location: 'ศรีราชา' } } }],
    [{ functionCall: { name: 'estimate_loan', args: { propertyCode: 'SPS-CD-9', monthlyIncome: 60000, monthlyDebt: 0 } } }],
    [{ text: 'เบื้องต้นผ่อนประมาณ 5,400 บาท/เดือนครับ (ดาวน์ 20% 30 ปี) เป็นประมาณการเท่านั้นนะครับ' }],
  )
  await receive('คอนโดศรีราชากู้ได้ไหม รายได้ 60000')
  assert.equal(sent.length, 1)
  assert.equal(conversation().loanEstimate.verdict, 'likely')
  assert.equal(conversation().loanEstimate.needsTeam, false)
  assert.equal(conversation().loanEstimate.price, 1500000)
  assert.equal(conversation().botPaused, undefined)
})

test('a hidden-price listing is never used for the calculation', async () => {
  const calls = []
  model(
    [{ functionCall: { name: 'search_properties', args: { location: 'พานทอง' } } }],
    [{ functionCall: { name: 'estimate_loan', args: { propertyCode: 'SPS-TH-1', monthlyIncome: 50000 } } }],
    [{ text: 'ทีมงานกำลังดำเนินการคำนวณให้ครับ รบกวนฝากเบอร์ติดต่อด้วยนะครับ' }],
  )
  await receive('ทาวน์โฮมพานทองกู้ได้ไหม')
  assert.equal(conversation().loanEstimate.reason, 'price-hidden')
  assert.equal(conversation().loanEstimate.monthlyPayment, undefined)
  assert.equal(conversation().loanEstimate.price, undefined)
  assert.ok(!JSON.stringify(sent).includes('2150000'))
  void calls
})

test('an estimate the bot cannot settle waits for a phone number, then hands over once', async () => {
  // Turn 1: no income -> team follow-up, but no phone yet so the bot stays on to ask for it.
  model(
    [{ functionCall: { name: 'estimate_loan', args: { price: 2500000 } } }],
    [{ text: 'ผ่อนประมาณ 9,000 บาท/เดือนครับ ทีมงานกำลังดำเนินการให้ รบกวนฝากเบอร์ติดต่อด้วยครับ' }],
  )
  await receive('งบ 2.5 ล้าน กู้ได้ไหม')
  assert.equal(conversation().loanEstimate.needsTeam, true)
  assert.equal(conversation().botPaused, undefined)

  // Turn 2: the customer gives a phone number -> handed to a teammate.
  model(
    [{ functionCall: { name: 'save_customer_info', args: { name: 'สมชาย', phone: '0812345678' } } }],
    [{ text: 'ได้ครับ ทีมงานจะติดต่อกลับเร็วๆ นี้นะครับ' }],
  )
  await receive('0812345678')
  assert.equal(conversation().contact.phone, '0812345678')
  assert.equal(conversation().botPaused, true)
  assert.equal(conversation().needsHuman, true)
  assert.match(conversation().handoffReason, /ประเมินสินเชื่อ/)
  assert.equal(conversation().loanEstimate.needsTeam, false)
})

test('resuming the bot after a loan hand-over does not hand over again', async () => {
  store.set('messenger_conversations/conv1', {
    pageId: 'P1', participantId: 'U1', pageName: 'เพจ',
    contact: { phone: '0812345678' }, loanEstimate: { needsTeam: false, verdict: 'unlikely' },
  })
  model([{ text: 'ได้ครับ' }])
  await receive('ขอบคุณครับ')
  assert.equal(conversation().botPaused, undefined)
})

test('a phone number already on file hands over right away when the estimate cannot be settled', async () => {
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', contact: { phone: '0899999999' } })
  model(
    [{ functionCall: { name: 'estimate_loan', args: { price: 2500000, downPayment: 300000, monthlyIncome: 20000, monthlyDebt: 2000 } } }],
    [{ text: 'ผ่อนประมาณ 9,900 บาท/เดือนครับ ทีมงานกำลังดำเนินการให้ จะติดต่อกลับทางเบอร์ที่ให้ไว้ครับ' }],
  )
  await receive('รายได้ 20000 กู้ได้ไหม')
  assert.equal(conversation().botPaused, true)
  assert.match(conversation().handoffReason, /ประเมินสินเชื่อ/)
})

// ─── Which property is the customer talking about? ───────────────────────────
async function capturePrompt(run) {
  let prompt = ''
  const { VertexAI } = fakes['@google-cloud/vertexai']
  const original = VertexAI.prototype.getGenerativeModel
  VertexAI.prototype.getGenerativeModel = function patched(options) {
    prompt = options.systemInstruction.parts[0].text
    return original.call(this, options)
  }
  try { await run() } finally { VertexAI.prototype.getGenerativeModel = original }
  return prompt
}

test('a pasted link is turned into the listing the customer means', async () => {
  const prompt = await capturePrompt(async () => {
    model([{ text: 'ราคาประมาณ 2.1xxx ล้านบาทครับ' }])
    await receive('สนใจหลังนี้ https://spspropertysolution.com/p/prop1 ราคาเท่าไหร่')
  })
  assert.match(prompt, /ทรัพย์ที่ลูกค้ากำลังพูดถึง/)
  assert.match(prompt, /SPS-TH-1/)
  assert.ok(!prompt.includes('2150000'))
  assert.equal(conversation().currentPropertyCode, 'SPS-TH-1')
  assert.match(sent[0].message.text, /2\.1xxx/)
})

test('a listing code in the message is recognised and the link to it is allowed in the reply', async () => {
  const prompt = await capturePrompt(async () => {
    model([{ text: 'หลังนี้ดูได้ที่ https://spspropertysolution.com/p/prop2 ครับ' }])
    await receive('ขอดู sps-cd-9 หน่อย')
  })
  assert.match(prompt, /SPS-CD-9/)
  assert.equal(conversation().currentPropertyCode, 'SPS-CD-9')
  assert.ok(sent[0].message.text.includes('https://spspropertysolution.com/p/prop2'))
})

test('the property being discussed is remembered for the next message', async () => {
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', currentPropertyCode: 'SPS-CD-9' })
  const prompt = await capturePrompt(async () => {
    model([{ text: 'ได้ครับ' }])
    await receive('มีสระว่ายน้ำไหม')
  })
  assert.match(prompt, /SPS-CD-9/)
})

test('an unknown code or link adds nothing and nothing is remembered', async () => {
  const prompt = await capturePrompt(async () => {
    model([{ text: 'ขอรหัสที่ถูกต้องอีกทีครับ' }])
    await receive('สนใจ SPS-XX-999 และ https://spspropertysolution.com/p/nope0000')
  })
  assert.ok(!prompt.includes('ทรัพย์ที่ลูกค้ากำลังพูดถึง'))
  assert.equal(conversation().currentPropertyCode, undefined)
})

test('get_property returns one listing with the price still masked and remembers it', async () => {
  model(
    [{ functionCall: { name: 'get_property', args: { code: 'SPS-TH-1' } } }],
    [{ text: 'หลังนี้ราคาประมาณ 2.1xxx ล้านบาทครับ' }],
  )
  await receive('ขอรายละเอียด SPS-TH-1')
  assert.equal(conversation().currentPropertyCode, 'SPS-TH-1')
  assert.ok(!JSON.stringify(sent).includes('2150000'))
})

test('get_property for a code that does not exist is refused', async () => {
  model(
    [{ functionCall: { name: 'get_property', args: { code: 'NOPE-1' } } }],
    [{ text: 'ไม่พบรหัสนี้ครับ ช่วยเช็กรหัสอีกทีนะครับ' }],
  )
  await receive('ขอดู NOPE-1')
  assert.equal(conversation().currentPropertyCode, undefined)
})

test('showing a single card makes it the property being discussed', async () => {
  model(
    [{ functionCall: { name: 'search_properties', args: { location: 'ศรีราชา' } } }],
    [{ functionCall: { name: 'show_property_cards', args: { codes: ['SPS-CD-9'] } } }],
    [{ text: 'มีคอนโดศรีราชาครับ ดูการ์ดได้เลยครับ' }],
  )
  await receive('มีคอนโดศรีราชาไหม')
  assert.equal(conversation().currentPropertyCode, 'SPS-CD-9')
})

// ─── Pictures ────────────────────────────────────────────────────────────────
const STORAGE_URL = 'https://firebasestorage.googleapis.com/v0/b/x/o/messenger%2Fa?alt=media&token=t'
const PNG = Buffer.from('89504e470d0a1a0a0000', 'hex')

async function receiveWith({ text = '', attachments = [] }) {
  const id = `m${store.size}`
  store.set(`messenger_conversations/${CID}/messages/${id}`, { direction: 'incoming', text, attachments, timestamp: new Ts(NOW) })
  await facebookAiReply.run(new DocRef(`messenger_conversations/${CID}/messages/${id}`).snap(), { params: { conversationId: CID, messageDocId: id } })
}
let seenContents
const spyModel = reply => { modelScript = [async contents => { seenContents = contents; return [{ text: reply }] }] }

test('with pictures enabled the model gets the customer\'s picture along with the text', async () => {
  store.set('messenger_settings/ai', { enabled: true, imagesEnabled: true })
  const fetched = []
  _test.setImageFetcher(async url => { fetched.push(url); return { mimeType: 'image/png', buffer: PNG } })
  spyModel('หลังนี้ใช่ SPS-TH-1 ไหมครับ')
  await receiveWith({ text: 'สนใจหลังนี้', attachments: [{ type: 'image', url: STORAGE_URL }] })
  assert.deepEqual(fetched, [STORAGE_URL])
  const last = seenContents[seenContents.length - 1]
  assert.equal(last.role, 'user')
  assert.equal(last.parts.at(-1).inlineData.mimeType, 'image/png')
  assert.equal(last.parts.at(-1).inlineData.data, PNG.toString('base64'))
  assert.equal(sent.length, 1)
})

test('a picture on its own is answered when pictures are enabled', async () => {
  store.set('messenger_settings/ai', { enabled: true, imagesEnabled: true })
  _test.setImageFetcher(async () => ({ mimeType: 'image/jpeg', buffer: PNG }))
  spyModel('เห็นรูปแล้วครับ หลังนี้รหัสอะไรครับ')
  await receiveWith({ attachments: [{ type: 'image', url: STORAGE_URL }] })
  assert.equal(sent.length, 1)
  assert.equal(seenContents.at(-1).parts.length, 2)
})

test('with pictures off a lone picture gets no reply and a picture with text is answered without the image', async () => {
  _test.setImageFetcher(async () => { throw new Error('must not fetch') })
  spyModel('ดูรูปไม่ได้ครับ พิมพ์รหัสทรัพย์ให้หน่อยนะครับ')
  await receiveWith({ attachments: [{ type: 'image', url: STORAGE_URL }] })
  assert.equal(sent.length, 0)
  await receiveWith({ text: 'หลังนี้ราคาเท่าไหร่', attachments: [{ type: 'image', url: STORAGE_URL }] })
  assert.equal(sent.length, 1)
  assert.ok(!JSON.stringify(seenContents).includes('inlineData'))
})

test('a picture that cannot be fetched, is too big or is not an image does not break the reply', async () => {
  store.set('messenger_settings/ai', { enabled: true, imagesEnabled: true, maxImagesPerMessage: 3 })
  const results = [
    async () => { throw new Error('boom') },
    async () => ({ mimeType: 'image/gif', buffer: PNG }),
    async () => ({ mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024) }),
  ]
  let call = 0
  _test.setImageFetcher(async () => results[call++]())
  spyModel('ขอรหัสทรัพย์ด้วยนะครับ')
  await receiveWith({
    text: 'ดูรูปนี้',
    attachments: [1, 2, 3].map(n => ({ type: 'image', url: `https://scontent.xx.fbcdn.net/${n}.jpg` })),
  })
  assert.equal(call, 3)
  assert.equal(sent.length, 1)
  assert.ok(!JSON.stringify(seenContents).includes('inlineData'))
})

test('only the allowed number of pictures is read, and other hosts or stickers are never fetched', async () => {
  store.set('messenger_settings/ai', { enabled: true, imagesEnabled: true, maxImagesPerMessage: 1 })
  const fetched = []
  _test.setImageFetcher(async url => { fetched.push(url); return { mimeType: 'image/png', buffer: PNG } })
  spyModel('ได้ครับ')
  await receiveWith({
    text: 'ดู',
    attachments: [
      { type: 'image', url: 'https://evil.example/x.png' },
      { type: 'image', stickerId: 1, url: 'https://scontent.xx.fbcdn.net/s.png' },
      { type: 'image', url: 'https://scontent.xx.fbcdn.net/1.jpg' },
      { type: 'image', url: 'https://scontent.xx.fbcdn.net/2.jpg' },
    ],
  })
  assert.deepEqual(fetched, ['https://scontent.xx.fbcdn.net/1.jpg'])
})

// ─── "Property first" mode ───────────────────────────────────────────────────

test('with "property first" on and no property, the AI stays silent and the chat is flagged', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  model([{ text: 'ต้องไม่ถูกส่ง' }])
  await receive('ราคาเท่าไหร่ครับ')
  assert.equal(sent.length, 0)
  assert.equal(conversation().needsProperty, true)
  assert.equal(modelScript.length, 1) // the model was never called
})

test('a property set by the team lets the AI answer, and clears the flag', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', currentPropertyCode: 'SPS-CD-9', needsProperty: true })
  const prompt = await capturePrompt(async () => {
    model([{ text: 'ราคา 1,500,000 บาทครับ' }])
    await receive('ราคาเท่าไหร่ครับ')
  })
  assert.equal(sent.length, 1)
  assert.match(prompt, /SPS-CD-9/)
  assert.equal(conversation().needsProperty, undefined)
})

test('a customer who names the property with a code or link also lets the AI answer', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  model([{ text: 'ได้ครับ' }])
  await receive('สนใจ SPS-CD-9')
  assert.equal(sent.length, 2) // the answer, then the card of the house the customer named
  assert.equal(conversation().currentPropertyCode, 'SPS-CD-9')
})

test('a property that is no longer available does not count', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', currentPropertyCode: 'SOLD-1' })
  model([{ text: 'ต้องไม่ถูกส่ง' }])
  await receive('ราคาเท่าไหร่ครับ')
  assert.equal(sent.length, 0)
})

test('without "property first" the AI answers as before', async () => {
  model([{ text: 'สวัสดีครับ' }])
  await receive('สวัสดี')
  assert.equal(sent.length, 1)
  assert.equal(conversation().needsProperty, undefined)
})

test('when the AI moves to another property it drops the saved title of the old one', async () => {
  store.set('messenger_conversations/conv1', {
    pageId: 'P1', participantId: 'U1', pageName: 'เพจ',
    currentPropertyCode: 'SPS-TH-1', currentPropertyId: 'prop1', currentPropertyTitle: 'ทาวน์โฮมสวย', currentPropertySetBy: 'u1',
  })
  model([{ text: 'ได้ครับ' }])
  await receive('แล้ว SPS-CD-9 ล่ะ')
  assert.equal(conversation().currentPropertyCode, 'SPS-CD-9')
  assert.equal(conversation().currentPropertyTitle, undefined)
  assert.equal(conversation().currentPropertySetBy, undefined)
})

// ─── House details written by the team ───────────────────────────────────────

test('house details written by the team go into the prompt and let the AI answer in "property first" mode', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  store.set('messenger_conversations/conv1', {
    pageId: 'P1', participantId: 'U1', pageName: 'เพจ', needsProperty: true,
    staffNote: 'บ้านเดี่ยวหลังริม 3 นอน มีที่จอดรถ 2 คัน โปรโมชันฟรีค่าโอนถึงสิ้นเดือน',
  })
  const prompt = await capturePrompt(async () => {
    model([{ text: 'หลังริมมีครับ จอดรถได้ 2 คันครับ' }])
    await receive('หลังริมไหมคะ')
  })
  assert.equal(sent.length, 1)
  assert.match(prompt, /บ้านของแชทนี้ \(สำคัญที่สุด/)
  assert.match(prompt, /รายละเอียดบ้านที่ทีมงานเขียนไว้สำหรับแชทนี้/)
  assert.match(prompt, /ที่จอดรถ 2 คัน/)
  assert.equal(conversation().needsProperty, undefined)
})

test('a blank note does not count, and without one the prompt has no team-details section', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', staffNote: '   ' })
  model([{ text: 'ต้องไม่ถูกส่ง' }])
  await receive('หลังริมไหมคะ')
  assert.equal(sent.length, 0)
  store.set('messenger_settings/ai', { enabled: true })
  const prompt = await capturePrompt(async () => { model([{ text: 'ครับ' }]); await receive('สวัสดีครับ') })
  assert.ok(!prompt.includes('บ้านของแชทนี้'))
  assert.ok(!prompt.includes('รายละเอียดบ้านที่ทีมงานเขียนไว้สำหรับแชทนี้'))
})

test('the prompt tells the AI not to ask the customer for a listing code first', async () => {
  const prompt = await capturePrompt(async () => { model([{ text: 'ครับ' }]); await receive('สวัสดี') })
  assert.match(prompt, /ห้ามขอ "รหัสทรัพย์" จากลูกค้าเป็นอย่างแรก/)
})

// ─── Credit profile, house images, nearby zones ──────────────────────────────

test('what the customer says about their finances is saved for the team, not decided on', async () => {
  model(
    [{ functionCall: { name: 'save_credit_profile', args: { occupation: 'salaried', monthlyIncome: 42000, monthlyDebt: 0, employmentYears: 3, coBorrower: false, creditIssue: 'none', age: 5 } } }],
    [{ text: 'รับทราบครับ ขอเบอร์ติดต่อให้ทีมงานช่วยเช็กวงเงินได้ไหมครับ' }],
  )
  await receive('เป็นพนักงานประจำ เงินเดือน 42000 ไม่มีหนี้ ทำงาน 3 ปี')
  const profile = conversation().creditProfile
  assert.equal(profile.occupation, 'พนักงานประจำ')
  assert.equal(profile.monthlyIncome, 42000)
  assert.equal(profile.monthlyDebt, 0)
  assert.equal(profile.employmentYears, 3)
  assert.equal(profile.coBorrower, false)
  assert.equal(profile.creditIssue, 'none')
  assert.equal(profile.age, undefined) // an impossible age is dropped
  assert.equal(conversation().botPaused, undefined)
})

test('the team\'s credit checklist reaches the prompt', async () => {
  store.set('messenger_settings/ai', { enabled: true, creditChecklist: 'ถามแค่ว่าเป็นพนักงานประจำหรือไม่' })
  const prompt = await capturePrompt(async () => { model([{ text: 'ครับ' }]); await receive('กู้ได้ไหม') })
  assert.match(prompt, /ถามแค่ว่าเป็นพนักงานประจำหรือไม่/)
  assert.ok(!prompt.includes('NCB ดึงล่าสุด'))
})

const HOUSE_IMAGES = [
  { url: 'https://firebasestorage.googleapis.com/v0/b/x/o/plan1?alt=media', caption: 'แปลนชั้น 1' },
  { url: 'https://firebasestorage.googleapis.com/v0/b/x/o/plan2?alt=media', caption: 'แปลนชั้น 2' },
]

test('the team\'s house pictures are sent only when the customer asks, as images after the reply', async () => {
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', staffImages: HOUSE_IMAGES })
  const prompt = await capturePrompt(async () => {
    model(
      [{ functionCall: { name: 'send_house_images', args: {} } }],
      [{ text: 'ส่งแบบบ้านให้แล้วครับ' }],
    )
    await receive('ขอดูแบบบ้านหน่อยครับ')
  })
  assert.match(prompt, /แนบรูปแบบบ้านไว้ในแชทนี้ 2 รูป/)
  assert.equal(sent.length, 3)
  assert.equal(sent[0].message.text, 'ส่งแบบบ้านให้แล้วครับ')
  assert.deepEqual(sent.slice(1).map(item => item.message.attachment.payload.url), HOUSE_IMAGES.map(image => image.url))
  assert.equal(sent[1].message.attachment.type, 'image')
  const imageMessages = stored.filter(message => message.extra?.kind === 'images')
  assert.equal(imageMessages.length, 2)
  assert.equal(imageMessages[0].attachments[0].url, HOUSE_IMAGES[0].url)
  assert.equal(imageMessages[0].sentBy, 'ai')
})

test('house pictures are not sent when the model does not call the tool', async () => {
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', staffImages: HOUSE_IMAGES })
  model([{ text: 'สวัสดีครับ' }])
  await receive('สวัสดี')
  assert.equal(sent.length, 1)
})

test('asking for house pictures when the team attached none is told so and sends nothing', async () => {
  let answer
  modelScript = [
    async () => [{ functionCall: { name: 'send_house_images', args: {} } }],
    async contents => { answer = contents.at(-1).parts[0].functionResponse.response; return [{ text: 'ทีมงานจะส่งให้ครับ ขอเบอร์ติดต่อด้วยนะครับ' }] },
  ]
  await receive('ขอแปลนหน่อย')
  assert.equal(answer.ok, false)
  assert.equal(sent.length, 1)
})

test('a failure while sending house pictures does not undo the text reply', async () => {
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', staffImages: HOUSE_IMAGES })
  model(
    [{ functionCall: { name: 'send_house_images', args: {} } }],
    [{ text: 'ส่งแบบบ้านให้แล้วครับ' }],
  )
  const original = sent.push.bind(sent)
  let count = 0
  sent.push = item => { count += 1; if (count === 2) throw new Error('image rejected'); return original(item) }
  await receive('ขอดูแบบบ้าน')
  assert.equal(count, 2) // the first picture failed and the rest were not tried
  assert.equal(stored[0].text, 'ส่งแบบบ้านให้แล้วครับ')
  assert.equal(stored.filter(message => message.extra?.kind === 'images').length, 0)
})

test('at most four house pictures are sent in one go', async () => {
  const many = Array.from({ length: 6 }, (_, n) => ({ url: `https://firebasestorage.googleapis.com/v0/b/x/o/p${n}?alt=media`, caption: '' }))
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', staffImages: many })
  model([{ functionCall: { name: 'send_house_images', args: {} } }], [{ text: 'ส่งให้แล้วครับ' }])
  await receive('ขอรูปแบบบ้านทั้งหมด')
  assert.equal(sent.length, 1 + 4)
})

test('an area with no listings is not filled with other zones unless the customer agrees', async () => {
  let first
  modelScript = [
    async () => [{ functionCall: { name: 'search_properties', args: { location: 'ภูเก็ต' } } }],
    async contents => { first = contents.at(-1).parts[0].functionResponse.response; return [{ text: 'ตรงนั้นยังไม่มีครับ สนใจโซนใกล้เคียงไหมครับ' }] },
  ]
  await receive('มีบ้านที่ภูเก็ตไหม')
  assert.equal(first.total, 0)
  assert.equal(first.nearbyZonesAvailable, true)
  assert.deepEqual(first.results, [])
  assert.equal(sent.length, 1) // no cards from another zone

  let second
  modelScript = [
    async () => [{ functionCall: { name: 'search_properties', args: { location: 'ภูเก็ต', allowNearbyZones: true } } }],
    async contents => { second = contents.at(-1).parts[0].functionResponse.response; return [{ text: 'โซนใกล้เคียงมีครับ' }] },
  ]
  await receive('ได้ครับ โซนใกล้เคียงก็ได้')
  assert.ok(second.total > 0)
})

// ─── Houses typed in by the team ─────────────────────────────────────────────
const PIC = n => ({ url: `https://firebasestorage.googleapis.com/v0/b/x/o/h${n}?alt=media`, caption: `รูป ${n}` })
const LISTINGS = [
  { id: 'aaa1', type: 'บ้านเดี่ยว', title: 'สวนสวย', listing: 'sale', bedrooms: 3, price: 2490000, priceNote: 'เริ่มต้น', priceVisible: true, details: 'ที่จอดรถ 2 คัน', images: [PIC(1), PIC(2)] },
  { id: 'bbb2', type: 'บ้านแฝด', title: 'แฝดสุขใจ', listing: 'sale', bedrooms: 3, price: 1850000, priceVisible: false, details: 'ใกล้นิคม', images: [PIC(3)] },
]
const withListings = (listings, extra = {}) => store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', staffListings: listings, attachedShownAt: new Ts(NOW - 1000), ...extra })

test('the AI answers from houses the team typed in, with their prices and no web link', async () => {
  withListings(LISTINGS)
  const prompt = await capturePrompt(async () => {
    model([{ text: 'บ้านเดี่ยวเริ่มต้น 2,490,000 บาท ส่วนบ้านแฝดประมาณ 1.8xxx ล้านบาทครับ' }])
    await receive('มีบ้านเดี่ยวกับบ้านแฝดราคาเท่าไหร่คะ')
  })
  assert.match(prompt, /id=aaa1 \| บ้านเดี่ยว สวนสวย/)
  assert.match(prompt, /ราคา: 2,490,000 บาท \(เริ่มต้น\)/)
  assert.match(prompt, /id=bbb2 \| บ้านแฝด แฝดสุขใจ/)
  assert.match(prompt, /ประมาณ 1\.8xxx ล้านบาท/)
  assert.ok(!prompt.includes('1850000') && !prompt.includes('1,850,000'))
  assert.equal(sent.length, 1)
})

test('a price the team marked "do not tell" is blocked if the AI says it anyway', async () => {
  withListings(LISTINGS)
  model([{ text: 'บ้านแฝดราคา 1,850,000 บาทครับ' }])
  await receive('บ้านแฝดราคาเท่าไหร่')
  assert.doesNotMatch(sent[0].message.text, /1,850,000/)
  assert.equal(conversation().botPaused, true)
  assert.match(conversation().handoffReason, /ราคาจริง/)
})

test('a visible typed-in price can be said freely', async () => {
  withListings(LISTINGS)
  model([{ text: 'บ้านเดี่ยวเริ่มต้น 2,490,000 บาทครับ' }])
  await receive('บ้านเดี่ยวราคาเท่าไหร่')
  assert.match(sent[0].message.text, /2,490,000/)
  assert.equal(conversation().botPaused, undefined)
})

test('plans are sent for the house the customer asked about, by listingId', async () => {
  withListings(LISTINGS)
  model(
    [{ functionCall: { name: 'send_house_images', args: { listingId: 'bbb2' } } }],
    [{ text: 'ส่งแปลนบ้านแฝดให้แล้วครับ' }],
  )
  await receive('ขอดูแปลนบ้านแฝดหน่อยครับ')
  assert.equal(sent.length, 2)
  assert.equal(sent[1].message.attachment.payload.url, PIC(3).url)
  assert.equal(stored.filter(message => message.extra?.kind === 'images').length, 1)
})

test('with pictures on several houses and no listingId the AI is asked which one; one wrong id is refused', async () => {
  withListings(LISTINGS)
  const answers = []
  const attempt = args => {
    modelScript = [
      async () => [{ functionCall: { name: 'send_house_images', args } }],
      async contents => { answers.push(contents.at(-1).parts[0].functionResponse.response); return [{ text: 'ครับ' }] },
    ]
    return receive('ขอดูแปลน')
  }
  await attempt({})
  await attempt({ listingId: 'nope' })
  assert.match(answers[0].error, /listingId/)
  assert.equal(answers[1].ok, false)
  assert.equal(sent.filter(item => item.message.attachment).length, 0)
})

test('with exactly one house that has pictures, no listingId is needed', async () => {
  withListings([LISTINGS[1]])
  model([{ functionCall: { name: 'send_house_images', args: {} } }], [{ text: 'ส่งให้แล้วครับ' }])
  await receive('ขอดูแปลน')
  assert.equal(sent.length, 2)
  assert.equal(sent[1].message.attachment.payload.url, PIC(3).url)
})

test('chat-level pictures win when there are some, and a house without pictures says so', async () => {
  withListings([{ ...LISTINGS[0], images: [] }], { staffImages: [PIC(9)] })
  model([{ functionCall: { name: 'send_house_images', args: {} } }], [{ text: 'ส่งให้แล้วครับ' }])
  await receive('ขอดูแปลน')
  assert.equal(sent[1].message.attachment.payload.url, PIC(9).url)

  withListings([{ ...LISTINGS[0], images: [] }])
  let answer
  modelScript = [
    async () => [{ functionCall: { name: 'send_house_images', args: { listingId: 'aaa1' } } }],
    async contents => { answer = contents.at(-1).parts[0].functionResponse.response; return [{ text: 'ทีมงานจะส่งให้ครับ' }] },
  ]
  await receive('ขอดูแปลนอีกที')
  assert.equal(answer.ok, false)
})

test('in "property first" mode houses typed in by the team count as house details', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  withListings(LISTINGS, { needsProperty: true })
  model([{ text: 'มีครับ' }])
  await receive('มีบ้านไหมคะ')
  assert.equal(sent.length, 1)
  assert.equal(conversation().needsProperty, undefined)
})

// ─── Google Calendar bookings ────────────────────────────────────────────────
const bangkokDate = daysAhead => {
  const date = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + daysAhead)
  return date.toISOString().slice(0, 10)
}
// The next weekday (Mon-Sat) at least 3 days away, so notice time never matters.
const nextOpenDay = () => {
  for (let ahead = 3; ahead < 12; ahead += 1) {
    const date = bangkokDate(ahead)
    if (new Date(`${date}T00:00:00Z`).getUTCDay() !== 0) return date
  }
}
const nextSunday = () => {
  for (let ahead = 3; ahead < 12; ahead += 1) {
    const date = bangkokDate(ahead)
    if (new Date(`${date}T00:00:00Z`).getUTCDay() === 0) return date
  }
}

function fakeCalendar({ busy = [], failFreeBusy = false, failInsert = false } = {}) {
  const calls = { freeBusy: 0, inserted: [], deleted: [] }
  const client = {
    freeBusy: async () => {
      calls.freeBusy += 1
      if (failFreeBusy) throw new Error('Google Calendar: boom')
      return [...busy, ...calls.inserted.map(event => ({ start: event.start.dateTime, end: event.end.dateTime }))]
    },
    insertEvent: async (calendarId, event) => {
      if (failInsert) throw new Error('Google Calendar: insert failed')
      calls.inserted.push({ calendarId, ...event })
      return { id: event.id, htmlLink: `https://calendar.example/${event.id}`, duplicate: false }
    },
    deleteEvent: async (calendarId, id) => { calls.deleted.push(id) },
  }
  _test.setCalendarClientFactory(() => client)
  return calls
}
const CAL = { enabled: true, calendarEnabled: true, calendarId: 'team@group.calendar.google.com' }
const appointments = () => [...store.entries()].filter(([path]) => path.startsWith('appointments/')).map(([, data]) => data)
const busyOn = (date, from, to) => ({ start: `${date}T${from}:00+07:00`, end: `${date}T${to}:00+07:00` })
const book = (date, time, extra = {}) => ({ name: 'สมชาย', phone: '0812345678', propertyCode: 'SPS-TH-1', date, time, ...extra })

test('check_availability lists the free start times of an open day', async () => {
  store.set('messenger_settings/ai', CAL)
  const day = nextOpenDay()
  fakeCalendar({ busy: [busyOn(day, '09:00', '12:00')] })
  let answer
  modelScript = [
    async () => [{ functionCall: { name: 'check_availability', args: { date: day } } }],
    async contents => { answer = contents.at(-1).parts[0].functionResponse.response; return [{ text: 'ว่างบ่ายครับ' }] },
  ]
  await receive('นัดชมวันนั้นได้ไหม')
  assert.equal(answer.open, true)
  assert.equal(answer.durationMinutes, 90)
  assert.ok(!answer.anyFreeStartTimes.includes('10:00'))
  assert.ok(answer.anyFreeStartTimes.includes('12:00'))
  assert.ok(answer.freeStartTimes.length <= 4)
})

test('check_availability: Sunday is closed, a bad date is refused, a Google failure is reported as unavailable', async () => {
  store.set('messenger_settings/ai', CAL)
  const answers = []
  const capture = date => [
    async () => [{ functionCall: { name: 'check_availability', args: { date } } }],
    async contents => { answers.push(contents.at(-1).parts[0].functionResponse.response); return [{ text: 'ครับ' }] },
  ]
  fakeCalendar()
  modelScript = capture(nextSunday()); await receive('วันอาทิตย์ได้ไหม')
  assert.equal(answers[0].open, false)
  modelScript = capture('2020-01-01'); await receive('วันที่ผ่านมาแล้ว')
  assert.equal(answers[1].ok, false)
  fakeCalendar({ failFreeBusy: true })
  modelScript = capture(nextOpenDay()); await receive('ลองอีกวัน')
  assert.equal(answers[2].unavailable, true)
})

test('a free time is booked: Google event, confirmed appointment for the LINE alert, and no hand-off', async () => {
  store.set('messenger_settings/ai', CAL)
  const day = nextOpenDay()
  const calls = fakeCalendar()
  let answer
  modelScript = [
    async () => [{ functionCall: { name: 'request_appointment', args: book(day, '10:30') } }],
    async contents => { answer = contents.at(-1).parts[0].functionResponse.response; return [{ text: `นัดเรียบร้อยแล้วครับ วันที่ ${day} เวลา 10:30` }] },
  ]
  await receive('นัดวันนั้น 10:30 ครับ')
  assert.equal(answer.confirmed, true)
  assert.equal(answer.time, '10:30')
  assert.equal(answer.endTime, '12:00')
  assert.equal(calls.inserted.length, 1)
  const event = calls.inserted[0]
  assert.equal(event.calendarId, 'team@group.calendar.google.com')
  assert.equal(event.start.dateTime, `${day}T10:30:00+07:00`)
  assert.equal(event.end.dateTime, `${day}T12:00:00+07:00`)
  assert.equal(event.start.timeZone, 'Asia/Bangkok')
  assert.match(event.summary, /SPS-TH-1/)
  assert.match(event.description, /0812345678/)
  assert.ok(!event.description.includes('2150000')) // a hidden price never goes into the calendar
  const [appointment] = appointments()
  assert.equal(appointment.status, 'confirmed')
  assert.equal(appointment.source, 'messenger-ai')
  assert.equal(appointment.date, day)
  assert.equal(appointment.time, '10:30')
  assert.equal(appointment.endTime, '12:00')
  assert.equal(appointment.calendarEventId, event.id)
  assert.equal(conversation().botPaused, undefined)
  assert.equal(conversation().contact.phone, '0812345678')
  assert.deepEqual(store.get(`appointment_locks/${day}`).holds, []) // the hold is released
})

test('a busy time is not booked and other free times are offered', async () => {
  store.set('messenger_settings/ai', CAL)
  const day = nextOpenDay()
  const calls = fakeCalendar({ busy: [busyOn(day, '10:00', '11:30')] })
  let answer
  modelScript = [
    async () => [{ functionCall: { name: 'request_appointment', args: book(day, '10:30') } }],
    async contents => { answer = contents.at(-1).parts[0].functionResponse.response; return [{ text: 'เวลานั้นไม่ว่างครับ 12:00 ได้ไหมครับ' }] },
  ]
  await receive('นัด 10:30')
  assert.equal(answer.confirmed, false)
  assert.equal(answer.reason, 'busy')
  assert.match(answer.error, /ห้ามบอกลูกค้าว่านัดแล้ว/)
  assert.ok(answer.freeStartTimes.length > 0)
  assert.ok(!answer.freeStartTimes.includes('10:30'))
  assert.equal(calls.inserted.length, 0)
  assert.equal(appointments().length, 0)
})

test('closed days, off-hours and odd minutes are refused without touching the calendar', async () => {
  store.set('messenger_settings/ai', CAL)
  const calls = fakeCalendar()
  const reasons = []
  const attempt = args => {
    modelScript = [
      async () => [{ functionCall: { name: 'request_appointment', args } }],
      async contents => { reasons.push(contents.at(-1).parts[0].functionResponse.response.reason); return [{ text: 'ครับ' }] },
    ]
    return receive('นัด')
  }
  await attempt(book(nextSunday(), '10:00'))
  await attempt(book(nextOpenDay(), '08:00'))
  await attempt(book(nextOpenDay(), '17:30'))
  await attempt(book(nextOpenDay(), '10:15'))
  assert.deepEqual(reasons, ['closed', 'outside-hours', 'outside-hours', 'bad-time'])
  assert.equal(calls.inserted.length, 0)
  assert.equal(appointments().length, 0)
})

test('a booking without a date and time asks for them first', async () => {
  store.set('messenger_settings/ai', CAL)
  const calls = fakeCalendar()
  let answer
  modelScript = [
    async () => [{ functionCall: { name: 'request_appointment', args: { name: 'สมชาย', phone: '0812345678', propertyCode: 'SPS-TH-1' } } }],
    async contents => { answer = contents.at(-1).parts[0].functionResponse.response; return [{ text: 'สะดวกวันไหนครับ' }] },
  ]
  await receive('อยากนัดชม')
  assert.equal(answer.ok, false)
  assert.equal(answer.confirmed, false)
  assert.equal(calls.inserted.length, 0)
})

test('asking for the same booking twice gives one event and one appointment', async () => {
  store.set('messenger_settings/ai', CAL)
  const day = nextOpenDay()
  const calls = fakeCalendar()
  const answers = []
  for (let n = 0; n < 2; n += 1) {
    modelScript = [
      async () => [{ functionCall: { name: 'request_appointment', args: book(day, '13:30') } }],
      async contents => { answers.push(contents.at(-1).parts[0].functionResponse.response); return [{ text: 'นัดเรียบร้อยครับ' }] },
    ]
    await receive('นัด 13:30 ครับ')
  }
  assert.equal(answers.every(answer => answer.confirmed === true), true)
  assert.equal(calls.inserted.length, 1)
  assert.equal(appointments().length, 1)
})

test('if Google cannot be reached the request goes to the team as before and nothing is confirmed', async () => {
  store.set('messenger_settings/ai', CAL)
  const day = nextOpenDay()
  fakeCalendar({ failFreeBusy: true })
  let answer
  modelScript = [
    async () => [{ functionCall: { name: 'request_appointment', args: book(day, '10:00') } }],
    async contents => { answer = contents.at(-1).parts[0].functionResponse.response; return [{ text: 'ส่งคำขอให้ทีมงานแล้วครับ' }] },
  ]
  await receive('นัด 10:00')
  assert.equal(answer.confirmed, false)
  assert.match(answer.message, /ห้ามบอกลูกค้าว่านัดแล้ว/)
  const [appointment] = appointments()
  assert.equal(appointment.status, 'pending')
  assert.equal(conversation().botPaused, true)
  assert.match(conversation().handoffReason, /ขอนัดชม/)
})

test('if creating the event fails, nothing is recorded as booked and the team is asked', async () => {
  store.set('messenger_settings/ai', CAL)
  const day = nextOpenDay()
  fakeCalendar({ failInsert: true })
  let answer
  modelScript = [
    async () => [{ functionCall: { name: 'request_appointment', args: book(day, '10:00') } }],
    async contents => { answer = contents.at(-1).parts[0].functionResponse.response; return [{ text: 'ส่งคำขอให้ทีมงานแล้วครับ' }] },
  ]
  await receive('นัด 10:00')
  assert.equal(answer.confirmed, false)
  assert.equal(appointments().filter(a => a.status === 'confirmed').length, 0)
  assert.equal(appointments()[0].status, 'pending')
  assert.deepEqual(store.get(`appointment_locks/${day}`).holds, [])
})

test('with the calendar off, appointments work exactly as before', async () => {
  store.set('messenger_settings/ai', { enabled: true })
  const day = nextOpenDay()
  let called = false
  _test.setCalendarClientFactory(() => { called = true; return {} })
  let tools
  modelScript = [
    async () => [{ functionCall: { name: 'request_appointment', args: book(day, '10:00') } }],
    async () => [{ text: 'ส่งคำขอให้ทีมงานแล้วครับ' }],
  ]
  await receive('นัด')
  assert.equal(called, false)
  assert.equal(appointments()[0].status, 'pending')
  assert.equal(conversation().botPaused, true)
  void tools
})

test('the prompt only talks about calendar booking when it is on', async () => {
  store.set('messenger_settings/ai', CAL)
  fakeCalendar()
  const on = await capturePrompt(async () => { model([{ text: 'ครับ' }]); await receive('สวัสดี') })
  assert.match(on, /check_availability/)
  assert.match(on, /จันทร์-เสาร์ 09:00-18:00 นัดละ 90 นาที/)
  assert.match(on, /confirmed เป็น true/)
  store.set('messenger_settings/ai', { enabled: true })
  const off = await capturePrompt(async () => { model([{ text: 'ครับ' }]); await receive('สวัสดีอีกที') })
  assert.ok(!off.includes('check_availability'))
  assert.match(off, /ทีมงานจะยืนยันเวลากลับ/)
})

test('two people cannot hold the same slot at once; holds expire and can be released', async () => {
  const db = fakes['firebase-admin'].firestore()
  assert.equal(await _test.holdSlot(db, '2030-01-07', 600, 690, 'a'), true)
  assert.equal(await _test.holdSlot(db, '2030-01-07', 630, 720, 'b'), false) // overlaps
  assert.equal(await _test.holdSlot(db, '2030-01-07', 690, 780, 'c'), true)  // touches only
  await _test.releaseSlot(db, '2030-01-07', 'a')
  assert.equal(await _test.holdSlot(db, '2030-01-07', 630, 720, 'd'), false) // still overlaps c? 630-720 vs 690-780 -> yes
  assert.equal(await _test.holdSlot(db, '2030-01-07', 600, 660, 'e'), true)
  const expired = store.get('appointment_locks/2030-01-07').holds.map(hold => ({ ...hold, expiresAt: 1 }))
  store.set('appointment_locks/2030-01-07', { holds: expired })
  assert.equal(await _test.holdSlot(db, '2030-01-07', 600, 690, 'f'), true)
})

// ─── What the AI knew, and starting a test again ─────────────────────────────

test('each AI answer records what it was based on, so the team can see whether it had the house details', async () => {
  store.set('messenger_conversations/conv1', {
    pageId: 'P1', participantId: 'U1', pageName: 'เพจ', currentPropertyCode: 'SPS-CD-9', currentPropertySetBy: 'admin1', staffNote: 'โปรโมชันฟรีค่าโอน',
    staffListings: [{ id: 'a1', title: 'บ้าน', images: [{ url: 'https://firebasestorage.googleapis.com/v0/b/x/o/1?alt=media' }] }],
    staffImages: [{ url: 'https://firebasestorage.googleapis.com/v0/b/x/o/2?alt=media' }],
  })
  model([{ functionCall: { name: 'search_properties', args: {} } }], [{ text: 'มีครับ' }])
  await receive('ราคาเท่าไหร่')
  const context = stored[0].extra.aiContext
  assert.deepEqual(context.properties, ['SPS-CD-9'])
  assert.equal(context.listings, 1)
  assert.equal(context.note, true)
  assert.equal(context.pictures, 2)
  assert.deepEqual(context.tools, ['search_properties'])
})

test('an answer given with no house information says so', async () => {
  model([{ text: 'สวัสดีครับ' }])
  await receive('สวัสดี')
  assert.deepEqual(stored[0].extra.aiContext, { properties: [], listings: 0, note: false, pictures: 0, tools: [] })
})

test('after a reset the AI does not see the earlier messages, greets again, and its limits start over', async () => {
  const resetAt = NOW - 1000
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', contextResetAt: new Ts(resetAt) })
  store.set('messenger_conversations/conv1/messages/old1', { direction: 'incoming', text: 'สนใจบ้านพานทอง', attachments: [], timestamp: new Ts(NOW - 60000) })
  store.set('messenger_conversations/conv1/messages/old2', { direction: 'outgoing', text: 'พอจะมีรหัสทรัพย์ไหมครับ', attachments: [], timestamp: new Ts(NOW - 50000), sentBy: 'ai' })
  store.set('messenger_conversations/conv1/messages/old3', { direction: 'outgoing', text: 'ทีมงานตอบเอง', attachments: [], timestamp: new Ts(NOW - 40000), sentBy: 'someAdmin' })
  let seen
  modelScript = [async contents => { seen = contents; return [{ text: 'สวัสดีครับ' }] }]
  const prompt = await capturePrompt(async () => { await receive('สวัสดีค่ะ') })
  const text = JSON.stringify(seen)
  assert.ok(!text.includes('สนใจบ้านพานทอง'))
  assert.ok(!text.includes('รหัสทรัพย์'))
  assert.ok(text.includes('สวัสดีค่ะ'))
  assert.equal(sent.length, 1) // the earlier human reply no longer keeps the AI quiet
  assert.match(prompt, /นี่คือการตอบครั้งแรก/)
})


// ─── Answering what is waiting (retry) ───────────────────────────────────────
async function requestRetry(id = 'r1') {
  store.set(`ai_retry_requests/${id}`, { conversationId: CID, reason: 'test' })
  await facebookAiRetry.run(new DocRef(`ai_retry_requests/${id}`).snap(), {})
}
const waitingMessage = (text, at = NOW - 30 * 60 * 1000) => store.set(`messenger_conversations/${CID}/messages/w1`, { direction: 'incoming', text, attachments: [], timestamp: new Ts(at) })

test('the customer who wrote before the house information existed is answered once it is added', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  // 1. the customer writes, the AI has nothing to go on and waits
  model([{ text: 'ต้องไม่ถูกส่ง' }])
  await receive('หลังนี้เท่าไหร่คะ')
  assert.equal(sent.length, 0)
  assert.equal(conversation().needsProperty, true)
  // 2. the team adds the house, the admin panel asks for an answer
  store.set('messenger_conversations/conv1', { ...conversation(), staffListings: [{ id: 'a1', type: 'บ้านแฝด', title: 'แฝดสุขใจ', price: 2190000, priceVisible: true }] })
  let prompt
  const { VertexAI } = fakes['@google-cloud/vertexai']
  const original = VertexAI.prototype.getGenerativeModel
  VertexAI.prototype.getGenerativeModel = function patched(options) { prompt = options.systemInstruction.parts[0].text; return original.call(this, options) }
  try {
    model([{ text: 'บ้านแฝดราคา 2,190,000 บาทครับ' }])
    await requestRetry()
  } finally { VertexAI.prototype.getGenerativeModel = original }
  assert.equal(sent.length, 2) // the answer, then the card of the house the team added
  assert.match(sent[0].message.text, /2,190,000/)
  assert.equal(sent[1].message.attachment.payload.template_type, 'generic')
  assert.match(sent[1].message.attachment.payload.elements[0].title, /แฝดสุขใจ/)
  assert.match(prompt, /แฝดสุขใจ/)
  assert.equal(conversation().needsProperty, undefined)
  assert.equal(stored[0].extra.aiContext.listings, 1)
})

test('a retry answers an old message and ignores an earlier reply from a person', async () => {
  store.set('messenger_conversations/conv1/messages/human1', { direction: 'outgoing', text: 'ทีมงานตอบเอง', attachments: [], timestamp: new Ts(NOW - 3 * 3600 * 1000), sentBy: 'someAdmin' })
  waitingMessage('ขอราคาหน่อยค่ะ') // 30 minutes old: too old for a normal reply
  model([{ text: 'ได้ครับ' }])
  await requestRetry()
  assert.equal(sent.length, 1)
})

test('the same message without a retry is not answered (too old, a person was active)', async () => {
  store.set('messenger_conversations/conv1/messages/human1', { direction: 'outgoing', text: 'ทีมงานตอบเอง', attachments: [], timestamp: new Ts(NOW - 3 * 3600 * 1000), sentBy: 'someAdmin' })
  model([{ text: 'ไม่ควรส่ง' }])
  await receive('ขอราคาหน่อยค่ะ', { at: NOW - 30 * 60 * 1000 })
  assert.equal(sent.length, 0)
})

test('a retry never answers a chat that is already answered', async () => {
  waitingMessage('ราคาเท่าไหร่', NOW - 60000)
  store.set('messenger_conversations/conv1/messages/a1', { direction: 'outgoing', text: 'ตอบแล้วครับ', attachments: [], timestamp: new Ts(NOW - 30000), sentBy: 'ai' })
  model([{ text: 'ต้องไม่ถูกส่ง' }])
  await requestRetry()
  assert.equal(sent.length, 0)
})

test('a retry respects the off switch and a paused chat', async () => {
  waitingMessage('ราคาเท่าไหร่', NOW - 60000)
  model([{ text: 'ต้องไม่ถูกส่ง' }])
  store.set('messenger_settings/ai', { enabled: false })
  await requestRetry('r1')
  store.set('messenger_settings/ai', { enabled: true })
  store.set('messenger_conversations/conv1', { ...conversation(), botPaused: true })
  await requestRetry('r2')
  assert.equal(sent.length, 0)
})

test('one request is handled once, and two close together do not both answer', async () => {
  waitingMessage('ราคาเท่าไหร่', NOW - 60000)
  model([{ text: 'ครับ' }], [{ text: 'ซ้ำ' }])
  await requestRetry('r1')
  await requestRetry('r1') // the same request delivered twice
  assert.equal(sent.length, 1)

  waitingMessage('มีอีกไหม', NOW - 1000)
  store.delete(`messenger_conversations/${CID}/messages/m2`)
  store.set('messenger_conversations/conv1', { ...conversation(), aiRetryLockUntil: Date.now() + 60000 })
  model([{ text: 'ต้องไม่ถูกส่ง' }])
  await requestRetry('r3')
  assert.equal(sent.length, 1) // locked: another retry is running
})

test('a retry that did not answer does not block the next one', async () => {
  waitingMessage('ราคาเท่าไหร่', NOW - 60000)
  modelScript = [async () => { throw new Error('model unavailable') }] // the AI cannot answer
  await requestRetry('r1')
  assert.equal(sent.length, 0)
  assert.equal(conversation().aiRetryLockUntil, undefined)
  model([{ text: 'ประมาณ 2.1xxx ล้านบาทครับ' }])
  await requestRetry('r2')
  assert.equal(sent.length, 1)
})

test('a retry for a conversation that does not exist or with nothing waiting does nothing', async () => {
  store.set('ai_retry_requests/rx', { conversationId: 'nope' })
  await facebookAiRetry.run(new DocRef('ai_retry_requests/rx').snap(), {})
  store.set('ai_retry_requests/ry', {})
  await facebookAiRetry.run(new DocRef('ai_retry_requests/ry').snap(), {})
  model([{ text: 'ต้องไม่ถูกส่ง' }])
  await requestRetry('rz') // the conversation has no messages at all
  assert.equal(sent.length, 0)
})

// ─── Several messages typed in a row ─────────────────────────────────────────
const addIncoming = (id, text, at, attachments = []) =>
  store.set(`messenger_conversations/${CID}/messages/${id}`, { direction: 'incoming', text, attachments, timestamp: new Ts(at) })
const runFor = id => facebookAiReply.run(new DocRef(`messenger_conversations/${CID}/messages/${id}`).snap(), { params: { conversationId: CID, messageDocId: id } })

test('messages typed in a row get one answer, from the run for the newest one', async () => {
  addIncoming('b1', 'สวัสดีครับ', NOW - 3000)
  addIncoming('b2', 'มีบ้านแถวพานทองไหม', NOW - 2000)
  addIncoming('b3', 'งบ 2 ล้าน', NOW - 1000)
  spyModel('มีครับ งบ 2 ล้านมีทาวน์โฮมครับ')
  await runFor('b1')
  await runFor('b2')
  assert.equal(sent.length, 0, 'older messages leave the answer to the newest one')
  await runFor('b3')
  assert.equal(sent.length, 1)
  const asked = seenContents[seenContents.length - 1].parts[0].text
  assert.match(asked, /สวัสดีครับ[\s\S]*พานทอง[\s\S]*งบ 2 ล้าน/)
  assert.deepEqual(slept, [15000, 15000, 15000])
})

test('a sticker after the question does not leave the question unanswered', async () => {
  addIncoming('s1', 'ราคาเท่าไหร่ครับ', NOW - 2000)
  addIncoming('s2', '', NOW - 1000, [{ type: 'image', url: 'https://scontent.fbcdn.net/s.png', stickerId: 369239263222822 }])
  model([{ text: 'ประมาณ 2.1xxx ล้านบาทครับ' }])
  await runFor('s1')
  assert.equal(sent.length, 1)
})

test('the wait can be changed or turned off, and a bad value uses the default', async () => {
  store.set('messenger_settings/ai', { enabled: true, replyDelaySeconds: 0 })
  model([{ text: 'ได้ครับ' }])
  await receive('สวัสดี')
  assert.deepEqual(slept, [])
  store.set('messenger_settings/ai', { enabled: true, replyDelaySeconds: 99 })
  model([{ text: 'ได้ครับ' }])
  await receive('มีบ้านไหม', { at: NOW + 1 })
  assert.deepEqual(slept, [15000])
})

test('a team retry does not wait', async () => {
  waitingMessage('ราคาเท่าไหร่', NOW - 60000)
  model([{ text: 'ประมาณ 2.1xxx ล้านบาทครับ' }])
  await requestRetry('rw')
  assert.equal(sent.length, 1)
  assert.deepEqual(slept, [])
})

test('a picture sent just before the question is seen with it', async () => {
  store.set('messenger_settings/ai', { enabled: true, imagesEnabled: true })
  const fetched = []
  _test.setImageFetcher(async url => { fetched.push(url); return { mimeType: 'image/png', buffer: PNG } })
  addIncoming('p1', '', NOW - 2000, [{ type: 'image', url: STORAGE_URL }])
  addIncoming('p2', 'หลังนี้ยังว่างไหม', NOW - 1000)
  spyModel('หลังนี้ใช่ SPS-TH-1 ไหมครับ')
  await runFor('p1')
  assert.equal(sent.length, 0)
  await runFor('p2')
  assert.deepEqual(fetched, [STORAGE_URL])
  assert.ok(seenContents[seenContents.length - 1].parts.some(part => part.inlineData))
})

// ─── Only a note, no property picked from the list ───────────────────────────
const TWIN_NOTE = `🏡 บ้านเเฝด 🗺️แยกมาบโป่ง เฟส8-10
2 ห้องนอน 2 ห้องน้ำ 1 ครัว 2 จอดรถ
✅ฟรีค่ามิเตอร์น้ำ
✅ฟรีถังสำรองน้ำ 1,000 ลิตร
พิกัด 📍
https://maps.app.goo.gl/38ManFKLBfZc8vE5A?g_st=ipc
 ราคา 2.19 ล้าน`

test('with only a note, the house in it comes first and the AI is told not to offer other houses', async () => {
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', staffNote: TWIN_NOTE })
  const prompt = await capturePrompt(async () => {
    model([{ text: 'บ้านแฝดแยกมาบโป่ง 2 นอน 2 น้ำ ราคา 2.19 ล้านครับ' }])
    await receive('รายละเอียดหลังนี้หน่อยครับ')
  })
  assert.equal(sent.length, 1)
  assert.ok(prompt.indexOf('บ้านของแชทนี้') < prompt.indexOf('สไตล์การพูด'), 'the house comes before the general rules')
  assert.match(prompt, /แยกมาบโป่ง/)
  assert.match(prompt, /ห้ามเรียก search_properties/)
  assert.ok(!prompt.includes('ใช้ข้อมูลจากเครื่องมือ search_properties เท่านั้น'))
})

test('the map link and the price from the note reach the customer', async () => {
  // A house in the database with the same price, but hidden: the note's own price is still fine.
  store.set('properties/prop3', property({ displayId: 'SPS-TW-3', price: 2190000, showPrice: false }))
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', staffNote: TWIN_NOTE })
  model([{ text: 'ราคา 2.19 ล้านครับ พิกัดตามนี้เลยครับ https://maps.app.goo.gl/38ManFKLBfZc8vE5A?g_st=ipcครับ' }])
  await receive('ราคาเท่าไหร่ อยู่ตรงไหนครับ')
  assert.equal(sent.length, 1)
  assert.match(sent[0].message.text, /2\.19 ล้าน/)
  assert.ok(sent[0].message.text.includes('https://maps.app.goo.gl/38ManFKLBfZc8vE5A?g_st=ipc'))
  assert.equal(conversation().needsHuman, undefined)
})

test('a property the AI remembered on its own does not push the note aside; one the team picked does', async () => {
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', staffNote: TWIN_NOTE, currentPropertyCode: 'SPS-CD-9' })
  let prompt = await capturePrompt(async () => {
    model([{ text: 'ได้ครับ' }])
    await receive('ราคาเท่าไหร่')
  })
  assert.ok(!prompt.includes('SPS-CD-9'))
  assert.deepEqual(stored[0].extra.aiContext.properties, [])

  store.set('messenger_conversations/conv1', { ...conversation(), currentPropertyCode: 'SPS-CD-9', currentPropertySetBy: 'admin1' })
  prompt = await capturePrompt(async () => {
    model([{ text: 'ได้ครับ' }])
    await receive('แล้วคอนโดล่ะ', { at: NOW + 1 })
  })
  assert.ok(prompt.includes('SPS-CD-9'))
})

test('with only a note, searching other houses is refused until the customer asks for them', async () => {
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', staffNote: TWIN_NOTE })
  let toolAnswer
  modelScript = [
    async () => [{ functionCall: { name: 'search_properties', args: {} } }],
    async contents => { toolAnswer = contents[contents.length - 1].parts[0].functionResponse.response; return [{ text: 'บ้านแฝดแยกมาบโป่ง 2.19 ล้านครับ' }] },
  ]
  await receive('ราคาเท่าไหร่')
  assert.equal(toolAnswer.blocked, true)
  assert.match(toolAnswer.error, /บ้านของแชทนี้/)

  // once the customer asks for other houses, the search goes through
  modelScript = [
    async () => [{ functionCall: { name: 'search_properties', args: { location: 'ศรีราชา' } } }],
    async contents => { toolAnswer = contents[contents.length - 1].parts[0].functionResponse.response; return [{ text: 'มีครับ' }] },
  ]
  await receive('มีหลังอื่นไหมครับ', { at: NOW + 1 })
  assert.notEqual(toolAnswer.blocked, true)
  assert.ok(toolAnswer.total > 0)
})

// ─── The attached house first, other houses only when the customer asks ──────
const ATTACHED = [
  { id: 'aaa1', type: 'บ้านเดี่ยว', title: 'สวนสวย', listing: 'sale', bedrooms: 3, bathrooms: 2, price: 2490000, priceVisible: true, images: [PIC(1)] },
  { id: 'bbb2', type: 'บ้านแฝด', title: 'แฝดสุขใจ', listing: 'sale', bedrooms: 2, bathrooms: 2, price: 1850000, priceVisible: false, images: [PIC(3)] },
]
const attachedChat = (extra = {}) => store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', staffListings: ATTACHED, ...extra })
const carousels = () => sent.filter(item => item.message.attachment?.payload?.template_type === 'generic')
const addProperties = count => {
  for (let n = 0; n < count; n += 1) {
    store.set(`properties/more${n}`, property({ displayId: `SPS-M-${n}`, locationDisplay: 'ศรีราชา, ชลบุรี', price: 1000000 + n * 1000, showPrice: true, title: `บ้านทางเลือก ${n}` }))
  }
}
const toolResult = contents => contents.at(-1).parts[0].functionResponse.response

test('the first answer in a chat with attached houses shows them as cards, once', async () => {
  attachedChat()
  model([{ text: 'สนใจบ้านแฝดใช่ไหมครับ' }])
  await receive('สนใจบ้านค่ะ')
  assert.equal(sent.length, 2)
  assert.equal(sent[0].message.text, 'สนใจบ้านแฝดใช่ไหมครับ')
  const [cards] = carousels()
  const elements = cards.message.attachment.payload.elements
  assert.deepEqual(elements.map(element => element.title), ['บ้านเดี่ยว สวนสวย', 'บ้านแฝด แฝดสุขใจ'])
  assert.equal(elements[0].image_url, PIC(1).url)
  assert.match(elements[0].subtitle, /2,490,000 บาท/)
  assert.match(elements[1].subtitle, /1\.8xxx ล้านบาท/) // "do not tell" price stays masked
  assert.ok(!JSON.stringify(sent).includes('1,850,000') && !JSON.stringify(sent).includes('1850000'))
  assert.ok(conversation().attachedShownAt)
  assert.equal(stored.at(-1).extra.kind, 'cards')

  // the next message does not repeat them
  model([{ text: 'ครับ' }])
  await receive('ขอบคุณค่ะ')
  assert.equal(carousels().length, 1)
})

test('the house the customer\'s message refers to is the one shown', async () => {
  attachedChat()
  model(
    [{ functionCall: { name: 'show_attached_houses', args: { listingIds: ['bbb2'] } } }],
    [{ text: 'บ้านแฝดสุขใจครับ 2 นอน' }],
  )
  await receive('สนใจบ้านแฝดค่ะ')
  assert.equal(carousels().length, 1) // not shown a second time by the automatic first showing
  assert.deepEqual(carousels()[0].message.attachment.payload.elements.map(element => element.title), ['บ้านแฝด แฝดสุขใจ'])
})

test('an id that is not in the chat is refused and the automatic showing still happens', async () => {
  attachedChat()
  let answer
  modelScript = [
    async () => [{ functionCall: { name: 'show_attached_houses', args: { listingIds: ['nope'] } } }],
    async contents => { answer = toolResult(contents); return [{ text: 'ครับ' }] },
  ]
  await receive('สนใจบ้านค่ะ')
  assert.equal(answer.ok, false)
  assert.equal(carousels()[0].message.attachment.payload.elements.length, 2)
})

test('before the customer asks for other houses, searching or showing them is refused', async () => {
  addProperties(5)
  attachedChat({ attachedShownAt: new Ts(NOW - 1000) })
  const answers = []
  modelScript = [
    async () => [{ functionCall: { name: 'search_properties', args: { location: 'ศรีราชา' } } }],
    async contents => { answers.push(toolResult(contents)); return [{ functionCall: { name: 'show_property_cards', args: { codes: ['SPS-M-0', 'SPS-M-1'] } } }] },
    async contents => { answers.push(toolResult(contents)); return [{ text: 'มีบ้านที่แนบไว้ให้ดูก่อนครับ' }] },
  ]
  await receive('สนใจบ้านค่ะ ราคาเท่าไหร่')
  assert.equal(answers[0].blocked, true)
  assert.equal(answers[0].total, 0)
  assert.equal(answers[1].blocked, true)
  assert.equal(carousels().length, 0)
  assert.equal(conversation().othersRequestedAt, undefined)
})

test('when the customer asks for other houses, they are shown, up to ten, and the chat stays open for more', async () => {
  addProperties(12)
  attachedChat({ attachedShownAt: new Ts(NOW - 1000) })
  let found
  const codes = Array.from({ length: 12 }, (_, n) => `SPS-M-${n}`)
  modelScript = [
    async () => [{ functionCall: { name: 'search_properties', args: { location: 'ศรีราชา' } } }],
    async contents => { found = toolResult(contents); return [{ functionCall: { name: 'show_property_cards', args: { codes } } }] },
    async () => [{ text: 'มีอีกหลายหลังครับ ดูการ์ดได้เลยครับ' }],
  ]
  await receive('มีบ้านอื่นไหมคะ')
  assert.equal(found.total, 13) // 12 added plus the condo in the same area
  assert.equal(found.results.length, 10)
  assert.equal(carousels().length, 1)
  assert.equal(carousels()[0].message.attachment.payload.elements.length, 10)
  assert.ok(conversation().othersRequestedAt)

  // later messages do not need to ask again
  let later
  modelScript = [
    async () => [{ functionCall: { name: 'search_properties', args: { location: 'ศรีราชา' } } }],
    async contents => { later = toolResult(contents); return [{ text: 'ครับ' }] },
  ]
  await receive('ราคาไม่เกิน 2 ล้านมีไหม')
  assert.notEqual(later.blocked, true)
})

test('the model can open the other houses when the customer asked in other words', async () => {
  addProperties(3)
  attachedChat({ attachedShownAt: new Ts(NOW - 1000) })
  let result
  modelScript = [
    async () => [{ functionCall: { name: 'search_properties', args: { location: 'ศรีราชา', customerAskedForOtherHouses: true } } }],
    async contents => { result = toolResult(contents); return [{ text: 'มีครับ' }] },
  ]
  await receive('ขอทางเลือกเพิ่มเติมหน่อยค่ะ')
  assert.equal(result.blocked, undefined)
  assert.ok(result.total > 0)
  assert.ok(conversation().othersRequestedAt)
})

test('the house the team set is not offered again among the other houses', async () => {
  addProperties(3)
  attachedChat({ staffListings: [], currentPropertyCode: 'SPS-CD-9', currentPropertySetBy: 'u1', attachedShownAt: new Ts(NOW - 1000) })
  let result
  modelScript = [
    async () => [{ functionCall: { name: 'search_properties', args: {} } }],
    async contents => { result = toolResult(contents); return [{ text: 'ครับ' }] },
  ]
  await receive('มีบ้านอื่นไหม')
  assert.ok(result.results.length > 0)
  assert.ok(!result.results.some(item => item.code === 'SPS-CD-9'))
})

test('a database property the team set is shown first as its own card', async () => {
  attachedChat({ staffListings: [], currentPropertyCode: 'SPS-CD-9', currentPropertySetBy: 'u1' })
  model([{ text: 'คอนโดศรีราชาครับ' }])
  await receive('สนใจค่ะ')
  const [cards] = carousels()
  assert.equal(cards.message.attachment.payload.elements.length, 1)
  assert.equal(cards.message.attachment.payload.elements[0].buttons[0].url, 'https://spspropertysolution.com/p/prop2')
  assert.deepEqual(conversation().shownCodes, ['SPS-CD-9'])
})

test('a property the AI only remembers is not "attached": searching other houses stays open', async () => {
  addProperties(3)
  store.set('messenger_conversations/conv1', { pageId: 'P1', participantId: 'U1', pageName: 'เพจ', currentPropertyCode: 'SPS-CD-9' })
  let result
  modelScript = [
    async () => [{ functionCall: { name: 'search_properties', args: { location: 'ศรีราชา' } } }],
    async contents => { result = toolResult(contents); return [{ text: 'มีครับ' }] },
  ]
  await receive('มีบ้านที่ศรีราชางบ 2 ล้านไหม')
  assert.notEqual(result.blocked, true)
  assert.equal(carousels().length, 0)
})

test('without attached houses a normal search shows at most three cards', async () => {
  addProperties(8)
  const codes = Array.from({ length: 8 }, (_, n) => `SPS-M-${n}`)
  model(
    [{ functionCall: { name: 'search_properties', args: { location: 'ศรีราชา' } } }],
    [{ functionCall: { name: 'show_property_cards', args: { codes } } }],
    [{ text: 'มีหลายหลังครับ' }],
  )
  await receive('มีบ้านที่ศรีราชาไหม')
  assert.equal(carousels()[0].message.attachment.payload.elements.length, 3)
})

test('when an attached-house card cannot be sent the text answer stays', async () => {
  attachedChat()
  model([{ text: 'สนใจบ้านแฝดใช่ไหมครับ' }])
  const original = sent.push.bind(sent)
  let count = 0
  sent.push = item => { count += 1; if (count === 2) throw new Error('cards rejected'); return original(item) }
  await receive('สนใจบ้านค่ะ')
  assert.equal(count, 2)
  assert.equal(stored[0].text, 'สนใจบ้านแฝดใช่ไหมครับ')
  assert.equal(conversation().attachedShownAt, undefined) // not marked as shown, so it is tried again next time
})

test('after a reset the attached houses are shown again and the other houses are held back again', async () => {
  attachedChat({ attachedShownAt: new Ts(NOW - 5000), othersRequestedAt: new Ts(NOW - 4000), contextResetAt: new Ts(NOW - 1000) })
  model([{ text: 'ครับ' }])
  await receive('สนใจค่ะ')
  assert.equal(carousels().length, 1)
  let result
  modelScript = [
    async () => [{ functionCall: { name: 'search_properties', args: {} } }],
    async contents => { result = toolResult(contents); return [{ text: 'ครับ' }] },
  ]
  await receive('ราคาเท่าไหร่')
  assert.equal(result.blocked, true)
})

test('a pasted post with the price marked "do not tell" never lets the real price out', async () => {
  store.set('messenger_conversations/conv1', {
    pageId: 'P1', participantId: 'U1', pageName: 'เพจ', attachedShownAt: new Ts(NOW - 1000),
    staffListings: [{ id: 'h1', type: 'บ้านแฝด', title: 'แยกมาบโป่ง', price: 2190000, priceVisible: false, details: TWIN_NOTE }],
  })
  const prompt = await capturePrompt(async () => {
    model([{ text: 'ราคา 2.19 ล้านครับ' }])
    await receive('ราคาเท่าไหร่')
  })
  assert.ok(!prompt.includes('2.19 ล้าน'))
  assert.match(prompt, /2\.1xxx ล้านบาท/)
  assert.ok(prompt.includes('maps.app.goo.gl'))
  assert.ok(!sent[0].message.text.includes('2.19'), 'the guard replaced the answer')
  assert.ok(conversation().needsHuman)
})

test('a house saved before posts were read (no price stored) is still answered with the post\'s price', async () => {
  store.set('messenger_conversations/conv1', {
    pageId: 'P1', participantId: 'U1', pageName: 'เพจ', attachedShownAt: new Ts(NOW - 1000),
    staffListings: [{ id: 'h1', type: 'บ้านเดี่ยว', title: '', price: null, priceVisible: true, details: TWIN_NOTE }],
  })
  const prompt = await capturePrompt(async () => {
    model([{ text: 'ราคา 2.19 ล้านครับ' }])
    await receive('ราคาเท่าไหร่')
  })
  assert.ok(!prompt.includes('ไม่ได้ระบุราคา'))
  assert.match(prompt, /ราคา: 2,190,000 บาท/)
  assert.match(sent[0].message.text, /2\.19 ล้าน/)
})


test('setting a database property answers the customer who was waiting for it', async () => {
  store.set('messenger_settings/ai', { enabled: true, requirePropertyForBot: true })
  model([{ text: 'ต้องไม่ถูกส่ง' }])
  await receive('หลังนี้เท่าไหร่คะ')
  assert.equal(conversation().needsProperty, true)
  store.set('messenger_conversations/conv1', { ...conversation(), currentPropertyCode: 'SPS-CD-9', currentPropertyId: 'prop2', currentPropertySetBy: 'admin1', needsProperty: undefined })
  model([{ text: 'คอนโดศรีราชา 1,500,000 บาทครับ' }])
  await requestRetry()
  assert.equal(sent[0].message.text, 'คอนโดศรีราชา 1,500,000 บาทครับ')
  assert.equal(sent[1].message.attachment.payload.template_type, 'generic')
})

test('questions followed by a picture are still answered (pictures off), by the picture\'s run and by a retry', async () => {
  store.set('messenger_conversations/conv1', {
    pageId: 'P1', participantId: 'U1', pageName: 'เพจ', attachedShownAt: new Ts(NOW - 1000),
    staffListings: [{ id: 'h1', type: 'บ้านแฝด', title: 'แยกมาบโป่ง', price: 2190000, priceVisible: true, details: TWIN_NOTE }],
  })
  addIncoming('q1', 'ราคาเท่าไหร่ครับ', NOW - 3000)
  addIncoming('q2', 'ขอพิกัดหน่อย', NOW - 2000)
  addIncoming('q3', '', NOW - 1000, [{ type: 'image', url: STORAGE_URL }])
  spyModel('ราคา 2.19 ล้านครับ พิกัด https://maps.app.goo.gl/38ManFKLBfZc8vE5A?g_st=ipc')
  await runFor('q1')
  await runFor('q2')
  assert.equal(sent.length, 0) // the picture is newer: its run answers
  await runFor('q3')
  assert.equal(sent.length, 1)
  assert.match(seenContents.at(-1).parts[0].text, /ราคาเท่าไหร่[\s\S]*ขอพิกัด/)

  // the team's button gives the same answer when it is pressed instead
  sent.length = 0
  store.delete(`messenger_conversations/${CID}/messages/q1`)
  for (const id of ['q2', 'q3']) store.set(`messenger_conversations/${CID}/messages/${id}`, { ...store.get(`messenger_conversations/${CID}/messages/${id}`), aiHandledAt: 'TS' })
  spyModel('ราคา 2.19 ล้านครับ')
  await requestRetry('rp')
  assert.equal(sent.length, 1)
})

// ─── The AI writes first ─────────────────────────────────────────────────────
const followUpRequest = id => {
  store.set(`ai_retry_requests/${id}`, { conversationId: CID, reason: 'follow-up', followUp: true })
  return facebookAiRetry.run(new DocRef(`ai_retry_requests/${id}`).snap(), {})
}

test('a follow-up carries on from the conversation, once, without pushing house cards', async () => {
  store.set('messenger_conversations/conv1', {
    pageId: 'P1', participantId: 'U1', pageName: 'เพจ',
    staffListings: [{ id: 'h1', type: 'บ้านแฝด', title: 'แยกมาบโป่ง', price: 2190000, priceVisible: true, details: TWIN_NOTE }],
  })
  addIncoming('f1', 'สนใจบ้านแฝดครับ ราคาเท่าไหร่', NOW - 40 * 60 * 1000)
  store.set(`messenger_conversations/${CID}/messages/f2`, { direction: 'outgoing', sentBy: 'ai', text: 'ราคา 2.19 ล้านครับ สนใจนัดดูบ้านไหมครับ', attachments: [], timestamp: new Ts(NOW - 39 * 60 * 1000) })
  let contents
  const prompt = await capturePrompt(async () => {
    modelScript = [async seen => { contents = seen; return [{ text: 'ยังสนใจบ้านแฝดมาบโป่งอยู่ไหมคะ สะดวกมาดูวันไหนคะ' }] }]
    await followUpRequest('fu1')
  })
  assert.equal(sent.length, 1, 'one text message, no cards')
  assert.match(sent[0].message.text, /สะดวกมาดู/)
  assert.match(prompt, /ตอนนี้คุณเป็นฝ่ายทักลูกค้าก่อน/)
  const last = contents.at(-1)
  assert.equal(last.role, 'user')
  assert.match(last.parts[0].text, /ข้อความจากระบบ ไม่ใช่ลูกค้า/)
  assert.match(contents.map(item => item.parts.map(part => part.text || '').join('')).join('\n'), /ราคาเท่าไหร่[\s\S]*2\.19 ล้าน/)
  assert.equal(stored[0].extra.followUp, true)
  assert.ok(conversation().lastFollowUpAt)

  // pressed again before the customer writes: nothing more is sent
  store.set(`messenger_conversations/${CID}/messages/f3`, { direction: 'outgoing', sentBy: 'ai', followUp: true, text: sent[0].message.text, attachments: [], timestamp: new Ts(NOW - 1000) })
  store.set('messenger_conversations/conv1', { ...conversation(), aiRetryLockUntil: undefined })
  model([{ text: 'ต้องไม่ถูกส่ง' }])
  await followUpRequest('fu2')
  assert.equal(sent.length, 1)
})

test('a follow-up request answers normally when the customer wrote in the meantime', async () => {
  addIncoming('g1', 'ขอพิกัดหน่อยครับ', NOW - 1000)
  let prompt = ''
  prompt = await capturePrompt(async () => {
    model([{ text: 'ได้เลยครับ' }])
    await followUpRequest('fu3')
  })
  assert.equal(sent.length, 1)
  assert.ok(!prompt.includes('ตอนนี้คุณเป็นฝ่ายทักลูกค้าก่อน'))
  assert.equal(stored[0].extra.followUp, undefined)
})

test('several questions typed in a row are all answered, in a longer message', async () => {
  addIncoming('m1', 'ราคาเท่าไหร่ครับ', NOW - 3000)
  addIncoming('m2', 'ขอพิกัดหน่อย', NOW - 2000)
  addIncoming('m3', 'กี่ห้องนอนครับ', NOW - 1000)
  const prompt = await capturePrompt(async () => {
    model([{ text: 'ราคา 2.19 ล้านครับ พิกัดตามลิงก์นี้ครับ มี 2 ห้องนอนครับ' }])
    await runFor('m3')
  })
  assert.match(prompt, /ตอบครบทุกข้อในข้อความเดียว/)
  assert.match(prompt, /ห้ามเกิน 484 ตัวอักษร/) // 220 x 2.2 for three questions
  assert.ok(!prompt.includes('ให้พูดเรื่องที่สำคัญที่สุดก่อนเรื่องเดียว'))
  assert.equal(sent.length, 1)
})

// ─── The AI never goes silent ────────────────────────────────────────────────
test('a credit question that uses many tools still gets an answer', async () => {
  const call = (name, args = {}) => [{ functionCall: { name, args } }]
  let lastContents
  modelScript = [
    ...[
      call('save_credit_profile', { note: 'มี MOU ธอส.' }),
      call('estimate_loan', { price: 2600000 }),
      call('save_customer_info', { note: 'ว่างอาทิตย์หน้า' }),
      call('save_credit_profile', { creditIssue: 'none' }),
      call('estimate_loan', { price: 2600000, monthlyIncome: 15000 }),
      call('save_customer_info', { note: 'ยังไม่พร้อมเอกสาร' }),
      call('save_credit_profile', { note: 'รายได้ไม่ถึง' }),
    ].map(parts => async () => parts),
    async contents => { lastContents = contents; return [{ text: 'มี MOU กับ ธอส. ช่วยได้มากค่ะ เดี๋ยวทีมงานช่วยเช็กเอกสารให้นะคะ' }] },
  ]
  await receive('เพื่อรายได้ไม่ถึง แต่พี่มี mou รอส.น่ะ')
  assert.equal(sent.length, 1)
  assert.match(sent[0].message.text, /MOU/)
  assert.match(lastContents.at(-1).parts.at(-1).text, /ห้ามเรียกเครื่องมือเพิ่ม/)
})

test('when the AI has no answer at all, the customer is told the team will follow up', async () => {
  model([])
  await receive('ถามอะไรก็ได้')
  assert.equal(sent.length, 1)
  assert.match(sent[0].message.text, /ทีมงาน/)
  assert.equal(conversation().needsHuman, true)
  assert.equal(conversation().botPaused, true)
})

test('why the AI did not answer is kept for the inbox, and cleared by the next answer', async () => {
  // a teammate replied by hand a moment ago
  store.set(`messenger_conversations/${CID}/messages/h1`, { direction: 'outgoing', sentBy: 'u1', text: 'เดี๋ยวโทรหานะครับ', attachments: [], timestamp: new Ts(NOW - 5000) })
  model([{ text: 'ต้องไม่ถูกส่ง' }])
  await receive('มีบ้านไหม', { at: NOW - 1000 })
  assert.equal(sent.length, 0)
  assert.equal(conversation().aiStatus.result, 'skipped')
  assert.equal(conversation().aiStatus.reason, 'human-active')

  store.set('messenger_conversations/conv1', { ...conversation(), botResumedAt: new Ts(NOW) }) // the team lets the AI answer again
  model([{ text: 'มีครับ' }])
  await receive('ราคาเท่าไหร่')
  assert.equal(conversation().aiStatus, undefined)
})

test('a failure is kept for the inbox too', async () => {
  modelScript = [async () => { throw new Error('Vertex down') }]
  await receive('สวัสดี')
  assert.equal(sent.length, 0)
  assert.deepEqual([conversation().aiStatus.result, conversation().aiStatus.reason], ['failed', 'gemini'])
})

// ─── The page's automatic reply (Instant Reply) ──────────────────────────────
test('the page\'s automatic reply does not stop the AI from answering', async () => {
  addIncoming('i1', 'สนใจบ้านแฝดค่ะ', NOW - 20000)
  store.set(`messenger_conversations/${CID}/messages/i2`, { direction: 'outgoing', automated: true, text: 'สวัสดี ขอบคุณที่ติดต่อเรา เราได้รับข้อความของคุณแล้ว', attachments: [], timestamp: new Ts(NOW - 18000) })
  model([{ text: 'สนใจหลังไหนคะ' }])
  await runFor('i1')
  assert.equal(sent.length, 1)

  // the team's button also sees the customer as still waiting
  sent.length = 0
  model([{ text: 'สนใจหลังไหนคะ' }])
  await requestRetry('ri')
  assert.equal(sent.length, 1)
})
