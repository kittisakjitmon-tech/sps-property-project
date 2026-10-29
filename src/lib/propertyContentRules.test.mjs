import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { normalizeListingTitle, descriptionPriceIssues, listingContentIssues } from './propertyContentRules.js'
const require = createRequire(import.meta.url)
const server = require('../../functions/property-content-rules.cjs')

test('title excludes project, ends with location once, and preserves punctuation in literal names', () => {
  assert.equal(normalizeListingTitle('ทาวน์โฮม โครงการนิรันดาพลัส', 'นิรันดาพลัส', 'หนองกะขะ ซอย 8'), 'ทาวน์โฮม หนองกะขะ ซอย 8')
  assert.equal(normalizeListingTitle('ทาวน์โฮม หนองกะขะ ซอย 8', '', 'หนองกะขะ ซอย 8'), 'ทาวน์โฮม หนองกะขะ ซอย 8')
  assert.equal(normalizeListingTitle('บ้าน โครงการ A+B (เฟส 2)', 'A+B (เฟส 2)', 'พานทอง'), 'บ้าน พานทอง')
  assert.equal(normalizeListingTitle('นิรันดาพลัส', 'นิรันดาพลัส', 'พานทอง'), '')
  assert.ok(listingContentIssues({ title: 'บ้าน นิรันดาพลัส', project: 'นิรันดาพลัส', locationDisplay: 'พานทอง' }).length >= 2)
})
test('blocks exact/full/net copy but keeps masked prices, dimensions, room counts and percentages', () => {
  for (const value of ['ราคา 1,650,000 บาท', 'ขาย 1.65 ล้านบาท', 'ราคา ๑,๖๕๐,๐๐๐ บาท', 'ราคาสุทธิ 1.6x ล้านบาท', 'ราคาเต็ม', 'ราคา 1.65–1.9x ล้านบาท', 'ตัวเลข 1650000']) assert.ok(descriptionPriceIssues(value, [1650000]).length, value)
  for (const value of ['ราคา 1.6x–1.9x ล้านบาท', '3 ห้องนอน 2 ห้องน้ำ พื้นที่ 16 ตร.ว. พื้นที่ใช้สอย 105 ตร.ม.', 'ฟรีค่าส่วนกลาง 2 ปี ค่าโอน 1%']) assert.deepEqual(descriptionPriceIssues(value, [1650000]), [], value)
})
test('client and server enforce identical content rules', () => {
  for (const title of ['บ้าน นิรันดาพลัส', 'โครงการนิรันดาพลัส บ้าน พานทอง', 'ทาวน์โฮม พานทอง']) assert.equal(normalizeListingTitle(title, 'นิรันดาพลัส', 'พานทอง'), server.normalizeListingTitle(title, 'นิรันดาพลัส', 'พานทอง'))
  for (const description of ['1,650,000 บาท', '1.65 ล้าน', '1.6x–1.9x ล้านบาท', 'ราคาสุทธิ', '3 ห้องนอน']) assert.deepEqual(descriptionPriceIssues(description, [1650000]), server.descriptionPriceIssues(description, [1650000]))
})

test('dropdown administrative address accepts matching locality and soi in the title', () => {
  const location = { province: 'ชลบุรี', district: 'พานทอง', subDistrict: 'บ้านเก่า' }
  const locationDisplay = 'บ้านเก่า, พานทอง, ชลบุรี'
  for (const rules of [{ normalizeListingTitle, listingContentIssues }, server]) {
    for (const suffix of ['บ้านเก่า', 'บ้านเก่า ซอย 10', 'บ้านเก่า ซ. 10', locationDisplay]) {
      const title = `ทาวน์โฮม 2 ชั้น ${suffix}`
      assert.deepEqual(rules.listingContentIssues({ title, locationDisplay, location }), [])
      assert.equal(rules.normalizeListingTitle(title, '', locationDisplay, location), title)
    }
    assert.ok(rules.listingContentIssues({ title: 'ทาวน์โฮม หนองกะขะ ซอย 8', locationDisplay, location }).length)
    assert.ok(rules.listingContentIssues({ title: 'ทาวน์โฮม บ้านเก่า ซอย 10 จุดเด่น', locationDisplay: 'บ้านเก่า ซอย 10' }).length)
    assert.equal(rules.normalizeListingTitle('ทาวน์โฮม', '', locationDisplay, location), 'ทาวน์โฮม บ้านเก่า')
  }
})
