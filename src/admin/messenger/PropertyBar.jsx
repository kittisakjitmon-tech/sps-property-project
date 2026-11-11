import { useState } from 'react'
import { Check, ChevronDown, ExternalLink, Home, Link2, Loader2, NotebookPen, PencilLine, X } from 'lucide-react'
import ListingsEditor from './ListingsEditor'
import PropertyPicker from './PropertyPicker'
import { searchPropertyOptions } from './propertySearch'
import { useMessengerApi } from './useMessengerData'

const MAX_LISTINGS = 10 // same limit as the server
const SET_BY = { 'facebook-referral': 'จากโฆษณา', staff: 'ทีมเลือก' }

// One box for "which house is this chat about". It shows the current house and where it came
// from, one search to choose a house (and, for a chat from an unmapped ad, to bind that ad to
// the house so the next customer gets it automatically), and folds the typed-in houses and the
// note to the AI underneath. The parent keys it by conversation so the forms reset per chat.
export default function PropertyBar({
  conversation, options, required, busy,
  onSet, onClear, onSaveNote, onAddImages, onRemoveImage, onSaveListing, onRemoveListing,
}) {
  const callApi = useMessengerApi()
  const currentCode = conversation?.currentPropertyCode || ''
  const savedNote = conversation?.staffNote || ''
  const listings = Array.isArray(conversation?.staffListings) ? conversation.staffListings : []
  const images = Array.isArray(conversation?.staffImages) ? conversation.staffImages : []
  const hasInfo = Boolean(currentCode || savedNote.trim() || listings.length)
  const source = conversation?.facebookReferral || null
  const sourceKind = source?.adId ? 'ad' : source?.postId ? 'post' : source?.ref ? 'ref' : ''
  const sourceValue = source?.adId || source?.postId || source?.ref || ''
  const adUnmapped = Boolean(sourceKind && ['unmapped', 'unavailable'].includes(source.status))

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [bindAd, setBindAd] = useState(true)
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [note, setNote] = useState(savedNote)
  const [noteSaved, setNoteSaved] = useState(false)
  const [panelOpen, setPanelOpen] = useState(listings.length > 0 || images.length > 0)
  const [creating, setCreating] = useState(false)
  const [editorKey, setEditorKey] = useState(0) // a new key starts the house form empty
  const [noteOpen, setNoteOpen] = useState(Boolean(savedNote.trim()))

  if (!conversation) return null

  const match = options.find(option => option.code === currentCode)
  const title = match?.title || conversation.currentPropertyTitle || ''
  const chosen = options.find(option => option.code.toLowerCase() === value.trim().toLowerCase())
  const showForm = editing || !currentCode
  const waiting = required && !hasInfo
  const working = busy || linking
  const noteChanged = note.trim() !== savedNote.trim()
  const pictureCount = images.length + listings.reduce((total, item) => total + (item.images?.length || 0), 0)
  const setBy = SET_BY[conversation.currentPropertySetBy] || (currentCode ? 'ลูกค้าถาม' : '')
  const willBind = adUnmapped && bindAd

  async function submit(event) {
    event.preventDefault()
    if (!chosen || working) return
    if (!willBind) {
      onSet(chosen.code)
      setEditing(false)
      setValue('')
      return
    }
    // Bind the ad to this house (future clicks), then apply it to this chat right away.
    setLinking(true)
    setLinkError('')
    try {
      await callApi({ action: 'savePropertySource', pageId: conversation.pageId, kind: sourceKind, value: sourceValue, propertyCode: chosen.code })
      try {
        await callApi({ action: 'applyConversationReferral', conversationId: conversation.id })
      } catch {
        onSet(chosen.code) // the mapping is saved; still set this chat's house
      }
      setEditing(false)
      setValue('')
    } catch (failure) {
      setLinkError(failure.message)
    } finally {
      setLinking(false)
    }
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
    <div className={`border-b text-xs ${waiting ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-slate-200 bg-white text-slate-700'}`}>
      <div className="space-y-2 px-4 py-2.5">
        {/* Current house */}
        <div className="flex flex-wrap items-center gap-2">
          <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-semibold">บ้านของแชทนี้:</span>
          {currentCode ? (
            <>
              <span className="max-w-full truncate rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-900 ring-1 ring-emerald-200">
                {currentCode}{title ? ` · ${title}` : ''}
              </span>
              {setBy && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{setBy}</span>}
              {!editing && (
                <>
                  <button type="button" onClick={() => setEditing(true)} disabled={working} className="rounded-lg px-2 py-1 font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50">เปลี่ยน</button>
                  <button type="button" onClick={onClear} disabled={working} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                    <X className="h-3 w-3" aria-hidden="true" /> ล้าง
                  </button>
                </>
              )}
            </>
          ) : listings.length ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-900 ring-1 ring-emerald-200">ใช้บ้านที่กรอกเอง {listings.length} หลัง</span>
          ) : (
            <span className="font-medium text-amber-800">ยังไม่มีบ้าน{required ? ' · AI จะยังไม่ตอบจนกว่าจะเลือกบ้าน' : ''}</span>
          )}
        </div>

        {/* Where the customer came from */}
        {source && (
          <p className={`flex flex-wrap items-center gap-1.5 ${adUnmapped ? 'text-amber-800' : 'text-slate-500'}`}>
            <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {source.adId || source.source === 'ADS' ? 'ลูกค้าทักจากโฆษณา' : 'ลูกค้าทักจากลิงก์ / โพสต์'}
              {source.title ? ` “${source.title}”` : ''}
              {source.status === 'matched' ? ` · ผูกกับ ${source.propertyCode} แล้ว` : ''}
              {source.status === 'manual' ? ' · ทีมยืนยันบ้านแล้ว' : ''}
              {source.status === 'unmapped' ? ' · โฆษณานี้ยังไม่ได้ผูกบ้าน' : ''}
              {source.status === 'unavailable' ? ` · บ้านที่ผูกไว้ (${source.propertyCode}) ขายแล้วหรือไม่พบ` : ''}
            </span>
            {sourceValue && <span className="font-mono text-[11px] text-slate-400">{sourceKind === 'ad' ? 'รหัสโฆษณา' : sourceKind === 'post' ? 'โพสต์' : 'ref'} {sourceValue}</span>}
          </p>
        )}

        {/* Choose a house */}
        {showForm && (
          <form onSubmit={submit} className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <PropertyPicker options={options} value={value} onChange={setValue} onPick={setValue} disabled={working} />
              <button type="submit" disabled={!chosen || working} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50">
                {working && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                {willBind ? 'ใช้บ้านนี้ + ผูกโฆษณา' : 'ใช้บ้านนี้'}
              </button>
              {currentCode && (
                <button type="button" onClick={() => { setEditing(false); setValue('') }} className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100">ยกเลิก</button>
              )}
              <button type="button" onClick={startManualEntry} disabled={working || creating || listings.length >= MAX_LISTINGS}
                title={listings.length >= MAX_LISTINGS ? `แชทนี้มีบ้านที่กรอกเองครบ ${MAX_LISTINGS} หลังแล้ว ลบหลังเก่าก่อน` : undefined}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-50">
                <PencilLine className="h-3.5 w-3.5" aria-hidden="true" /> ไม่มีในระบบ? กรอกเอง
              </button>
            </div>
            {adUnmapped && (
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={bindAd} onChange={event => setBindAd(event.target.checked)} disabled={working} className="mt-0.5" />
                <span>ผูก{sourceKind === 'ad' ? 'โฆษณา' : 'ต้นทาง'}นี้กับบ้านที่เลือกด้วย <span className="text-slate-500">ลูกค้าคนต่อไปที่ทักจากโฆษณานี้จะได้บ้านนี้อัตโนมัติ</span></span>
              </label>
            )}
            {value.trim() && !chosen && !searchPropertyOptions(options, value).length && (
              <p className="text-amber-700">ไม่พบ &quot;{value.trim()}&quot; ในบ้านที่ยังว่าง ถ้าไม่มีในระบบ กด &quot;กรอกเอง&quot;</p>
            )}
            {chosen && <p className="text-emerald-700">เลือกแล้ว: {[chosen.code, chosen.title, chosen.location].filter(Boolean).join(' · ')}</p>}
            {linkError && <p role="alert" className="text-red-700">{linkError}</p>}
          </form>
        )}

        {/* Extras, folded */}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setPanelOpen(open => !open)} aria-expanded={panelOpen}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-slate-600 hover:bg-slate-100">
            <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
            บ้านที่กรอกเอง และหมายเหตุถึง AI
            {(listings.length > 0 || pictureCount > 0 || savedNote.trim()) && (
              <span className="font-normal text-emerald-700">
                ({[listings.length ? `${listings.length} หลัง` : '', pictureCount ? `${pictureCount} รูป` : '', savedNote.trim() ? 'มีโน้ต' : ''].filter(Boolean).join(' · ')})
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition ${panelOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          <a href="/sps-internal-admin/ad-mappings" className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-blue-700">
            จัดการการผูกโฆษณาทั้งหมด <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
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
