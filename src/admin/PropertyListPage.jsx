import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useAdminAuth } from '../context/AdminAuthContext'
import { adminDb } from '../lib/firebase'
import { formatPropertyPrice } from '../lib/priceFormat'
import { getPropertyLabel } from '../constants/propertyTypes'
import { countPropertyStatuses, filterByBudget, hasCoordinates, hasImages, propertyStatus, searchProperty, sortProperties } from '../lib/propertyManagement'
import MoneyInput from '../components/ui/MoneyInput'
import PropertyQuotation from '../features/quotation/PropertyQuotation'
import { propertyDateParts } from '../lib/inputFormatting'
import { Plus, Search, ImageOff, Pencil, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

const EMPTY = { search: '', type: '', listingType: '', condition: '', availability: '', project: '', min: '', max: '', quality: '', sort: 'latest', page: 1 }
const STATUSES = { available: 'ว่าง', reserved: 'ติดจอง', sold: 'ขายแล้ว', pending: 'รออนุมัติ', unavailable: 'ไม่ว่าง' }
const COLORS = { available: 'bg-green-50 text-green-800', reserved: 'bg-amber-50 text-amber-800', sold: 'bg-blue-50 text-blue-800', pending: 'bg-orange-50 text-orange-800' }
const CONTROL = 'w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-800 shadow-sm transition hover:border-slate-400 focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400'

function restore(key) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(key))
    if (!stored || typeof stored !== 'object') return EMPTY
    return Object.fromEntries(Object.entries(EMPTY).map(([name, fallback]) => [name, name === 'page'
      ? Number.isInteger(stored.page) && stored.page > 0 ? stored.page : 1
      : typeof stored[name] === 'string' ? stored[name] : fallback]))
  } catch { return EMPTY }
}

function Filter({ label, children, ...props }) {
  const id = useId()
  return <div className="min-w-0"><label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label><select id={id} className={CONTROL} {...props}>{children}</select></div>
}

const SORT_COLUMNS = [
  { label: 'ทรัพย์ / ทำเล', description: 'ชื่อทรัพย์', ascending: 'title-asc', descending: 'title-desc', first: 'title-asc' },
  { label: 'รายละเอียด', description: 'ประเภททรัพย์', ascending: 'type-asc', descending: 'type-desc', first: 'type-asc' },
  { label: 'สถานะ / ความครบถ้วน', description: 'สถานะ', ascending: 'status-asc', descending: 'status-desc', first: 'status-asc' },
  { label: 'ราคา', description: 'ราคา', ascending: 'price-asc', descending: 'price-desc', first: 'price-asc' },
  { label: 'วันที่เพิ่ม', description: 'วันที่เพิ่ม', ascending: 'created-asc', descending: 'latest', first: 'latest' },
  { label: 'แก้ไขล่าสุด', description: 'วันที่แก้ไข', ascending: 'updated-asc', descending: 'updated', first: 'updated' },
]

function SortHeader({ column, sort, onSort }) {
  const ascending = sort === column.ascending
  const descending = sort === column.descending
  const active = ascending || descending
  const next = ascending ? column.descending : descending ? column.ascending : column.first
  const Icon = ascending ? ArrowUp : descending ? ArrowDown : ArrowUpDown
  const direction = next === column.ascending ? 'จากน้อยไปมาก' : 'จากมากไปน้อย'
  return <th scope="col" aria-sort={ascending ? 'ascending' : descending ? 'descending' : 'none'} className="whitespace-nowrap px-2 py-1">
    <button type="button" onClick={() => onSort(next)} title={`เรียงตาม${column.description} ${direction}`} aria-label={`เรียงตาม${column.description} ${direction}`} className={`inline-flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${active ? 'font-semibold text-blue-800' : 'text-slate-600'}`}>
      {column.label}<Icon size={15} className={active ? 'shrink-0 text-blue-700' : 'shrink-0 text-slate-400'} aria-hidden="true" />
    </button>
  </th>
}

function PropertyDateCell({ value }) {
  const parts = propertyDateParts(value)
  return <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">{parts ? <time dateTime={parts.iso} title={`${parts.date} ${parts.time} น. (เวลาไทย)`}><span className="block">{parts.date}</span><span className="mt-1 block text-xs tabular-nums text-slate-400">{parts.time} น.</span></time> : <span className="text-xs text-slate-400">ไม่ระบุ</span>}</td>
}

function PropertyList({ user, role }) {
  const storageKey = `sps-property-filters:${user.uid}`
  const [filters, setFilters] = useState(() => restore(storageKey))
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [brokenImages, setBrokenImages] = useState({})
  const change = (name, value) => setFilters(previous => ({ ...previous, [name]: value, page: 1, ...(name === 'listingType' ? { condition: '' } : {}) }))

  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(filters)) } catch { /* Browsing works when storage is unavailable. */ }
  }, [filters, storageKey])

  useEffect(() => {
    const source = collection(adminDb, 'properties')
    const request = role === 'agent' ? query(source, where('createdBy', '==', user.uid)) : source
    return onSnapshot(request, snapshot => {
      setProperties(snapshot.docs.map(document => ({ ...document.data(), id: document.id })))
      setLoading(false)
      setError('')
    }, () => {
      setLoading(false)
      setError('โหลดรายการทรัพย์ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อหรือสิทธิ์บัญชี')
    })
  }, [role, user.uid, retry])

  const projects = useMemo(() => [...new Set(properties.map(p => p.project?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')), [properties])
  const types = useMemo(() => [...new Set(properties.map(p => p.type).filter(Boolean))].sort((a, b) => getPropertyLabel(a).localeCompare(getPropertyLabel(b), 'th')), [properties])
  const invalidBudget = filters.min !== '' && filters.max !== '' && Number(filters.min) > Number(filters.max)
  const filtered = useMemo(() => {
    const matching = properties.filter(property => {
      if (!searchProperty(property, filters.search, getPropertyLabel(property.type))) return false
      if (filters.type && property.type !== filters.type) return false
      const listingType = property.listingType || (property.isRental ? 'rent' : 'sale')
      if (filters.listingType && listingType !== filters.listingType) return false
      if (filters.condition) {
        const condition = listingType === 'sale' ? property.propertyCondition || property.propertySubStatus : property.subListingType || (property.directInstallment ? 'installment_only' : 'rent_only')
        if (condition !== filters.condition) return false
      }
      if (filters.availability && propertyStatus(property) !== filters.availability) return false
      if (filters.project && property.project?.trim() !== filters.project) return false
      if (filters.quality === 'coordinates' && hasCoordinates(property)) return false
      if (filters.quality === 'images' && hasImages(property)) return false
      return true
    })
    return sortProperties(filterByBudget(matching, filters.min, filters.max), filters.sort, getPropertyLabel)
  }, [properties, filters])
  const counts = useMemo(() => countPropertyStatuses(properties), [properties])
  const pages = Math.max(1, Math.ceil(filtered.length / 10))
  const page = Math.min(filters.page, pages)
  const rows = filtered.slice((page - 1) * 10, page * 10)
  const active = Object.entries(filters).some(([key, value]) => !['page', 'sort'].includes(key) && value !== '')

  return <div className="mx-auto max-w-[1440px] space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-blue-900 sm:text-3xl">จัดการทรัพย์</h1><p className="mt-1 text-sm text-slate-500">ทั้งหมด {properties.length.toLocaleString('th-TH')} รายการ · ค้นหาและดูแลข้อมูลบ้านของคุณ · ยอดสรุปไม่เปลี่ยนตามตัวกรอง</p></div>
      <div className="flex flex-wrap gap-2"><Link to="/agent" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-900">เปิดหน้าเอเจนต์</Link><Link to="/sps-internal-admin/properties/new" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600"><Plus size={18} />เพิ่มทรัพย์</Link></div>
    </header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="จำนวนทรัพย์ทั้งหมด แยกตามสถานะ ไม่ขึ้นกับตัวกรอง">
      {['available', 'reserved', 'sold', 'pending'].map(status => <button key={status} onClick={() => change('availability', filters.availability === status ? '' : status)} aria-pressed={filters.availability === status} className={`rounded-xl border p-4 text-left transition hover:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-700 ${filters.availability === status ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white'}`}><span className="text-sm text-slate-600">{STATUSES[status]}</span><strong className="mt-1 block text-2xl text-blue-900">{counts[status] || 0}</strong></button>)}
    </div>
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="ค้นหาและกรองทรัพย์">
      <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">ค้นหาทรัพย์</span><span className="relative block"><Search size={19} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" className={`${CONTROL} pl-10`} placeholder="รหัส ชื่อบ้าน โครงการ จังหวัด อำเภอ ตำบล หรือแท็ก" value={filters.search} onChange={e => change('search', e.target.value)} /></span></label>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Filter label="ประเภททรัพย์" value={filters.type} onChange={e => change('type', e.target.value)}><option value="">ทั้งหมด</option>{types.map(type => <option key={type} value={type}>{getPropertyLabel(type)}</option>)}</Filter>
        <Filter label="ขาย / เช่า" value={filters.listingType} onChange={e => change('listingType', e.target.value)}><option value="">ทั้งหมด</option><option value="sale">ขาย</option><option value="rent">เช่า / ผ่อนตรง</option></Filter>
        <Filter label={filters.listingType === 'rent' ? 'รูปแบบเช่า' : 'สภาพบ้าน'} disabled={!filters.listingType} value={filters.condition} onChange={e => change('condition', e.target.value)}><option value="">{filters.listingType ? 'ทั้งหมด' : 'เลือกขาย / เช่าก่อน'}</option>{(filters.listingType === 'rent' ? [['rent_only', 'เช่า'], ['installment_only', 'ผ่อนตรง']] : [['มือ 1', 'มือ 1'], ['มือ 2', 'มือ 2']]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Filter>
        <Filter label="โครงการ" value={filters.project} onChange={e => change('project', e.target.value)}><option value="">ทั้งหมด</option>{projects.map(project => <option key={project}>{project}</option>)}</Filter>
        <MoneyInput label="ราคาต่ำสุด (บาท)" value={filters.min} placeholder="ไม่จำกัด" onValueChange={value => change('min', value)} />
        <MoneyInput label="ราคาสูงสุด (บาท)" value={filters.max} placeholder="ไม่จำกัด" onValueChange={value => change('max', value)} error={invalidBudget ? 'ต้องไม่น้อยกว่าราคาต่ำสุด' : undefined} />
        <Filter label="สถานะ" value={filters.availability} onChange={e => change('availability', e.target.value)}><option value="">ทั้งหมด</option>{Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Filter>
        <Filter label="ข้อมูลที่ต้องเติม" value={filters.quality} onChange={e => change('quality', e.target.value)}><option value="">ทั้งหมด</option><option value="coordinates">ยังไม่มีพิกัด</option><option value="images">ยังไม่มีรูป</option></Filter>
      </div>
      {invalidBudget && <p role="alert" className="text-sm text-red-700">ราคาต่ำสุดต้องไม่มากกว่าราคาสูงสุด</p>}
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="text-sm text-slate-600" role="status">{loading ? 'กำลังโหลด…' : `พบ ${filtered.length.toLocaleString('th-TH')} รายการ${active ? ' ตามตัวกรอง' : ''}`}</p>
        <div className="flex flex-wrap items-end gap-3"><Filter label="เรียงตาม" value={filters.sort} onChange={e => change('sort', e.target.value)}><option value="latest">เพิ่มล่าสุด</option><option value="updated">แก้ไขล่าสุด</option><option value="price-asc">ราคาน้อย → มาก</option><option value="price-desc">ราคามาก → น้อย</option><option value="created-asc">เพิ่มก่อน → หลัง</option><option value="updated-asc">แก้ไขก่อน → หลัง</option><option value="title-asc">ชื่อทรัพย์ ก → ฮ</option><option value="title-desc">ชื่อทรัพย์ ฮ → ก</option><option value="type-asc">ประเภท ก → ฮ</option><option value="type-desc">ประเภท ฮ → ก</option><option value="status-asc">สถานะ ว่าง → ไม่ว่าง</option><option value="status-desc">สถานะ ไม่ว่าง → ว่าง</option></Filter><button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50" onClick={() => setFilters({ ...EMPTY })}><RotateCcw size={16} />ล้างตัวกรอง</button></div>
      </div>
      {!filters.listingType && (filters.min || filters.max) && <p className="text-xs text-slate-500">ผลค้นหารวมราคาขายและค่าเช่าต่อเดือน เลือกขาย / เช่าเพื่อเทียบงบประเภทเดียวกัน</p>}
    </section>
    {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">{error}<button className="ml-3 min-h-11 underline" onClick={() => { setLoading(true); setRetry(value => value + 1) }}>ลองใหม่</button></div> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-sm"><caption className="sr-only">รายการทรัพย์ตามผลค้นหา</caption><thead className="bg-slate-50 text-left text-slate-600"><tr>{SORT_COLUMNS.map(column => <SortHeader key={column.label} column={column} sort={filters.sort} onSort={value => change('sort', value)} />)}<th scope="col" className="whitespace-nowrap px-4 py-3">จัดการ</th></tr></thead><tbody>
        {rows.map(property => {
          const status = propertyStatus(property)
          const location = typeof property.location === 'object' && property.location ? [...new Set([property.location.subDistrict, property.location.district, property.location.province].filter(Boolean))].join(', ') : property.locationDisplay || property.location || ''
          const cover = property.coverImageUrl || property.images?.[0]
          return <tr key={property.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
            <td className="min-w-[290px] px-4 py-4"><div className="flex gap-3">{cover && !brokenImages[cover] ? <img src={cover} alt={`ภาพ ${property.title || 'ทรัพย์'}`} width="88" height="72" loading="lazy" className="h-[72px] w-[88px] shrink-0 rounded-lg object-cover" onError={() => setBrokenImages(previous => ({ ...previous, [cover]: true }))} /> : <span className="flex h-[72px] w-[88px] shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400" aria-label="ไม่มีภาพตัวอย่าง"><ImageOff size={24} /></span>}<div><span className="text-xs text-slate-500">{property.displayId || property.propertyId || 'ยังไม่มีรหัส'}</span><Link className="mt-1 block font-semibold text-blue-900 hover:underline" to={`/sps-internal-admin/properties/${property.id}/edit`}>{property.title || 'ยังไม่มีชื่อทรัพย์'}</Link><p className="mt-1 text-xs text-slate-500">{location || 'ยังไม่ระบุทำเล'}</p>{property.project && <p className="mt-1 text-xs text-indigo-700">{property.project}</p>}</div></div></td>
            <td className="min-w-[150px] px-4 py-4"><p>{getPropertyLabel(property.type)}</p><p className="mt-1 text-xs text-slate-500">{property.bedrooms ?? '–'} นอน · {property.bathrooms ?? '–'} น้ำ</p><p className="mt-1 text-xs text-slate-500">{Number(property.area) > 0 ? `${Number(property.area) / 4} ตร.ว.` : 'ยังไม่ระบุพื้นที่'}</p></td>
            <td className="min-w-[165px] px-4 py-4"><span className={`inline-block rounded-md px-2 py-1 text-xs ${COLORS[status] || 'bg-slate-100 text-slate-700'}`}>{STATUSES[status] || status}</span>{(property.propertyCondition || property.propertySubStatus) && <span className="ml-1 text-xs text-slate-500">{property.propertyCondition || property.propertySubStatus}</span>}{!hasCoordinates(property) && <p className="mt-2 text-xs text-amber-800">ยังไม่มีพิกัด</p>}{!hasImages(property) && <p className="mt-1 text-xs text-amber-800">ยังไม่มีรูป</p>}</td>
            <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-800">{formatPropertyPrice(property)}</td>
            <PropertyDateCell value={property.createdAt} /><PropertyDateCell value={property.updatedAt} />
            <td className="px-4 py-4"><div className="flex flex-col items-start gap-2"><PropertyQuotation property={property} buttonLabel="ใบเสนอราคา" buttonClassName="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800" /><Link to={`/sps-internal-admin/properties/${property.id}/edit`} aria-label={`แก้ไข ${property.title || 'ทรัพย์'}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-50 px-3 text-blue-900 hover:bg-blue-100"><Pencil size={16} />แก้ไข</Link></div></td>
          </tr>
        })}
        {!rows.length && <tr><td colSpan={7} className="p-10 text-center text-slate-500">{loading ? 'กำลังโหลดทรัพย์…' : active ? 'ไม่พบทรัพย์ตามเงื่อนไข ลองล้างตัวกรองหรือขยายช่วงราคา' : 'ยังไม่มีทรัพย์ เริ่มด้วยปุ่มเพิ่มทรัพย์ด้านบน'}</td></tr>}
      </tbody></table></div>
      {!!filtered.length && <nav aria-label="หน้ารายการทรัพย์" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4"><p className="text-sm text-slate-500">แสดง {(page - 1) * 10 + 1}–{Math.min(page * 10, filtered.length)} จาก {filtered.length} รายการ</p><div className="flex items-center gap-3"><button disabled={page === 1} className="min-h-11 rounded-lg border px-3 disabled:opacity-40" onClick={() => setFilters(previous => ({ ...previous, page: page - 1 }))}>ก่อนหน้า</button><span className="text-sm">หน้า {page} / {pages}</span><button disabled={page === pages} className="min-h-11 rounded-lg border px-3 disabled:opacity-40" onClick={() => setFilters(previous => ({ ...previous, page: page + 1 }))}>ถัดไป</button></div></nav>}
    </div>}
  </div>
}

export default function PropertyListPage() {
  const { user, userRole, loading } = useAdminAuth()
  if (loading) return <p className="p-6">กำลังตรวจสอบบัญชี…</p>
  if (!user || !['super_admin', 'admin', 'agent'].includes(userRole)) return <p role="alert" className="p-6 text-red-700">บัญชีนี้ไม่มีสิทธิ์จัดการทรัพย์</p>
  return <PropertyList key={user.uid} user={user} role={userRole} />
}
