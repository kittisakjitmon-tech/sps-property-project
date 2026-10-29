import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateAttachmentCounts, prepareIntakeFiles, shrinkPhoto, compressUploadFiles } from './photoUpload.js'
const photo = (id, size = 8 * 1024 * 1024) => ({ name: `house-${id}.jpg`, type: 'image/jpeg', size })
const tiny = async (file, options) => ({ ...file, type: 'image/webp', size: Math.floor(options.maxSizeMB * 1024 * 1024 * 0.8) })
test('accepts 15 photos plus 2 PDFs, rejects a 16th photo or third PDF', () => {
  const all = [...Array.from({ length: 15 }, (_, i) => photo(i)), ...Array(2).fill({ type: 'application/pdf', size: 100 })]
  validateAttachmentCounts(all)
  assert.throws(() => validateAttachmentCounts([...all, photo(16)]), /15/)
  assert.throws(() => validateAttachmentCounts([...all, { type: 'application/pdf' }]), /2/)
})
test('compresses 15 large originals sequentially within request budget while keeping PDF unmodified', async () => {
  let active = 0, peak = 0
  const pdf = { name: 'info.pdf', type: 'application/pdf', size: 4 * 1024 * 1024 }
  const files = [...Array.from({ length: 15 }, (_, i) => photo(i)), pdf]
  const prepared = await prepareIntakeFiles(files, [], async (file, options) => { active++; peak = Math.max(peak, active); await Promise.resolve(); const next = await tiny(file, options); active--; return next })
  assert.equal(peak, 1); assert.equal(prepared.length, 16)
  assert.ok(prepared.reduce((sum, p) => sum + p.file.size, 0) < 6 * 1024 * 1024)
  assert.equal(prepared.at(-1).file, pdf)
  assert.equal(prepared[0].originalSize, 8 * 1024 * 1024)
})
test('reduces resolution if quality alone cannot meet target and never falls back to large originals', async () => {
  const widths = []
  await shrinkPhoto(photo(1), 100000, async (file, options) => { widths.push(options.maxWidth); return { ...file, size: options.maxWidth > 1024 ? 200000 : 80000 } })
  assert.deepEqual(widths, [1600, 1280, 1024])
  await assert.rejects(shrinkPhoto(photo(1), 100000, async file => file), /ย่อรูป/)
  await assert.rejects(prepareIntakeFiles([{ type: 'application/pdf', size: 5 * 1024 * 1024 }]), /4 MB/)
})
test('upload compression enforces total 15 including existing photos and caps each upload at 300KB', async () => {
  const files = await compressUploadFiles([photo(1)], 14, tiny)
  assert.ok(files[0].size <= 300 * 1024)
  await assert.rejects(compressUploadFiles([photo(1), photo(2)], 14, tiny), /15/)
})
