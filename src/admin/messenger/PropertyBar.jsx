import { useState } from 'react'
import { Check, ChevronDown, Home, Loader2, NotebookPen, PencilLine, X } from 'lucide-react'
import ListingsEditor from './ListingsEditor'
import PropertyPicker from './PropertyPicker'
import { searchPropertyOptions } from './propertySearch'

const MAX_LISTINGS = 10 // same limit as the server

// What this chat is about, for the AI. Two ways: a property from the database ("ตั้งทรัพย์"), or a
// house the team adds by pasting its post ("กรอกเอง"). The note and the chat-wide pictures are
// older, optional extras: the note is folded away, and the pictures only show on chats that
// already have some. With "property first" on, the AI will not answer a chat until it has a
// house. The parent keys it by conversation so the forms reset when another chat is opened.
export default function PropertyBar({
  conversation, options, required, busy,
  onSet, onClear, onSaveNote, onAddImages, onRemoveImage, onSaveListing, onRemoveListing,
}) {
  const currentCode = conversation?.currentPropertyCode || ''
  const savedNote = conversation?.staffNote || ''
  const listings = Array.isArray(conversation?.staffListings) ? conversation.staffListings : []
  const images = Array.isArray(conversation?.staffImages) ? conversation.staffImages : []
  const hasInfo = Boolean(currentCode || savedNote.trim() || listings.length)

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [note, setNote] = useState(savedNote)
  const [noteSaved, setNoteSaved] = useState(false)
  const [panelOpen, setPanelOpen] = useState(!hasInfo || listings.length > 0)
  const [creating, setCreating] = useState(false)
  const [editorKey, setEditorKey] = useState(0) // a new key starts the house form empty
  const [noteOpen, setNoteOpen] = useState(Boolean(savedNote.trim()))

  if (!conversation) return null

  const match = options.find(option => option.code === currentCode)
  const title = match?.title || conversation.currentPropertyTitle || ''
  const chosen = options.find(option => option.code.toLowerCase() === value.trim().toLowerCase())
  const showForm = editing || !currentCode
  const waiting = required && !hasInfo
  const noteChanged = note.trim() !== savedNote.trim()
  const pictureCount = images.length + listings.reduce((total, item) => total + (item.images?.length || 0), 0)

  function submit(event) {
    event.preventDefault()
    if (!chosen || busy) return
    onSet(chosen.code)
    setEditing(false)
    setValue('')
  }

  function startManualEntry() {
    setPanelOpen(true)
    setEditorKey(key => key + 1)
    setCreating(true)
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
            <button type="button" onClick={() => setEditing(true)} disabled={busy} className="rounded-lg px-2 py-1 font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50">
              เปลี่ยน
            </button>
            <button type="button" onClick={onClear} disabled={busy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              <X className="h-3 w-3" aria-hidden="true" />
              ล้าง
            </button>
          </>
        )}

        {showForm && (
          <form onSubmit={submit} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <PropertyPicker options={options} value={value} onChange={setValue} onPick={setValue} disabled={busy} />
            <button type="submit" disabled={!chosen || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50">
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

        <button
          type="button"
          onClick={startManualEntry}
          disabled={busy || creating || listings.length >= MAX_LISTINGS}
          title={listings.length >= MAX_LISTINGS ? `แชทนี้มีบ้านที่กรอกเองครบ ${MAX_LISTINGS} หลังแล้ว ลบหลังเก่าก่อน` : undefined}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-50"
        >
          <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
          ไม่มีในระบบ? กรอกเอง
        </button>

        <button
          type="button"
          onClick={() => setPanelOpen(open => !open)}
          aria-expanded={panelOpen}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium ${hasInfo ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-700'} hover:bg-slate-50`}
        >
          <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
          บ้านที่กรอกเอง
          {(listings.length > 0 || pictureCount > 0 || savedNote.trim()) && (
            <span className="font-normal">
              ({[listings.length ? `${listings.length} หลัง` : '', pictureCount ? `${pictureCount} รูป` : '', savedNote.trim() ? 'มีโน้ต' : ''].filter(Boolean).join(' · ')})
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition ${panelOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {showForm && value.trim() && !chosen && !searchPropertyOptions(options, value).length && (
          <span className="basis-full text-amber-700">
            ไม่พบ &quot;{value.trim()}&quot; ในทรัพย์ที่ยังว่าง (ค้นจากรหัส ชื่อ โครงการ ทำเล สถานที่ใกล้เคียง) ถ้าไม่มีในระบบ กด &quot;ไม่มีในระบบ? กรอกเอง&quot;
          </span>
        )}
        {showForm && chosen && (
          <span className="basis-full text-emerald-700">จะตั้งเป็น: {[chosen.code, chosen.title, chosen.location].filter(Boolean).join(' · ')} กด &quot;ตั้งทรัพย์&quot; เพื่อยืนยัน</span>
        )}
        {showForm && value.trim() && !chosen && searchPropertyOptions(options, value).length > 0 && (
          <span className="basis-full text-slate-500">เลือกทรัพย์จากรายการที่ค้นเจอ แล้วกด &quot;ตั้งทรัพย์&quot;</span>
        )}

        {waiting && (
          <span className="basis-full font-medium">
            AI จะตอบแชทนี้เมื่อมีบ้าน: เลือกจากฐานข้อมูลแล้วกด &quot;ตั้งทรัพย์&quot; หรือกด &quot;ไม่มีในระบบ? กรอกเอง&quot; แล้ววางโพสต์
          </span>
        )}
      </div>

      {panelOpen && (
        <div className="max-h-[50vh] space-y-4 overflow-y-auto border-t border-slate-100 px-4 py-3">
          <ListingsEditor
            key={editorKey}
            listings={listings}
            busy={busy}
            creating={creating}
            onCreatingChange={setCreating}
            onSave={onSaveListing}
            onRemove={onRemoveListing}
            onAddImages={onAddImages}
            onRemoveImage={onRemoveImage}
          />

          <section className="rounded-lg border border-slate-200" aria-label="หมายเหตุถึง AI">
            <button
              type="button"
              onClick={() => setNoteOpen(open => !open)}
              aria-expanded={noteOpen}
              className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left font-medium"
            >
              <NotebookPen className="h-4 w-4 shrink-0" aria-hidden="true" />
              หมายเหตุถึง AI {savedNote.trim() ? <span className="font-normal text-emerald-700">(มีโน้ต)</span> : <span className="font-normal text-slate-500">(ไม่บังคับ)</span>}
              <span className="font-normal text-slate-500">· เรื่องที่ไม่ใช่ข้อมูลบ้าน เช่น ลูกค้าคนนี้ขอส่วนลดไปแล้ว ข้อมูลบ้านให้วางโพสต์ที่ &quot;กรอกเอง&quot;</span>
              <ChevronDown className={`ml-auto h-3.5 w-3.5 transition ${noteOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {noteOpen && (
              <div className="border-t border-slate-100 p-3">
            <form onSubmit={saveNote} className="flex flex-col gap-2">
              <label htmlFor="conversation-note" className="sr-only">หมายเหตุถึง AI</label>
              <textarea
                id="conversation-note"
                value={note}
                onChange={event => { setNote(event.target.value); setNoteSaved(false) }}
                maxLength={1500}
                rows={3}
                placeholder="เช่น โพสต์นี้ฟรีค่าโอนถึงสิ้นเดือน จองด้วยเงิน 10,000 บาท"
                className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button type="submit" disabled={!noteChanged || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50">
                  {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                  บันทึกให้ AI
                </button>
                {noteSaved && !noteChanged && (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    บันทึกแล้ว AI จะใช้ในข้อความถัดไป
                  </span>
                )}
                <span className="ml-auto text-slate-500">{note.length}/1500</span>
              </div>
            </form>
              </div>
            )}
          </section>

          {images.length > 0 && (
            <section className="space-y-2" aria-label="รูปทั่วไปของแชท">
              <p className="font-medium">
                รูปทั่วไปของแชทนี้ (แบบเดิม)
                <span className="font-normal text-slate-500"> · AI ส่งเมื่อลูกค้าขอดู รูปบ้านใหม่ให้ใส่ในบ้านที่กรอกเอง</span>
              </p>
              <ul className="flex flex-wrap gap-2">
                {images.map(image => (
                  <li key={image.url} className="relative">
                    <a href={image.url} target="_blank" rel="noreferrer">
                      <img src={image.url} alt={image.caption || 'รูปแบบบ้าน'} className="h-16 w-20 rounded-lg border border-slate-200 object-cover" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onRemoveImage(image.url)}
                      disabled={busy}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-1 text-slate-600 shadow ring-1 ring-slate-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                      aria-label="ลบรูปนี้"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
