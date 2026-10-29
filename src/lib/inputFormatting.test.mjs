import test from 'node:test'
import assert from 'node:assert/strict'
import { formatMoneyInput, parseMoneyInput, moneyCaretPosition, propertyDateParts } from './inputFormatting.js'

test('prices keep separators, zero, cents and partially typed decimal values', () => {
  assert.equal(formatMoneyInput('2390000'), '2,390,000')
  assert.equal(formatMoneyInput('0'), '0')
  assert.equal(formatMoneyInput('1234.50'), '1,234.50')
  assert.equal(formatMoneyInput('1234.'), '1,234.')
  assert.equal(formatMoneyInput(''), '')
})
test('pasted prices and Thai digits become raw numbers without losing precision', () => {
  assert.equal(parseMoneyInput('฿ ๒,๓๙๐,๐๐๐.๕๐'), '2390000.50')
  assert.equal(parseMoneyInput('0001500'), '1500')
  for (const value of ['-100', '12a', '1.2.3', '1.234']) assert.equal(parseMoneyInput(value), null)
})
test('caret tracks numeric position through thousands separators', () => {
  assert.equal(moneyCaretPosition('1,234,567', 3), 4)
  assert.equal(moneyCaretPosition('1,234,567', 0), 0)
  assert.equal(moneyCaretPosition('1,234.50', 7), 8)
})
test('dates accept Firestore timestamps, serialized timestamps and ISO with Bangkok time', () => {
  const instant = '2026-10-27T18:30:00.000Z'
  const expected = propertyDateParts(instant)
  assert.equal(expected.time, '01:30')
  assert.match(expected.date, /28/)
  assert.match(expected.date, /2569/)
  assert.deepEqual(propertyDateParts({ toDate: () => new Date(instant) }), expected)
  assert.deepEqual(propertyDateParts({ seconds: Date.parse(instant) / 1000 }), expected)
  assert.deepEqual(propertyDateParts(Date.parse(instant)), expected)
})
test('missing and invalid dates stay missing instead of inventing a date', () => {
  for (const value of [null, undefined, '', 'not-a-date', NaN]) assert.equal(propertyDateParts(value), null)
})
