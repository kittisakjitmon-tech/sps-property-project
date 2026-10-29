import { test } from 'node:test'
import assert from 'node:assert/strict'
import { draftToForm, missingFields, validateFiles, validateDraft } from './propertyDraft.js'

test('maps land square wah to stored sqm, keeping usable area separate, gifts and promotions', () => {
  const form = draftToForm({ title: 'ทาวน์โฮม หนองกะขะ', type: 'SPS-TH-2CLASS-ID', landAreaSqw: 16, usableAreaSqm: 105, price: 1650000, priceMax: 1970000, bedrooms: 3, bathrooms: 2, gifts: [{ name: 'ถังน้ำ', detail: 'ขนาดรอยืนยัน' }], promotions: ['ค่าส่วนกลาง 2 ปี'] })
  assert.equal(form.area, 64); assert.equal(form.usableAreaSqm, 105)
  assert.equal(form.priceMax, 1970000); assert.equal(form.bedrooms, 3)
  assert.match(form.description, /ถังน้ำ: ขนาดรอยืนยัน/); assert.match(form.description, /ค่าส่วนกลาง 2 ปี/)
  assert.equal(form.status, 'pending'); assert.equal(form.coverImageUrl, '')
})
test('never inserts default rooms, price, land area or location when unknown', () => {
  const form = draftToForm({})
  assert.equal(form.bedrooms, ''); assert.equal(form.bathrooms, ''); assert.equal(form.price, ''); assert.equal(form.area, ''); assert.equal(form.location.province, '')
  assert.ok(missingFields({}).includes('ห้องนอน'))
  assert.ok(!missingFields({ type: 'SPS-LD-ID' }).includes('ห้องนอน'))
})
test('rejects unsupported/oversize/too many files and aggregate limits', () => {
  assert.throws(() => validateFiles([{ type: 'text/html', size: 1 }], []))
  assert.throws(() => validateFiles([{ type: 'application/pdf', size: 5e6 }], []))
  assert.throws(() => validateFiles(Array(16).fill({ type: 'image/png', size: 100 }), []))
  assert.throws(() => validateFiles([{ type: 'application/pdf', size: 4e6 }], [{ type: 'image/png', size: 3e6 }]))
  validateFiles([{ type: 'application/pdf', size: 1000 }], [])
})
test('rejects invalid edits while permitting unknown values to be filled in final form', () => {
  assert.throws(() => validateDraft({ bedrooms: 2.5 }))
  assert.throws(() => validateDraft({ landAreaSqw: -1 }))
  assert.throws(() => validateDraft({ price: 200, priceMax: 100 }))
  validateDraft({ title: 'บ้าน หนองกะขะ', locationDisplay: 'หนองกะขะ', price: null, bedrooms: null })
})

test('removes project name, appends location once and defaults commission to 3 percent', () => {
  const form = draftToForm({ title: 'ทาวน์โฮม โครงการนิรันดาพลัส หนองกะขะ ซอย 8', project: 'นิรันดาพลัส', locationDisplay: 'หนองกะขะ ซอย 8' })
  assert.equal(form.title, 'ทาวน์โฮม หนองกะขะ ซอย 8')
  assert.equal(form.commissionRate, 3)
})
test('blocks exact prices hidden in gifts or promotions before transfer', () => {
  const draft = { title: 'บ้าน หนองกะขะ', locationDisplay: 'หนองกะขะ', price: 1650000 }
  assert.throws(() => validateDraft({ ...draft, gifts: [{ name: 'โปรโมชั่น', detail: 'ราคา 1,650,000 บาท' }] }), /ราคาเต็ม/)
  assert.throws(() => validateDraft({ ...draft, promotions: ['ราคาสุทธิ 1.6x ล้าน'] }), /ราคาสุทธิ/)
  validateDraft({ ...draft, description: 'ราคาเริ่มต้น 1.6x–1.9x ล้านบาท พื้นที่ 16 ตร.ว. 3 ห้องนอน 2 ห้องน้ำ' })
})

test('maps the discounted sale price and undiscounted contract price to separate fields', () => {
  const draft = { title: 'บ้าน หนองกะขะ', locationDisplay: 'หนองกะขะ', price: 1650000, bankPrice: 1900000, discountAmount: 250000 }
  const form = draftToForm(draft)
  assert.equal(form.price, 1650000); assert.equal(form.bankPrice, 1900000)
  validateDraft(draft)
  assert.throws(() => validateDraft({ ...draft, price: 1900000 }), /ราคาหลังส่วนลด/)
  assert.throws(() => validateDraft({ ...draft, description: 'ราคาหน้าสัญญา 1900000' }), /ราคาเต็ม/)
})
