import { useEffect, useRef, useState } from 'react'
import { FileText, X, Download, Loader2 } from 'lucide-react'
import { makeQuotationSnapshot, quotationGifts } from './quotationData'

const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300'
const money = value => value === '' || value == null ? 'ไม่ระบุ' : `${Number(value).toLocaleString('th-TH')} บาท`
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }

function QuotationDialog({ property, newFiles, onClose }) {
  const dialog = useRef(null), resultUrl = useRef(null), alive = useRef(true)
  const [images, setImages] = useState(() => (property.images || []).filter(url => typeof url === 'string'))
  const [details, setDetails] = useState(() => ({
    customerName: '', customerPhone: '', sellerName: property.agentContact?.name || '', sellerPhone: property.agentContact?.phone || '',
    date: today(), photo: images.find(url => url !== property.coverImageUrl) || images[0] || '',
    gifts: quotationGifts(property.description, property.project),
    notes: 'ราคาและรายการของแถมตามที่ระบุ ณ วันที่ออกเอกสาร\nโปรดยืนยันสถานะทรัพย์ รายการของแถม และค่าใช้จ่ายที่เกี่ยวข้องก่อนจอง\nเฟอร์นิเจอร์และเครื่องใช้ในภาพไม่รวม เว้นแต่ระบุไว้ในรายการของแถม',
  }))
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null)
  useEffect(() => {
    const urls = newFiles.map(file => URL.createObjectURL(file))
    const remote = (property.images || []).filter(url => typeof url === 'string')
    const all = [...remote, ...urls]
    setImages(all)
    setDetails(prev => ({ ...prev, photo: remote.includes(prev.photo) ? prev.photo : all.find(url => url !== property.coverImageUrl) || all[0] || '' }))
    return () => urls.forEach(URL.revokeObjectURL)
  }, [newFiles, property.images, property.coverImageUrl])
  useEffect(() => {
    alive.current = true
    const node = dialog.current
    node.showModal()
    return () => { alive.current = false; node.close(); if(resultUrl.current) URL.revokeObjectURL(resultUrl.current) }
  }, [])
  const update = (key, value) => {
    setDetails(prev=>({...prev,[key]:value}));setError('');setResult(null)
    if(resultUrl.current) { URL.revokeObjectURL(resultUrl.current);resultUrl.current=null }
  }
  const generate = async event => {
    event.preventDefault();setError('');setBusy(true)
    try {
      const snapshot = makeQuotationSnapshot(property, details)
      const { renderQuotation } = await import('./quotationPdf')
      const output = await renderQuotation(snapshot)
      if (!alive.current) return
      if(resultUrl.current) URL.revokeObjectURL(resultUrl.current)
      resultUrl.current=URL.createObjectURL(output.blob)
      setResult({...output, url:resultUrl.current, filename:`ใบเสนอราคา-${snapshot.code.replace(/[^A-Za-z0-9_-]/g,'_')}-${snapshot.date}.pdf`})
    } catch (err) { if(alive.current) setError(err.message || 'สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่') }
    finally { if(alive.current) setBusy(false) }
  }
  return <dialog ref={dialog} aria-labelledby="quotation-heading" onCancel={onClose} className="m-auto max-h-[92dvh] w-[min(1100px,96vw)] rounded-2xl bg-slate-50 p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
      <div><h2 id="quotation-heading" className="text-xl font-bold text-blue-900">ทำใบเสนอราคา</h2><p className="mt-1 text-sm text-slate-500">{property.displayId || property.propertyId} · SPS Property Solution</p></div>
      <button type="button" aria-label="ปิดใบเสนอราคา" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
    </div>
    <form onSubmit={generate} className="grid gap-6 p-5 lg:grid-cols-2">
      <div className="space-y-4">
        <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">ใช้ข้อมูลทรัพย์ขณะเปิดหน้าต่างนี้ การทำใบเสนอราคาไม่เปลี่ยนข้อมูลทรัพย์</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">ชื่อลูกค้า *<input autoFocus required maxLength={80} className={inputClass} value={details.customerName} onChange={e=>update('customerName',e.target.value)} /></label>
          <label className="text-sm font-medium">โทรศัพท์ลูกค้า<input type="tel" maxLength={30} className={inputClass} value={details.customerPhone} onChange={e=>update('customerPhone',e.target.value)} /></label>
          <label className="text-sm font-medium">ผู้เสนอราคา *<input required maxLength={80} className={inputClass} value={details.sellerName} onChange={e=>update('sellerName',e.target.value)} /></label>
          <label className="text-sm font-medium">โทรศัพท์ผู้เสนอราคา<input type="tel" maxLength={30} className={inputClass} value={details.sellerPhone} onChange={e=>update('sellerPhone',e.target.value)} /></label>
          <label className="text-sm font-medium">วันที่ออกเอกสาร *<input required type="date" className={inputClass} value={details.date} onChange={e=>update('date',e.target.value)} /></label>
        </div>
        <label className="block text-sm font-medium">ของแถมและสิทธิประโยชน์<textarea rows={7} maxLength={10000} className={inputClass} value={details.gifts} onChange={e=>update('gifts',e.target.value)} placeholder="ตรวจรายการของแถมจากทรัพย์ หรือระบุเพิ่มเติมที่นี่" /><span className="mt-1 block text-xs font-normal text-slate-500">ดึงจากหัวข้อของแถมในรายละเอียด โปรดตรวจรายการและเงื่อนไขก่อนออกเอกสาร</span></label>
        <label className="block text-sm font-medium">หมายเหตุและเงื่อนไข<textarea rows={4} maxLength={5000} className={inputClass} value={details.notes} onChange={e=>update('notes',e.target.value)} /></label>
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">ราคาเสนอขาย{property.listingType === 'rent' ? ' / เช่า' : 'หลังส่วนลด'}</p><p className="mt-1 text-2xl font-bold text-blue-900">{money(property.price)}{property.priceMax !== '' && property.priceMax != null && Number(property.priceMax)!==Number(property.price) ? ` - ${money(property.priceMax)}` : ''}</p>
          {property.bankPrice !== '' && property.bankPrice != null && <p className="mt-2 text-sm text-slate-500">ราคาหน้าสัญญา / ราคาประเมิน {money(property.bankPrice)}</p>}
        </div>
        <fieldset><legend className="mb-2 text-sm font-semibold">เลือกรูปบ้าน 1 รูป *</legend><p className="mb-3 text-xs text-slate-500">ใช้รูปที่เห็นตัวบ้านครบ ไม่มีชื่อโครงการติดอยู่ในภาพ ระบบวางภาพเต็มโดยไม่ครอป</p>
          {!images.length && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">ทรัพย์นี้ยังไม่มีรูป กรุณาเพิ่มรูปในหน้าแก้ไขก่อน</p>}
          <div className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto p-1">{images.map((url,i)=><label key={`${url}-${i}`} className={`relative cursor-pointer rounded-xl border-2 p-1 ${details.photo===url?'border-blue-700 bg-blue-50':'border-slate-200 bg-white'}`}>
            <input className="absolute left-2 top-2" type="radio" name="quotation-photo" aria-label={`เลือกรูปที่ ${i+1}`} checked={details.photo===url} onChange={()=>update('photo',url)} />
            <img src={url} alt={`รูปทรัพย์ ${i+1}`} className="h-20 w-full rounded-lg object-contain" loading="lazy" />
          </label>)}</div>
        </fieldset>
        {details.photo && !result && <div className="rounded-xl border border-slate-200 bg-white p-3"><img src={details.photo} alt="รูปที่เลือกสำหรับใบเสนอราคา" className="max-h-64 w-full object-contain" /></div>}
        {result && <div className="rounded-xl border border-slate-200 bg-white p-3"><p role="status" className="mb-2 text-sm text-emerald-800">สร้างแล้ว {result.pages} หน้า · ข้อมูลและราคาเก็บอยู่ใน PDF ฉบับนี้</p><img src={result.preview} alt="ตัวอย่างใบเสนอราคาหน้าแรก" className="w-full" /><a href={result.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-blue-800 underline">เปิดดู PDF ทุกหน้า</a></div>}
      </div>
      <div className="sticky bottom-0 col-span-full flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div><p className="text-xs text-slate-500">A4 หน้าเดียว · ใช้โลโก้เว็บ ไม่แสดงชื่อโครงการ ค่าคอมมิชชั่น หรือบรรทัดส่วนลดพิเศษ</p>{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>
        <div className="flex gap-2"><button type="submit" disabled={busy || !images.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<FileText className="h-4 w-4"/>}{busy?'กำลังสร้าง PDF…':'สร้างตัวอย่าง PDF'}</button>
          {result && <a href={result.url} download={result.filename} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900"><Download className="h-4 w-4"/>ดาวน์โหลด PDF</a>}
        </div>
      </div>
    </form>
  </dialog>
}

export default function PropertyQuotation({ property, newFiles = [], buttonClassName, buttonLabel = 'ทำใบเสนอราคา' }) {
  const [draft, setDraft] = useState(null)
  return <>
    <button type="button" onClick={()=>setDraft({ property: structuredClone(property), newFiles: [...newFiles] })} className={buttonClassName || "mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 font-semibold text-white hover:bg-blue-800"}><FileText className="h-5 w-5 shrink-0"/>{buttonLabel}</button>
    {draft && <QuotationDialog property={draft.property} newFiles={draft.newFiles} onClose={()=>setDraft(null)} />}
  </>
}
