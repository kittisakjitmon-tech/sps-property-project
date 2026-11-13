const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  cleanPost,
  parseThaiPrice,
  guessListingFields,
  checkExtractedFields,
  buildExtractRequest,
  parseJsonObject,
  publicListingText,
  completeStaffListing,
  toIndexedProperty,
  searchProperties,
  shouldReply,
  unansweredCustomerMessages,
  historyToContents,
  cleanReplyText,
  buildSystemPrompt,
  runConversation,
  vertexClientOptions,
  replyCharLimit,
  countQuestions,
  isTooLong,
  hardTrim,
  buildShortenRequest,
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
  assert.equal(searchProperties(list, { limit: 99 }).results.length <= 10, true)
})

test('place names match their synonyms and spellings', () => {
  assert.equal(searchProperties(list, { location: 'amata' }).results[0].code, 'SPS-R-1')
  assert.equal(searchProperties(list, { location: 'อมตะซิตี้' }).results[0].code, 'SPS-R-1')
  assert.equal(searchProperties(list, { location: 'sriracha' }).results[0].code, 'SPS-CD-1')
})

test('empty searches loosen filters step by step and say so', () => {
  // Other zones only when the customer allowed them.
  const none = searchProperties(list, { location: 'ภูเก็ต', propertyType: 'ที่ดิน' }, {})
  assert.equal(none.total, 0)
  const nearby = searchProperties(list, { location: 'ภูเก็ต', propertyType: 'ที่ดิน', allowNearbyZones: true })
  assert.ok(nearby.total > 0, 'falls back to alternatives')
  assert.ok(nearby.relaxed.includes('location'))
  assert.match(nearby.note, /ใกล้เคียง/)

  const overBudget = searchProperties(list, { listingType: 'sale', maxPrice: 2000000, location: 'พานทอง' })
  assert.ok(overBudget.relaxed.some(step => step.startsWith('maxPrice')))
  assert.equal(overBudget.results[0].code, 'SPS-TH-1CLASS-204')

  const empty = searchProperties([], { location: 'x' })
  assert.equal(empty.total, 0)
  assert.deepEqual(empty.results, [])
  assert.equal(empty.nearbyZonesAvailable, false)
  assert.deepEqual(searchProperties([], {}), { total: 0, results: [], relaxed: [] })
})

test('other zones are never listed unless the customer allowed them; the bot is told they exist', () => {
  const asked = searchProperties(list, { location: 'ภูเก็ต' })
  assert.equal(asked.total, 0)
  assert.deepEqual(asked.results, [])
  assert.equal(asked.nearbyZonesAvailable, true)
  assert.match(asked.note, /ห้ามเสนอโซนอื่นเอง/)
  assert.match(asked.note, /allowNearbyZones/)
  assert.ok(!JSON.stringify(asked).includes('SPS-'), 'no listing from another zone leaks into the answer')
  // "true" as text is not permission
  assert.equal(searchProperties(list, { location: 'ภูเก็ต', allowNearbyZones: 'true' }).total, 0)
  const allowed = searchProperties(list, { location: 'ภูเก็ต', allowNearbyZones: true })
  assert.ok(allowed.total > 0)
  assert.ok(allowed.relaxed.includes('location'))
  // looser filters inside the same zone still work without permission
  const sameZone = searchProperties(list, { listingType: 'sale', maxPrice: 2000000, location: 'พานทอง' })
  assert.ok(sameZone.total > 0)
  assert.ok(!sameZone.relaxed.includes('location'))
})

const { sanitizeCreditProfile, DEFAULT_CREDIT_CHECKLIST } = require('./facebook-ai-core.cjs')

test('credit profile keeps only sensible numbers and known values', () => {
  const profile = sanitizeCreditProfile({
    age: 34, occupation: 'salaried', employmentYears: 3.46, monthlyIncome: 45000.4, monthlyDebt: 0,
    downPayment: 300000, wantedLoan: 2000000, creditIssue: 'none', coBorrower: false, note: 'ต้องการผ่อน 30 ปี',
  })
  assert.deepEqual(profile, {
    age: 34, occupation: 'พนักงานประจำ', employmentYears: 3.5, monthlyIncome: 45000, monthlyDebt: 0,
    downPayment: 300000, wantedLoan: 2000000, creditIssue: 'none', coBorrower: false, note: 'ต้องการผ่อน 30 ปี',
  })
  assert.deepEqual(sanitizeCreditProfile({ age: 5, monthlyIncome: -1, monthlyDebt: 'abc', creditIssue: 'maybe', coBorrower: 'yes', employmentYears: 99 }), {})
  assert.equal(sanitizeCreditProfile({ occupation: 'ขายของออนไลน์' }).occupation, 'ขายของออนไลน์')
  assert.deepEqual(sanitizeCreditProfile(undefined), {})
})

test('the prompt uses the team\'s credit checklist, or the default one', () => {
  const custom = buildSystemPrompt({ isFirstReply: false, creditChecklist: 'ถามเฉพาะ: อาชีพ และรายได้ต่อเดือน เท่านั้น' })
  assert.match(custom, /ถามเฉพาะ: อาชีพ และรายได้ต่อเดือน เท่านั้น/)
  assert.ok(!custom.includes('NCB ดึงล่าสุด'))
  const fallback = buildSystemPrompt({ isFirstReply: false })
  assert.match(fallback, /NCB ดึงล่าสุด/)
  assert.match(fallback, /สำเนาบัตรประชาชน หน้า-หลัง 5 ชุด/)
  assert.match(fallback, /สเตทเมนต์ 6 เดือนย้อนหลัง/)
  assert.match(fallback, /เอกสารคู่สมรส/)
  assert.match(fallback, /ไม่ต้องให้ส่งเอกสารหรือข้อมูลบัตรในแชท/)
  assert.match(fallback, /save_credit_profile/)
  assert.match(DEFAULT_CREDIT_CHECKLIST, /ห้ามบอกว่ามีเอกสารครบแล้วจะกู้ผ่านแน่/)
})

test('the prompt mentions team house images only when there are some, and says to send only on request', () => {
  const none = buildSystemPrompt({ isFirstReply: false })
  assert.ok(!none.includes('ทีมงานแนบรูปแบบบ้านไว้'))
  const some = buildSystemPrompt({ isFirstReply: false, staffImages: [{ caption: 'แปลนชั้น 1' }, { caption: '' }] })
  assert.match(some, /แนบรูปแบบบ้านไว้ในแชทนี้ 2 รูป \(แปลนชั้น 1\)/)
  assert.match(some, /ห้ามส่งรูปเมื่อลูกค้าไม่ได้ขอ/)
  assert.match(some, /send_house_images/)
})

test('house images and cards are one reply, so neither counts against the hourly limit', () => {
  const now = Date.now()
  const recent = [
    { direction: 'outgoing', sentBy: 'ai', kind: 'images', timestamp: now - 1000 },
    { direction: 'outgoing', sentBy: 'ai', kind: 'images', timestamp: now - 2000 },
    { direction: 'outgoing', sentBy: 'ai', kind: 'cards', timestamp: now - 3000 },
  ]
  const base = { settings: { enabled: true, maxRepliesPerHour: 1 }, conversation: {}, text: 'สวัสดี', timestamp: now, recentMessages: recent, now }
  assert.equal(shouldReply(base).reply, true)
  assert.equal(shouldReply({ ...base, recentMessages: [{ direction: 'outgoing', sentBy: 'ai', timestamp: now - 1000 }] }).reason, 'rate-limited')
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
  assert.equal(buildCardElements(Array(10).fill(list[0])).length, 10)
  assert.equal(buildCardElements(Array(15).fill(list[0])).length, 10, 'a carousel holds at most 10 cards')
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

test('Thai typed right after a link is kept, and the link is kept too', () => {
  const allowed = ['https://spspropertysolution.com/p/a1']
  assert.equal(
    sanitizeUrls('ดูได้ที่ https://spspropertysolution.com/p/a1นะครับ', allowed),
    'ดูได้ที่ https://spspropertysolution.com/p/a1 นะครับ',
  )
  // A link that is not allowed is removed, but the Thai after it stays.
  assert.equal(sanitizeUrls('ดู https://evil.example/xนะครับ', allowed), 'ดู นะครับ')
  assert.equal(sanitizeUrls('(https://spspropertysolution.com/p/a1)', allowed), '(https://spspropertysolution.com/p/a1)')
  // Thai after a link still counts towards the reply length.
  assert.equal(isTooLong(`https://spspropertysolution.com/p/a1${'ก'.repeat(221)}`, 220), true)
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
  assert.match(first, /แอดมินเพจ/)
  assert.ok(!first.includes('ผู้ช่วย AI'))
  assert.match(first, /ไม่ต้องแนะนำตัว/)
  assert.match(first, /ห้ามโกหกว่าเป็นคน/) // never claims to be a person when asked directly
  assert.match(first, /คำลงท้าย "ครับ"/)
  assert.match(first, /priceApprox/)
  assert.match(first, /ห้ามเดา/)
  assert.match(buildSystemPrompt({ isFirstReply: false }), /ไม่ต้องทักทายหรือแนะนำตัวซ้ำ/)
  const female = buildSystemPrompt({ isFirstReply: true, particle: 'ค่ะ' })
  assert.match(female, /ห้ามใช้ "ผม"/)
  assert.match(female, /สวัสดีค่ะ/)
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

test('all thirteen tools are declared', () => {
  assert.deepEqual(TOOL_DECLARATIONS.map(t => t.name), [
    'search_properties', 'get_property', 'show_attached_houses', 'show_property_cards', 'save_customer_info', 'check_availability', 'request_appointment', 'estimate_loan', 'save_credit_profile', 'save_document_review', 'send_house_guide', 'send_house_images', 'request_human',
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

test('the prompt asks for short human chat, not letters, and examples use placeholders', () => {
  const prompt = buildSystemPrompt({ isFirstReply: false })
  assert.match(prompt, /ข้อความเดียวและสั้น/)
  assert.match(prompt, /ห้ามเกิน 220 ตัวอักษร/)
  assert.doesNotMatch(prompt, /เว้นบรรทัดว่าง|ทีละฟอง/)
  assert.match(prompt, /ยินดีให้บริการ/)
  assert.match(prompt, /\{priceApprox\}/)
  assert.ok(!/ตัวอย่างน้ำเสียง[\s\S]*2\.1xxx/.test(prompt.split('กฎด้านข้อมูล')[0]), 'examples must not contain a copyable price')
  assert.doesNotMatch(prompt, /ไม่เกิน 600 ตัวอักษร/)
  assert.match(buildSystemPrompt({ isFirstReply: true }), /ทักทายสั้นๆ/)
})

test('the reply length limit ignores links, is configurable and clamped', () => {
  assert.equal(replyCharLimit({}), 220)
  assert.equal(replyCharLimit({ maxReplyChars: 150 }), 150)
  assert.equal(replyCharLimit({ maxReplyChars: 10 }), 220)
  assert.equal(replyCharLimit({ maxReplyChars: 5000 }), 220)
  assert.equal(replyCharLimit({ maxReplyChars: 'abc' }), 220)
  const link = 'https://spspropertysolution.com/p/' + 'a'.repeat(40)
  assert.equal(isTooLong('ก'.repeat(220), 220), false)
  assert.equal(isTooLong('ก'.repeat(221), 220), true)
  assert.equal(isTooLong(`${'ก'.repeat(200)} ${link}`, 220), false, 'links are not counted')
  assert.equal(isTooLong(null, 220), false)
})

test('a last-resort cut stops at a space and keeps links intact', () => {
  const words = Array.from({ length: 60 }, (_, i) => `คำ${i}`).join(' ')
  const cut = hardTrim(words, 100)
  assert.ok(cut.length <= 100)
  assert.ok(!cut.endsWith(' '))
  assert.ok(words.startsWith(cut))
  assert.equal(hardTrim('สั้น', 100), 'สั้น')
  const link = 'https://spspropertysolution.com/p/abc'
  const withLink = `${words} ${link}`
  assert.ok(hardTrim(withLink, 100).length <= 100 + link.length)
})

test('the shorten request keeps facts, prices and links and states the limit', () => {
  const request = buildShortenRequest('ข้อความยาว 2.1xxx ล้านบาท', 180, 'ค่ะ')
  assert.match(request.systemInstruction, /ค่ะ/)
  assert.match(request.systemInstruction, /ห้ามเปลี่ยนตัวเลข/)
  assert.match(request.systemInstruction, /ลิงก์/)
  assert.match(request.contents[0].parts[0].text, /ไม่เกิน 180 ตัวอักษร/)
  assert.match(request.contents[0].parts[0].text, /2\.1xxx/)
})


// ─── Loan estimate ───────────────────────────────────────────────────────────
const { estimateLoan } = require('./facebook-ai-core.cjs')

test('estimateLoan: standard instalment with default down payment and years', () => {
  const r = estimateLoan({ price: 2500000, monthlyIncome: 40000, monthlyDebt: 3000 })
  assert.equal(r.ok, true)
  assert.equal(r.assumptions.downPayment, 500000)
  assert.equal(r.assumptions.loanAmount, 2000000)
  assert.equal(r.assumptions.years, 30)
  assert.equal(r.assumptions.ratePercent, 3.5)
  assert.equal(r.monthlyPayment, 9000) // 2,000,000 @ 3.5% over 30 years, rounded to 100
  assert.equal(r.verdict, 'likely')
  assert.equal(r.needsTeam, false)
})

test('estimateLoan: customer-given down payment, years and direct installment are used', () => {
  const r = estimateLoan({ price: 1000000, downPayment: 100000, years: 10, loanType: 'direct', monthlyIncome: 50000 }, {})
  assert.equal(r.assumptions.loanAmount, 900000)
  assert.equal(r.assumptions.years, 10)
  assert.equal(r.assumptions.ratePercent, 2.5)
  assert.equal(r.monthlyPayment, 8500)
  const zero = estimateLoan({ price: 1000000, downPercent: 0, monthlyIncome: 50000 })
  assert.equal(zero.assumptions.downPayment, 0)
})

test('estimateLoan: years are capped and settings override the defaults', () => {
  assert.equal(estimateLoan({ price: 2000000, years: 99, monthlyIncome: 50000 }).assumptions.years, 30)
  const r = estimateLoan({ price: 2000000, monthlyIncome: 50000 }, { loanBankRate: 5, loanDefaultDownPercent: 10, loanMaxYears: 20, loanDefaultYears: 20 })
  assert.equal(r.assumptions.ratePercent, 5)
  assert.equal(r.assumptions.downPayment, 200000)
  assert.equal(r.assumptions.years, 20)
  // nonsense settings fall back to the defaults
  assert.equal(estimateLoan({ price: 2000000, monthlyIncome: 50000 }, { loanBankRate: 'abc', loanMaxDsrPercent: -5 }).assumptions.ratePercent, 3.5)
})

test('estimateLoan: high debt burden is never called a rejection and goes to the team', () => {
  const r = estimateLoan({ price: 2500000, downPayment: 300000, monthlyIncome: 20000, monthlyDebt: 2000 })
  assert.equal(r.verdict, 'unlikely')
  assert.equal(r.needsTeam, true)
  assert.match(r.hint, /ห้ามบอกว่ากู้ไม่ผ่าน/)
  const border = estimateLoan({ price: 2000000, downPercent: 0, monthlyIncome: 20000 }) // ~9,000 / 20,000 = 45%
  assert.equal(border.verdict, 'borderline')
  assert.equal(border.needsTeam, true)
})

test('estimateLoan: missing income still gives the instalment but asks the team to follow up', () => {
  const r = estimateLoan({ price: 2500000 })
  assert.equal(r.ok, true)
  assert.equal(r.verdict, 'unknown')
  assert.equal(r.needsTeam, true)
  assert.ok(r.monthlyPayment > 0)
})

test('estimateLoan: no usable price means it cannot calculate', () => {
  for (const price of [undefined, 0, 500, -5, 'abc', 5e9]) {
    const r = estimateLoan({ price, monthlyIncome: 40000 })
    assert.equal(r.ok, false)
    assert.equal(r.needsTeam, true)
  }
})

test('estimateLoan: the approximate maximum loan is rounded down and fits the income', () => {
  const r = estimateLoan({ price: 5000000, monthlyIncome: 40000, monthlyDebt: 4000 })
  assert.ok(r.approxMaxLoan % 50000 === 0)
  const paymentAtMax = estimateLoan({ price: r.approxMaxLoan + r.assumptions.downPayment, downPayment: r.assumptions.downPayment, monthlyIncome: 40000, monthlyDebt: 4000 })
  assert.ok(paymentAtMax.dsrPercent <= 40)
})

test('the loan tool is declared and the prompt tells the bot not to promise approval', () => {
  assert.ok(TOOL_DECLARATIONS.some(tool => tool.name === 'estimate_loan'))
  const prompt = buildSystemPrompt({ isFirstReply: false })
  assert.match(prompt, /estimate_loan/)
  assert.match(prompt, /ให้ทำตาม hint ในผลลัพธ์ ไม่ต้องขอเบอร์ติดต่อ/)
  assert.match(prompt, /ขอเบอร์เฉพาะตอนลูกค้าต้องการนัดหมาย/)
  assert.doesNotMatch(prompt, /ฝากเบอร์ติดต่อ|ขอเบอร์โทรอย่างสุภาพ/)
})

// ─── Which property is the customer talking about? ───────────────────────────
const { extractPropertyMentions, findFocusProperties, findPropertyByRef } = require('./facebook-ai-core.cjs')

const mkProp = (id, displayId, extra = {}) => toIndexedProperty(id, {
  status: 'available', displayId, title: `บ้าน ${displayId}`, type: 'SPS-TH-1CLASS-ID', listingType: 'sale',
  bedrooms: 3, bathrooms: 2, locationDisplay: 'พานทอง, ชลบุรี', price: 2150000, showPrice: true, description: 'บ้านใหม่', ...extra,
})
const MENTION_CATALOG = [mkProp('abc123XYZ', 'SPS-TH-1'), mkProp('def456UVW', 'SPS-TH-10'), mkProp('ghi789RST', 'SPS-CD-9', { price: 1500000, showPrice: false })]

test('a link to our site names the property', () => {
  const found = extractPropertyMentions('สนใจหลังนี้ครับ https://spspropertysolution.com/p/abc123XYZ ราคาเท่าไหร่', MENTION_CATALOG)
  assert.deepEqual(found.map(p => p.code), ['SPS-TH-1'])
  assert.deepEqual(extractPropertyMentions('https://www.spspropertysolution.com/p/def456UVW?utm=x', MENTION_CATALOG).map(p => p.code), ['SPS-TH-10'])
})

test('a listing code names the property, ignoring case, and does not match a longer code', () => {
  assert.deepEqual(extractPropertyMentions('ขอดู sps-th-1 หน่อย', MENTION_CATALOG).map(p => p.code), ['SPS-TH-1'])
  assert.deepEqual(extractPropertyMentions('รหัส SPS-TH-10 ครับ', MENTION_CATALOG).map(p => p.code), ['SPS-TH-10'])
  assert.deepEqual(extractPropertyMentions('SPS-TH-100', MENTION_CATALOG), [])
})

test('made-up ids, other sites and unknown codes are ignored; several mentions keep their order', () => {
  assert.deepEqual(extractPropertyMentions('https://spspropertysolution.com/p/nope0000', MENTION_CATALOG), [])
  assert.deepEqual(extractPropertyMentions('https://evil.example/p/abc123XYZ', MENTION_CATALOG), [])
  assert.deepEqual(extractPropertyMentions('SPS-ZZ-9', MENTION_CATALOG), [])
  assert.deepEqual(extractPropertyMentions('เทียบ SPS-CD-9 กับ https://spspropertysolution.com/p/abc123XYZ', MENTION_CATALOG).map(p => p.code), ['SPS-CD-9', 'SPS-TH-1'])
  assert.deepEqual(extractPropertyMentions(undefined, MENTION_CATALOG), [])
})

test('focus: newest mention first, then the one already being discussed', () => {
  const messages = [
    { direction: 'incoming', text: 'SPS-TH-1 ราคาเท่าไหร่', timestamp: 1 },
    { direction: 'outgoing', text: 'ประมาณ 2.15 ล้านครับ', timestamp: 2 },
    { direction: 'incoming', text: 'แล้ว SPS-CD-9 ล่ะ', timestamp: 3 },
  ]
  assert.deepEqual(findFocusProperties({ messages, catalog: MENTION_CATALOG }).map(p => p.code), ['SPS-CD-9', 'SPS-TH-1'])
  const none = [{ direction: 'incoming', text: 'ผ่อนเดือนละเท่าไหร่', timestamp: 1 }]
  assert.deepEqual(findFocusProperties({ messages: none, catalog: MENTION_CATALOG, currentCode: 'SPS-TH-10' }).map(p => p.code), ['SPS-TH-10'])
  assert.deepEqual(findFocusProperties({ messages: none, catalog: MENTION_CATALOG, currentCode: 'GONE-1' }), [])
  // the bot's own text never counts as the customer's mention
  assert.deepEqual(findFocusProperties({ messages: [{ direction: 'outgoing', text: 'SPS-TH-1', timestamp: 1 }], catalog: MENTION_CATALOG }), [])
})

test('findPropertyByRef finds by code or link and nothing else', () => {
  assert.equal(findPropertyByRef({ code: 'sps-th-1' }, MENTION_CATALOG).id, 'abc123XYZ')
  assert.equal(findPropertyByRef({ url: 'https://spspropertysolution.com/p/def456UVW' }, MENTION_CATALOG).code, 'SPS-TH-10')
  assert.equal(findPropertyByRef({ code: 'nope' }, MENTION_CATALOG), null)
  assert.equal(findPropertyByRef({}, MENTION_CATALOG), null)
})

test('the listing code can be searched', () => {
  assert.equal(searchProperties(MENTION_CATALOG, { keywords: 'SPS-CD-9' }).results[0].code, 'SPS-CD-9')
})

test('the prompt names the focused listing with a masked price and offers get_property', () => {
  const prompt = buildSystemPrompt({ isFirstReply: false, focus: [MENTION_CATALOG[2]] })
  assert.match(prompt, /ทรัพย์ที่ลูกค้ากำลังพูดถึง/)
  assert.match(prompt, /SPS-CD-9/)
  assert.ok(!prompt.includes('1500000'))
  assert.match(prompt, /1\.5xxx/)
  assert.ok(TOOL_DECLARATIONS.some(tool => tool.name === 'get_property'))
  assert.ok(!buildSystemPrompt({ isFirstReply: false }).includes('ทรัพย์ที่ลูกค้ากำลังพูดถึง'))
})

// ─── Pictures the customer sends ─────────────────────────────────────────────
const { imageSettings, pickImageAttachments, withImages } = require('./facebook-ai-core.cjs')

test('imageSettings: off unless explicitly enabled, with a clamped picture count', () => {
  assert.deepEqual(imageSettings({}), { enabled: false, maxImages: 2, maxBytes: 4 * 1024 * 1024 })
  assert.equal(imageSettings({ imagesEnabled: 'true' }).enabled, false)
  assert.equal(imageSettings({ imagesEnabled: true }).enabled, true)
  assert.equal(imageSettings({ maxImagesPerMessage: 3 }).maxImages, 3)
  assert.equal(imageSettings({ maxImagesPerMessage: 50 }).maxImages, 2)
  assert.equal(imageSettings({ maxImagesPerMessage: 0 }).maxImages, 2)
})

test('pickImageAttachments keeps real pictures from known hosts only', () => {
  const urls = pickImageAttachments([
    { type: 'image', url: 'https://firebasestorage.googleapis.com/v0/b/x/o/a?alt=media' },
    { type: 'image', url: 'https://scontent.xx.fbcdn.net/b.jpg' },
    { type: 'image', url: 'https://evil.example/c.jpg' },
    { type: 'image', url: 'http://scontent.xx.fbcdn.net/d.jpg' },
    { type: 'image', url: 'not a url' },
    { type: 'image', stickerId: 369239263222822, url: 'https://scontent.xx.fbcdn.net/sticker.png' },
    { type: 'video', url: 'https://scontent.xx.fbcdn.net/v.mp4' },
    { type: 'file', url: 'https://scontent.xx.fbcdn.net/f.pdf' },
    { type: 'image' },
  ], 5)
  assert.deepEqual(urls, ['https://firebasestorage.googleapis.com/v0/b/x/o/a?alt=media', 'https://scontent.xx.fbcdn.net/b.jpg'])
  const many = Array.from({ length: 5 }, (_, i) => ({ type: 'image', url: `https://scontent.xx.fbcdn.net/${i}.jpg` }))
  assert.equal(pickImageAttachments(many, 2).length, 2)
  assert.deepEqual(pickImageAttachments(undefined), [])
})

test('shouldReply: a picture without text only counts when pictures can be read', () => {
  const base = { settings: { enabled: true }, conversation: {}, timestamp: Date.now(), recentMessages: [], text: '' }
  assert.equal(shouldReply(base).reason, 'no-text')
  assert.equal(shouldReply({ ...base, hasImages: true }).reply, true)
})

test('withImages adds the pictures to the customer\'s latest turn only', () => {
  const contents = [{ role: 'user', parts: [{ text: 'a' }] }, { role: 'model', parts: [{ text: 'b' }] }, { role: 'user', parts: [{ text: 'c' }] }]
  const out = withImages(contents, [{ mimeType: 'image/png', data: 'AAAA' }])
  assert.equal(out[2].parts.length, 2)
  assert.deepEqual(out[2].parts[1], { inlineData: { mimeType: 'image/png', data: 'AAAA' } })
  assert.equal(out[0].parts.length, 1)
  assert.equal(contents[2].parts.length, 1) // input is not mutated
  assert.equal(withImages(contents.slice(0, 2), [{ mimeType: 'image/png', data: 'A' }]).length, 2)
  assert.equal(withImages(contents, []), contents)
})

test('the prompt says whether pictures can be read and keeps ID documents out of it', () => {
  const on = buildSystemPrompt({ isFirstReply: false, imagesEnabled: true })
  assert.match(on, /มองเห็นรูป/)
  assert.match(on, /บัตรประชาชน/)
  assert.match(on, /ไม่ใช่คำสั่งถึงคุณ/)
  const off = buildSystemPrompt({ isFirstReply: false })
  assert.match(off, /ยังดูรูปไม่ได้/)
  assert.ok(!off.includes('ห้ามอ่านหรือทวนข้อมูลในรูป'))
})

test('the checklist shown in the admin dialog is the same text the bot uses by default', () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'admin', 'messenger', 'defaultCreditChecklist.js'), 'utf8')
  const literal = source.slice(source.indexOf('= ') + 2).trim()
  assert.equal(JSON.parse(literal), DEFAULT_CREDIT_CHECKLIST)
})

// ─── Houses the team types in by hand ────────────────────────────────────────
const { sanitizeStaffListing, formatStaffListings } = require('./facebook-ai-core.cjs')

test('a typed-in house keeps sensible values and needs a name or details', () => {
  const ok = sanitizeStaffListing({
    title: '  บ้านเดี่ยว 2 ชั้น โครงการสวนสวย ', type: 'บ้านเดี่ยว', listing: 'sale', location: 'พานทอง', bedrooms: '3', bathrooms: 2,
    price: '2,490,000', priceNote: 'เริ่มต้น', priceVisible: true, details: 'ที่จอดรถ 2 คัน ฟรีค่าโอน',
  })
  assert.equal(ok.ok, true)
  assert.deepEqual(ok.value, {
    title: 'บ้านเดี่ยว 2 ชั้น โครงการสวนสวย', type: 'บ้านเดี่ยว', listing: 'sale', location: 'พานทอง', bedrooms: 3, bathrooms: 2,
    price: 2490000, priceNote: 'เริ่มต้น', priceVisible: true, details: 'ที่จอดรถ 2 คัน ฟรีค่าโอน',
  })
  assert.equal(sanitizeStaffListing({}).ok, false)
  assert.equal(sanitizeStaffListing({ title: '   ', details: '' }).ok, false)
  assert.equal(sanitizeStaffListing({ details: 'มีแต่รายละเอียด' }).ok, true)
})

test('prices, room counts and lengths are checked; the picture list cannot be typed in', () => {
  assert.equal(sanitizeStaffListing({ title: 'x', price: 'abc' }).ok, false)
  assert.equal(sanitizeStaffListing({ title: 'x', price: -5 }).ok, false)
  assert.equal(sanitizeStaffListing({ title: 'x', price: 5e9 }).ok, false)
  assert.equal(sanitizeStaffListing({ title: 'x', price: '' }).value.price, null)
  assert.equal(sanitizeStaffListing({ title: 'x', price: 0 }).ok, false)
  const odd = sanitizeStaffListing({ title: 'x', bedrooms: 99, bathrooms: -1, priceVisible: 'no', listing: 'whatever', type: 'วิลล่า' }).value
  assert.equal(odd.bedrooms, null)
  assert.equal(odd.bathrooms, null)
  assert.equal(odd.priceVisible, true) // only an explicit false hides the price
  assert.equal(odd.listing, 'sale')
  assert.equal(odd.type, 'วิลล่า')
  const long = sanitizeStaffListing({ title: 'ก'.repeat(500), details: 'ข'.repeat(5000) }).value
  assert.equal(long.title.length, 80)
  assert.equal(long.details.length, 2000)
  assert.equal('images' in sanitizeStaffListing({ title: 'x', images: [{ url: 'https://evil.example/a.png' }], id: 'abc' }).value, false)
})

test('houses typed in by the team are given to the AI with their price, or masked when not to be told', () => {
  const lines = formatStaffListings([
    { id: 'a1', type: 'บ้านเดี่ยว', title: 'สวนสวย', location: 'พานทอง', bedrooms: 3, bathrooms: 2, price: 2490000, priceNote: 'เริ่มต้น', priceVisible: true, details: 'ฟรีค่าโอน', images: [{ url: 'u' }, { url: 'v' }] },
    { id: 'b2', type: 'บ้านแฝด', title: 'แฝดสุขใจ', price: 1850000, priceVisible: false, listing: 'sale' },
    { id: 'c3', type: 'ทาวน์โฮม', title: 'ไม่มีราคา' },
    { id: 'd4', type: 'บ้านเช่า', title: 'เช่า', price: 12000, priceVisible: true, listing: 'rent' },
  ])
  assert.equal(lines.length, 4)
  assert.match(lines[0], /id=a1/)
  assert.match(lines[0], /บ้านเดี่ยว สวนสวย/)
  assert.match(lines[0], /3 นอน 2 น้ำ/)
  assert.match(lines[0], /ราคา: 2,490,000 บาท \(เริ่มต้น\)/)
  assert.match(lines[0], /มีรูปแบบบ้าน 2 รูป/)
  assert.match(lines[1], /ประมาณ 1\.8xxx ล้านบาท/)
  assert.ok(!lines[1].includes('1850000') && !lines[1].includes('1,850,000'))
  assert.match(lines[2], /ไม่ได้ระบุราคา/)
  assert.match(lines[3], /12,000 บาท\/เดือน/)
  assert.deepEqual(formatStaffListings(undefined), [])
  assert.equal(formatStaffListings(Array.from({ length: 30 }, (_, n) => ({ id: `i${n}`, title: 't' }))).length, 10)
})

test('the prompt lists the team\'s houses, tells the AI not to invent links, and is silent when there are none', () => {
  const prompt = buildSystemPrompt({ isFirstReply: false, staffListings: [{ id: 'a1', type: 'บ้านแฝด', title: 'แฝดสุขใจ', price: 1850000, priceVisible: true }] })
  assert.match(prompt, /บ้านที่ทีมงานกรอกไว้สำหรับแชทนี้/)
  assert.match(prompt, /id=a1 \| บ้านแฝด แฝดสุขใจ/)
  assert.match(prompt, /listingId/)
  assert.ok(!buildSystemPrompt({ isFirstReply: false }).includes('บ้านที่ทีมงานกรอกไว้สำหรับแชทนี้'))
  const tool = TOOL_DECLARATIONS.find(item => item.name === 'send_house_images')
  assert.ok(tool.parameters.properties.listingId)
})


// ─── Which house to show first ───────────────────────────────────────────────
const { asksForOtherHouses, buildStaffListingElement, buildAttachedElements, MAX_CARDS: CARD_CAP, DEFAULT_CARDS } = require('./facebook-ai-core.cjs')

test('a carousel holds ten houses; three are shown at first', () => {
  assert.equal(CARD_CAP, 10)
  assert.equal(DEFAULT_CARDS, 3)
})

test('asking for other houses is recognised, and plain interest in a house is not', () => {
  for (const text of [
    'มีบ้านอื่นไหมคะ', 'ขอดูหลังอื่นหน่อย', 'มีโซนอื่นไหม', 'มีแบบอื่นอีกไหมครับ', 'ขอดูเพิ่มได้ไหม', 'มีอีกไหม',
    'มีทำเลใกล้เคียงไหม', 'any other house?', 'show more options', 'มีโครงการอื่นๆ ไหมคะ', 'ดูเพิ่มหน่อย',
  ]) assert.equal(asksForOtherHouses(text), true, text)
  for (const text of [
    'สนใจบ้านแฝดค่ะ', 'หลังนี้เท่าไหร่คะ', 'ขอดูแปลน', 'สวัสดีครับ', 'ผ่อนเดือนละเท่าไหร่', 'โครงการอะไรคะ', '', undefined, null,
  ]) assert.equal(asksForOtherHouses(text), false, String(text))
})

test('a typed-in house becomes a card with picture, rooms, area and price, and no web link', () => {
  const card = buildStaffListingElement({
    type: 'บ้านแฝด', title: 'สุขใจ', bedrooms: 2, bathrooms: 2, location: 'พานทอง', price: 2190000, priceVisible: true,
    images: [{ url: 'http://insecure.example/a.jpg' }, { url: 'https://firebasestorage.googleapis.com/v0/b/x/o/a?alt=media' }],
  })
  assert.equal(card.title, 'บ้านแฝด สุขใจ')
  assert.equal(card.subtitle, '2 นอน 2 น้ำ · พานทอง · 2,190,000 บาท')
  assert.equal(card.image_url, undefined) // the first picture is http, so no image rather than an insecure one
  assert.equal(card.buttons, undefined)
  const withImage = buildStaffListingElement({ title: 'บ้านเดี่ยว', images: [{ url: 'https://firebasestorage.googleapis.com/v0/b/x/o/b?alt=media' }] })
  assert.equal(withImage.image_url, 'https://firebasestorage.googleapis.com/v0/b/x/o/b?alt=media')
  assert.equal(withImage.subtitle, undefined)
})

test('a price the team marked "do not tell" is masked on the card', () => {
  const card = buildStaffListingElement({ type: 'บ้านเดี่ยว', title: 'สวนสวย', price: 2490000, priceVisible: false })
  assert.match(card.subtitle, /2\.4xxx ล้านบาท/)
  assert.ok(!JSON.stringify(card).includes('2490000') && !JSON.stringify(card).includes('2,490,000'))
  assert.equal(buildStaffListingElement({ title: 'x', price: 2490000, priceVisible: false, listing: 'rent' }).subtitle, 'ราคา 2,490,xxx บาท/เดือน')
  assert.ok(buildStaffListingElement({ title: 'ก'.repeat(200), details: 'x' }).title.length <= 80)
})

test('attached cards: database properties first, then typed-in houses, at most ten', () => {
  const props = [list[0]]
  const listings = [{ title: 'a' }, { title: 'b' }]
  const cards = buildAttachedElements({ properties: props, listings })
  assert.equal(cards.length, 3)
  assert.ok(cards[0].buttons, 'the database property keeps its details button')
  assert.equal(cards[1].title, 'a')
  assert.equal(buildAttachedElements({ listings: Array.from({ length: 14 }, (_, n) => ({ title: `h${n}` })) }).length, 10)
  assert.deepEqual(buildAttachedElements(), [])
})

test('the prompt makes the attached houses come first, and holds back other houses until asked', () => {
  const none = buildSystemPrompt({ isFirstReply: false })
  assert.ok(!none.includes('ลำดับการแนะนำบ้านในแชทนี้'))
  const prompt = buildSystemPrompt({ isFirstReply: false, staffListings: [{ id: 'a1', title: 'บ้านแฝด' }] })
  assert.match(prompt, /บ้านที่แนบไว้ก่อนเสมอ/)
  assert.match(prompt, /show_attached_houses/)
  assert.match(prompt, /ห้ามเสนอ ค้นหา หรือส่งการ์ดบ้านหลังอื่น/)
  assert.match(prompt, /customerAskedForOtherHouses/)
  assert.match(prompt, /ไม่เกิน 10 หลัง/)
  // a property the AI merely remembers is not 'attached'
  assert.ok(!buildSystemPrompt({ isFirstReply: false, focus: [list[0]] }).includes('ลำดับการแนะนำบ้านในแชทนี้'))
  const withProperty = buildSystemPrompt({ isFirstReply: false, focus: [list[0]], attachedProperty: true })
  assert.match(withProperty, /บ้านที่แนบไว้ก่อนเสมอ/)
})

// ─── A pasted house post ─────────────────────────────────────────────────────
const POST = `🏡 บ้านเเฝด 🗺️แยกมาบโป่ง เฟส8-10
2 ห้องนอน 2 ห้องน้ำ 1 ครัว 2 จอดรถ
พื้นที่เงียบสงบ เป็นส่วนตัว
✅ฟรีถังสำรองน้ำ 1,000 ลิตร   

พิกัด 📍
https://maps.app.goo.gl/38ManFKLBfZc8vE5A?g_st=ipc
 ราคา 2.19 ล้าน`

test('a pasted post keeps its lines, tidied', () => {
  const text = cleanPost('  บรรทัด   แรก \r\n\n\n\nบรรทัดสอง  ')
  assert.equal(text, 'บรรทัด แรก\n\nบรรทัดสอง')
  assert.equal(cleanPost('ก'.repeat(3000)).length, 2000)
  assert.equal(cleanPost(42), '')
})

test('Thai prices are read in the ways people write them', () => {
  assert.equal(parseThaiPrice('ราคา 2.19 ล้าน'), 2190000)
  assert.equal(parseThaiPrice('2,190,000 บาท'), 2190000)
  assert.equal(parseThaiPrice('1.85 ลบ.'), 1850000)
  assert.equal(parseThaiPrice('9 แสน'), 900000)
  assert.equal(parseThaiPrice('ค่าเช่า 8,500 บาท/เดือน'), 8500)
  assert.equal(parseThaiPrice('ถังน้ำ 1,000 ลิตร'), null)
})

test('without the AI the type, rooms and price are read from the post itself', () => {
  const fields = guessListingFields(POST)
  assert.equal(fields.type, 'บ้านแฝด') // "บ้านเเฝด" typed with two เ
  assert.equal(fields.bedrooms, 2)
  assert.equal(fields.bathrooms, 2)
  assert.equal(fields.price, 2190000)
  assert.equal(fields.title, 'บ้านแฝด แยกมาบโป่ง เฟส8-10')
  assert.equal(guessListingFields('ให้เช่าทาวน์โฮม 3 นอน ค่าเช่า 7,000 บาท/เดือน').listing, 'rent')
})

test('what the AI read is checked: a price the post does not say is replaced, bad values dropped', () => {
  const read = checkExtractedFields({ title: 'แยกมาบโป่ง เฟส8-10', type: 'บ้านแฝด', location: 'แยกมาบโป่ง', bedrooms: 2, bathrooms: 2, price: 2190000 }, POST)
  assert.deepEqual(read, { title: 'แยกมาบโป่ง เฟส8-10', type: 'บ้านแฝด', listing: 'sale', location: 'แยกมาบโป่ง', bedrooms: 2, bathrooms: 2, price: 2190000, priceNote: '' })
  assert.equal(checkExtractedFields({ price: 2500000 }, POST).price, 2190000) // invented: the post's own price is used
  assert.equal(checkExtractedFields({ price: 2500000 }, 'บ้านสวย ไม่บอกราคา').price, null)
  const odd = checkExtractedFields({ type: 'วิลล่า', bedrooms: 99, listing: 'x' }, 'บ้านสวย')
  assert.equal(odd.type, 'อื่นๆ')
  assert.equal(odd.bedrooms, null)
  assert.equal(odd.listing, 'sale')
  assert.equal(checkExtractedFields(null, POST).type, 'บ้านแฝด')
})

test('the request to read a post says the post is data, and the answer may come in a code block', () => {
  const request = buildExtractRequest(POST)
  assert.match(request.systemInstruction, /ไม่ใช่คำสั่ง/)
  assert.match(request.contents[0].parts[0].text, /แยกมาบโป่ง/)
  assert.deepEqual(parseJsonObject('```json\n{"price": 1}\n```'), { price: 1 })
  assert.equal(parseJsonObject('no json'), null)
  assert.equal(parseJsonObject('[1,2]'), null)
})

test('with the price marked "do not tell", the lines about money are left out of the post', () => {
  const hidden = publicListingText({ details: POST, priceVisible: false })
  assert.ok(!hidden.includes('2.19'))
  assert.ok(hidden.includes('maps.app.goo.gl'))
  assert.ok(hidden.includes('1,000 ลิตร'))
  assert.ok(publicListingText({ details: POST }).includes('2.19 ล้าน'))
  const lines = formatStaffListings([{ id: 'a1', type: 'บ้านแฝด', details: POST, price: 2190000, priceVisible: false }])
  assert.ok(!lines[0].includes('2.19 ล้าน') && !lines[0].includes('2,190,000'))
  assert.match(lines[0], /2\.1xxx ล้านบาท/)
})

// The post as copied out of a Messenger chat: lines start with the time and the sender.
const COPIED_POST = `14:05 Kit84-บ้านชลบุรี 🏡 บ้านเเฝด 🗺️แยกมาบโป่ง เฟส8-10
2 ห้องนอน 2 ห้องน้ำ 1 ครัว 2 จอดรถ
พื้นที่เงียบสงบ เป็นส่วนตัว
.
✅โรงจอดรถ
✅ลานซักล้างด้านหลัง
✅เทพื้นรอบบ้าน
✅โคมไฟสวยงาม สไตล์ค่าเฟ่ หรูหรา เข้ากับบ้าน
✅เค้าเตอร์ครัว 
✅ฝักบัว Rain Shower เพื่อสุนทรีในการอาบน้ำ
✅สกิมโค้ททั้งภายใน และภายนอก 
✅รั้วสูงพร้อมความเป็นส่วนตัว
✅ฟรีค่ามิเตอร์น้ำ
✅ฟรีค่ามิเตอร์ไฟฟ้า
✅ฟรีปั๊มน้ำ
✅ฟรีถังสำรองน้ำ 1,000 ลิตร  

พิกัด 📍
https://maps.app.goo.gl/38ManFKLBfZc8vE5A?g_st=ipc
14:05 Kit84-บ้านชลบุรี ราคา 2.19 ล้าน`

test('a post copied out of a chat loses the time and sender stamps, and its price is found', () => {
  const text = cleanPost(COPIED_POST)
  assert.ok(!text.includes('14:05') && !text.includes('Kit84'))
  assert.equal(text.split('\n').at(-1), 'ราคา 2.19 ล้าน')
  assert.equal(guessListingFields(COPIED_POST).price, 2190000)
  assert.equal(guessListingFields(COPIED_POST).title, 'บ้านแฝด แยกมาบโป่ง เฟส8-10')
  assert.equal(cleanPost('10:00 - 17:00 เปิดให้ชม\n9:30 น. นัดได้'), '10:00 - 17:00 เปิดให้ชม\n9:30 น. นัดได้') // opening hours stay
})

test('a house saved without a price gets the price its post states', () => {
  assert.equal(completeStaffListing({ id: 'h', details: COPIED_POST, price: null }).price, 2190000)
  assert.equal(completeStaffListing({ id: 'h', details: COPIED_POST, price: 2500000 }).price, 2500000) // the saved price wins
  assert.equal(completeStaffListing({ id: 'h', details: 'บ้านสวย' }).price, undefined)
})

test('nearby places saved as a list are searchable and shown to the AI', () => {
  const listed = toIndexedProperty('p9', {
    status: 'available', displayId: 'SPS-TW-9', title: 'บ้านแฝด', price: 2190000,
    nearbyPlace: ['นิคมอมตะซิตี้', { label: 'โลตัสพานทอง' }, { name: '' }, 5],
  })
  assert.equal(listed.nearby, 'นิคมอมตะซิตี้, โลตัสพานทอง')
  assert.deepEqual(searchProperties([listed], { keywords: 'โลตัส' }).results.map(item => item.code), ['SPS-TW-9'])
  assert.equal(toIndexedProperty('p8', { status: 'available', displayId: 'X', nearbyPlace: 'ตลาด' }).nearby, 'ตลาด')
  assert.equal(toIndexedProperty('p7', { status: 'available', displayId: 'Y' }).nearby, '')
})

test('the reply may be longer when it answers several questions, within limits', () => {
  assert.equal(replyCharLimit({}, 1), 220)
  assert.equal(replyCharLimit({}, 2), 352)
  assert.equal(replyCharLimit({}, 3), 484)
  assert.equal(replyCharLimit({}, 9), 550) // at most 2.5 times
  assert.equal(replyCharLimit({ maxReplyChars: 600 }, 3), 1000) // never over 1000
  assert.equal(replyCharLimit({}, 0), 220)
  assert.equal(countQuestions([{ direction: 'incoming', text: 'ราคา' }, { direction: 'incoming', text: '' }, { direction: 'incoming', text: 'พิกัด' }]), 2)
  assert.equal(countQuestions([]), 1)
  assert.match(buildSystemPrompt({ maxChars: 352 }), /ห้ามเกิน 352 ตัวอักษร/)
})

test('the page\'s automatic reply is not a person answering, and answers nothing', () => {
  const now = 10_000_000
  const recentMessages = [
    { direction: 'incoming', text: 'สนใจบ้านค่ะ', timestamp: now - 20_000 },
    { direction: 'outgoing', sentBy: null, automated: true, text: 'สวัสดี ขอบคุณที่ติดต่อเรา', timestamp: now - 18_000 },
  ]
  assert.equal(shouldReply({ settings: { enabled: true }, conversation: {}, text: 'สนใจบ้านค่ะ', timestamp: now - 20_000, recentMessages, now }).reply, true)
  const person = recentMessages.map(m => (m.automated ? { ...m, automated: false } : m))
  assert.equal(shouldReply({ settings: { enabled: true }, conversation: {}, text: 'x', timestamp: now - 1000, recentMessages: person, now }).reason, 'human-active')
  assert.deepEqual(unansweredCustomerMessages(recentMessages).map(m => m.text), ['สนใจบ้านค่ะ'])
})

test('the team\'s finance knowledge reaches the AI; unfilled outline lines do not', () => {
  const outline = '# ธนาคารและ MOU\n- MOU กับ ธอส.: [ใส่ว่าคืออะไร]\n\n# ค่าใช้จ่ายวันโอน\n- ค่าโอน: [ใส่ใครจ่าย]'
  assert.ok(!buildSystemPrompt({ financeKnowledge: outline }).includes('ความรู้การเงินและสินเชื่อของบริษัท'))
  assert.ok(!buildSystemPrompt({}).includes('ความรู้การเงินและสินเชื่อของบริษัท'))
  const filled = outline.replace('[ใส่ว่าคืออะไร]', 'พนักงานบริษัทที่มี MOU กู้ ธอส. ดอกเบี้ยพิเศษ')
  const prompt = buildSystemPrompt({ financeKnowledge: filled })
  assert.match(prompt, /ความรู้การเงินและสินเชื่อของบริษัท[\s\S]*ห้ามรับปากว่ากู้ผ่าน/)
  assert.match(prompt, /\n- MOU กับ ธอส\.: พนักงานบริษัทที่มี MOU กู้ ธอส\. ดอกเบี้ยพิเศษ\n/) // its own line
  assert.ok(!prompt.includes('[ใส่ใครจ่าย]'))
})

test('with no house yet, the AI is told to ask the zone first, from the team\'s post', () => {
  const guide = 'โพสต์ช่วงราคา:\n- ทาวน์โฮม 1.3-1.7 ล้านบาท\nโซนที่มีบ้าน: [ใส่ โซน]'
  const prompt = buildSystemPrompt({ openingGuide: guide })
  assert.match(prompt, /ถามก่อนว่าสนใจโซนไหน/)
  assert.match(prompt, /\n- ทาวน์โฮม 1\.3-1\.7 ล้านบาท\n/)
  assert.ok(!prompt.includes('[ใส่ โซน]'))
  assert.ok(prompt.indexOf('ถามก่อนว่าสนใจโซนไหน') < prompt.indexOf('สไตล์การพูด'), 'comes before the general rules')
  // a chat that already has a house does not get it
  assert.ok(!buildSystemPrompt({ openingGuide: guide, staffNote: 'บ้านแฝดมาบโป่ง' }).includes('ถามก่อนว่าสนใจโซนไหน'))
  assert.ok(!buildSystemPrompt({}).includes('ถามก่อนว่าสนใจโซนไหน'))
})

// ─── Documents the customer sends ────────────────────────────────────────────
const { documentSettings, pickDocumentAttachments, maskSensitiveNumbers, sanitizeDocumentReview, mergeDocumentReview } = require('./facebook-ai-core.cjs')

test('document reading is off unless switched on, with a clamped count', () => {
  assert.deepEqual(documentSettings({}), { enabled: false, maxDocuments: 2, maxBytes: 10 * 1024 * 1024 })
  assert.equal(documentSettings({ documentsEnabled: 'true' }).enabled, false)
  assert.equal(documentSettings({ documentsEnabled: true, maxDocumentsPerMessage: 3 }).maxDocuments, 3)
  assert.equal(documentSettings({ documentsEnabled: true, maxDocumentsPerMessage: 40 }).maxDocuments, 2)
})

test('only file attachments from known hosts are picked as documents', () => {
  const urls = pickDocumentAttachments([
    { type: 'file', url: 'https://firebasestorage.googleapis.com/v0/b/x/o/a?alt=media' },
    { type: 'file', url: 'https://cdn.fbsbx.com/b.pdf' },
    { type: 'file', url: 'https://evil.example/c.pdf' },
    { type: 'file', url: 'http://cdn.fbsbx.com/d.pdf' },
    { type: 'image', url: 'https://cdn.fbsbx.com/e.jpg' },
    { type: 'video', url: 'https://cdn.fbsbx.com/f.mp4' },
    { type: 'file' },
  ], 5)
  assert.deepEqual(urls, ['https://firebasestorage.googleapis.com/v0/b/x/o/a?alt=media', 'https://cdn.fbsbx.com/b.pdf'])
  assert.equal(pickDocumentAttachments(Array.from({ length: 5 }, (_, n) => ({ type: 'file', url: `https://cdn.fbsbx.com/${n}.pdf` })), 2).length, 2)
  assert.deepEqual(pickDocumentAttachments(undefined), [])
})

test('ID, account and phone numbers are masked down to the last four digits', () => {
  assert.equal(maskSensitiveNumbers('บัตร 1-2345-67890-12-3 ของสมชาย'), 'บัตร •••••••••0123 ของสมชาย')
  assert.equal(maskSensitiveNumbers('บัญชี 123-4-56789-0'), 'บัญชี ••••••7890')
  assert.equal(maskSensitiveNumbers('โทร 081 234 5678'), 'โทร ••••••5678')
  assert.equal(maskSensitiveNumbers('รายได้ 42,000 บาท ปี 2569 เลข 2500000'), 'รายได้ 42,000 บาท ปี 2569 เลข 2500000')
  assert.equal(maskSensitiveNumbers(undefined), '')
})

test('a document review keeps type, readability, a masked summary and issues; junk is dropped', () => {
  const review = sanitizeDocumentReview({
    documents: [
      { type: 'สลิปเงินเดือน', readable: true, summary: 'ก.ค.-ธ.ค. สุทธิ 42,000 บัญชี 123-4-56789-0', issues: ['ขาดเดือน ก.พ.', 'เลขบัตร 1234567890123'] },
      { type: '', summary: 'no type' },
      { type: 'สเตทเมนต์', readable: false },
    ],
    missing: ['สลิปโบนัส', 'ทะเบียนสมรส', '   '],
    note: 'ติดต่อ 0812345678',
  })
  assert.equal(review.documents.length, 2)
  assert.equal(review.documents[0].summary, 'ก.ค.-ธ.ค. สุทธิ 42,000 บัญชี ••••••7890')
  assert.deepEqual(review.documents[0].issues, ['ขาดเดือน ก.พ.', 'เลขบัตร •••••••••0123'])
  assert.equal(review.documents[1].readable, false)
  assert.deepEqual(review.missing, ['สลิปโบนัส', 'ทะเบียนสมรส'])
  assert.equal(review.note, 'ติดต่อ ••••••5678')
  assert.deepEqual(sanitizeDocumentReview({}), {})
  assert.deepEqual(sanitizeDocumentReview({ documents: 'x', missing: 5 }), {})
  assert.equal(sanitizeDocumentReview({ documents: Array.from({ length: 30 }, () => ({ type: 't' })) }).documents.length, 10)
})

test('a later review replaces the same document type and the latest missing list wins', () => {
  const first = mergeDocumentReview(undefined, { documents: [{ type: 'สลิป', summary: 'a', issues: [], readable: true }], missing: ['สเตทเมนต์', 'บัตร'] })
  assert.deepEqual(first.missing, ['สเตทเมนต์', 'บัตร'])
  const second = mergeDocumentReview(first, { documents: [{ type: 'สลิป', summary: 'b', issues: [], readable: true }, { type: 'บัตร', summary: 'c', issues: [], readable: true }], missing: ['สเตทเมนต์'] })
  assert.deepEqual(second.documents.map(item => [item.type, item.summary]), [['สลิป', 'b'], ['บัตร', 'c']])
  assert.deepEqual(second.missing, ['สเตทเมนต์'])
  // no new "missing": the earlier one stays; nothing at all: no key
  assert.deepEqual(mergeDocumentReview(second, { documents: [] }).missing, ['สเตทเมนต์'])
  assert.equal('missing' in mergeDocumentReview(undefined, { documents: [] }), false)
})

test('the prompt allows reading documents only when switched on, and never repeating ID numbers', () => {
  const on = buildSystemPrompt({ isFirstReply: false, documentsEnabled: true, imagesEnabled: true })
  assert.match(on, /เอกสารที่ลูกค้าส่งมาในแชท/)
  assert.match(on, /save_document_review/)
  assert.match(on, /ห้ามพิมพ์ทวนเลขบัตรประชาชน/)
  assert.match(on, /ห้ามยืนยันว่าเอกสารจริงหรือปลอม/)
  assert.ok(!on.includes('ห้ามอ่านหรือทวนข้อมูลในรูป'), 'the old "refuse documents" rule is not applied')
  const off = buildSystemPrompt({ isFirstReply: false, imagesEnabled: true })
  assert.ok(!off.includes('เอกสารที่ลูกค้าส่งมาในแชท'))
  assert.match(off, /ห้ามอ่านหรือทวนข้อมูลในรูป/)
})


test('house guide is offered only when configured and no house is selected', () => {
  const prompt = buildSystemPrompt({ houseGuideAvailable: true });
  assert.match(prompt, /send_house_guide/);
  assert.match(prompt, /ภาพตัวอย่าง/);
  assert.match(prompt, /งบประมาณคร่าวๆ/);
  assert.match(prompt, /ห้ามยืนยัน/);
  assert.doesNotMatch(buildSystemPrompt({}), /send_house_guide/);
  assert.doesNotMatch(buildSystemPrompt({ houseGuideAvailable: true, focus: [toIndexedProperty('a', base)] }), /send_house_guide/);
  assert.doesNotMatch(buildSystemPrompt({ houseGuideAvailable: true, staffNote: 'บ้านพานทอง 2 ห้องนอน' }), /send_house_guide/);
  assert.doesNotMatch(buildSystemPrompt({ houseGuideAvailable: true, staffListings: [{ id: 'one', text: 'บ้านพานทอง' }] }), /send_house_guide/);
  assert.doesNotMatch(buildSystemPrompt({ houseGuideAvailable: true, attachedProperty: true }), /send_house_guide/);
  assert.doesNotMatch(buildSystemPrompt({ houseGuideAvailable: true, followUp: true }), /send_house_guide/);
});

test('a house guide attachment is part of an answer, not another hourly AI reply', () => {
  const now = Date.now();
  const result = shouldReply({ settings: { enabled: true, maxRepliesPerHour: 1 }, conversation: {}, text: 'สนใจบ้าน', timestamp: now, now,
    recentMessages: [{ direction: 'outgoing', sentBy: 'ai', kind: 'house-guide', timestamp: now - 1000 }] });
  assert.equal(result.reply, true);
});

test('explicit indecision about choosing a house is distinct from questions about a selected house', () => {
  const { asksForHouseGuide } = require('./facebook-ai-core.cjs');
  for (const text of ['คือผมยังไม่รู้ว่าจะเลือกบ้านแบบไหน', 'ยังไม่รู้จะเลือกบ้านแบบไหนดี', 'ยังเลือกบ้านไม่ถูก', 'เลือกแบบบ้านไม่ได้เลย', 'ยังไม่ได้เลือกบ้าน', 'ยังตัดสินใจไม่ได้ว่าจะเลือกบ้านแบบไหน']) {
    assert.equal(asksForHouseGuide(text), true, text);
  }
  for (const text of ['มีแบบบ้านให้เลือกหรือไม่', 'มีแบบบ้านให้เลือกไหมคะ', 'มีแบบให้เลือกไหม', 'แบบบ้านมีกี่แบบ', 'มีบ้านแบบไหนบ้าง', 'แบบบ้านมีอะไรบ้างคะ', 'ขอดูแบบบ้านทั้งหมด',
    'มีแบบบ้านไหมคะ', 'มี แบบบ้าน มั้ย', 'มีแบบไหนบ้างคะ', 'มีกี่แบบคะ', 'มีให้เลือกกี่แบบ', 'มีบ้านอะไรบ้าง', 'ขอดูแบบบ้านหน่อยค่ะ',
    'ส่งแบบบ้านให้ดูหน่อย', 'มีแคตตาล็อกไหม', 'ขอ Catalog หน่อย', 'มีโบรชัวร์ไหมคะ', 'แนะนำแบบบ้านหน่อย']) {
    assert.equal(asksForHouseGuide(text), true, text);
  }
  for (const text of ['ขอดูแบบบ้าน', 'ขอดูแบบบ้านก่อน', 'ในบ้านมีอะไรบ้าง', 'สินเชื่อมีกี่แบบ', 'มีแบบผ่อนให้เลือกไหม', 'มีธนาคารให้เลือกกี่ที่', 'บ้านหลังนี้มีแบบแปลนไหม',
    'ผ่อนมีแบบไหนบ้าง', 'โปรมีอะไรบ้าง', 'บ้านหลังนี้มีกี่แบบ', 'ห้องนอนมีกี่แบบ', 'ราคาเริ่มต้นที่เท่าไร', 'บ้านเดี่ยวชั้นเดียวค่ะ']) {
    assert.equal(asksForHouseGuide(text), false, text);
  }
  for (const text of ['สวัสดีครับ', 'ไม่รู้ว่าบ้านหลังนี้กี่ห้อง', 'บ้านหลังนี้อยู่ที่ไหน', 'ขอข้อมูล SPS-TH-1', 'ไม่รู้จะเลือกธนาคารไหนดี', 'ผมรู้แล้วว่าจะเลือกบ้านแบบไหน', 'ขอดูรูปบ้านหลังนี้']) {
    assert.equal(asksForHouseGuide(text), false, text);
  }
});
