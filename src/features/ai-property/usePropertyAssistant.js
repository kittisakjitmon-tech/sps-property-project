import { useEffect, useRef, useState } from 'react'
import { readDraft, writeDraft } from './draftStore'
import { fileToDataUrl, validateFiles, validateDraft, draftToForm, attachmentToFile } from './propertyDraft'
import { prepareIntakeFiles, compressUploadFiles } from './photoUpload'
import { preparePropertyPhotos } from './coverImage'
import { requestAssistant } from './aiService'

const empty = () => ({ files: [], messages: [], properties: [], questions: [] })
export function usePropertyAssistant(uid) {
  const [session, setSession] = useState(empty)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [activity, setActivity] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState(null)
  const lock = useRef(false)
  const key = `session:${uid}`
  useEffect(() => {
    let active = true
    readDraft(key).then(saved => { if (active && saved) setSession(saved) }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [key])
  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => { writeDraft(key, session).catch(e => setError(e.message)) }, 350)
    return () => clearTimeout(timer)
  }, [key, ready, session])

  async function addFiles(files) {
    if (lock.current) return
    lock.current = true
    setBusy(true); setActivity('compressing'); setError('')
    try {
      const prepared = await prepareIntakeFiles(files, session.files)
      validateFiles(prepared.map(p => p.file), session.files)
      const additions = await Promise.all(prepared.map(async ({ file: f, originalSize }) => ({ id: crypto.randomUUID(), name: f.name, size: f.size, originalSize, type: f.type, dataUrl: await fileToDataUrl(f) })))
      setSession(s => ({ ...s, files: [...s.files, ...additions] }))
    } catch (e) { setError(e.message) } finally { lock.current = false; setBusy(false); setActivity('') }
  }
  function removeFile(id) {
    if (lock.current) return
    setSession(s => ({ ...s, files: s.files.filter(f => f.id !== id), properties: s.properties.map(p => ({ ...p, imageIds: (p.imageIds || []).filter(x => x !== id), coverImageId: p.coverImageId === id ? '' : p.coverImageId, coverReason: p.coverImageId === id ? '' : p.coverReason })) }))
  }
  async function send(message) {
    if (lock.current || !ready || !message.trim()) return false
    lock.current = true; setBusy(true); setActivity('thinking'); setError('')
    try {
      // Keep history unchanged on failures so a retry cannot duplicate a user turn.
      const result = await requestAssistant({ message, files: session.files, history: session.messages.slice(-16).map(m => ({ role: m.role, content: m.content })), properties: session.properties })
      const next = { ...session, messages: [...session.messages, { role: 'user', content: message }, { role: 'assistant', content: result.reply }].slice(-40), properties: result.properties, questions: result.questions }
      setSession(next)
      setStatus({ configured: true, available: true, model: result.model, reason: `ใช้งาน ${result.model} · เฉพาะรุ่นฟรี` })
      try { await writeDraft(key, next) } catch (e) { setError(e.message) }
      return true
    } catch (e) { setError(e.message); return false } finally { lock.current = false; setBusy(false); setActivity('') }
  }
  function editProperty(index, patch) {
    setSession(s => ({ ...s, properties: s.properties.map((p, i) => i === index ? { ...p, ...patch } : p) }))
  }
  async function checkStatus() {
    setError('')
    try { setStatus(await requestAssistant({ action: 'status' })) } catch (e) { setError(e.message) }
  }
  async function transfer(index) {
    const property = session.properties[index]
    validateDraft(property)
    const photos = await preparePropertyPhotos(property, session.files)
    const compressed = await compressUploadFiles(photos.files.map(attachmentToFile))
    const uploadFiles = await Promise.all(compressed.map(async (file, i) => ({ ...photos.files[i], name: file.name, type: file.type, size: file.size, dataUrl: await fileToDataUrl(file) })))
    const transferId = crypto.randomUUID()
    await writeDraft(key, session)
    await writeDraft(`transfer:${uid}:${transferId}`, {
      form: draftToForm(property), files: uploadFiles, coverGenerated: photos.coverGenerated, originalPhotoCount: photos.files.length - (photos.coverGenerated ? 1 : 0),
      questions: property.questions || [], evidence: property.evidence || {}, createdAt: Date.now(),
    })
    return transferId
  }
  async function reset() {
    const next = empty()
    await writeDraft(key, next)
    setSession(next); setError('')
  }
  return { session, ready, busy, activity, error, setError, status, addFiles, removeFile, send, editProperty, checkStatus, transfer, reset }
}
