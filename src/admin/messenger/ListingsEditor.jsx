import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import ImageDropZone from './ImageDropZone'

const TYPES = ['บ้านเดี่ยว', 'บ้านแฝด', 'ทาวน์โฮม', 'คอนโด', 'ที่ดิน', 'อื่นๆ']
const MAX_LISTINGS = 10 // same limits as the server
const MAX_IMAGES = 6
const MAX_TEXT = 2000

const EMPTY = { details: '', priceVisible: true, title: '', type: '', listing: 'sale', location: '', bedrooms: '', bathrooms: '', price: '', priceNote: '' }

const POST_EXAMPLE = `เช่น
🏡 บ้านแฝด แยกมาบโป่ง เฟส 8-10
2 ห้องนอน 2 ห้องน้ำ 2 จอดรถ
✅ ฟรีค่ามิเตอร์น้ำ-ไฟ
พิกัด https://maps.app.goo.gl/...
ราคา 2.19 ล้าน`

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100'

function toDraft(listing) {
  return {
    id: listing.id,
    details: listing.details || '',
    priceVisible: listing.priceVisible !== false,
    title: listing.title || '',
    type: listing.type || '',
    listing: listing.listing === 'rent' ? 'rent' : 'sale',
    location: listing.location || '',
    bedrooms: listing.bedrooms ?? '',
    bathrooms: listing.bathrooms ?? '',
    price: listing.price ? String(listing.price) : '',
    priceNote: listing.priceNote || '',
  }
}

function priceText(listing) {
  if (!listing.price) return ''
  return `${listing.price.toLocaleString('th-TH')} บาท${listing.listing === 'rent' ? '/เดือน' : ''}${listing.priceNote ? ` (${listing.priceNote})` : ''}`
}

// What the AI (or the team) read from the post: what goes on the house card.
function readSummary(listing) {
  return [
    [listing.type, listing.title].filter(Boolean).join(' '),
    listing.location,
    [listing.bedrooms != null ? `${listing.bedrooms} นอน` : '', listing.bathrooms != null ? `${listing.bathrooms} น้ำ` : ''].filter(Boolean).join(' '),
    priceText(listing) ? `${priceText(listing)}${listing.priceVisible === false ? ' · ไม่บอกราคาจริง' : ''}` : '',
  ].filter(Boolean).join(' · ')
}

const READ_BY = {
  ai: { label: 'AI อ่านได้ว่า', className: 'text-emerald-700' },
  text: { label: 'ระบบอ่านจากข้อความ (AI ไม่ว่าง กรุณาตรวจ)', className: 'text-amber-700' },
  team: { label: 'ข้อมูลที่ตรวจแล้ว', className: 'text-slate-600' },
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

// Houses the team adds for this chat, for example from a post that shows a house that is not in
// the property database. The team pastes the post as it is; the AI answers from it, and reads
// the type, name, area, rooms and price for the house card. The pictures of one house are sent
// when the customer asks for them.
export default function ListingsEditor({ listings, busy, creating, onCreatingChange, onSave, onRemove, onAddImages, onRemoveImage }) {
  const [editingId, setEditingId] = useState(null) // a listing id | null (a new house is `creating`)
  const [draft, setDraft] = useState(EMPTY)
  const [savedDetails, setSavedDetails] = useState('') // the post as it was when editing started
  const [fieldsOpen, setFieldsOpen] = useState(false)
  const [fieldsEdited, setFieldsEdited] = useState(false)
  const [pending, setPending] = useState([]) // pictures chosen while filling in a new house

  // Previews of the pending pictures; released when they change or the form goes away.
  const previews = useMemo(() => pending.map(file => ({ file, url: URL.createObjectURL(file) })), [pending])
  useEffect(() => () => previews.forEach(item => URL.revokeObjectURL(item.url)), [previews])

  function startNew() {
    setDraft(EMPTY)
    setSavedDetails('')
    setFieldsOpen(false)
    setFieldsEdited(false)
    setPending([])
    setEditingId(null)
    onCreatingChange(true)
  }

  function startEdit(listing) {
    setDraft(toDraft(listing))
    setSavedDetails(listing.details || '')
    setFieldsOpen(false)
    setFieldsEdited(false)
    onCreatingChange(false)
    setEditingId(listing.id)
  }

  function closeForm() {
    setEditingId(null)
    setPending([])
    onCreatingChange(false)
  }

  function addPending(files) {
    setPending(current => [...current, ...files].slice(0, MAX_IMAGES))
  }

  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }))
  const updateField = (key, value) => {
    update(key, value)
    setFieldsEdited(true)
  }

  const postChanged = draft.details.trim() !== savedDetails.trim()

  async function submit(event) {
    event.preventDefault()
    if (busy || !draft.details.trim()) return
    let saved
    if (creating) {
      saved = await onSave({ details: draft.details, priceVisible: draft.priceVisible }, { extract: true })
    } else if (fieldsEdited) {
      // The team corrected what was read: keep their values, even if the post changed too.
      saved = await onSave({ ...draft, fieldsEdited: true }, { extract: false })
    } else if (postChanged) {
      saved = await onSave({ id: draft.id, details: draft.details, priceVisible: draft.priceVisible }, { extract: true })
    } else {
      saved = await onSave({ ...draft }, { extract: false })
    }
    if (!saved) return
    // Pictures chosen while filling in a new house go up now that it has an id.
    if (creating && pending.length) await onAddImages(pending, saved.id)
    closeForm()
  }

  const willRead = creating || (!fieldsEdited && postChanged)

  const form = (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs">
      <label className="flex flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2 font-medium text-slate-700">
          วางโพสต์หรือรายละเอียดบ้าน
          <span className="font-normal text-slate-500">(วางทั้งโพสต์ได้เลย AI จะใช้ตอบลูกค้า และอ่านประเภท ห้อง ทำเล ราคา ไปทำการ์ดบ้านให้)</span>
        </span>
        <textarea
          value={draft.details}
          onChange={event => update('details', event.target.value)}
          rows={9}
          maxLength={MAX_TEXT}
          required
          placeholder={POST_EXAMPLE}
          className={`${inputClass} resize-y leading-relaxed`}
        />
        <span className="self-end text-slate-500">{draft.details.length}/{MAX_TEXT}</span>
      </label>

      <label className="flex items-start gap-2">
        <input type="checkbox" checked={draft.priceVisible} onChange={event => update('priceVisible', event.target.checked)} className="mt-0.5" />
        <span>ให้ AI บอกราคาในโพสต์กับลูกค้าได้ <span className="text-slate-500">(ไม่ติ๊ก = AI ไม่เห็นบรรทัดที่พูดถึงราคา บอกแค่ประมาณ เช่น 2.1xxx ล้าน และให้ทีมงานแจ้งราคาจริง)</span></span>
      </label>

      {!creating && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setFieldsOpen(open => !open)}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-medium text-slate-700"
            aria-expanded={fieldsOpen}
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            ข้อมูลที่อ่านได้สำหรับการ์ดบ้าน
            <span className="font-normal text-slate-500">(แก้เองได้ถ้าอ่านผิด)</span>
            <ChevronDown className={`ml-auto h-3.5 w-3.5 transition ${fieldsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {fieldsOpen && (
            <div className="grid grid-cols-2 gap-2 border-t border-slate-200 p-2.5 sm:grid-cols-4">
              <Field label="ประเภท">
                <select value={TYPES.includes(draft.type) ? draft.type : ''} onChange={event => updateField('type', event.target.value)} className={inputClass}>
                  <option value="">ไม่ระบุ</option>
                  {TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="ชื่อบ้าน / โครงการ" className="col-span-2">
                <input value={draft.title} onChange={event => updateField('title', event.target.value)} maxLength={80} className={inputClass} />
              </Field>
              <Field label="ขาย / เช่า">
                <select value={draft.listing} onChange={event => updateField('listing', event.target.value)} className={inputClass}>
                  <option value="sale">ขาย</option>
                  <option value="rent">เช่า</option>
                </select>
              </Field>
              <Field label="ทำเล" className="col-span-2">
                <input value={draft.location} onChange={event => updateField('location', event.target.value)} maxLength={80} className={inputClass} />
              </Field>
              <Field label="ห้องนอน">
                <input value={draft.bedrooms} onChange={event => updateField('bedrooms', event.target.value)} inputMode="numeric" className={inputClass} />
              </Field>
              <Field label="ห้องน้ำ">
                <input value={draft.bathrooms} onChange={event => updateField('bathrooms', event.target.value)} inputMode="numeric" className={inputClass} />
              </Field>
              <Field label="ราคา (บาท)" className="col-span-2">
                <input value={draft.price} onChange={event => updateField('price', event.target.value)} inputMode="numeric" placeholder="เช่น 2,190,000" className={inputClass} />
              </Field>
              <Field label="หมายเหตุราคา" className="col-span-2">
                <input value={draft.priceNote} onChange={event => updateField('priceNote', event.target.value)} maxLength={40} placeholder="เช่น เริ่มต้น" className={inputClass} />
              </Field>
            </div>
          )}
        </div>
      )}

      {creating && (
        <div className="space-y-2">
          <p className="font-medium text-slate-600">รูปแบบบ้านของหลังนี้ <span className="font-normal text-slate-500">(ไม่บังคับ · จะอัปโหลดตอนกดบันทึก)</span></p>
          {previews.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {previews.map((item, index) => (
                <li key={item.url} className="relative">
                  <img src={item.url} alt={item.file.name} className="h-16 w-20 rounded-lg border border-slate-200 object-cover" />
                  <button
                    type="button"
                    onClick={() => setPending(current => current.filter((_, position) => position !== index))}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-1 text-slate-600 shadow ring-1 ring-slate-300 hover:bg-red-50 hover:text-red-700"
                    aria-label={`เอารูป ${item.file.name} ออก`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pending.length < MAX_IMAGES && (
            <ImageDropZone busy={busy} onFiles={addPending} label={`ลากรูปแบบบ้านมาวาง (สูงสุด ${MAX_IMAGES} รูป)`} />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy || !draft.details.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : (willRead && <Sparkles className="h-3 w-3" aria-hidden="true" />)}
          {busy && willRead ? 'AI กำลังอ่านโพสต์…' : `บันทึกบ้านนี้${creating && pending.length ? ` พร้อม ${pending.length} รูป` : ''}`}
        </button>
        <button type="button" onClick={closeForm} className="rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100">ยกเลิก</button>
        {!creating && postChanged && fieldsEdited && (
          <span className="text-slate-500">แก้ข้อมูลที่อ่านได้เองแล้ว จะบันทึกตามที่แก้ ไม่ให้ AI อ่านใหม่</span>
        )}
      </div>
    </form>
  )

  return (
    <section className="space-y-2" aria-label="บ้านที่กรอกเอง">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">ทรัพย์ที่แอดมินกรอกเอง</p>
        <span className="text-slate-500">(ใช้เมื่อไม่มีในฐานข้อมูล วางโพสต์ทีละหลัง)</span>
        {!creating && listings.length < MAX_LISTINGS && (
          <button type="button" onClick={startNew} disabled={busy} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            เพิ่มทรัพย์ที่กรอกเอง
          </button>
        )}
      </div>

      {creating && form}

      <ul className="space-y-2">
        {listings.map(listing => {
          const readBy = READ_BY[listing.readBy] || READ_BY.team
          return (
            <li key={listing.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
              <div className="space-y-2">
                {editingId === listing.id ? form : (
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-slate-800">
                        <span className={`font-medium ${readBy.className}`}>{readBy.label}:</span>{' '}
                        <span className="font-semibold">{readSummary(listing) || 'ยังอ่านข้อมูลไม่ได้'}</span>
                      </p>
                      {!listing.price && (
                        <p className="text-amber-700">ไม่พบราคาในโพสต์ AI จะบอกลูกค้าว่าทีมงานจะแจ้งราคา (ใส่ราคาในโพสต์ หรือกด แก้ไข เพื่อใส่เอง)</p>
                      )}
                      {listing.details && (
                        <details className="text-slate-600">
                          <summary className="cursor-pointer select-none text-blue-700">ดูโพสต์ที่วางไว้</summary>
                          <p className="mt-1 whitespace-pre-line break-words rounded-lg bg-slate-50 p-2 leading-relaxed">{listing.details}</p>
                        </details>
                      )}
                    </div>
                    <button type="button" onClick={() => startEdit(listing)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                      แก้ไข
                    </button>
                    <button type="button" onClick={() => onRemove(listing.id)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      ลบ
                    </button>
                  </div>
                )}
                {(listing.images || []).length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {listing.images.map(image => (
                      <li key={image.url} className="relative">
                        <a href={image.url} target="_blank" rel="noreferrer">
                          <img src={image.url} alt={image.caption || 'รูปแบบบ้าน'} className="h-16 w-20 rounded-lg border border-slate-200 object-cover" />
                        </a>
                        <button
                          type="button"
                          onClick={() => onRemoveImage(image.url, listing.id)}
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
                {(listing.images || []).length < MAX_IMAGES && (
                  <ImageDropZone
                    busy={busy}
                    onFiles={files => onAddImages(files, listing.id)}
                    label={`ลากรูปแบบบ้านของหลังนี้มาวาง (สูงสุด ${MAX_IMAGES} รูป)`}
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {!listings.length && !creating && (
        <p className="text-slate-500">ยังไม่มีทรัพย์ที่กรอกเอง กด &quot;เพิ่มทรัพย์ที่กรอกเอง&quot; แล้ววางโพสต์ของบ้านหลังนั้น พร้อมรูปแบบบ้าน</p>
      )}
    </section>
  )
}
