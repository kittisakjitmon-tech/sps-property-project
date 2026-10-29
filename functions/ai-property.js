const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { IntakeError, validateInput, buildRequest, freeModelCandidates, parseResponse } = require('./ai-property-core.cjs')

let catalogCache
async function availability() {
  if (catalogCache && Date.now() - catalogCache.at < 60000) return catalogCache.value
  const response = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new IntakeError('unavailable', 'ตรวจสอบรุ่นฟรีกับ OpenRouter ไม่สำเร็จ กรุณาลองใหม่')
  const body = await response.json()
  if (!Array.isArray(body.data)) throw new IntakeError('unavailable', 'ตรวจสอบรายการโมเดลไม่สำเร็จ')
  const candidates = freeModelCandidates(body.data)
  const value = { available: candidates.length > 0, model: candidates[0]?.id || null, candidates: candidates.map(m => m.id), reason: candidates.length ? `พบโมเดลฟรี ${candidates[0].name || candidates[0].id} · สลับเฉพาะรุ่นฟรีเมื่อใช้ไม่ได้` : 'ยังไม่มีโมเดลฟรีที่รับรูปและข้อมูลตามที่ต้องการ ระบบจะไม่ใช้รุ่นเสียเงิน' }
  catalogCache = { at: Date.now(), value }
  return value
}

async function checkUser(context, db) {
  if (!context.auth) throw new IntakeError('unauthenticated', 'กรุณาเข้าสู่ระบบก่อนใช้ AI')
  const snap = await (db || admin.firestore()).collection('users').doc(context.auth.uid).get()
  const user = snap.data()
  if (!snap.exists || !['super_admin', 'admin', 'agent'].includes(user.role) || ['disabled', 'suspended', 'inactive', 'pending', 'blocked'].includes(user.status) || user.disabled === true) throw new IntakeError('permission-denied', 'บัญชีนี้ไม่มีสิทธิ์ใช้ผู้ช่วยกรอกทรัพย์')
}

async function rateLimit(uid, db = admin.firestore(), now = Date.now()) {
  const ref = db.collection('_aiPropertyRateLimits').doc(uid)
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const state = snap.data() || {}
    const day = new Date(now).toISOString().slice(0, 10)
    const count = state.day === day ? state.count || 0 : 0
    if (now - (state.lastAt || 0) < 10000 || count >= 30) throw new IntakeError('resource-exhausted', count >= 30 ? 'ครบโควตา 30 ข้อความต่อวันแล้ว กรุณาลองวันถัดไป' : 'กรุณาเว้น 10 วินาทีก่อนส่งข้อความถัดไป')
    tx.set(ref, { day, count: count + 1, lastAt: now })
  })
}

async function runFreeCompletion(input, candidates, key, fetcher = fetch) {
  let lastCode = 'unavailable'
  for (const model of candidates.slice(0, 3)) {
    let response
    try {
      response = await fetcher('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-OpenRouter-Title': 'SPS Property Admin' },
        body: JSON.stringify(buildRequest(input, model)), signal: AbortSignal.timeout(45000),
      })
    } catch { continue }
    if ([401, 402].includes(response.status)) throw new IntakeError('permission-denied', 'OpenRouter ปฏิเสธบัญชีหรือ API Key (เช่น User not found) กรุณาตรวจบัญชีและสร้างคีย์ใหม่ ระบบไม่ได้ใช้รุ่นเสียเงิน')
    if (!response.ok) { if (response.status === 429) lastCode = 'resource-exhausted'; continue }
    const body = await response.json()
    try { return parseResponse(body, input.files, model) } catch (err) { if (!(err instanceof IntakeError)) throw err; lastCode = err.code }
  }
  throw new IntakeError(lastCode, 'โมเดลฟรีที่ตรวจแล้วตอบไม่สำเร็จหรือโควตาเต็ม ระบบไม่ได้ใช้โมเดลเสียเงิน กรุณาลองใหม่ภายหลัง ร่างเดิมยังอยู่')
}

exports.aiPropertyAssistant = functions.runWith({ secrets: ['OPENROUTER_API_KEY'], timeoutSeconds: 180, memory: '512MB', maxInstances: 3 }).https.onCall(async (data, context) => {
  try {
    await checkUser(context)
    const key = process.env.OPENROUTER_API_KEY
    if (data?.action === 'status') { const { candidates: _candidates, ...status } = await availability(); return { configured: Boolean(key), ...status } }
    const input = validateInput(data)
    if (!key) throw new IntakeError('failed-precondition', 'ยังไม่ได้ตั้งค่า OpenRouter API Key ที่เซิร์ฟเวอร์')
    const status = await availability()
    if (!status.available) throw new IntakeError('failed-precondition', status.reason)
    await rateLimit(context.auth.uid)
    return await runFreeCompletion(input, status.candidates, key)
  } catch (err) {
    if (err instanceof IntakeError) throw new functions.https.HttpsError(err.code, err.message)
    functions.logger.warn('AI property assistant request failed', { code: err?.name || 'unknown' })
    throw new functions.https.HttpsError('unavailable', 'ติดต่อผู้ช่วย AI ไม่สำเร็จ กรุณาลองใหม่ ข้อมูลร่างเดิมยังอยู่')
  }
})
exports._test = { checkUser, rateLimit, runFreeCompletion }
