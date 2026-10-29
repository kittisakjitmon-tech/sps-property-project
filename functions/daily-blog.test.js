const test = require('node:test')
const assert = require('node:assert/strict')
const { _private } = require('./daily-blog')

const longContent = 'เนื้อหา '.repeat(60)

test('freeTextModels keeps only free text models with enough context', () => {
  const models = [
    { id: 'paid/model', pricing: { prompt: '0.001', completion: '0.002' }, context_length: 128000 },
    { id: 'small/model:free', pricing: { prompt: '0', completion: '0' }, context_length: 4000 },
    { id: 'big/model:free', pricing: { prompt: '0', completion: '0' }, context_length: 128000, architecture: { output_modalities: ['text'] } },
    { id: 'image/model:free', pricing: { prompt: '0', completion: '0' }, context_length: 32000, architecture: { output_modalities: ['image'] } },
    { id: 'mid/model:free', pricing: { prompt: '0', completion: '0' }, context_length: 32000 },
  ]
  assert.deepEqual(_private.freeTextModels(models), ['big/model:free', 'mid/model:free'])
})

test('parseBlogJson extracts JSON wrapped in extra text', () => {
  const result = _private.parseBlogJson(`นี่คือบทความ\n${JSON.stringify({ title: ' หัวข้อ ', summary: 'สรุป', content: longContent })}`)
  assert.equal(result.title, 'หัวข้อ')
  assert.equal(result.summary, 'สรุป')
})

test('parseBlogJson rejects missing or too-short content', () => {
  assert.throws(() => _private.parseBlogJson('no json here'))
  assert.throws(() => _private.parseBlogJson(JSON.stringify({ title: 'x', content: 'สั้น' })))
})

test('generateBlog falls back to the next free model when one fails', async () => {
  const calls = []
  const fetcher = async (url, options) => {
    if (url.endsWith('/models')) {
      return {
        ok: true,
        json: async () => ({ data: [
          { id: 'a:free', pricing: { prompt: '0', completion: '0' }, context_length: 64000 },
          { id: 'b:free', pricing: { prompt: '0', completion: '0' }, context_length: 32000 },
        ] }),
      }
    }
    const { model } = JSON.parse(options.body)
    calls.push(model)
    if (model === 'a:free') return { ok: false, status: 429, json: async () => ({ error: { message: 'rate limited' } }) }
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ title: 'T', summary: 'S', content: longContent }) } }] }),
    }
  }
  const blog = await _private.generateBlog('topic', 'key', fetcher)
  assert.deepEqual(calls, ['a:free', 'b:free'])
  assert.equal(blog.model, 'b:free')
})
