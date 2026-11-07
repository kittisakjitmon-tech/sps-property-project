import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckCircle2, House, ImageOff, MapPin } from 'lucide-react'
import MoneyInput from '../../components/ui/MoneyInput'
import LocationAutocomplete from '../../components/LocationAutocomplete'
import { PROPERTY_TYPES, getPropertyLabel } from '../../constants/propertyTypes'
import { formatPropertyPrice } from '../../lib/priceFormat'
import { COMPLETION_LABELS } from './completionForm'
import useCompletionRequest from './useCompletionRequest'

const CONTROL = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-4 focus-visible:ring-blue-100 disabled:bg-slate-100'
const OPTIONAL = new Set(['area', 'usableAreaSqm', 'mapUrl', 'priceMax'])

function CompletionNotice({ message, onClose }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="completion-notice-title" className="w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-7 text-center shadow-xl backdrop:bg-slate-950/50">
    <CheckCircle2 className="mx-auto text-emerald-600" size={44} aria-hidden="true" />
    <h2 id="completion-notice-title" className="mt-4 text-xl font-semibold text-blue-950">{message}</h2>
    <p className="mt-3 leading-7 text-slate-600">คุณสามารถตรวจสอบและแก้ไขข้อมูลต่อได้</p>
    <button type="button" onClick={onClose} className="mt-6 min-h-12 w-full rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">โอเค</button>
  </dialog>
}

function LocationPicker({ form, missingFields, onChange }) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  function select(location) {
    const keys = ['province', 'district', 'subDistrict']
    if (keys.some(key => !missingFields.includes(key) && form.location?.[key] && form.location[key] !== location[key])) {
      setError('พื้นที่ที่เลือกไม่ตรงกับจังหวัดหรืออำเภอที่ผู้ส่งระบุ กรุณาเลือกอีกครั้ง')
      return
    }
    for (const key of keys) if (missingFields.includes(key)) onChange(key, location[key])
    if (missingFields.includes('locationDisplay')) onChange('locationDisplay', location.displayName)
    setError('')
  }
  return <div className="space-y-2">
    <label htmlFor="completion-area-search" className="block text-sm font-medium text-slate-700">ค้นหาพื้นที่เพื่อช่วยกรอกที่ตั้ง</label>
    <LocationAutocomplete id="completion-area-search" value={query} onChange={setQuery} onSelect={select} enableTypingAnimation={false} placeholder="พิมพ์ชื่อตำบล อำเภอ หรือจังหวัด" />
    {error && <p role="alert" className="text-sm leading-7 text-rose-700">{error}</p>}
  </div>
}

function PhotoGallery({ form }) {
  const photos = [...new Set([form.coverImageUrl, ...(form.images || [])].filter(Boolean))]
  const [selected, setSelected] = useState(photos[0])
  const [failed, setFailed] = useState(false)
  return <div>
    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-slate-200">
      {selected && !failed ? <img src={selected} referrerPolicy="no-referrer" alt="รูปบ้านที่ขอเติมข้อมูล" onError={() => setFailed(true)} className="h-full w-full object-contain" /> : <div className="flex flex-col items-center gap-3 text-slate-500"><ImageOff size={32} aria-hidden="true" /><span>เปิดรูปไม่สำเร็จ เลือกรูปอื่นด้านล่างได้</span></div>}
    </div>
    {photos.length > 1 && <div aria-label="รูปภาพบ้าน" className="mt-3 flex gap-2 overflow-x-auto pb-2">
      {photos.map((url, index) => <button type="button" key={url} onClick={() => { setSelected(url); setFailed(false) }} aria-label={`ดูรูปที่ ${index + 1}`} aria-pressed={selected === url}
        className={`h-20 w-24 shrink-0 overflow-hidden rounded-lg border-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${selected === url ? 'border-blue-800' : 'border-transparent'}`}>
        <img src={url} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover" />
      </button>)}
    </div>}
  </div>
}

function CompletionField({ field, value, onChange, required, landOnly }) {
  const label = COMPLETION_LABELS[field]
  const id = `complete-${field}`
  if (field === 'price' || field === 'priceMax') return <div className="space-y-4">
    <MoneyInput id={id} label={field === 'price' ? 'ราคาขาย / ค่าเช่า (บาท)' : label} value={value} required={field === 'price'} onValueChange={next => onChange(field, next)} placeholder="เช่น 2,890,000" helpText="กรอกจำนวนเงินบาทเต็ม หากเป็นค่าเช่าให้กรอกราคาต่อเดือน" />
  </div>
  const options = field === 'type' ? PROPERTY_TYPES.map(type => ({ value: type.id, label: type.label }))
    : field === 'listingType' ? [{ value: 'sale', label: 'ขาย' }, { value: 'rent', label: 'ให้เช่า' }] : null
  const numberField = ['bedrooms', 'bathrooms', 'area', 'usableAreaSqm'].includes(field)
  const needed = required && !(landOnly && ['bedrooms', 'bathrooms'].includes(field))
  return <div className="min-w-0">
    <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">{label}{needed ? <span className="ml-1 text-rose-600">*</span> : <span className="ml-2 font-normal text-slate-400">ถ้ามี</span>}</label>
    {options ? <select id={id} value={value} required={needed} onChange={event => onChange(field, event.target.value)} className={CONTROL}>
      <option value="">เลือก{label}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select> : <input id={id} value={value} required={needed} type={numberField ? 'number' : field === 'mapUrl' ? 'url' : 'text'} inputMode={numberField ? 'decimal' : undefined}
      min={numberField ? 0 : undefined} step={['bedrooms', 'bathrooms'].includes(field) ? 1 : numberField ? '0.01' : undefined}
      maxLength={numberField ? undefined : field === 'mapUrl' ? 2000 : 300}
      placeholder={field === 'mapUrl' ? 'https://maps.google.com/…' : field === 'locationDisplay' ? 'เช่น วัดราษฎร์สโมสร นาป่า' : undefined}
      onChange={event => onChange(field, event.target.value)} className={CONTROL} />}
  </div>
}

function CompletionContent({ token }) {
  const { request, loading, error, values, saving, save, reload, change, notice, dismissNotice } = useCompletionRequest(token)
  if (loading) return <div role="status" className="px-6 py-24 text-center text-slate-600">กำลังเปิดรูปและข้อมูลบ้าน…</div>
  if (!request) return <div className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="text-2xl font-semibold text-blue-950">เปิดลิงก์เติมข้อมูลบ้าน</h1><p role="alert" className="mt-4 leading-7 text-rose-700">{error}</p><button type="button" onClick={reload} className={`${CONTROL} mt-6 max-w-48 font-semibold text-blue-900`}>ลองเปิดอีกครั้ง</button><p className="mt-5 text-sm leading-7 text-slate-500">หากลิงก์หมดอายุหรือถูกปิด กรุณาขอลิงก์ใหม่จากผู้ส่ง</p></div>

  const completed = request.state === 'completed'
  const { form, missingFields } = request
  const type = values.type || form.type
  const knownLocation = form.locationDisplay || [form.location?.subDistrict, form.location?.district, form.location?.province].filter(Boolean).join(', ')
  const facts = [form.bedrooms !== '' && form.bedrooms != null && `${form.bedrooms} ห้องนอน`, form.bathrooms !== '' && form.bathrooms != null && `${form.bathrooms} ห้องน้ำ`, form.area !== '' && form.area != null && `${Number(form.area) / 4} ตร.ว.`].filter(Boolean)
  const requiredFields = missingFields.filter(field => !OPTIONAL.has(field))
  const optionalFields = missingFields.filter(field => OPTIONAL.has(field))
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    {notice && <CompletionNotice message={notice} onClose={dismissNotice} />}
    <div className="mb-8 max-w-2xl"><h1 className="text-2xl font-semibold leading-relaxed text-blue-950 sm:text-3xl">{completed ? 'ตรวจสอบและแก้ไขข้อมูลบ้าน' : 'เติมข้อมูลบ้านให้ครบ'}</h1><p className="mt-3 text-base leading-8 text-slate-600">{completed ? 'บ้านหลังนี้ลงข้อมูลครบและเผยแพร่แล้ว คุณสามารถแก้ไขข้อมูลที่เคยกรอกผ่านลิงก์นี้ได้' : 'ดูรูปและรายละเอียดด้านล่าง แล้วเติมช่องที่ขาด เมื่อกดบันทึก บ้านหลังนี้จะเผยแพร่บนเว็บไซต์ทันที'}</p></div>
    <div className="grid items-start gap-8 lg:grid-cols-[1.12fr_1fr] lg:gap-12">
      <section aria-label="รูปและข้อมูลเบื้องต้น" className="min-w-0">
        <PhotoGallery form={form} />
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold leading-9 text-blue-950">{form.title || getPropertyLabel(form.type) || 'ข้อมูลบ้านเบื้องต้น'}</h2>
          {knownLocation && <p className="flex items-start gap-2 leading-7 text-slate-600"><MapPin className="mt-1 shrink-0" size={18} aria-hidden="true" />{knownLocation}</p>}
          {Number(form.price) > 0 && <p className="text-2xl font-semibold text-blue-900">{formatPropertyPrice(form)}</p>}
          {!(Number(form.price) > 0) && Number(form.priceMax) > 0 && <p className="text-sm text-slate-600">ราคาสูงสุดที่ผู้ส่งระบุ {Number(form.priceMax).toLocaleString('th-TH')} บาท</p>}
          {facts.length > 0 && <p className="text-sm leading-7 text-slate-600">{facts.join(' · ')}</p>}
          {form.description && <div className="border-t border-slate-200 pt-5"><h3 className="font-semibold text-slate-800">รายละเอียดที่ผู้ส่งเตรียมไว้</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-8 text-slate-600">{form.description}</p></div>}
        </div>
      </section>
      <form onSubmit={save} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <fieldset disabled={saving} className="min-w-0 space-y-5">
          <legend className="mb-2 text-xl font-semibold text-blue-950">{completed ? 'ข้อมูลที่แก้ไขได้' : 'ข้อมูลที่ต้องเติม'}</legend>
          <p className="text-sm leading-7 text-slate-500">ตรวจข้อมูลให้ตรงกับบ้านในรูป ช่องที่มี * ต้องกรอกก่อนเผยแพร่</p>
          {missingFields.some(field => ['province', 'district', 'subDistrict'].includes(field)) && <LocationPicker form={form} missingFields={missingFields} onChange={change} />}
          {requiredFields.map(field => <CompletionField key={field} field={field} value={values[field] ?? ''} required landOnly={type === 'SPS-LD-ID'} onChange={change} />)}
          {!missingFields.includes('priceMax') && missingFields.includes('price') && (form.priceMax == null || form.priceMax === '') && <MoneyInput id="complete-priceMax" label="ราคาสูงสุด กรณีขายเป็นช่วงราคา" value={values.priceMax ?? ''} onValueChange={value => change('priceMax', value)} helpText="บ้านราคาเดียวเว้นช่องนี้ว่างได้" />}
          {optionalFields.length > 0 && <div className="space-y-5 border-t border-slate-200 pt-5"><h3 className="font-semibold text-slate-700">ข้อมูลประกอบเพิ่มเติม</h3>{optionalFields.map(field => <CompletionField key={field} field={field} value={values[field] ?? ''} onChange={change} />)}</div>}
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm leading-7 text-rose-800">{error}</p>}
          <p className="text-sm leading-7 text-slate-600">ข้อมูลที่กรอกจะบันทึกลงรายการบ้านและเผยแพร่ทันที สามารถเปิดลิงก์นี้เพื่อแก้ไขข้อมูลได้จนกว่าลิงก์จะหมดอายุหรือผู้ส่งปิดลิงก์</p>
          <button type="submit" disabled={saving} className="min-h-14 w-full rounded-xl bg-blue-900 px-5 py-4 font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-50">{saving ? 'กำลังบันทึก…' : completed ? 'บันทึกการแก้ไข' : 'บันทึกและเผยแพร่บ้าน'}</button>
        </fieldset>
      </form>
    </div>
  </div>
}

export default function PropertyCompletionPage() {
  const { hash } = useLocation()
  const token = hash.slice(1)
  return <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)]">
    <title>เติมข้อมูลบ้าน | SPS Property</title>
    <meta name="robots" content="noindex, nofollow" />
    <meta name="referrer" content="no-referrer" />
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-20 max-w-6xl items-center gap-3 px-4 sm:px-6"><House size={27} className="text-blue-900" aria-hidden="true" /><span className="font-semibold tracking-wide text-blue-950">SPS PROPERTY</span></div></header>
    <main><CompletionContent key={token} token={token} /></main>
  </div>
}
