/**
 * Export recent Messenger chats (customer + AI + team messages) to a local JSON file,
 * so the AI's answers can be reviewed for mistakes.
 *
 * Run (from the functions folder, which has firebase-admin installed):
 *       cd functions && node scripts/export-ai-chats.mjs        (last 14 days, up to 300 chats)
 *       cd functions && node scripts/export-ai-chats.mjs --days 30 --limit 500
 *
 * Credentials: ../.env.json (service account, same as the root scripts) or, if that file is
 * missing, Application Default Credentials (`gcloud auth application-default login`).
 * Output: ../chat-exports/chats-<date>.json — contains customer data, never commit it.
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  const value = index >= 0 ? Number(process.argv[index + 1]) : NaN
  return Number.isFinite(value) && value > 0 ? value : fallback
}
const days = arg('days', 14)
const limit = arg('limit', 300)
const since = Date.now() - days * 24 * 60 * 60 * 1000

const keyFile = ['../.env.json', './.env.json'].find(path => existsSync(path))
initializeApp(keyFile
  ? { credential: cert(JSON.parse(readFileSync(keyFile, 'utf8'))) }
  : { credential: applicationDefault(), projectId: 'sps-property' })
const db = getFirestore()

const ms = value => value?.toMillis?.() ?? (typeof value === 'number' ? value : null)
const iso = value => (ms(value) ? new Date(ms(value)).toISOString() : null)

const snapshot = await db.collection('messenger_conversations').orderBy('lastMessageAt', 'desc').limit(limit).get()
const chats = []
for (const doc of snapshot.docs) {
  const c = doc.data()
  if ((ms(c.lastMessageAt) || 0) < since) continue
  const messages = await doc.ref.collection('messages').orderBy('timestamp', 'asc').limit(200).get()
  const items = messages.docs.map(m => {
    const d = m.data()
    return {
      at: iso(d.timestamp),
      from: d.direction === 'incoming' ? 'customer' : (d.sentBy || 'page'),
      text: d.text || '',
      ...(d.kind ? { kind: d.kind } : {}),
      ...(d.automated ? { automated: true } : {}),
      ...(Array.isArray(d.attachments) && d.attachments.length ? { attachments: d.attachments.map(a => a.type || 'file') } : {}),
    }
  })
  if (!items.some(item => item.from === 'ai')) continue
  chats.push({
    id: doc.id,
    customer: c.participantName || c.contact?.name || null,
    house: c.currentPropertyCode || null,
    houseSetBy: c.currentPropertySetBy || null,
    adTitle: c.facebookReferral?.adTitle || c.facebookReferral?.ad_title || null,
    staffNote: c.staffNote || null,
    botPaused: Boolean(c.botPaused),
    needsHuman: Boolean(c.needsHuman),
    handoffReason: c.handoffReason || null,
    aiStatus: c.aiStatus ? { result: c.aiStatus.result, reason: c.aiStatus.reason, at: iso(c.aiStatus.at) } : null,
    messages: items,
  })
}

mkdirSync('../chat-exports', { recursive: true })
const file = `../chat-exports/chats-${new Date().toISOString().slice(0, 10)}.json`
writeFileSync(file, JSON.stringify({ exportedAt: new Date().toISOString(), days, chats }, null, 2))
console.log(`Saved ${chats.length} chats with AI replies (last ${days} days) to ${file}`)
process.exit(0)
