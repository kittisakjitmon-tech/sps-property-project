import { useState, useEffect, useMemo } from 'react'
import { Download } from 'lucide-react'
import { getActivitiesSnapshot } from '../lib/firestore'
import { getActivityBadgeClass, getUsernameFromEmail, formatRoleDisplay } from '../data/activityLogsMock'
import { getActionDisplay, getActionCategory } from '../data/activityActionMap'

const ACTIVITY_TYPES = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
]

function formatTimestamp(ts) {
  if (!ts?.toDate) return '-'
  const d = ts.toDate()
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

function actionMatchesFilter(action, filterType) {
  if (!filterType) return true
  const a = (action || '').toUpperCase()
  if (filterType === 'create') return a.includes('CREATE')
  if (filterType === 'update') return a.includes('UPDATE') || a.includes('ADD')
  if (filterType === 'delete') return a.includes('DELETE')
  if (filterType === 'login') return a.includes('LOGIN')
  return true
}

function Avatar({ email }) {
  const username = getUsernameFromEmail(email)
  const letter = username?.charAt(0)?.toUpperCase() || '?'
  return (
    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-semibold text-sm shrink-0">
      {letter}
    </div>
  )
}

function UserDisplay({ email, role }) {
  const username = getUsernameFromEmail(email)
  const roleDisplay = formatRoleDisplay(role)
  return (
    <div className="cursor-help" title={email}>
      <span className="font-semibold text-slate-800">{username}</span>
      <span className="text-slate-400 font-normal"> ({roleDisplay})</span>
    </div>
  )
}

export default function ActivityLogsPage() {
  const [activities, setActivities] = useState([])
  const [filterType, setFilterType] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [limitCount, setLimitCount] = useState(20)

  useEffect(() => {
    const unsub = getActivitiesSnapshot(setActivities, limitCount)
    return () => unsub()
  }, [limitCount])

  const uniqueUsers = useMemo(() => {
    const emails = [...new Set(activities.map((a) => a.user?.email).filter(Boolean))]
    return emails.map((email) => {
      const user = activities.find((a) => a.user?.email === email)?.user
      return {
        email,
        label: `${getUsernameFromEmail(email)} (${formatRoleDisplay(user?.role)})`,
      }
    })
  }, [activities])

  const filteredLogs = useMemo(() => {
    return activities.filter((log) => {
      const matchType = actionMatchesFilter(log.action, filterType)
      const matchUser = !filterUser || log.user?.email === filterUser
      return matchType && matchUser
    })
  }, [activities, filterType, filterUser])

  const handleExportCSV = () => {
    alert('Export CSV (Mock) - ฟีเจอร์นี้จะเชื่อมต่อกับ API ในอนาคต')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 tracking-tight">
          บันทึกกิจกรรมระบบ
        </h1>
        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors border border-slate-200"
        >
          <Download className="h-5 w-5" />
          Export CSV
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">ประเภทกิจกรรม:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {ACTIVITY_TYPES.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">ผู้ใช้งาน:</label>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[180px]"
          >
            <option value="">ทุกคน</option>
            {uniqueUsers.map((u) => (
              <option key={u.email} value={u.email}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Target</th>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t border-gray-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar email={log.user?.email} />
                      <UserDisplay email={log.user?.email} role={log.user?.role} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${getActivityBadgeClass(getActionCategory(log.action))}`}
                    >
                      {getActionDisplay(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{log.target || '-'}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="px-6 py-12 text-center text-slate-500">
            {activities.length === 0 ? 'ยังไม่มีรายการกิจกรรม' : 'ไม่พบรายการที่ตรงกับตัวกรอง'}
          </div>
        )}
        {activities.length >= limitCount && (
          <div className="px-6 py-4 border-t border-gray-100 bg-slate-50 flex justify-center">
            <button
              onClick={() => setLimitCount((prev) => prev + 20)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition shadow-sm text-sm font-medium"
            >
              โหลดเพิ่มเติม (Load More)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
