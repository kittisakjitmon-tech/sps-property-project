import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeNetworkFailure, resolveApiUrl } from './apiUrl.js'

test('without a configured URL the same-origin path is used', () => {
  assert.equal(resolveApiUrl(undefined, 'sps-property.web.app'), '/api/admin/messenger')
  assert.equal(resolveApiUrl('', 'sps-property.web.app'), '/api/admin/messenger')
  assert.equal(resolveApiUrl('   ', 'localhost'), '/api/admin/messenger')
})

test('a real function URL is kept', () => {
  const url = 'https://us-central1-sps-property.cloudfunctions.net/facebookMessengerAdmin'
  assert.equal(resolveApiUrl(url, 'sps-property.web.app'), url)
  assert.equal(resolveApiUrl(url, 'localhost'), url)
})

test('a localhost URL baked into a production build is ignored there, and kept on localhost', () => {
  for (const url of ['http://localhost:5173/api/admin/messenger', 'http://127.0.0.1:5001/x/us-central1/facebookMessengerAdmin']) {
    assert.equal(resolveApiUrl(url, 'sps-property.web.app'), '/api/admin/messenger')
    assert.equal(resolveApiUrl(url, 'sps-property.firebaseapp.com'), '/api/admin/messenger')
    assert.equal(resolveApiUrl(url, 'localhost'), url)
    assert.equal(resolveApiUrl(url, '127.0.0.1'), url)
  }
})

test('the network failure message says what to check, and differs on localhost', () => {
  const remote = describeNetworkFailure('/api/admin/messenger', 'sps-property.web.app')
  assert.match(remote, /facebookMessengerAdmin/)
  assert.ok(!remote.includes('localhost'))
  const local = describeNetworkFailure('/api/admin/messenger', 'localhost')
  assert.match(local, /localhost/)
  assert.match(local, /sps-property\.web\.app/)
})
