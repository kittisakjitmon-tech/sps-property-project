import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adminSessionExpired } from './adminSession.js'

const DAY = 24 * 60 * 60 * 1000
const user = at => ({ metadata: { lastSignInTime: new Date(at).toUTCString() } })
const now = Date.parse('2026-11-11T00:00:00Z')

test('a login stays valid for 30 days', () => {
  assert.equal(adminSessionExpired(user(now - 1 * DAY), now), false)
  assert.equal(adminSessionExpired(user(now - 29 * DAY), now), false)
})

test('after 30 days the login expires', () => {
  assert.equal(adminSessionExpired(user(now - 30 * DAY - 60_000), now), true)
  assert.equal(adminSessionExpired(user(now - 90 * DAY), now), true)
})

test('a missing sign-in time never logs anyone out', () => {
  assert.equal(adminSessionExpired(null, now), false)
  assert.equal(adminSessionExpired({ metadata: {} }, now), false)
})
