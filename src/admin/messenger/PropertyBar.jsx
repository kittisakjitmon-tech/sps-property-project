import { useState } from 'react'
import { Check, Home, Loader2, NotebookPen, X } from 'lucide-react'

// The property this chat is about. The AI uses it to answer, and when "property first"
// is on it will not answer a chat until one is set. The parent keys it by conversation
// so the form resets when another chat is opened.
export default function PropertyBar({ conversation, options, required, busy, onSet, onClear, onSaveNote }) {
  const currentCode = conversation?.currentPropertyCode || ''
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const savedNote = conversation?.staffNote || ''
  const [note, setNote] = useState(savedNote)
  const [noteSaved, setNoteSaved] = useState(false)

  if (!conversation) return null

  const match = options.find(option => option.code === currentCode)
  const title = match?.title || conversation.currentPropertyTitle || ''
  const chosen = options.find(option => option.code.toLowerCase() === value.trim().toLowerCase())
  const showForm = editing || !currentCode
  const waiting = required && !currentCode && !savedNote.trim()
  const noteChanged = note.trim() !== savedNote.trim()

  function submit(event) {
    event.preventDefault()
    if (!chosen || busy) return
    onSet(chosen.code)
    setEditing(false)
    setValue('')
  }

  async function saveNote(event) {
    event.preventDefault()
    if (!noteChanged || busy) return
    setNoteSaved(false)
    if (await onSaveNote(note.trim())) setNoteSaved(true)
  }

  return (
    <div className={`border-b text-xs ${waiting ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700'}`}>
    <div className="flex flex-wrap items-center gap-2 px-4 py-2">
      <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="font-medium">ทรัพย์ที่ลูกค้าสนใจ:</span>

      {!showForm && (
        <>
          <span className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
            {currentCode}{title ? ` · ${title}` : ''}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={busy}
            className="rounded-lg px-2 py-1 font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            เปลี่ยน
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            ล้าง
          </button>
        </>
      )}

      {showForm && (
        <form onSubmit={submit} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="conversation-property">รหัสหรือชื่อทรัพย์</label>
          <input
            id="conversation-property"
            list="conversation-property-options"
            value={value}
            onChange={event => setValue(event.target.value)}
            placeholder="พิมพ์รหัสทรัพย์ แล้วเลือกจากรายการ"
            autoComplete="off"
            className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
          />
          <datalist id="conversation-property-options">
            {options.slice(0, 400).map(option => (
              <option key={option.code} value={option.code}>{option.title}</option>
            ))}
          </datalist>
          <button
            type="submit"
            disabled={!chosen || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
            ตั้งทรัพย์
          </button>
          {currentCode && (
            <button type="button" onClick={() => { setEditing(false); setValue('') }} className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100">
              ยกเลิก
            </button>
          )}
        </form>
      )}

      {waiting && (
        <span className="basis-full font-medium">
          เปิด &quot;ต้องมีข้อมูลบ้านก่อน&quot; อยู่ · AI จะยังไม่ตอบแชทนี้ จนกว่าจะเลือกทรัพย์หรือกรอกรายละเอียดบ้านด้านล่าง (หรือลูกค้าส่งลิงก์/รหัสทรัพย์มาเอง)
        </span>
      )}
    </div>

    <form onSubmit={saveNote} className="flex flex-col gap-2 border-t border-slate-100 px-4 py-2">
      <label htmlFor="conversation-note" className="flex items-center gap-2 font-medium">
        <NotebookPen className="h-4 w-4 shrink-0" aria-hidden="true" />
        รายละเอียดบ้านให้ AI ใช้ตอบในแชทนี้
        <span className="font-normal text-slate-500">(พิมพ์เอง เช่น ทำเล ห้อง ราคาที่บอกลูกค้าได้ โปรโมชัน)</span>
      </label>
      <textarea
        id="conversation-note"
        value={note}
        onChange={event => { setNote(event.target.value); setNoteSaved(false) }}
        maxLength={1500}
        rows={3}
        placeholder="เช่น บ้านเดี่ยวหลังริม 3 นอน 2 น้ำ ที่จอดรถ 2 คัน ใกล้นิคมอมตะ โปรโมชันฟรีค่าโอนถึงสิ้นเดือน"
        className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={!noteChanged || busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
          บันทึกให้ AI
        </button>
        {noteSaved && !noteChanged && (
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            บันทึกแล้ว AI จะใช้ในข้อความถัดไป
          </span>
        )}
        <span className="ml-auto text-slate-500">{note.length}/1500 · อย่าใส่ราคาที่ตั้งใจซ่อนไว้</span>
      </div>
    </form>
    </div>
  )
}
