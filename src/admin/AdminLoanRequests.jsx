import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getLoanRequestsSnapshot,
  updateLoanRequestStatus,
  deleteLoanRequest,
} from '../lib/firestore'
import {
  FileText,
  Search,
  Phone,
  MessageCircle,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  CreditCard,
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'pending', label: '🟡 รอตรวจสอบ' },
  { value: 'contacted', label: '🔵 ติดต่อแล้ว' },
  { value: 'submitted', label: '🟢 ยื่นกู้แล้ว' },
  { value: 'approved', label: '✅ อนุมัติ' },
  { value: 'rejected', label: '🔴 ไม่ผ่าน' },
]

const OCCUPATION_LABELS = {
  government: 'ข้าราชการ',
  employee: 'พนักงานประจำ',
  business: 'ธุรกิจส่วนตัว',
  freelance: 'รับจ้างอิสระ',
  '': '-',
}

const CREDIT_LABELS = {
  normal: 'ปกติดี',
  delayed: 'เคยล่าช้า',
  bureau_closed: 'ติดบูโร-ปิดแล้ว',
  bureau_open: 'ติดบูโร-ยังไม่ปิด',
  '': '-',
}

function formatDate(ts) {
  if (!ts?.toDate) return '-'
  const d = ts.toDate()
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear()).slice(-2)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${h}:${m}`
}

function getFinancialHealth(income, debt) {
  const inc = parseFloat(income) || 0
  const d = parseFloat(debt) || 0
  if (inc <= 0) return { label: '-', color: 'bg-slate-100 text-slate-700' }
  const ratio = d / inc
  if (ratio <= 0.5 && inc > d * 2) return { label: 'Potential', color: 'bg-emerald-100 text-emerald-800' }
  if (ratio > 0.6) return { label: 'High Risk', color: 'bg-red-100 text-red-800' }
  return { label: 'Moderate', color: 'bg-amber-100 text-amber-800' }
}

function getLineAddUrl(lineId) {
  if (!lineId || typeof lineId !== 'string') return null
  const tid = lineId.trim().replace(/^@/, '')
  if (!tid) return null
  return `https://line.me/R/ti/p/${encodeURIComponent(tid)}`
}

export default function AdminLoanRequests() {
  const { isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortNewest, setSortNewest] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [detailModal, setDetailModal] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!isSuperAdmin()) {
      setAccessDenied(true)
      setLoading(false)
      return
    }

    const unsub = getLoanRequestsSnapshot((list) => {
      setRequests(Array.isArray(list) ? list : [])
      setLoading(false)
    })

    return () => {
      if (typeof unsub === 'function') unsub()
    }
  }, [isSuperAdmin])

  const filteredAndSorted = useMemo(() => {
    let list = [...requests]

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      list = list.filter(
        (r) =>
          (r.nickname || '').toLowerCase().includes(q) ||
          (r.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
          (r.lineId || '').toLowerCase().includes(q)
      )
    }

    if (statusFilter) {
      list = list.filter((r) => (r.status || 'pending') === statusFilter)
    }

    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0
      const tb = b.createdAt?.toMillis?.() ?? 0
      return sortNewest ? tb - ta : ta - tb
    })

    return list
  }, [requests, searchTerm, statusFilter, sortNewest])

  const stats = useMemo(() => {
    const total = requests.length
    const pending = requests.filter((r) => (r.status || 'pending') === 'pending').length
    const approved = requests.filter((r) => r.status === 'approved').length
    const totalValue = requests
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + (parseFloat(r.approvedAmount) || 0), 0)

    return { total, pending, approved, totalValue }
  }, [requests])

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id)
    try {
      await updateLoanRequestStatus(id, newStatus)
      showToast('อัปเดตสถานะเรียบร้อย')
    } catch (err) {
      console.error(err)
      showToast('เกิดข้อผิดพลาด ' + (err?.message || ''), 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('ต้องการลบคำขอนี้หรือไม่?')) return
    setDeletingId(id)
    try {
      await deleteLoanRequest(id)
      setDetailModal(null)
      showToast('ลบเรียบร้อย')
    } catch (err) {
      console.error(err)
      showToast('เกิดข้อผิดพลาด ' + (err?.message || ''), 'error')
    } finally {
      setDeletingId(null)
    }
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-600 mb-4">เฉพาะ Super Admin เท่านั้นที่เข้าถึงหน้านี้ได้</p>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="px-6 py-2 rounded-lg bg-blue-900 text-white hover:bg-blue-800"
        >
          กลับแดชบอร์ด
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-900">จัดการคำขอกู้สินเชื่อ</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'คำขอทั้งหมด', value: stats.total, icon: FileText },
          { label: 'รอตรวจสอบ', value: stats.pending, icon: FileText, color: 'text-amber-600' },
          { label: 'อนุมัติวงเงินแล้ว', value: stats.approved, icon: CreditCard, color: 'text-emerald-600' },
          {
            label: 'ยอดวงเงินรวม',
            value: stats.totalValue > 0 ? `${(stats.totalValue / 1e6).toFixed(2)} ล้าน` : '-',
            icon: CreditCard,
          },
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
            placeholder="ค้นหา ชื่อ, เบอร์, Line ID..."
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
        <button
          type="button"
          onClick={() => setSortNewest((v) => !v)}
          className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
        >
          {sortNewest ? 'มาใหม่ล่าสุด' : 'เก่าสุด'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">กำลังโหลด...</div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="p-12 text-center text-slate-500">ไม่พบข้อมูล</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Financial</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((r) => {
                  const health = getFinancialHealth(r.income, r.monthlyDebt)
                  const lineUrl = getLineAddUrl(r.lineId)
                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-800">{r.nickname || '-'}</p>
                          <a
                            href={`tel:${(r.phone || '').replace(/\D/g, '').replace(/^0/, '0')}`}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {r.phone || '-'}
                          </a>
                          {r.lineId ? (
                            lineUrl ? (
                              <a
                                href={lineUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-green-600 hover:underline"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                {r.lineId}
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 text-sm text-slate-500">
                                <MessageCircle className="h-3.5 w-3.5" />
                                {r.lineId}
                              </span>
                            )
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <span className="text-slate-600">
                            {(r.income || 0).toLocaleString('th-TH')} / {(r.monthlyDebt || 0).toLocaleString('th-TH')}
                          </span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${health.color}`}>
                            {health.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={r.status || 'pending'}
                          onChange={(e) => handleStatusChange(r.id, e.target.value)}
                          disabled={updatingId === r.id}
                          className="text-sm px-2 py-1 rounded border border-slate-300"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailModal(r)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            disabled={deletingId === r.id}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                            title="ลบ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-start border-b">
              <h3 className="text-lg font-bold text-blue-900">รายละเอียดคำขอ</h3>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <p><span className="text-slate-500">วันที่:</span> {formatDate(detailModal.createdAt)}</p>
              <p><span className="text-slate-500">ชื่อเล่น:</span> {detailModal.nickname || '-'}</p>
              <p>
                <span className="text-slate-500">เบอร์โทร:</span>{' '}
                <a href={`tel:${detailModal.phone}`} className="text-blue-600 hover:underline">{detailModal.phone || '-'}</a>
              </p>
              {detailModal.lineId && (
                <p>
                  <span className="text-slate-500">Line ID:</span>{' '}
                  {getLineAddUrl(detailModal.lineId) ? (
                    <a href={getLineAddUrl(detailModal.lineId)} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                      {detailModal.lineId}
                    </a>
                  ) : (
                    detailModal.lineId
                  )}
                </p>
              )}
              <p><span className="text-slate-500">อาชีพ:</span> {OCCUPATION_LABELS[detailModal.occupation] || detailModal.occupation}</p>
              <p><span className="text-slate-500">รายได้/เดือน:</span> {(detailModal.income || 0).toLocaleString('th-TH')} บาท</p>
              <p><span className="text-slate-500">ภาระหนี้/เดือน:</span> {(detailModal.monthlyDebt || 0).toLocaleString('th-TH')} บาท</p>
              <p><span className="text-slate-500">ประวัติเครดิต:</span> {CREDIT_LABELS[detailModal.creditHistory] || detailModal.creditHistory}</p>
              <p><span className="text-slate-500">สถานะ:</span> {STATUS_OPTIONS.find((o) => o.value === (detailModal.status || 'pending'))?.label || detailModal.status}</p>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => handleDelete(detailModal.id)}
                disabled={deletingId === detailModal.id}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

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
