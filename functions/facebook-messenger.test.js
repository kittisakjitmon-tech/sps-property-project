const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { facebookWebhook, _private } = require('./facebook-messenger')

test('verifyFacebookSignature accepts a valid Meta signature', () => {
  const body = JSON.stringify({ object: 'page', entry: [] })
  const signature = `sha256=${crypto.createHmac('sha256', 'secret').update(body).digest('hex')}`
  assert.equal(_private.verifyFacebookSignature(body, signature, 'secret'), true)
})

test('verifyFacebookSignature rejects invalid signatures and missing secrets', () => {
  assert.equal(_private.verifyFacebookSignature('{}', 'sha256=invalid', 'secret'), false)
  assert.equal(_private.verifyFacebookSignature('{}', null, 'secret'), false)
  assert.equal(_private.verifyFacebookSignature('{}', 'sha256=abc', ''), false)
})

test('conversation and message IDs are deterministic and isolated', () => {
  assert.equal(_private.conversationId('page', 'user'), _private.conversationId('page', 'user'))
  assert.notEqual(_private.conversationId('page', 'user'), _private.conversationId('page', 'other'))
  assert.equal(_private.messageId('mid.123').length, 64)
})

test('messagePreview describes attachments when text is empty', () => {
  assert.equal(_private.messagePreview('', [{ type: 'image' }]), '[รูปภาพ]')
  assert.equal(_private.messagePreview('', [{ type: 'file' }]), '[ไฟล์แนบ]')
  assert.equal(_private.messagePreview('สวัสดี', []), 'สวัสดี')
})

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
    send(payload) {
      this.body = payload
      return this
    },
  }
}

test('facebookWebhook verifies Meta callback URLs', async () => {
  process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN = 'verify-token'
  const req = {
    method: 'GET',
    query: {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'verify-token',
      'hub.challenge': 'challenge-ok',
    },
  }
  const res = mockResponse()
  await facebookWebhook(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body, 'challenge-ok')
})

test('facebookWebhook accepts a correctly signed empty page event', async () => {
  process.env.FACEBOOK_APP_SECRET = 'secret'
  const body = { object: 'page', entry: [] }
  const rawBody = JSON.stringify(body)
  const signature = `sha256=${crypto.createHmac('sha256', 'secret').update(rawBody).digest('hex')}`
  const req = {
    method: 'POST',
    body,
    rawBody: Buffer.from(rawBody),
    get: name => name === 'x-hub-signature-256' ? signature : undefined,
  }
  const res = mockResponse()
  await facebookWebhook(req, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { received: true })
})

test('extractContacts finds Thai phones and emails in customer text', () => {
  const result = _private.extractContacts('สนใจครับ โทร 081-234-5678 หรือ +66 92 345 6789 อีเมล Somchai@Example.co.th')
  assert.deepEqual(result.phones, ['0812345678', '0923456789'])
  assert.deepEqual(result.emails, ['somchai@example.co.th'])
})

test('extractContacts ignores prices and plain numbers', () => {
  const result = _private.extractContacts('ราคา 2,500,000 บาท ห้อง 1203 ชั้น 12')
  assert.deepEqual(result.phones, [])
  assert.deepEqual(result.emails, [])
})

test('describeGraphError explains the 24-hour window in Thai', () => {
  const error = { response: { data: { error: { code: 10, error_subcode: 2018278, message: 'outside window' } } } }
  assert.match(_private.describeGraphError(error), /24 ชั่วโมง/)
})
