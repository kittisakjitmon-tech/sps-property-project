const admin = require('firebase-admin')
const functions = require('firebase-functions')
const {
  vertexClientOptions,
  buildExtractRequest,
  parseJsonObject,
  checkExtractedFields,
  guessListingFields,
} = require('./facebook-ai-core.cjs')

// Reads a pasted house post into the fields a card needs (type, name, area, rooms, price),
// with the same provider as the chatbot (messenger_settings/ai). It never fails: when the AI
// cannot be reached the fields are read from the text itself, and `by` says which happened.
const DEFAULT_MODEL = 'gemini-2.5-flash'
const DEFAULT_LOCATION = 'us-central1'

async function defaultGenerate(settings, request) {
  if (settings.provider === 'openrouter') {
    // Loaded here so the admin function does not need the OpenRouter key unless it is used.
    const { createOpenRouterGenerate } = require('./facebook-ai-openrouter')
    const generate = createOpenRouterGenerate({ settings, systemInstruction: request.systemInstruction, withTools: false })
    const parts = await generate(request.contents)
    return parts.map(part => part.text || '').join('')
  }
  const { VertexAI } = require('@google-cloud/vertexai')
  const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId
  const vertex = new VertexAI(vertexClientOptions(settings, projectId, DEFAULT_LOCATION))
  const model = vertex.getGenerativeModel({
    model: settings.model || DEFAULT_MODEL,
    systemInstruction: { role: 'system', parts: [{ text: request.systemInstruction }] },
    generationConfig: { temperature: 0, maxOutputTokens: 2048, responseMimeType: 'application/json' },
  })
  const result = await model.generateContent({ contents: request.contents })
  return (result.response?.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('')
}

let generate = defaultGenerate

async function extractListingFields(text, settings = {}) {
  try {
    const raw = parseJsonObject(await generate(settings, buildExtractRequest(text)))
    if (raw) return { fields: checkExtractedFields(raw, text), by: 'ai' }
    functions.logger.warn('Listing read: the AI answer was not JSON')
  } catch (error) {
    functions.logger.warn('Listing read failed', { reason: error.message })
  }
  return { fields: checkExtractedFields(guessListingFields(text), text), by: 'text' }
}

module.exports = {
  extractListingFields,
  _test: { setGenerate(fn) { generate = fn || defaultGenerate } },
}
