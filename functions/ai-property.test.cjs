const { test } = require('node:test')
const assert = require('node:assert/strict')
const { MODEL, validateInput, normalizeProperties, buildRequest, modelAvailability, freeModelCandidates, pricingValues, parseResponse } = require('./ai-property-core.cjs')
const { _test: { checkUser, rateLimit, runFreeCompletion } } = require('./ai-property')
const pdf = { id: 'pdf-1', name: 'house.pdf', type: 'application/pdf', dataUrl: `data:application/pdf;base64,${Buffer.from('%PDF-1.7\nexample').toString('base64')}` }
const png = { id: 'image-1', name: 'house.png', type: 'image/png', dataUrl: `data:image/png;base64,${Buffer.from('89504e470d0a1a0a', 'hex').toString('base64')}` }
const userDb = (role, status, exists = true) => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists, data: () => ({ role, status }) }) }) }) })

test('requires a valid message, actual file signatures, unique IDs and bounded uploads', () => {
  assert.equal(validateInput({ message: 'ช่วยกรอก', files: [pdf, png] }).files.length, 2)
  for (const data of [{ message: '' }, { message: 'a'.repeat(6001) }, { message: 'ok', files: [png, png] }, { message: 'ok', files: [{ ...png, dataUrl: 'https://external/secret' }] }, { message: 'ok', files: [{ ...png, dataUrl: 'data:image/png;base64,YWJjZA==' }] }, { message: 'ok', files: Array(9).fill(pdf) }]) assert.throws(() => validateInput(data))
  const big = { ...pdf, dataUrl: `data:application/pdf;base64,${Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(4 * 1024 * 1024)]).toString('base64')}` }
  assert.throws(() => validateInput({ message: 'ok', files: [big] }), /4 MB/)
})
test('does not infer unknown rooms, type or coords; ignores foreign image IDs and fields', () => {
  const [p] = normalizeProperties([{ title: 'บ้าน', bedrooms: null, bathrooms: 2.5, type: 'made-up', landAreaSqw: 16, price: '1650000', lat: 99, lng: 101, imageIds: ['image-1', 'pdf-1', 'foreign'], createdBy: 'attacker' }], [pdf, png])
  assert.equal(p.bedrooms, null); assert.equal(p.bathrooms, null); assert.equal(p.type, '')
  assert.equal(p.lat, null); assert.equal(p.lng, null); assert.equal(p.price, 1650000)
  assert.deepEqual(p.imageIds, ['image-1']); assert.equal(p.createdBy, undefined)
})
test('pins exact free model and zero-cost provider limits; PDF parser is explicit and free', () => {
  const req = buildRequest(validateInput({ message: 'กรอกบ้าน', files: [pdf, png], properties: [] }))
  assert.equal(req.model, MODEL)
  assert.deepEqual(req.provider, { allow_fallbacks: false, max_price: { prompt: 0, completion: 0, request: 0, image: 0 } })
  assert.equal(req.plugins[0].pdf.engine, 'cloudflare-ai')
  assert.equal(req.messages.at(-1).content.find(p => p.type === 'file').file.file_data, pdf.dataUrl)
  assert.equal(req.messages.at(-1).content.find(p => p.type === 'image_url').image_url.url, png.dataUrl)
  assert.equal(buildRequest(validateInput({ message: 'ok' })).plugins, undefined)
})
test('rejects unavailable, paid, unpriced or paid-request catalog entries', () => {
  for (const catalog of [[], [{ id: MODEL, pricing: { prompt: '0.1', completion: '0' } }], [{ id: MODEL, pricing: {} }], [{ id: MODEL, pricing: { prompt: '0', completion: '0', request: '0.01' } }]]) assert.equal(modelAvailability(catalog).available, false)
  assert.equal(modelAvailability([{ id: MODEL, pricing: { prompt: '0', completion: '0', image: '0' } }]).available, true)
})
test('rejects truncated, invalid or missing structured responses', () => {
  const body = { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reply: 'เตรียมแล้ว', properties: [{ title: 'บ้าน' }] }) } }] }
  assert.equal(parseResponse(body, []).properties.length, 1)
  assert.throws(() => parseResponse({ choices: [{ ...body.choices[0], finish_reason: 'length' }] }, []))
  assert.throws(() => parseResponse({ choices: [{ finish_reason: 'stop', message: { content: 'not json' } }] }, []))
})
test('callable authorization rejects anonymous, member, disabled and nonexistent users', async () => {
  await assert.rejects(checkUser({}), e => e.code === 'unauthenticated')
  for (const [role, status, exists] of [['member', 'active', true], ['admin', 'disabled', true], ['agent', 'pending', true], ['admin', 'active', false]]) await assert.rejects(checkUser({ auth: { uid: 'u' } }, userDb(role, status, exists)), e => e.code === 'permission-denied')
  for (const role of ['super_admin', 'admin', 'agent']) await checkUser({ auth: { uid: 'u' } }, userDb(role, 'active'))
})
test('per-user transaction enforces cooldown, daily quota and next-day reset', async () => {
  let state = {}
  const db = { collection: () => ({ doc: () => ({}) }), runTransaction: fn => fn({ get: async () => ({ data: () => state }), set: (_, next) => { state = next } }) }
  const now = Date.UTC(2026, 9, 27)
  await rateLimit('u', db, now); assert.equal(state.count, 1)
  await assert.rejects(rateLimit('u', db, now + 100), e => e.code === 'resource-exhausted')
  await rateLimit('u', db, now + 10001); assert.equal(state.count, 2)
  state.count = 30
  await assert.rejects(rateLimit('u', db, now + 30000), /30/)
  await rateLimit('u', db, now + 86400000); assert.equal(state.count, 1)
})

test('normalizes AI titles and enforces copy rules on descriptions, gifts and promotions', () => {
  const property = { title: 'ทาวน์โฮม นิรันดาพลัส', project: 'นิรันดาพลัส', locationDisplay: 'หนองกะขะ ซอย 8', price: 1650000 }
  const body = p => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reply: 'เตรียมแล้ว', properties: [p] }) } }] })
  assert.equal(parseResponse(body(property), []).properties[0].title, 'ทาวน์โฮม หนองกะขะ ซอย 8')
  for (const patch of [{ description: 'ราคา 1,650,000 บาท' }, { gifts: [{ name: 'ส่วนลด', detail: 'ราคาสุทธิ 1.6x ล้าน' }] }, { promotions: ['ขาย 1.65 ล้านบาท'] }]) assert.throws(() => parseResponse(body({ ...property, ...patch }), []), /ราคาเต็ม|ราคาสุทธิ/)
})

test('AI cover selection must belong to the selected real images for that property', () => {
  const base = { imageIds: ['image-1'], coverImageId: 'image-1', coverReason: 'หน้าบ้านชัด', coverOverlay: true }
  const [valid] = normalizeProperties([base], [png, pdf])
  assert.equal(valid.coverImageId, 'image-1'); assert.equal(valid.coverReason, 'หน้าบ้านชัด')
  for (const bad of [{ ...base, coverImageId: 'foreign' }, { ...base, coverImageId: 'pdf-1' }, { ...base, imageIds: [] }]) {
    const [p] = normalizeProperties([bad], [png, pdf])
    assert.equal(p.coverImageId, ''); assert.equal(p.coverReason, '')
  }
  const [manual] = normalizeProperties([{ ...base, coverOverlay: false, coverText: 'บ้าน นิรันดาพลัส', project: 'นิรันดาพลัส', locationDisplay: 'หนองกะขะ ซอย 8' }], [png])
  assert.equal(manual.coverOverlay, false)
  assert.equal(manual.coverText, 'บ้าน หนองกะขะ ซอย 8')
})

test('15 photos plus 2 PDFs are accepted independently, a 16th photo or third PDF is rejected', () => {
  const photos = Array.from({ length: 15 }, (_, i) => ({ ...png, id: `photo-${i}` }))
  const docs = [{ ...pdf, id: 'pdf-a' }, { ...pdf, id: 'pdf-b' }]
  assert.equal(validateInput({ message: 'กรอก', files: [...photos, ...docs] }).files.length, 17)
  assert.throws(() => validateInput({ message: 'กรอก', files: [...photos, { ...png, id: 'photo-16' }] }), /15/)
  assert.throws(() => validateInput({ message: 'กรอก', files: [...docs, { ...pdf, id: 'pdf-c' }] }), /2/)
})
test('only free vision models with explicit zero prices and JSON support can be selected', () => {
  const good = { id: 'nvidia/nemotron-3.5-super-vl:free', pricing: { prompt: '0', completion: '0', image: '0' }, architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] }, context_length: 131072, supported_parameters: ['response_format'] }
  const candidates = freeModelCandidates([{ ...good, id: 'model/paid' }, { ...good, id: 'model/paid:free', pricing: { prompt: '0', completion: '0.1' } }, { ...good, id: 'model/text:free', architecture: { input_modalities: ['text'], output_modalities: ['text'] } }, { ...good, id: 'model/unknown:free', pricing: {} }, good])
  assert.deepEqual(candidates.map(m => m.id), [good.id])
  assert.throws(() => buildRequest(validateInput({ message: 'test' }), 'model/paid'), /รุ่นฟรี/)
})
test('discount arithmetic fills only the net price and never applies discount twice', () => {
  const raw = { bankPrice: 1900000, discountAmount: 250000 }
  assert.equal(pricingValues(raw).price, 1650000)
  assert.equal(pricingValues({ ...raw, price: 1650000 }).price, 1650000)
  assert.equal(pricingValues({ ...raw, price: 1900000 }).price, null)
  assert.ok(pricingValues({ ...raw, price: 1900000 }).questions.length)
  assert.equal(pricingValues({ bankPrice: 1900000 }).price, null)
  assert.equal(pricingValues({ price: 1650000 }).bankPrice, null)
})
test('retries a second free model after quota failure while retaining zero price limits', async () => {
  const seen = []
  const result = await runFreeCompletion(validateInput({ message: 'test' }), ['a/first:free', 'b/second:free'], 'test-key', async (_, opts) => {
    const req = JSON.parse(opts.body); seen.push(req)
    return seen.length === 1 ? { ok: false, status: 429 } : { ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reply: 'พร้อม', properties: [] }) } }] }) }
  })
  assert.equal(result.model, 'b/second:free')
  assert.deepEqual(seen.map(r => r.model), ['a/first:free', 'b/second:free'])
  assert.ok(seen.every(r => Object.values(r.provider.max_price).every(v => v === 0)))
  let count = 0
  await assert.rejects(runFreeCompletion(validateInput({ message: 'test' }), ['a/first:free', 'b/second:free'], 'test-key', async () => { count++; return { ok: false, status: 401 } }))
  assert.equal(count, 1)
})
