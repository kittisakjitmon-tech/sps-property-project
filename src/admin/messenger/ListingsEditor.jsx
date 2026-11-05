import { useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import ImageDropZone from './ImageDropZone'

const TYPES = ['บ้านเดี่ยว', 'บ้านแฝด', 'ทาวน์โฮม', 'คอนโด', 'ที่ดิน', 'อื่นๆ']
const MAX_LISTINGS = 10 // same limits as the server
const MAX_IMAGES = 6

const EMPTY = { title: '', type: 'บ้านเดี่ยว', listing: 'sale', location: '', bedrooms: '', bathrooms: '', price: '', priceNote: '', priceVisible: true, details: '' }

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100'

function toDraft(listing) {
  return {
    id: listing.id,
    title: listing.title || '',
    type: listing.type || 'บ้านเดี่ยว',
    listing: listing.listing === 'rent' ? 'rent' : 'sale',
    location: listing.location || '',
    bedrooms: listing.bedrooms ?? '',
    bathrooms: listing.bathrooms ?? '',
    price: listing.price ? String(listing.price) : '',
    priceNote: listing.priceNote || '',
    priceVisible: listing.priceVisible !== false,
    details: listing.details || '',
  }
}

function summary(listing) {
  const price = listing.price
    ? `${listing.price.toLocaleString('th-TH')} บาท${listing.listing === 'rent' ? '/เดือน' : ''}${listing.priceNote ? ` (${listing.priceNote})` : ''}${listing.priceVisible === false ? ' · ไม่บอกราคา' : ''}`
    : 'ไม่ได้ระบุราคา'
  return [listing.type, listing.title].filter(Boolean).join(' ') + ` · ${price}`
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

// Houses the team types in for this chat, for example from a post that shows several houses
// that are not in the property database. The AI answers from them, and sends the pictures
// of one house when the customer asks for them.
export default function ListingsEditor({ listings, busy, creating, onCreatingChange, onSave, onRemove, onAddImages, onRemoveImage }) {
  const [editingId, setEditingId] = useState(null) // a listing id | null (a new house is `creating`)
  const [draft, setDraft] = useState(EMPTY)
  const [pending, setPending] = useState([]) // pictures chosen while filling in a new house

  // Previews of the pending pictures; released when they change or the form goes away.
  const previews = useMemo(() => pending.map(file => ({ file, url: URL.createObjectURL(file) })), [pending])
  useEffect(() => () => previews.forEach(item => URL.revokeObjectURL(item.url)), [previews])

  function startNew() {
    setDraft(EMPTY)
    setPending([])
    setEditingId(null)
    onCreatingChange(true)
  }

  function startEdit(listing) {
    setDraft(toDraft(listing))
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

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const payload = { ...draft }
    if (creating) delete payload.id
    const saved = await onSave(payload)
    if (!saved) return
    // Pictures chosen while filling in a new house go up now that it has an id.
    if (creating && pending.length) await onAddImages(pending, saved.id)
    closeForm()
  }

  const form = (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2 rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs sm:grid-cols-4">
      <Field label="ประเภท">
        <select value={TYPES.includes(draft.type) ? draft.type : 'อื่นๆ'} onChange={event => update('type', event.target.value)} className={inputClass}>
          {TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </Field>
      <Field label="ชื่อบ้าน / โครงการ" className="col-span-2">
        <input value={draft.title} onChange={event => update('title', event.target.value)} maxLength={80} placeholder="เช่น โครงการสวนสวย แบบ A" className={inputClass} />
      </Field>
      <Field label="ขาย / เช่า">
        <select value={draft.listing} onChange={event => update('listing', event.target.value)} className={inputClass}>
          <option value="sale">ขาย</option>
          <option value="rent">เช่า</option>
        </select>
      </Field>
      <Field label="ทำเล" className="col-span-2">
        <input value={draft.location} onChange={event => update('location', event.target.value)} maxLength={80} placeholder="เช่น พานทอง ชลบุรี" className={inputClass} />
      </Field>
      <Field label="ห้องนอน">
        <input value={draft.bedrooms} onChange={event => update('bedrooms', event.target.value)} inputMode="numeric" className={inputClass} />
      </Field>
      <Field label="ห้องน้ำ">
        <input value={draft.bathrooms} onChange={event => update('bathrooms', event.target.value)} inputMode="numeric" className={inputClass} />
      </Field>
      <Field label="ราคา (บาท)">
        <input value={draft.price} onChange={event => update('price', event.target.value)} inputMode="numeric" placeholder="เช่น 2,490,000" className={inputClass} />
      </Field>
      <Field label="หมายเหตุราคา">
        <input value={draft.priceNote} onChange={event => update('priceNote', event.target.value)} maxLength={40} placeholder="เช่น เริ่มต้น" className={inputClass} />
      </Field>
      <label className="col-span-2 flex items-center gap-2 self-end pb-1.5">
        <input type="checkbox" checked={draft.priceVisible} onChange={event => update('priceVisible', event.target.checked)} />
        <span>ให้ AI บอกราคานี้กับลูกค้าได้ <span className="text-slate-500">(ไม่ติ๊ก = บอกแค่ประมาณ และให้ทีมงานแจ้งราคาจริง)</span></span>
      </label>
      <Field label="รายละเอียดเพิ่มเติม (ขนาด ที่จอดรถ โปรโมชัน เงื่อนไข)" className="col-span-2 sm:col-span-4">
        <textarea value={draft.details} onChange={event => update('details', event.target.value)} rows={3} maxLength={600} className={`${inputClass} resize-y leading-relaxed`} />
      </Field>
      {creating && (
        <div className="col-span-2 space-y-2 sm:col-span-4">
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
      <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-4">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50">
          {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
          บันทึกบ้านนี้{creating && pending.length ? ` พร้อม ${pending.length} รูป` : ''}
        </button>
        <button type="button" onClick={closeForm} className="rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100">ยกเลิก</button>
      </div>
    </form>
  )

  return (
    <section className="space-y-2" aria-label="บ้านที่กรอกเอง">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">ทรัพย์ที่แอดมินกรอกเอง</p>
        <span className="text-slate-500">(ใช้เมื่อไม่มีในฐานข้อมูล เช่น จากโพสต์ที่มีหลายหลัง)</span>
        {!creating && listings.length < MAX_LISTINGS && (
          <button type="button" onClick={startNew} disabled={busy} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            เพิ่มทรัพย์ที่กรอกเอง
          </button>
        )}
      </div>

      {creating && form}

      <ul className="space-y-2">
        {listings.map(listing => (
          <li key={listing.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="space-y-2">
              {editingId === listing.id ? form : (
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">{summary(listing)}</p>
                    {(listing.location || listing.bedrooms != null || listing.details) && (
                      <p className="mt-0.5 text-slate-600">
                        {[listing.location, listing.bedrooms != null ? `${listing.bedrooms} นอน` : '', listing.bathrooms != null ? `${listing.bathrooms} น้ำ` : ''].filter(Boolean).join(' · ')}
                        {listing.details ? `${listing.location || listing.bedrooms != null ? ' · ' : ''}${listing.details}` : ''}
                      </p>
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
        ))}
      </ul>
      {!listings.length && !creating && (
        <p className="text-slate-500">ยังไม่มีทรัพย์ที่กรอกเอง กด &quot;เพิ่มทรัพย์ที่กรอกเอง&quot; เพื่อใส่ประเภท ราคา รายละเอียด และรูปแบบบ้านทีละหลัง</p>
      )}
    </section>
  )
}
