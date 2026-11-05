import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placeNames, toPropertyOption, searchPropertyOptions } from './propertySearch.js'

const OPTIONS = [
  { displayId: 'SPS-TW-12', title: 'บ้านแฝดสุขใจ', project: 'สุขใจวิลล์', locationDisplay: 'มาบโป่ง พานทอง ชลบุรี', nearbyPlace: ['นิคมอมตะซิตี้', { label: 'โลตัสพานทอง' }] },
  { displayId: 'SPS-TH-1', title: 'ทาวน์โฮมสวย', project: 'พฤกษา 9', location: { district: 'ศรีราชา', province: 'ชลบุรี' }, nearbyPlace: [] },
  { displayId: 'SPS-TH-10', title: 'ทาวน์โฮมใหม่', project: '', locationDisplay: 'บ้านบึง ชลบุรี', nearbyPlace: ['ม.บูรพา'] },
].map(toPropertyOption)

const codes = results => results.map(item => item.option.code)

test('nearby places come as strings or objects', () => {
  assert.deepEqual(placeNames(['ก', { label: 'ข' }, { name: 'ค' }, '', null]), ['ก', 'ข', 'ค'])
  assert.deepEqual(placeNames('ง'), ['ง'])
  assert.deepEqual(placeNames(undefined), [])
})

test('a code still works, an exact or starting code first', () => {
  assert.deepEqual(codes(searchPropertyOptions(OPTIONS, 'SPS-TH-1')), ['SPS-TH-1', 'SPS-TH-10'])
  assert.deepEqual(codes(searchPropertyOptions(OPTIONS, 'tw-12')), ['SPS-TW-12'])
})

test('finds by name, project, area and nearby place, and says why', () => {
  assert.deepEqual(codes(searchPropertyOptions(OPTIONS, 'สุขใจ')), ['SPS-TW-12'])
  assert.deepEqual(codes(searchPropertyOptions(OPTIONS, 'พฤกษา')), ['SPS-TH-1'])
  const [area] = searchPropertyOptions(OPTIONS, 'มาบโป่ง')
  assert.deepEqual(area.matched, { label: 'ทำเล', text: 'มาบโป่ง พานทอง ชลบุรี' })
  const [near] = searchPropertyOptions(OPTIONS, 'อมตะ')
  assert.equal(near.option.code, 'SPS-TW-12')
  assert.deepEqual(near.matched, { label: 'ใกล้', text: 'นิคมอมตะซิตี้' })
  assert.deepEqual(codes(searchPropertyOptions(OPTIONS, 'ศรีราชา')), ['SPS-TH-1'])
})

test('every word must match, spaces and a doubled เ do not matter', () => {
  assert.deepEqual(codes(searchPropertyOptions(OPTIONS, 'ทาวน์โฮม บ้านบึง')), ['SPS-TH-10'])
  assert.deepEqual(codes(searchPropertyOptions(OPTIONS, 'มาบ โป่ง')), ['SPS-TW-12'])
  assert.deepEqual(codes(searchPropertyOptions(OPTIONS, 'บ้านเเฝด')), ['SPS-TW-12'])
  assert.deepEqual(searchPropertyOptions(OPTIONS, 'ระยอง'), [])
  assert.deepEqual(searchPropertyOptions(OPTIONS, '   '), [])
})

test('at most eight results', () => {
  const many = Array.from({ length: 20 }, (_, n) => toPropertyOption({ displayId: `SPS-X-${n}`, title: 'บ้าน' }))
  assert.equal(searchPropertyOptions(many, 'บ้าน').length, 8)
})
