import { useId, useMemo, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { adminDb } from '../../lib/firebase'
import { useFaqItems } from './useMessengerData'

// Same limits as the AI (functions/facebook-ai-reply.js loadFaq): up to 40 answered entries,
// a question up to 150 characters and an answer up to 500.
const MAX_ACTIVE = 40
const MAX_QUESTION = 150
const MAX_ANSWER = 500

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100'

// Company facts and frequently asked questions the AI answers from, edited by the team. A change
// reaches the AI within about five minutes (it keeps a short cache).
export default function FaqDialog({ onClose }) {
  const id = useId()
  const { items, loading, error: loadError } = useFaqItems()
  const [editing, setEditing] = useState(null) // { id?, question, answer } | null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const sorted = useMemo(() => [...items].sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)), [items])
  const activeCount = sorted.filter(item => item.active !== false).length

  async function run(action) {
    setBusy(true)
    setError('')
    try {
      await action()
      return true
    } catch (actionError) {
      setError(actionError.message || 'บันทึกไม่สำเร็จ')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function save(event) {
    event.preventDefault()
    const question = editing.question.trim()
    const answer = editing.answer.trim()
    if (!question || !answer) return setError('ใส่ทั้งคำถามและคำตอบ')
    const ok = await run(() => (editing.id
      ? updateDoc(doc(adminDb, 'messenger_faq', editing.id), { question, answer, updatedAt: serverTimestamp() })
      : addDoc(collection(adminDb, 'messenger_faq'), { question, answer, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })))
    if (ok) setEditing(null)
  }

  const toggle = item => run(() => updateDoc(doc(adminDb, 'messenger_faq', item.id), { active: item.active === false, updatedAt: serverTimestamp() }))
  const remove = item => window.confirm(`ลบคำถาม "${item.question}"?`) && run(() => deleteDoc(doc(adminDb, 'messenger_faq', item.id)))

  const form = editing && (
    <form onSubmit={save} className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs">
      <label className="block space-y-1">
        <span className="font-medium text-slate-700">คำถาม</span>
        <input value={editing.question} onChange={event => setEditing(current => ({ ...current, question: event.target.value }))} maxLength={MAX_QUESTION} placeholder="เช่น ค่าใช้จ่ายวันโอนใครจ่าย" className={inputClass} autoFocus />
      </label>
      <label className="block space-y-1">
        <span className="font-medium text-slate-700">คำตอบ <span className="font-normal text-slate-500">({editing.answer.length}/{MAX_ANSWER})</span></span>
        <textarea value={editing.answer} onChange={event => setEditing(current => ({ ...current, answer: event.target.value }))} maxLength={MAX_ANSWER} rows={4} placeholder="คำตอบที่ถูกต้องของบริษัท AI จะตอบตามนี้" className={`${inputClass} resize-y`} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50">
          {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
          บันทึก
        </button>
        <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100">ยกเลิก</button>
      </div>
    </form>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id={`${id}-title`} className="text-base font-semibold text-slate-900">คำถามที่พบบ่อย</h2>
            <p className="text-xs text-slate-500">ข้อมูลบริษัทที่ AI ใช้ตอบลูกค้า เปิดใช้ได้ {activeCount}/{MAX_ACTIVE} ข้อ · แก้แล้ว AI ใช้ภายในประมาณ 5 นาที</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="ปิด">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5 text-sm">
          {(error || loadError) && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{error || loadError}</p>}
          {!editing && (
            <button
              type="button"
              onClick={() => { setEditing({ question: '', answer: '' }); setError('') }}
              disabled={activeCount >= MAX_ACTIVE}
              title={activeCount >= MAX_ACTIVE ? `เปิดใช้ได้ไม่เกิน ${MAX_ACTIVE} ข้อ ปิดหรือลบข้อเก่าก่อน` : undefined}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              เพิ่มคำถาม
            </button>
          )}
          {editing && !editing.id && form}

          {loading && <p className="text-xs text-slate-500">กำลังโหลด…</p>}
          {!loading && !sorted.length && !editing && (
            <p className="text-xs text-slate-500">ยังไม่มีคำถาม เพิ่มเรื่องที่ลูกค้าถามบ่อย เช่น ค่าใช้จ่ายวันโอน เวลาทำการ การจอง เพื่อให้ AI ตอบตรงกับบริษัท</p>
          )}

          <ul className="space-y-2">
            {sorted.map(item => (
              <li key={item.id} className={`rounded-xl border p-3 text-xs ${item.active === false ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200 bg-white'}`}>
                {editing?.id === item.id ? form : (
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-semibold text-slate-800">ถาม: {item.question}</p>
                      <p className="whitespace-pre-line text-slate-600">ตอบ: {item.answer}</p>
                    </div>
                    <label className="inline-flex items-center gap-1.5 font-medium">
                      <input type="checkbox" checked={item.active !== false} onChange={() => toggle(item)} disabled={busy || (item.active === false && activeCount >= MAX_ACTIVE)} />
                      ใช้
                    </label>
                    <button type="button" onClick={() => { setEditing({ id: item.id, question: item.question || '', answer: item.answer || '' }); setError('') }} disabled={busy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                      แก้ไข
                    </button>
                    <button type="button" onClick={() => remove(item)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      ลบ
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
