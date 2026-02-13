import { useState, useEffect, useMemo } from 'react'
import { getAppointmentsSnapshot, updateAppointmentStatus } from '../lib/firestore'
import { Search, Phone, Calendar, Clock } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'pending', label: '🟡 รอยืนยัน' },
  { value: 'confirmed', label: '🔵 ยืนยันแล้ว' },
  { value: 'completed', label: '🟢 สำเร็จ' },
  { value: 'cancelled', label: '🔴 ยกเลิก' },
]

const SORT_BY_APPOINTMENT = 'appointment'
const SORT_BY_CREATED = 'created'

function formatAppointmentDateTime(dateStr, timeStr) {
  if (!dateStr) return '-'
  const [y, m, d] = String(dateStr).split('-')
  if (!y || !m || !d) return dateStr
  const time = timeStr ? ` ${String(timeStr).slice(0, 5)}` : ''
  return `${d}/${m}/${y?.slice(-2) || ''}${time}`
}

function formatCreatedAt(ts) {
  if (!ts?.toDate) return '-'
  const d = ts.toDate()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Returns YYYY-MM-DD for today in local timezone */
function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getAppointmentSortKey(a) {
  const date = a.date || ''
  const time = a.time || '00:00'
  return `${date}T${time}`
}

export default function LeadsInbox() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState(SORT_BY_APPOINTMENT)
  const [updatingId, setUpdatingId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const unsub = getAppointmentsSnapshot((list) => {
      setAppointments(Array.isArray(list) ? list : [])
      setLoading(false)
    })
    return () => {
      if (typeof unsub === 'function') unsub()
    }
  }, [])

  const todayStr = useMemo(() => getTodayStr(), [])

  const stats = useMemo(() => {
    const total = appointments.length
    const pending = appointments.filter((a) => (a.status || 'pending') === 'pending').length
    const today = appointments.filter((a) => {
      const s = a.status || 'pending'
      return s !== 'cancelled' && a.date === todayStr
    }).length
    return { total, pending, today }
  }, [appointments, todayStr])

  const filteredAndSorted = useMemo(() => {
    let list = [...appointments]

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      list = list.filter(
        (a) =>
          (a.contactName || '').toLowerCase().includes(q) ||
          (a.propertyTitle || '').toLowerCase().includes(q)
      )
    }

    if (statusFilter) {
      list = list.filter((a) => (a.status || 'pending') === statusFilter)
    }

    if (sortBy === SORT_BY_APPOINTMENT) {
      list.sort((a, b) => {
        const ka = getAppointmentSortKey(a)
        const kb = getAppointmentSortKey(b)
        return ka.localeCompare(kb)
      })
    } else {
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0
        const tb = b.createdAt?.toMillis?.() ?? 0
        return tb - ta
      })
    }

    return list
  }, [appointments, searchTerm, statusFilter, sortBy])

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id)
    try {
      await updateAppointmentStatus(id, newStatus)
      showToast('อัปเดตสถานะเรียบร้อย')
    } catch (err) {
      console.error(err)
      showToast('เกิดข้อผิดพลาด ' + (err?.message || ''), 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-900">จัดการนัดหมาย</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'นัดหมายวันนี้', value: stats.today, icon: Calendar, color: 'text-blue-600' },
          { label: 'รอยืนยัน', value: stats.pending, icon: Clock, color: 'text-amber-600' },
          { label: 'นัดหมายทั้งหมด', value: stats.total, icon: Calendar },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center ${color || 'text-blue-600'}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหา ชื่อลูกค้า หรือ ชื่อทรัพย์..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-300"
        >
          <option value="">ทุกสถานะ</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSortBy(SORT_BY_APPOINTMENT)}
            className={`px-4 py-2 rounded-lg border ${sortBy === SORT_BY_APPOINTMENT ? 'bg-blue-50 border-blue-300 text-blue-900' : 'border-slate-300 hover:bg-slate-50'}`}
          >
            ใกล้นัดขึ้นก่อน
          </button>
          <button
            type="button"
            onClick={() => setSortBy(SORT_BY_CREATED)}
            className={`px-4 py-2 rounded-lg border ${sortBy === SORT_BY_CREATED ? 'bg-blue-50 border-blue-300 text-blue-900' : 'border-slate-300 hover:bg-slate-50'}`}
          >
            มาใหม่ล่าสุด
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">กำลังโหลด...</div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="p-12 text-center text-slate-500">ไม่พบนัดหมาย</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">วันเวลานัด</th>
                  <th className="px-4 py-3 font-medium">ลูกค้า</th>
                  <th className="px-4 py-3 font-medium">ทรัพย์ที่สนใจ</th>
                  <th className="px-4 py-3 font-medium">วันที่สร้าง</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((a) => {
                  const isToday = a.date === todayStr && (a.status || 'pending') !== 'cancelled'
                  return (
                    <tr
                      key={a.id}
                      className={`border-t border-slate-100 hover:bg-slate-50/50 ${isToday ? 'bg-amber-50/70' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {formatAppointmentDateTime(a.date, a.time)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-800">{a.contactName || '-'}</p>
                          <a
                            href={`tel:${(a.tel || '').replace(/\D/g, '')}`}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {a.tel || '-'}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-slate-800 line-clamp-2">{a.propertyTitle || '-'}</p>
                          {(a.propertyId || a.propertyID) && (
                            <a
                              href={`/properties/${a.propertyId || a.propertyID}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              ดูประกาศ
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatCreatedAt(a.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={a.status || 'pending'}
                          onChange={(e) => handleStatusChange(a.id, e.target.value)}
                          disabled={updatingId === a.id}
                          className="text-sm px-2 py-1 rounded border border-slate-300"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[300] px-6 py-3 rounded-xl shadow-lg ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
