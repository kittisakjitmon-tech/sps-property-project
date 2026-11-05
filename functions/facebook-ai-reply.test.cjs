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
      update: (ref, data) => updates.push([ref, data]),
    }
    const result = await run(transaction)
    for (const [ref, data] of updates) await ref.update(data)
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
const { facebookAiReply, _test } = require('./facebook-ai-reply.js')
Module._load = originalLoad

// ─── Fixtures ────────────────────────────────────────────────────────────────
const CID = 'conv1'
const NOW = Date.now()
const property = (extra = {}) => ({
  status: 'available', displayId: 'SPS-TH-1', title: 'ทาวน์โฮมสวย', type: 'SPS-TH-1CLASS-ID', listingType: 'sale',
  bedrooms: 3, bathrooms: 2, locationDisplay: 'พานทอง, ชลบุรี', price: 2150000, showPrice: false,
  description: 'บ้านใหม่ ใกล้นิคม', coverImageUrl: 'https://img.example/a.jpg', ...extra,
})

beforeEach(() => {
  _test.resetCaches()
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
  await receive('ถามยาวๆ')
  assert.ok(sent[0].message.text.length <= 220)
  assert.ok(words.startsWith(sent[0].message.text))

  sent.length = 0
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
  assert.equal(sent.length, 1)
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
  assert.match(prompt, /ข้อมูลที่ทีมงานระบุไว้สำหรับแชทนี้/)
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
  assert.ok(!prompt.includes('ข้อมูลที่ทีมงานระบุไว้สำหรับแชทนี้'))
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
