const functions = require('firebase-functions')
const admin = require('firebase-admin')

// Topics the AI rotates through for the daily draft.
const BLOG_TOPICS = [
  'ข่าวสารการกู้เงินซื้อบ้านในไทย อัปเดตดอกเบี้ยและนโยบายรัฐ',
  'เทคนิคการเลือกซื้อบ้านและคอนโดสำหรับมือใหม่',
  'สิ่งที่ควรรู้ก่อนกู้ซื้อบ้าน การเตรียมเอกสารและการเดินบัญชี',
  'ไอเดียการแต่งบ้านสไตล์มินิมอลและโมเดิร์นที่ประหยัดงบ',
  'เทรนด์อสังหาริมทรัพย์ไทยในปีนี้ พื้นที่ไหนน่าลงทุน',
  'ความรู้เรื่องกฎหมายบ้านและที่ดินที่เจ้าของบ้านควรรู้',
]

const MAX_MODEL_ATTEMPTS = 3

function isFree(model) {
  const pricing = model.pricing || {}
  return ['prompt', 'completion'].every(key => Number(pricing[key] || 0) === 0)
}

function outputsText(model) {
  const output = model.architecture?.output_modalities
  if (Array.isArray(output)) return output.includes('text')
  return String(model.architecture?.modality || 'text').endsWith('text')
}

// Only free models, so the daily job can never create a bill.
function freeTextModels(models) {
  return (Array.isArray(models) ? models : [])
    .filter(model => typeof model?.id === 'string' && model.id.endsWith(':free'))
    .filter(model => isFree(model) && outputsText(model) && (model.context_length || 0) >= 8000)
    .sort((a, b) => (b.context_length || 0) - (a.context_length || 0))
    .map(model => model.id)
}

function buildPrompt(topic) {
  return `คุณเป็นนักเขียนบล็อกอสังหาริมทรัพย์มืออาชีพในประเทศไทย เขียนบทความคุณภาพสูงเกี่ยวกับ: ${topic}
ความยาว 600-900 คำ ภาษาไทย อ่านง่าย มีหัวข้อย่อย ห้ามแต่งตัวเลขดอกเบี้ย ราคา หรือกฎหมายที่ไม่แน่ใจ ให้เขียนแนะนำให้ผู้อ่านตรวจสอบกับแหล่งทางการแทน
ส่งกลับเป็น JSON เท่านั้น รูปแบบ: { "title": "...", "summary": "...", "content": "..." } ห้ามมีข้อความอื่นปน`
}

function parseBlogJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI ไม่ได้ส่ง JSON กลับมา')
  const data = JSON.parse(match[0])
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  const content = typeof data.content === 'string' ? data.content.trim() : ''
  const summary = typeof data.summary === 'string' ? data.summary.trim() : ''
  if (!title || content.length < 200) throw new Error('บทความจาก AI สั้นหรือไม่ครบ')
  return { title: title.slice(0, 200), summary: summary.slice(0, 500), content }
}

async function generateBlog(topic, apiKey, fetcher = fetch) {
  const catalog = await fetcher('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(15000) })
  if (!catalog.ok) throw new Error(`โหลดรายชื่อโมเดล OpenRouter ไม่สำเร็จ (${catalog.status})`)
  const models = freeTextModels((await catalog.json()).data)
  if (!models.length) throw new Error('ตอนนี้ OpenRouter ไม่มีโมเดลฟรีที่ใช้ได้')

  let lastError
  for (const model of models.slice(0, MAX_MODEL_ATTEMPTS)) {
    try {
      const response = await fetcher('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: buildPrompt(topic) }],
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(90000),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error?.message || `HTTP ${response.status}`)
      return { ...parseBlogJson(body.choices?.[0]?.message?.content), model }
    } catch (error) {
      lastError = error
      functions.logger.warn('Daily blog model failed, trying next', { model, message: error.message })
    }
  }
  throw lastError
}

const scheduledDailyBlog = functions
  .runWith({ timeoutSeconds: 300, memory: '256MB', secrets: ['OPENROUTER_API_KEY'] })
  .pubsub.schedule('0 8 * * *')
  .timeZone('Asia/Bangkok')
  .onRun(async () => {
    const topic = BLOG_TOPICS[Math.floor(Math.random() * BLOG_TOPICS.length)]
    try {
      const blog = await generateBlog(topic, process.env.OPENROUTER_API_KEY)
      // Saved as a draft: AI content must be reviewed by an admin before it goes public.
      const docRef = await admin.firestore().collection('blogs').add({
        title: blog.title,
        summary: blog.summary,
        content: blog.content,
        published: false,
        isFeatured: false,
        images: [],
        author: 'AI Assistant',
        aiGenerated: true,
        aiModel: blog.model,
        topic,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      functions.logger.info('Daily AI blog draft created', { blogId: docRef.id, model: blog.model })
    } catch (error) {
      functions.logger.error('Daily AI blog failed', { topic, message: error.message })
    }
    return null
  })

module.exports = {
  scheduledDailyBlog,
  _private: { freeTextModels, parseBlogJson, generateBlog },
}
