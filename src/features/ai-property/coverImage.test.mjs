import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coverTitle, photoLayout, orderedPropertyImages, validateCover, wrapCoverText, coverFacts, preparePropertyPhotos } from './coverImage.js'
const files = [{ id: 'living', name: 'living.jpg', type: 'image/jpeg' }, { id: 'exterior', name: 'front.jpg', type: 'image/jpeg' }, { id: 'brochure', name: 'house.pdf', type: 'application/pdf' }]
const property = { title: 'ทาวน์โฮม นิรันดาพลัส', project: 'นิรันดาพลัส', locationDisplay: 'หนองกะขะ ซอย 8', imageIds: ['living', 'exterior'], coverImageId: 'exterior', price: 1650000 }

test('puts chosen cover first and never imports PDF, foreign IDs or duplicate images', () => {
  assert.deepEqual(orderedPropertyImages({ ...property, imageIds: ['living', 'exterior', 'exterior', 'brochure', 'foreign'] }, files).map(f => f.id), ['exterior', 'living'])
  assert.throws(() => orderedPropertyImages({ ...property, coverImageId: 'foreign' }, files), /เลือกรูปหน้าปก/)
  assert.throws(() => orderedPropertyImages({ ...property, imageIds: ['living'] }, files))
  assert.deepEqual(orderedPropertyImages({ imageIds: ['brochure'] }, files), [])
})
test('cover title follows project/location rules and cannot reveal exact or net price', () => {
  assert.equal(coverTitle(property), 'ทาวน์โฮม หนองกะขะ ซอย 8')
  assert.equal(validateCover({ ...property, coverText: 'ขายทาวน์โฮม โครงการนิรันดาพลัส' }), 'ขายทาวน์โฮม หนองกะขะ ซอย 8')
  assert.throws(() => validateCover({ ...property, coverText: 'ขาย 1,650,000 บาท' }), /ราคาเต็ม/)
  assert.throws(() => validateCover({ ...property, coverText: 'ราคาสุทธิ 1.6x ล้าน' }), /ราคาสุทธิ/)
})
test('text wrapping preserves Thai graphemes, stays within width, and does not truncate copy', () => {
  const text = 'บ้านใหม่ ทำเลหนองกะขะ ซอย 8'
  const measure = t => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(t)].length
  const lines = wrapCoverText(text, measure, 8)
  assert.ok(lines.every(l => measure(l) <= 8))
  assert.equal(lines.join('').replaceAll(' ', ''), text.replaceAll(' ', ''))
  assert.equal(coverFacts({ bedrooms: 3, bathrooms: 2, landAreaSqw: 16 }), '3 ห้องนอน   •   2 ห้องน้ำ   •   ที่ดิน 16 ตร.ว.')
  assert.equal(coverFacts({}), '')
})
test('generated announcement goes first, replacing the first image to stay within the 15-image gallery limit', async () => {
  let rendered
  const generated = { id: 'cover-exterior', type: 'image/jpeg', dataUrl: 'generated' }
  const result = await preparePropertyPhotos(property, files, async (p, source) => { rendered = { p, source }; return generated })
  assert.equal(rendered.source.id, 'exterior')
  assert.equal(result.coverGenerated, true)
  assert.deepEqual(result.files.map(f => f.id), ['cover-exterior', 'living'])
  assert.equal(result.files[1], files[0])
  let called = false
  const original = await preparePropertyPhotos({ ...property, coverOverlay: false }, files, async () => { called = true })
  assert.equal(called, false); assert.equal(original.coverGenerated, false)
  assert.deepEqual(original.files.map(f => f.id), ['exterior', 'living'])
})
test('rendering failures block handoff rather than silently omitting requested cover', async () => {
  await assert.rejects(preparePropertyPhotos(property, files, async () => { throw new Error('image decode failed') }), /decode failed/)
  assert.deepEqual(await preparePropertyPhotos({ imageIds: [] }, files), { files: [], coverGenerated: false })
})

test('keeps landscape and portrait photos entirely inside the photo area without cropping', () => {
  for (const [w, h] of [[2400, 1600], [1600, 2400], [4000, 1000]]) {
    const layout = photoLayout(w, h)
    assert.ok(layout.x >= 0 && layout.y >= 0)
    assert.ok(layout.x + layout.width <= 1600 && layout.y + layout.height <= 850)
    assert.ok(Math.abs(layout.width / layout.height - w / h) < 1e-12)
  }
  assert.throws(() => photoLayout(0, 100))
})
