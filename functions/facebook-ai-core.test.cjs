const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  toIndexedProperty,
  searchProperties,
  shouldReply,
  historyToContents,
  cleanReplyText,
  buildSystemPrompt,
  runConversation,
  vertexClientOptions,
  maskPrice,
  findPriceLeaks,
  buildCardElements,
  buildCarouselMessage,
  normalizeThaiPhone,
  sanitizeCustomerInfo,
  validateAppointment,
  sanitizeUrls,
  TOOL_DECLARATIONS,
} = require('./facebook-ai-core.cjs')

const base = {
  status: 'available',
  displayId: 'SPS-TH-1CLASS-204',
  title: 'ทาวน์โฮม 1 ชั้น',
  type: 'SPS-TH-1CLASS-ID',
  listingType: 'sale',
  bedrooms: 2,
  bathrooms: 1,
  locationDisplay: 'มาบโป่ง, พานทอง, ชลบุรี',
  price: 2150000,
  showPrice: false,
  propertySubStatus: 'มือ 1',
  coverImageUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg',
  description: 'ทาวน์โฮม 1 ชั้น มีส่วนลดพิเศษ\nราคา 2.15 ล้าน\nผ่อน 4,000-5,000 /เดือน\n2 นอน 1 ห้องน้ำ ใกล้นิคม',
  agentContact: { phone: '0999999999' },
  commissionRate: 3,
  createdBy: 'uid-secret',
  lat: 13.1,
}

const list = [
  toIndexedProperty('a1', base),
  toIndexedProperty('a2', { ...base, displayId: 'SPS-CD-1', type: 'SPS-CD-ID', locationDisplay: 'ศรีราชา, ชลบุรี', showPrice: true, price: 2500000, bedrooms: 1, coverImageUrl: 'http://insecure/a.jpg' }),
  toIndexedProperty('a3', { ...base, displayId: 'SPS-R-1', listingType: 'rent', price: 8000, showPrice: true, locationDisplay: 'อมตะนคร, ชลบุรี' }),
  toIndexedProperty('gone', { ...base, status: 'reserved' }),
].filter(Boolean)

test('only available properties are indexed', () => {
  assert.equal(toIndexedProperty('x', { ...base, status: 'reserved' }), null)
  assert.equal(toIndexedProperty('x', { ...base, status: 'pending' }), null)
  assert.equal(list.length, 3)
})

test('hidden prices become a masked approximation, never the exact figure', () => {
  assert.equal(maskPrice(2150000, 'sale'), '2.1xxx ล้านบาท')
  assert.equal(maskPrice(1000000, 'sale'), '1.0xxx ล้านบาท')
  assert.equal(maskPrice(850000, 'sale'), '8.5xxx แสนบาท')
  assert.equal(maskPrice(8000, 'rent'), '8,xxx บาท/เดือน')
  assert.equal(maskPrice(12500, 'rent'), '12,xxx บาท/เดือน')
  assert.equal(maskPrice(0, 'sale'), null)
  assert.equal(maskPrice('abc', 'sale'), null)

  const { results } = searchProperties(list, { location: 'พานทอง' })
  assert.equal(results.length, 1)
  const [p] = results
  assert.equal(p.price, null)
  assert.equal(p.priceApprox, '2.1xxx ล้านบาท')
  assert.match(p.priceNote, /priceApprox/)
  const dump = JSON.stringify(p)
  assert.ok(!dump.includes('2150000'))
  assert.ok(!dump.includes('2.15'))
  assert.ok(!dump.includes('4,000'))
  assert.match(p.summary, /ใกล้นิคม/)
  assert.equal(p.condition, 'มือ 1')
})

test('visible prices are passed through like the website (showPrice !== false)', () => {
  const [p] = searchProperties(list, { location: 'ศรีราชา' }).results
  assert.equal(p.price, 2500000)
  assert.equal(p.priceApprox, undefined)
  assert.equal(p.priceNote, undefined)
  assert.equal(toIndexedProperty('z', { ...base, showPrice: undefined }).price, 2150000)
})

test('internal fields are never exposed', () => {
  const dump = JSON.stringify(searchProperties(list, {}).results)
  for (const secret of ['0999999999', 'commissionRate', 'uid-secret', 'agentContact', '13.1', '_search', '_numericPrice', 'cloudinary']) {
    assert.ok(!dump.includes(secret), secret)
  }
})

test('the exact hidden price is caught in replies but the masked form and echoed budgets are fine', () => {
  const hidden = [2150000, 8000]
  assert.equal(findPriceLeaks('ประมาณ 2.1xxx ล้านบาทครับ', hidden), false)
  assert.equal(findPriceLeaks('ห้องนอน 1 ห้องน้ำ 1 ชั้น 1', [1000000]), false, 'a bare 1 is not a price')
  assert.equal(findPriceLeaks('ราคา 2,150,000 บาท', hidden), true)
  assert.equal(findPriceLeaks('ราคา 2150000 บาท', hidden), true)
  assert.equal(findPriceLeaks('ราคา 2.15 ล้านบาท', hidden), true)
  assert.equal(findPriceLeaks('ราคา 2.15ล้าน', hidden), true)
  assert.equal(findPriceLeaks('เช่า 8,000 บาท', hidden), true)
  assert.equal(findPriceLeaks('ประมาณ 2.1 ล้านกว่า', hidden), false)
  assert.equal(findPriceLeaks('งบ 1.5 ล้านใช่ไหมครับ', [1500000], 'งบ 1.5 ล้านค่ะ'), false, 'customer typed it first')
  assert.equal(findPriceLeaks('ราคา 1.5 ล้านพอดี', [1500000], 'มีอะไรแนะนำไหม'), true)
  assert.equal(findPriceLeaks('ราคา 8.5 แสน', [850000]), true)
  assert.equal(findPriceLeaks('', hidden), false)
})

test('search filters by type, listing, bedrooms and budget; budget works even when price is hidden', () => {
  assert.equal(searchProperties(list, { propertyType: 'คอนโด' }).results[0].code, 'SPS-CD-1')
  assert.equal(searchProperties(list, { listingType: 'rent' }).results[0].code, 'SPS-R-1')
  assert.equal(searchProperties(list, { minBedrooms: 2 }).results.every(p => p.bedrooms >= 2), true)
  const cheap = searchProperties(list, { maxPrice: 2200000 })
  assert.deepEqual(cheap.results.map(p => p.code).sort(), ['SPS-R-1', 'SPS-TH-1CLASS-204'])
  assert.equal(searchProperties(list, { limit: 99 }).results.length <= 5, true)
})

test('place names match their synonyms and spellings', () => {
  assert.equal(searchProperties(list, { location: 'amata' }).results[0].code, 'SPS-R-1')
  assert.equal(searchProperties(list, { location: 'อมตะซิตี้' }).results[0].code, 'SPS-R-1')
  assert.equal(searchProperties(list, { location: 'sriracha' }).results[0].code, 'SPS-CD-1')
})

test('empty searches loosen filters step by step and say so', () => {
  const none = searchProperties(list, { location: 'ภูเก็ต', propertyType: 'ที่ดิน' })
  assert.ok(none.total > 0, 'falls back to alternatives')
  assert.ok(none.relaxed.includes('location'))
  assert.match(none.note, /ใกล้เคียง/)

  const overBudget = searchProperties(list, { listingType: 'sale', maxPrice: 2000000, location: 'พานทอง' })
  assert.ok(overBudget.relaxed.some(step => step.startsWith('maxPrice')))
  assert.equal(overBudget.results[0].code, 'SPS-TH-1CLASS-204')

  assert.deepEqual(searchProperties([], { location: 'x' }), { total: 0, results: [], relaxed: [] })
})

test('properties already shown are not offered again unless nothing else matches', () => {
  const fresh = searchProperties(list, { listingType: 'sale' }, { excludeCodes: ['SPS-TH-1CLASS-204'] })
  assert.deepEqual(fresh.results.map(p => p.code), ['SPS-CD-1'])
  const all = searchProperties(list, { listingType: 'sale' }, { excludeCodes: ['SPS-TH-1CLASS-204', 'SPS-CD-1'] })
  assert.equal(all.results.length, 2)
  assert.match(all.note, /เคยเสนอ/)
})

test('cards are built from catalog data with https images and masked prices', () => {
  const elements = buildCardElements(list)
  assert.equal(elements.length, 3)
  const hidden = elements.find(e => e.title.includes('ทาวน์โฮม'))
  assert.match(hidden.subtitle, /2\.1xxx ล้านบาท/)
  assert.ok(!JSON.stringify(hidden).includes('2150000'))
  assert.equal(hidden.image_url, 'https://res.cloudinary.com/x/image/upload/a.jpg')
  assert.equal(hidden.buttons[0].url, 'https://spspropertysolution.com/p/a1')
  const insecure = elements.find(e => e.subtitle.includes('ศรีราชา'))
  assert.equal(insecure.image_url, undefined, 'http images are dropped')
  assert.match(insecure.subtitle, /2,500,000 บาท/)
  for (const element of elements) {
    assert.ok(element.title.length <= 80 && element.subtitle.length <= 80)
  }
  const message = buildCarouselMessage(elements)
  assert.equal(message.attachment.payload.template_type, 'generic')
  assert.equal(buildCardElements(Array(10).fill(list[0])).length, 3)
})

test('phones, emails and customer info are validated and cleaned', () => {
  assert.equal(normalizeThaiPhone('081-234-5678'), '0812345678')
  assert.equal(normalizeThaiPhone('+66 81 234 5678'), '0812345678')
  assert.equal(normalizeThaiPhone('66812345678'), '0812345678')
  assert.equal(normalizeThaiPhone('12345'), null)
  assert.equal(normalizeThaiPhone(undefined), null)
  assert.deepEqual(sanitizeCustomerInfo({ name: ' สมชาย ', phone: '0812345678', email: 'A@B.com', budget: 'ไม่เกิน 2 ล้าน', interest: 'ทาวน์โฮม' }), {
    name: 'สมชาย', phone: '0812345678', email: 'a@b.com', interest: 'ไม่เกิน 2 ล้าน · ทาวน์โฮม',
  })
  assert.deepEqual(sanitizeCustomerInfo({ phone: 'abc', email: 'nope' }), {})
})

test('appointment requests need a name, a valid phone and a real property code', () => {
  const knownCodes = new Map(list.map(p => [p.code, p]))
  const ctx = { today: '2026-11-04', knownCodes }
  const good = validateAppointment({ name: 'สมชาย', phone: '0812345678', propertyCode: 'SPS-CD-1', date: '2026-11-08', time: '14:30', note: 'มา 3 คน' }, ctx)
  assert.equal(good.ok, true)
  assert.deepEqual(good.value, {
    contactName: 'สมชาย', tel: '0812345678', date: '2026-11-08', time: '14:30',
    propertyId: 'SPS-CD-1', propertyTitle: good.value.propertyTitle, note: 'มา 3 คน',
  })
  assert.equal(validateAppointment({ phone: '0812345678', propertyCode: 'SPS-CD-1' }, ctx).ok, false)
  assert.equal(validateAppointment({ name: 'ก', phone: '123', propertyCode: 'SPS-CD-1' }, ctx).ok, false)
  assert.equal(validateAppointment({ name: 'ก', phone: '0812345678', propertyCode: 'FAKE-1' }, ctx).ok, false)

  const vague = validateAppointment({ name: 'ก', phone: '0812345678', propertyCode: 'SPS-CD-1', date: 'เสาร์นี้', time: 'บ่ายๆ' }, ctx)
  assert.equal(vague.value.date, '')
  assert.equal(vague.value.time, '')
  assert.match(vague.value.note, /เสาร์นี้/)
  const past = validateAppointment({ name: 'ก', phone: '0812345678', propertyCode: 'SPS-CD-1', date: '2026-01-01' }, ctx)
  assert.equal(past.value.date, '')
  const far = validateAppointment({ name: 'ก', phone: '0812345678', propertyCode: 'SPS-CD-1', date: '2027-12-01' }, ctx)
  assert.equal(far.value.date, '')
  const impossible = validateAppointment({ name: 'ก', phone: '0812345678', propertyCode: 'SPS-CD-1', date: '2026-02-31' }, ctx)
  assert.equal(impossible.value.date, '')
})

test('links in a reply must come from the property results or be the site root', () => {
  const allowed = ['https://spspropertysolution.com/p/a1']
  const text = 'ดูเลยครับ https://spspropertysolution.com/p/a1 และ https://evil.example/p/x กับ https://spspropertysolution.com'
  const out = sanitizeUrls(text, allowed)
  assert.ok(out.includes('https://spspropertysolution.com/p/a1'))
  assert.ok(out.includes('https://spspropertysolution.com'))
  assert.ok(!out.includes('evil.example'))
  assert.equal(sanitizeUrls('ลิงก์ https://spspropertysolution.com/p/made-up.', allowed).includes('made-up'), false)
})

test('replies are off unless explicitly enabled and honour pause, humans and rate limits', () => {
  const now = 10_000_000
  const ok = { settings: { enabled: true }, conversation: {}, text: 'สนใจค่ะ', timestamp: now - 1000, recentMessages: [], now }
  assert.equal(shouldReply(ok).reply, true)
  assert.equal(shouldReply({ ...ok, settings: {} }).reason, 'disabled')
  assert.equal(shouldReply({ ...ok, settings: { enabled: 'true' } }).reason, 'disabled')
  assert.equal(shouldReply({ ...ok, conversation: { botPaused: true } }).reason, 'paused')
  assert.equal(shouldReply({ ...ok, text: '  ' }).reason, 'no-text')
  assert.equal(shouldReply({ ...ok, timestamp: now - 11 * 60 * 1000 }).reason, 'stale')

  const human = [{ direction: 'outgoing', sentBy: 'uid-admin', timestamp: now - 60_000 }]
  assert.equal(shouldReply({ ...ok, recentMessages: human }).reason, 'human-active')
  const echoFromInbox = [{ direction: 'outgoing', sentBy: null, timestamp: now - 60_000 }]
  assert.equal(shouldReply({ ...ok, recentMessages: echoFromInbox }).reason, 'human-active')
  const resumed = shouldReply({ ...ok, conversation: { botResumedAtMs: now - 30_000 }, recentMessages: human })
  assert.equal(resumed.reply, true, 'resuming the bot overrides earlier human replies')
  const humanAfterResume = [{ direction: 'outgoing', sentBy: 'uid-admin', timestamp: now - 10_000 }]
  assert.equal(shouldReply({ ...ok, conversation: { botResumedAtMs: now - 30_000 }, recentMessages: humanAfterResume }).reason, 'human-active')
  const oldHuman = [{ direction: 'outgoing', sentBy: 'uid-admin', timestamp: now - 13 * 3600_000 }]
  assert.equal(shouldReply({ ...ok, recentMessages: oldHuman }).reply, true)

  const ai = Array.from({ length: 8 }, (_, i) => ({ direction: 'outgoing', sentBy: 'ai', timestamp: now - i * 1000 }))
  assert.equal(shouldReply({ ...ok, recentMessages: ai }).reason, 'rate-limited')
  assert.equal(shouldReply({ ...ok, settings: { enabled: true, maxRepliesPerHour: 20 }, recentMessages: ai }).reply, true)
  const cards = ai.map(m => ({ ...m, kind: 'cards' }))
  assert.equal(shouldReply({ ...ok, recentMessages: cards }).reply, true, 'cards do not count toward the limit')
})

test('history alternates roles, starts with the customer and handles attachments', () => {
  const contents = historyToContents([
    { direction: 'outgoing', text: 'ตอบเก่า', timestamp: 1 },
    { direction: 'incoming', text: 'สวัสดี', timestamp: 2 },
    { direction: 'incoming', text: 'มีคอนโดไหม', timestamp: 3 },
    { direction: 'outgoing', text: 'มีครับ', timestamp: 4 },
    { direction: 'incoming', text: '', attachmentCount: 1, timestamp: 5 },
  ])
  assert.deepEqual(contents.map(c => c.role), ['user', 'model', 'user'])
  assert.match(contents[0].parts[0].text, /สวัสดี\nมีคอนโดไหม/)
  assert.match(contents[2].parts[0].text, /รูปภาพ/)
})

test('reply text is plain, bounded and never empty', () => {
  assert.equal(cleanReplyText('**สวัสดี**\n\n\n\n# หัวข้อ\n- ข้อ 1'), 'สวัสดี\n\nหัวข้อ\n• ข้อ 1')
  assert.equal(cleanReplyText('   '), null)
  assert.equal(cleanReplyText(null), null)
  assert.ok(cleanReplyText('ก'.repeat(5000)).length <= 1900)
})

test('system prompt sets a human tone, the particle, masked-price rules, FAQ and today', () => {
  const first = buildSystemPrompt({ isFirstReply: true })
  assert.match(first, /ผู้ช่วย AI/)
  assert.match(first, /แนะนำตัว/)
  assert.match(first, /คำลงท้าย "ครับ"/)
  assert.match(first, /priceApprox/)
  assert.match(first, /ห้ามเดา/)
  assert.match(buildSystemPrompt({ isFirstReply: false }), /ไม่ต้องแนะนำตัวซ้ำ/)
  assert.match(buildSystemPrompt({ isFirstReply: false, particle: 'ค่ะ' }), /คำลงท้าย "ค่ะ"/)
  assert.match(buildSystemPrompt({ isFirstReply: false, particle: 'อะไรก็ได้' }), /คำลงท้าย "ครับ"/)
  const full = buildSystemPrompt({
    isFirstReply: false,
    faq: [{ question: 'โอนบ้านกี่วัน', answer: 'ประมาณ 1 วัน' }],
    extraInstructions: 'เรียกลูกค้าว่าพี่',
    today: { iso: '2026-11-04', text: 'วันพุธที่ 4 พฤศจิกายน 2569' },
  })
  assert.match(full, /โอนบ้านกี่วัน/)
  assert.match(full, /เรียกลูกค้าว่าพี่/)
  assert.match(full, /2026-11-04/)
})

test('all five tools are declared', () => {
  assert.deepEqual(TOOL_DECLARATIONS.map(t => t.name), [
    'search_properties', 'show_property_cards', 'save_customer_info', 'request_appointment', 'request_human',
  ])
})

test('tool loop runs the tools, feeds results back and returns the cleaned final text', async () => {
  const seen = []
  const turns = [
    [{ functionCall: { name: 'search_properties', args: { location: 'พานทอง' } } }],
    [{ functionCall: { name: 'request_human', args: { reason: 'ขอนัดชม' } } }],
    [{ text: '**พบ 1 รายการ** ทีมงานจะติดต่อกลับครับ' }],
  ]
  let call = 0
  const result = await runConversation({
    generate: async contents => { seen.push(contents.length); return turns[call++] },
    contents: [{ role: 'user', parts: [{ text: 'มีทาวน์โฮมพานทองไหม' }] }],
    handlers: {
      search_properties: args => ({ total: 1, args }),
      request_human: () => ({ ok: true }),
    },
  })
  assert.equal(result.text, 'พบ 1 รายการ ทีมงานจะติดต่อกลับครับ')
  assert.deepEqual(result.calls.map(c => c.name), ['search_properties', 'request_human'])
  assert.deepEqual(seen, [1, 3, 5])
})

test('tool loop stops after the round limit and survives failing or unknown tools', async () => {
  const loop = await runConversation({
    generate: async () => [{ functionCall: { name: 'search_properties', args: {} } }],
    contents: [{ role: 'user', parts: [{ text: 'x' }] }],
    handlers: { search_properties: () => ({ total: 0 }) },
    maxRounds: 2,
  })
  assert.equal(loop.text, null)

  let turn = 0
  const resilient = await runConversation({
    generate: async () => (turn++ === 0
      ? [{ functionCall: { name: 'nope', args: {} } }, { functionCall: { name: 'search_properties', args: {} } }]
      : [{ text: 'ขออภัยครับ' }]),
    contents: [{ role: 'user', parts: [{ text: 'x' }] }],
    handlers: { search_properties: () => { throw new Error('boom') } },
  })
  assert.equal(resilient.text, 'ขออภัยครับ')
})

test('the global location uses the global Vertex endpoint instead of a nonexistent global- host', () => {
  assert.deepEqual(vertexClientOptions({}, 'p'), { project: 'p', location: 'us-central1' })
  assert.deepEqual(vertexClientOptions({ location: ' europe-west4 ' }, 'p'), { project: 'p', location: 'europe-west4' })
  assert.deepEqual(vertexClientOptions({ location: '' }, 'p'), { project: 'p', location: 'us-central1' })
  assert.deepEqual(vertexClientOptions({ location: 'global' }, 'p'), {
    project: 'p',
    location: 'global',
    apiEndpoint: 'aiplatform.googleapis.com',
  })
})
