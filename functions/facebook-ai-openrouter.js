const {
  TOOL_DECLARATIONS,
  SITE_URL,
  toOpenAiTools,
  toOpenAiMessages,
  fromOpenAiMessage,
  selectFreeChatModels,
} = require('./facebook-ai-core.cjs')

// Chat via OpenRouter, using free models only. Which model answers is chosen from
// OpenRouter's live list (free, supports tools, long enough context); the first
// few candidates are tried in turn when one is busy, rate limited or fails.
const MODELS_URL = 'https://openrouter.ai/api/v1/models'
const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODELS_TTL_MS = 60 * 60 * 1000
const MAX_CANDIDATES = 3
const REQUEST_TIMEOUT_MS = 45000

let modelsCache = { at: 0, models: [] }

// Looked up at call time so tests can replace global fetch.
const doFetch = (...args) => globalThis.fetch(...args)

async function loadModels() {
  if (Date.now() - modelsCache.at < MODELS_TTL_MS && modelsCache.models.length) return modelsCache.models
  const response = await doFetch(MODELS_URL, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`OpenRouter model list failed (${response.status})`)
  const body = await response.json()
  if (!Array.isArray(body.data)) throw new Error('OpenRouter model list was not understood')
  modelsCache = { at: Date.now(), models: body.data }
  return modelsCache.models
}

function createOpenRouterGenerate({ settings, systemInstruction, withTools = true, info = {} }) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

  return async contents => {
    const candidates = selectFreeChatModels(await loadModels(), { pinned: settings.openrouterModel }).slice(0, MAX_CANDIDATES)
    if (!candidates.length) throw new Error('No free OpenRouter model with tool support is available right now')

    let lastError = new Error('OpenRouter did not answer')
    for (const model of candidates) {
      try {
        const response = await doFetch(CHAT_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': SITE_URL,
            'X-Title': 'SPS Property Chatbot',
          },
          body: JSON.stringify({
            model,
            messages: toOpenAiMessages(contents, systemInstruction),
            temperature: 0.6,
            max_tokens: 1024,
            ...(withTools ? { tools: toOpenAiTools(TOOL_DECLARATIONS), tool_choice: 'auto' } : {}),
            ...(settings.openrouterDataCollection === 'deny' ? { provider: { data_collection: 'deny' } } : {}),
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        if (!response.ok) {
          const detail = (await response.text().catch(() => '')).slice(0, 200)
          const error = new Error(`OpenRouter ${response.status} (${model}): ${detail}`)
          error.status = response.status
          // A bad key will not get better with another model.
          if (response.status === 401 || response.status === 403) throw Object.assign(error, { fatal: true })
          lastError = error
          continue
        }
        const body = await response.json()
        const parts = fromOpenAiMessage(body.choices?.[0]?.message)
        if (!parts.length) {
          lastError = new Error(`OpenRouter ${model} returned an empty answer`)
          continue
        }
        info.model = model
        return parts
      } catch (error) {
        if (error.fatal) throw error
        lastError = error
      }
    }
    throw lastError
  }
}

module.exports = {
  createOpenRouterGenerate,
  _test: { resetCache() { modelsCache = { at: 0, models: [] } } },
}
