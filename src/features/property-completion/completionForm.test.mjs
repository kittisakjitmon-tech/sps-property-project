import { test } from 'node:test'
import assert from 'node:assert/strict'
import { completionValues, completionUrl, completionErrorMessage } from './completionForm.js'

test('only requested fields are sent and square wah converts to stored square metres', () => {
  const values = completionValues(['price', 'area', 'province'], { price: '2890000', priceMax: '2900000', area: '50', province: 'ชลบุรี', title: 'เปลี่ยนชื่อ', images: ['foreign'] })
  assert.deepEqual(values, { price: '2890000', priceMax: '2900000', area: 200, province: 'ชลบุรี' })
})

test('optional empty area stays empty and known prices are never sent', () => {
  assert.deepEqual(completionValues(['area'], { area: '', price: '100', priceMax: '200' }), { area: '' })
  assert.deepEqual(completionValues(['area'], { area: '0' }), { area: 0 })
  assert.deepEqual(completionValues(['price'], { price: '100', priceMax: '200' }, { priceMax: 300 }), { price: '100' })
})

test('completion token stays in the URL fragment', () => {
  const result = new URL(completionUrl('https://sps-property.web.app', 'a'.repeat(43)))
  assert.equal(result.pathname, '/complete-property')
  assert.equal(result.search, '')
  assert.equal(result.hash, `#${'a'.repeat(43)}`)
})

test('callable transport errors use Thai copy and retain useful server validation messages', () => {
  const message = completionErrorMessage({ code: 'functions/internal', message: 'internal' })
  assert.match(message, /ติดต่อบริการ/)
  assert.doesNotMatch(message, /internal/i)
  assert.equal(completionErrorMessage({ code: 'functions/invalid-argument', message: 'กรุณากรอกราคาให้ครบ' }), 'กรุณากรอกราคาให้ครบ')
  assert.equal(completionErrorMessage({ message: 'INTERNAL' }), message)
  assert.match(completionErrorMessage(null), /ลองใหม่/)
})
