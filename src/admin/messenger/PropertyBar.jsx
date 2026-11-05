import { useState } from 'react'
import { Check, ChevronDown, Home, Loader2, NotebookPen, X } from 'lucide-react'
import ImageDropZone from './ImageDropZone'
import ListingsEditor from './ListingsEditor'

const MAX_IMAGES = 6 // same limit as the server

// What this chat is about, for the AI: a property from the database, houses the team types in
// (for example from a post with several houses), free-text details and pictures. With
// "property first" on, the AI will not answer a chat until one of these exists. The parent
// keys it by conversation so the forms reset when another chat is opened.
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
  const [panelOpen, setPanelOpen] = useState(!hasInfo)

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
            <label className="sr-only" htmlFor="conversation-property">รหัสหรือชื่อทรัพย์ในฐานข้อมูล</label>
            <input
              id="conversation-property"
              list="conversation-property-options"
              value={value}
              onChange={event => setValue(event.target.value)}
              placeholder="ทรัพย์ในฐานข้อมูล: พิมพ์รหัส แล้วเลือกจากรายการ"
              autoComplete="off"
              className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
            />
            <datalist id="conversation-property-options">
              {options.slice(0, 400).map(option => (
                <option key={option.code} value={option.code}>{option.title}</option>
              ))}
            </datalist>
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
          onClick={() => setPanelOpen(open => !open)}
          aria-expanded={panelOpen}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium ${hasInfo ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-700'} hover:bg-slate-50`}
        >
          <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
          ข้อมูลบ้านให้ AI
          {(listings.length > 0 || pictureCount > 0 || savedNote.trim()) && (
            <span className="font-normal">
              ({[listings.length ? `${listings.length} หลัง` : '', pictureCount ? `${pictureCount} รูป` : '', savedNote.trim() ? 'มีโน้ต' : ''].filter(Boolean).join(' · ')})
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition ${panelOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {waiting && (
          <span className="basis-full font-medium">
            เปิด &quot;ต้องมีข้อมูลบ้านก่อน&quot; อยู่ · AI จะยังไม่ตอบแชทนี้ จนกว่าจะเลือกทรัพย์ เพิ่มบ้านที่กรอกเอง หรือกรอกรายละเอียดบ้าน (หรือลูกค้าส่งลิงก์/รหัสทรัพย์มาเอง)
          </span>
        )}
      </div>

      {panelOpen && (
        <div className="max-h-[50vh] space-y-4 overflow-y-auto border-t border-slate-100 px-4 py-3">
          <ListingsEditor
            listings={listings}
            busy={busy}
            onSave={onSaveListing}
            onRemove={onRemoveListing}
            onAddImages={onAddImages}
            onRemoveImage={onRemoveImage}
          />

          <form onSubmit={saveNote} className="flex flex-col gap-2">
            <label htmlFor="conversation-note" className="flex flex-wrap items-center gap-2 font-medium">
              <NotebookPen className="h-4 w-4 shrink-0" aria-hidden="true" />
              รายละเอียดอื่นๆ ให้ AI ใช้ตอบในแชทนี้
              <span className="font-normal text-slate-500">(พิมพ์เอง เช่น โปรโมชันของโพสต์ เงื่อนไขการจอง)</span>
            </label>
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

          <section className="space-y-2" aria-label="รูปทั่วไปของแชท">
            <p className="font-medium">
              รูปทั่วไปของแชทนี้ (เช่น รูปโพสต์ แปลนรวม)
              <span className="font-normal text-slate-500"> · AI ส่งเมื่อลูกค้าขอดูเท่านั้น สูงสุด {MAX_IMAGES} รูป</span>
            </p>
            {images.length > 0 && (
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
            )}
            {images.length < MAX_IMAGES && (
              <ImageDropZone busy={busy} onFiles={files => onAddImages(files)} label="ลากรูปมาวางที่นี่ หรือคลิกเพื่อเลือก" />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
