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
  price: 1000000,
  showPrice: false,
  description: 'ทาวน์โฮม 1 ชั้น มีส่วนลดพิเศษ\nราคา 1.xx ล้าน\nผ่อน 4,000-5,000 /เดือน\n2 นอน 1 ห้องน้ำ ใกล้นิคม',
  agentContact: { phone: '0999999999' },
  commissionRate: 3,
  createdBy: 'uid-secret',
  lat: 13.1,
}

const index = [
  toIndexedProperty('a1', base),
  toIndexedProperty('a2', { ...base, displayId: 'SPS-CD-1', type: 'SPS-CD-ID', locationDisplay: 'ศรีราชา, ชลบุรี', showPrice: true, price: 2500000, bedrooms: 1 }),
  toIndexedProperty('a3', { ...base, displayId: 'SPS-R-1', listingType: 'rent', price: 8000, showPrice: true, locationDisplay: 'อมตะนคร, ชลบุรี' }),
  toIndexedProperty('gone', { ...base, status: 'reserved' }),
]

test('only available properties are indexed', () => {
  assert.equal(toIndexedProperty('x', { ...base, status: 'reserved' }), null)
  assert.equal(toIndexedProperty('x', { ...base, status: 'pending' }), null)
  assert.equal(index.filter(Boolean).length, 3)
})

test('hidden prices never reach the model and money lines are dropped from the summary', () => {
  const { results } = searchProperties(index.filter(Boolean), { location: 'พานทอง' })
  assert.equal(results.length, 1)
  const [p] = results
  assert.equal(p.price, null)
  assert.match(p.priceNote, /ราคาไม่เปิดเผย/)
  const dump = JSON.stringify(p)
  assert.ok(!dump.includes('1000000'))
  assert.ok(!dump.includes('ล้าน'))
  assert.ok(!dump.includes('4,000'))
  assert.match(p.summary, /ใกล้นิคม/)
})

test('visible prices are passed through like the website (showPrice !== false)', () => {
  const [p] = searchProperties(index.filter(Boolean), { location: 'ศรีราชา' }).results
  assert.equal(p.price, 2500000)
  assert.equal(p.priceNote, undefined)
  const implicit = toIndexedProperty('z', { ...base, showPrice: undefined })
  assert.equal(implicit.price, 1000000)
})

test('internal fields are never exposed', () => {
  const dump = JSON.stringify(searchProperties(index.filter(Boolean), {}).results)
  for (const secret of ['0999999999', 'commissionRate', 'uid-secret', 'agentContact', '13.1', '_search', '_numericPrice']) {
    assert.ok(!dump.includes(secret), secret)
  }
})

test('search filters by type, listing, bedrooms and budget; budget works even when price is hidden', () => {
  const list = index.filter(Boolean)
  assert.equal(searchProperties(list, { propertyType: 'คอนโด' }).results[0].code, 'SPS-CD-1')
  assert.equal(searchProperties(list, { listingType: 'rent' }).results[0].code, 'SPS-R-1')
  assert.equal(searchProperties(list, { minBedrooms: 2 }).results.every(p => p.bedrooms >= 2), true)
  const cheap = searchProperties(list, { maxPrice: 1200000 })
  assert.deepEqual(cheap.results.map(p => p.code).sort(), ['SPS-R-1', 'SPS-TH-1CLASS-204'])
  assert.equal(searchProperties(list, { location: 'ภูเก็ต' }).total, 0)
  assert.equal(searchProperties(list, { limit: 99 }).results.length <= 5, true)
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

test('system prompt introduces the AI once and forbids guessing prices', () => {
  assert.match(buildSystemPrompt({ isFirstReply: true }), /ผู้ช่วย AI/)
  assert.match(buildSystemPrompt({ isFirstReply: true }), /แนะนำตัว/)
  assert.match(buildSystemPrompt({ isFirstReply: false }), /ไม่ต้องแนะนำตัวซ้ำ/)
  assert.match(buildSystemPrompt({ isFirstReply: false }), /ห้ามเดา/)
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
