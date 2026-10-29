import { useEffect, useMemo, useRef, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { Search, SlidersHorizontal, X, MapPin, BedDouble, Bath, Ruler, ArrowRight, RotateCcw, ImageOff, Building2 } from 'lucide-react'
import { db } from '../../lib/firebase'
import { getPropertyLabel } from '../../constants/propertyTypes'
import { countPropertyStatuses } from '../../lib/propertyManagement'
import { formatPropertyPrice } from '../../lib/priceFormat'
import MoneyInput from '../../components/ui/MoneyInput'
import PropertyQuotation from '../quotation/PropertyQuotation'
import { agentProperty, filterAgentProperties } from './agentProperties'
import logo from '../../assets/logo.png'

const EMPTY = { search: '', type: '', status: '', deal: '', condition: '', min: '', max: '', sort: 'latest' }
const LABELS = { available: 'พร้อมขาย / เช่า', reserved: 'ติดจอง', sold: 'ขายแล้ว' }
const BADGES = { available: 'bg-emerald-50 text-emerald-800 ring-emerald-200', reserved: 'bg-amber-50 text-amber-800 ring-amber-200', sold: 'bg-slate-100 text-slate-600 ring-slate-200' }
const CONTROL = 'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300'
const QUOTE_BUTTON = 'inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-900 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:ring-4 focus-visible:ring-blue-200'
const digits = value => value == null || value === '' ? '-' : Number(value).toLocaleString('th-TH', { maximumFractionDigits: 2 })

function Facts({ property }) {
  return <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
    <span className="inline-flex items-center gap-1.5"><BedDouble size={16}/>{digits(property.bedrooms)} นอน</span>
    <span className="inline-flex items-center gap-1.5"><Bath size={16}/>{digits(property.bathrooms)} น้ำ</span>
    <span className="inline-flex items-center gap-1.5"><Ruler size={16}/>{property.area !== '' ? digits(Number(property.area)/4) : '-'} ตร.ว.</span>
  </div>
}
function PropertyPhoto({ url, title, className }) {
  const [failed, setFailed] = useState(false)
  return url && !failed ? <img src={url} alt={title || 'รูปทรัพย์'} loading="lazy" onError={()=>setFailed(true)} className={className}/> : <div className={`${className} flex items-center justify-center bg-slate-100 text-slate-300`}><ImageOff size={40}/></div>
}
function PropertyDetails({ property, onClose }) {
  const dialog = useRef(null)
  const photos = [...new Set([property.coverImageUrl, ...property.images].filter(Boolean))]
  const [photo, setPhoto] = useState(photos.find(url=>url!==property.coverImageUrl) || photos[0])
  useEffect(()=> { const node=dialog.current;node.showModal();return()=>node.close() },[])
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="agent-property-title" className="m-auto max-h-[94dvh] w-[min(800px,96vw)] rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-slate-950/60">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4"><p className="text-sm font-semibold text-blue-900">{property.displayId || 'รายละเอียดทรัพย์'}</p><button type="button" aria-label="ปิดรายละเอียด" onClick={onClose} className="rounded-full bg-slate-100 p-3"><X size={20}/></button></div>
    <div className="space-y-5 p-5">
      <PropertyPhoto key={photo} url={photo} title={property.title} className="h-64 w-full rounded-2xl bg-slate-50 object-contain sm:h-80"/>
      {photos.length>1 && <div className="flex gap-2 overflow-x-auto pb-2" aria-label="รูปภาพทรัพย์">{photos.map((url,i)=><button type="button" key={url} onClick={()=>setPhoto(url)} aria-label={`ดูรูปที่ ${i+1}`} aria-pressed={photo===url} className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${photo===url?'border-blue-700':'border-transparent'}`}><img src={url} alt="" className="h-full w-full object-cover" loading="lazy"/></button>)}</div>}
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${BADGES[property.status]}`}>{LABELS[property.status]}</span>
      <h2 id="agent-property-title" className="text-xl font-bold leading-relaxed text-slate-900">{property.title || getPropertyLabel(property.type)}</h2>
      <p className="flex items-start gap-2 text-sm leading-relaxed text-slate-500"><MapPin className="mt-0.5 shrink-0" size={16}/>{property.locationDisplay || 'สอบถามทำเลเพิ่มเติม'}</p>
      <p className="text-2xl font-bold text-blue-900">{formatPropertyPrice(property)}</p><Facts property={property}/>
      {property.usableAreaSqm !== '' && <p className="text-sm text-slate-600">พื้นที่ใช้สอย {digits(property.usableAreaSqm)} ตร.ม.</p>}
      <section className="border-t pt-5"><h3 className="mb-3 font-semibold text-slate-900">รายละเอียดและของแถม</h3><p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{property.description || 'สอบถามรายละเอียดเพิ่มเติมก่อนออกใบเสนอราคา'}</p></section>
    </div>
    <div className="sticky bottom-0 flex border-t bg-white p-4"><PropertyQuotation property={property} buttonClassName={QUOTE_BUTTON}/></div>
  </dialog>
}
export default function AgentPropertiesPage() {
  const [properties,setProperties]=useState([]), [loading,setLoading]=useState(true), [error,setError]=useState('')
  const [filters,setFilters]=useState(EMPTY), [more,setMore]=useState(false), [limit,setLimit]=useState(12), [selected,setSelected]=useState(null), [retry,setRetry]=useState(0)
  useEffect(()=> {
    document.title='บ้านสำหรับเอเจนต์ | SPS Property Solution'
    const unsubscribe=onSnapshot(collection(db,'properties'),snapshot=> {
      setProperties(snapshot.docs.map(doc=>agentProperty({...doc.data(),id:doc.id})).filter(Boolean));setLoading(false);setError('')
    },()=> {setLoading(false);setError('โหลดรายการไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่')})
    return unsubscribe
  },[retry])
  const change=(key,value)=> {setFilters(prev=>({...prev,[key]:value}));setLimit(12)}
  const counts=useMemo(()=>countPropertyStatuses(properties),[properties])
  const types=useMemo(()=>[...new Set(properties.map(p=>p.type).filter(Boolean))].sort((a,b)=>getPropertyLabel(a).localeCompare(getPropertyLabel(b),'th')),[properties])
  const invalidBudget=filters.min!=='' && filters.max!=='' && Number(filters.min)>Number(filters.max)
  const filtered=useMemo(()=>filterAgentProperties(properties,filters,getPropertyLabel),[properties,filters])
  const reset=()=> {setFilters({...EMPTY});setLimit(12)}
  const active=Object.entries(filters).some(([key,value])=>key!=='sort' && value!=='')
  return <div className="min-h-screen bg-[#f4f7fb] pb-12">
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6"><a href="/agent" className="flex min-w-0 items-center gap-3" aria-label="SPS Property Solution หน้าเอเจนต์"><img src={logo} alt="" className="h-9 w-14 object-contain"/><div><p className="text-sm font-bold tracking-tight text-blue-950 sm:text-base">SPS Property Solution</p><p className="text-[11px] text-slate-500">ค้นหาบ้าน · เสนอราคาให้ลูกค้า</p></div></a><span className="shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-900">สำหรับเอเจนต์</span></div>
    </header>
    <main className="mx-auto max-w-6xl space-y-5 px-4 pt-6 sm:px-6 sm:pt-8">
      <section><div className="mb-5 flex items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">หาบ้านที่ใช่ให้ลูกค้า</h1><p className="mt-2 text-sm leading-6 text-slate-500">ดูทรัพย์ เลือกรูป แล้วออกใบเสนอราคาได้ทันที</p></div><span className="hidden rounded-2xl bg-white p-3 text-blue-700 sm:block"><Building2 size={28}/></span></div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="ยอดรวมทรัพย์ทั้งหมด ไม่ขึ้นกับตัวกรอง">{['available','reserved','sold'].map(status=><button key={status} type="button" onClick={()=>change('status',filters.status===status?'':status)} aria-pressed={filters.status===status} className={`rounded-2xl border p-3 text-left transition sm:p-4 ${filters.status===status?'border-blue-700 bg-blue-50 ring-1 ring-blue-700':'border-slate-200 bg-white hover:border-blue-300'}`}><span className="text-[11px] text-slate-500 sm:text-sm">{LABELS[status]}</span><strong className="mt-1 block text-2xl font-bold tabular-nums text-blue-950">{loading?'…':counts[status] || 0}</strong></button>)}</div>
      </section>
      <section aria-label="ค้นหาทรัพย์สำหรับเอเจนต์" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block"><span className="sr-only">ค้นหาทรัพย์</span><span className="relative block"><Search size={19} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="search" value={filters.search} onChange={e=>change('search',e.target.value)} placeholder="ค้นหารหัสบ้าน ทำเล หรือประเภท" className={`${CONTROL} bg-slate-50 pl-10`}/></span></label>
        <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">ยอดด้านบนเป็นทรัพย์ทั้งหมด</p><button type="button" onClick={()=>setMore(prev=>!prev)} aria-expanded={more} aria-controls="agent-filters" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-50 px-3 text-sm font-semibold text-blue-900"><SlidersHorizontal size={17}/>ตัวกรอง{active && <span className="h-2 w-2 rounded-full bg-blue-600"/>}</button></div>
        {more && <div id="agent-filters" className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <label className="text-xs font-medium text-slate-600">ประเภททรัพย์<select value={filters.type} onChange={e=>change('type',e.target.value)} className={`${CONTROL} mt-1`}><option value="">ทุกประเภท</option>{types.map(type=><option key={type} value={type}>{getPropertyLabel(type)}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600">ขาย / เช่า<select value={filters.deal} onChange={e=>change('deal',e.target.value)} className={`${CONTROL} mt-1`}><option value="">ทั้งหมด</option><option value="sale">ขาย</option><option value="rent">เช่า / ผ่อนตรง</option></select></label>
          <label className="text-xs font-medium text-slate-600">สภาพบ้าน<select value={filters.condition} onChange={e=>change('condition',e.target.value)} className={`${CONTROL} mt-1`}><option value="">ทั้งหมด</option><option value="มือ 1">มือ 1</option><option value="มือ 2">มือ 2</option></select></label>
          <MoneyInput label="งบต่ำสุด (บาท)" value={filters.min} onValueChange={value=>change('min',value)} placeholder="ไม่จำกัด"/>
          <MoneyInput label="งบสูงสุด (บาท)" value={filters.max} onValueChange={value=>change('max',value)} placeholder="ไม่จำกัด" error={invalidBudget?'ต่ำกว่างบขั้นต่ำ':undefined}/>
          <label className="text-xs font-medium text-slate-600">เรียงตาม<select value={filters.sort} onChange={e=>change('sort',e.target.value)} className={`${CONTROL} mt-1`}><option value="latest">เพิ่มล่าสุด</option><option value="updated">แก้ไขล่าสุด</option><option value="price-asc">ราคาน้อยไปมาก</option><option value="price-desc">ราคามากไปน้อย</option></select></label>
          {filters.deal==='' && (filters.min || filters.max) && <p className="col-span-full text-xs text-slate-500">กรุณาเลือกขาย / เช่า เพื่อเทียบราคาขายหรือค่าเช่าประเภทเดียวกัน</p>}
        </div>}
      </section>
      <div className="flex items-center justify-between gap-3"><p role="status" className="text-sm font-semibold text-slate-700">{loading?'กำลังโหลดทรัพย์…':`พบ ${filtered.length.toLocaleString('th-TH')} รายการ`}{filters.status && <span className="ml-2 text-xs font-normal text-slate-500">{LABELS[filters.status]}</span>}</p>{active && <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-blue-800"><RotateCcw size={14}/>ล้างตัวกรอง</button>}</div>
      {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}<button type="button" className="ml-3 min-h-11 underline" onClick={()=>{setLoading(true);setRetry(prev=>prev+1)}}>ลองใหม่</button></div> : loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="กำลังโหลด">{[1,2,3].map(i=><div key={i} className="h-96 animate-pulse rounded-3xl bg-slate-200/60"/>)}</div> : !filtered.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><Search className="mx-auto mb-3 text-slate-300" size={36}/><h2 className="font-semibold">ไม่พบทรัพย์ที่ตรงกับเงื่อนไข</h2><p className="mt-2 text-sm text-slate-500">ลองลดตัวกรองหรือเปลี่ยนคำค้นหา</p><button type="button" onClick={reset} className="mt-4 min-h-11 rounded-xl bg-blue-900 px-5 text-sm font-semibold text-white">ดูทรัพย์ทั้งหมด</button></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.slice(0,limit).map(property=><article key={property.id} className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
        <button type="button" onClick={()=>setSelected(property.id)} aria-label={`ดูรายละเอียด ${property.displayId || property.title}`} className="relative block w-full bg-slate-100 text-left"><PropertyPhoto url={property.coverImageUrl || property.images[0]} title={property.title} className="aspect-[4/3] w-full object-contain"/><span className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm ring-1 ${BADGES[property.status]}`}>{LABELS[property.status]}</span><span className="absolute bottom-3 right-3 rounded-lg bg-slate-950/70 px-2 py-1 text-[11px] font-medium text-white">{property.displayId || 'ทรัพย์พร้อมดู'}</span></button>
        <div className="flex flex-1 flex-col gap-3 p-4"><p className="text-[11px] font-medium text-blue-700">{getPropertyLabel(property.type)}{property.propertyCondition?` · ${property.propertyCondition}`:''}</p><h2 className="line-clamp-2 text-base font-semibold leading-7 text-slate-900">{property.title || getPropertyLabel(property.type)}</h2><p className="flex items-start gap-1.5 text-xs leading-5 text-slate-500"><MapPin size={14} className="mt-0.5 shrink-0"/>{property.locationDisplay || 'สอบถามทำเลเพิ่มเติม'}</p><Facts property={property}/><p className="mt-auto pt-2 text-xl font-bold text-blue-950">{formatPropertyPrice(property)}</p><div className="flex gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={()=>setSelected(property.id)} className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-700">รายละเอียด<ArrowRight size={14}/></button><PropertyQuotation property={property} buttonLabel="ใบเสนอราคา" buttonClassName={QUOTE_BUTTON}/></div></div>
      </article>)}</div>}
      {!loading && filtered.length>limit && <div className="pt-3 text-center"><button type="button" onClick={()=>setLimit(prev=>prev+12)} className="min-h-12 rounded-xl border border-slate-300 bg-white px-7 text-sm font-semibold text-blue-900">ดูเพิ่มอีก {Math.min(12,filtered.length-limit)} รายการ</button><p className="mt-2 text-xs text-slate-400">แสดง {Math.min(limit,filtered.length)} จาก {filtered.length} รายการ</p></div>}
      <footer className="pt-5 text-center text-xs leading-6 text-slate-400">SPS Property Solution<br/>โปรดตรวจสถานะ ราคา และสิทธิประโยชน์ก่อนเสนอขาย</footer>
    </main>
    {selected && properties.find(p=>p.id===selected) && <PropertyDetails key={selected} property={properties.find(p=>p.id===selected)} onClose={()=>setSelected(null)}/>}
  </div>
}
