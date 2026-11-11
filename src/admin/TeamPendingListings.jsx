import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { Building2, Check, Pencil, X } from 'lucide-react'
import { adminDb } from '../lib/firebase'
import { updatePropertyById } from '../lib/firestore'

// ประกาศที่ทีมงาน (member) ลงไว้ในระบบ รอแอดมินอนุมัติก่อนขึ้นเว็บ (properties.status = 'pending')
export default function TeamPendingListings() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => onSnapshot(
    query(collection(adminDb, 'properties'), where('status', '==', 'pending')),
    snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      setItems(list)
      setError('')
    },
    err => { console.error('โหลดประกาศทีมงานไม่สำเร็จ', err); setError('โหลดประกาศทีมงานที่รออนุมัติไม่สำเร็จ') },
  ), [])

  async function decide(property, approve) {
    let reason = ''
    if (approve) {
      if (!window.confirm(`อนุมัติ "${property.title || property.displayId}" ให้ขึ้นเว็บ?`)) return
    } else {
      const input = window.prompt('เหตุผลที่ไม่อนุมัติ (ไม่บังคับ):', '')
      if (input === null) return
      reason = input.trim() || 'ข้อมูลไม่ผ่านเกณฑ์การตรวจสอบ'
    }
    setProcessingId(property.id)
    try {
      await updatePropertyById(property.id, approve
        ? { status: 'available', availability: 'available', rejectionReason: null }
        : { status: 'rejected', availability: 'rejected', rejectionReason: reason }, adminDb)
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + (err?.message || ''))
    } finally {
      setProcessingId(null)
    }
  }

  if (!items.length && !error) return null

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-blue-900">ประกาศจากทีมงานรออนุมัติ ({items.length})</h2>
        <p className="text-sm text-slate-600">อนุมัติแล้วขึ้นเว็บทันที เปิดดูหรือแก้ไขก่อนได้ด้วยปุ่มแก้ไข</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {items.map(property => {
          const cover = property.coverImageUrl || property.images?.[0]
          const busy = processingId === property.id
          return (
            <li key={property.id} className="flex flex-wrap items-center gap-3 p-3">
              {cover
                ? <img src={cover} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                : <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100"><Building2 className="h-6 w-6 text-slate-300" /></div>}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{property.title || '(ไม่มีชื่อ)'}</p>
                <p className="truncate text-sm text-slate-500">
                  {[property.displayId, property.locationDisplay, property.price ? `${Number(property.price).toLocaleString('th-TH')} บาท` : ''].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link to={`/sps-internal-admin/properties/${property.id}/edit`} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50">
                  <Pencil className="h-4 w-4" /> แก้ไข
                </Link>
                <button type="button" disabled={busy} onClick={() => decide(property, true)} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-green-600 px-3 text-sm text-white hover:bg-green-700 disabled:opacity-50">
                  <Check className="h-4 w-4" /> อนุมัติ
                </button>
                <button type="button" disabled={busy} onClick={() => decide(property, false)} aria-label="ไม่อนุมัติ" className="inline-flex min-h-10 items-center rounded-lg bg-red-600 px-3 text-white hover:bg-red-700 disabled:opacity-50">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
