import { Link } from 'react-router-dom'
import {
  Building2,
  Users,
  DollarSign,
  FileCheck,
  Plus,
  ChevronRight,
  Phone,
  Activity,
  DatabaseZap,
  Loader2,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useDashboardData } from '../hooks/useDashboardData'
import { getActivityBadgeClass, getUsernameFromEmail, formatRoleDisplay } from '../data/activityLogsMock'
import { getActionDisplay, getActionCategory } from '../data/activityActionMap'
import { useState } from 'react'
import { getPropertiesOnce, db, writeBatch } from '../lib/firestore'
import { PROPERTY_TYPES } from '../constants/propertyTypes'
import { doc, serverTimestamp } from 'firebase/firestore'

// ─── Stat Card Component ────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, iconBg, href }) {
  const formattedValue =
    typeof value === 'number' && value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)} ล้าน`
      : value.toLocaleString('th-TH')

  const content = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-600 truncate">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">{formattedValue}</p>
      </div>
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="h-6 w-6 text-blue-900" />
      </div>
    </div>
  )

  const cardClass =
    'bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200'

  if (href) {
    return (
      <Link to={href} className={`block ${cardClass}`}>
        {content}
      </Link>
    )
  }

  return <div className={cardClass}>{content}</div>
}

// ─── Avatar Placeholder ────────────────────────────────────────────────────
function LeadAvatar({ name }) {
  const initial = name?.charAt(0) || '?'
  return (
    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-semibold text-sm shrink-0">
      {initial}
    </div>
  )
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex justify-between">
        <div className="h-9 w-48 bg-slate-200 rounded-lg" />
        <div className="h-10 w-32 bg-slate-200 rounded-xl" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="h-4 w-24 bg-slate-200 rounded mb-4" />
            <div className="h-9 w-20 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 h-[380px]">
          <div className="h-5 w-40 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-32 bg-slate-100 rounded mb-6" />
          <div className="h-64 bg-slate-100 rounded" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 h-[380px]">
          <div className="h-5 w-36 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-28 bg-slate-100 rounded mb-6" />
          <div className="h-64 bg-slate-100 rounded-full mx-auto max-w-[200px]" />
        </div>
      </div>

      {/* Table + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="h-14 px-6 border-b border-gray-100 flex items-center justify-between">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-48 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="h-14 px-6 border-b border-gray-100 flex items-center justify-between">
            <div className="h-5 w-28 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50">
                <div className="h-4 w-full bg-slate-200 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    loading,
    stats,
    leadsChartData,
    propertyTypeData,
    recentLeads,
    recentActivities,
    pendingProperties,
  } = useDashboardData()

  const [migrating, setMigrating] = useState(false)
  const [migrationDone, setMigrationDone] = useState(false)

  const handleMigration = async () => {
    if (!window.confirm('คุณต้องการรันสคริปต์ปรับปรุงระบบ ID (PropertyTypes & DisplayId) หรือไม่?')) return
    setMigrating(true)
    try {
      const allProps = await getPropertiesOnce()
      if (!allProps || allProps.length === 0) {
        alert('ไม่มีข้อมูลอสังหาริมทรัพย์')
        return
      }

      // Reverse map helper
      const getPropertyIdByLabel = (label) => {
        const found = PROPERTY_TYPES.find(pt => pt.label === label)
        return found ? found.id : null
      }

      // Prefix extractor helper logic matching the new propertyId.js
      const getPrefixForTypeLocal = (type) => {
        if (type && type.endsWith('-ID')) return type.slice(0, -2)
        const found = PROPERTY_TYPES.find((pt) => pt.label === type)
        if (found && found.id.endsWith('-ID')) return found.id.slice(0, -2)
        return 'SPS-X-'
      }

      let count = 0
      const batch = writeBatch(db)

      // Find global max sequence among all properties
      let globalMaxSequence = 0
      allProps.forEach((p) => {
        const idToCheck = p.displayId || p.propertyId || ''
        const match = idToCheck.match(/\d+$/)
        if (match) {
          const num = parseInt(match[0], 10)
          if (num > globalMaxSequence) {
            globalMaxSequence = num
          }
        }
      })

      allProps.forEach((property, index) => {
        const docRef = doc(db, 'properties', property.id)
        let needsUpdate = false
        const updateData = {}

        // 1. Resolve type string mapping if needed
        let resolvedType = property.type
        const typeId = getPropertyIdByLabel(property.type)
        if (typeId && property.type !== typeId) {
          resolvedType = typeId
          updateData.type = typeId
          needsUpdate = true
        }

        // 2. Generate displayId with sequence matching
        const prefix = getPrefixForTypeLocal(resolvedType)
        const existingIdStr = property.displayId || property.propertyId || ''
        const match = existingIdStr.match(/\d+$/)

        let sequenceNum = 0
        if (match) {
          sequenceNum = parseInt(match[0], 10)
        } else {
          globalMaxSequence++
          sequenceNum = globalMaxSequence
        }

        const newDisplayId = `${prefix}${String(sequenceNum).padStart(3, '0')}`

        // Only update if displayId does not exactly match the new structure
        if (property.displayId !== newDisplayId) {
          updateData.displayId = newDisplayId
          needsUpdate = true
        }

        if (needsUpdate) {
          updateData.updatedAt = serverTimestamp()
          batch.update(docRef, updateData)
          count++
        }
      })

      if (count > 0) {
        await batch.commit()
        alert(`ปรับปรุงข้อมูลสำเร็จ ${count} รายการ`)
        setMigrationDone(true)
      } else {
        alert('ไม่มีข้อมูลที่ต้องปรับปรุง')
        setMigrationDone(true)
      }
    } catch (e) {
      console.error(e)
      alert('เกิดข้อผิดพลาดในการปรับปรุงข้อมูล: ' + e.message)
    } finally {
      setMigrating(false)
    }
  }

  const pendingCount = pendingProperties.length

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 tracking-tight">
          แดชบอร์ด
        </h1>
        <div className="flex items-center gap-3">
          {!migrationDone && (
            <button
              onClick={handleMigration}
              disabled={migrating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
              เริ่มการปรับปรุงระบบ ID (Migration)
            </button>
          )}
          <Link
            to="/admin/properties/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 text-yellow-900 font-semibold hover:bg-yellow-500 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            เพิ่มทรัพย์
          </Link>
        </div>
      </div>

      {/* Row 1: Executive Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="มูลค่าพอร์ตลงทุน"
          value={stats.totalAssetValue}
          icon={DollarSign}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="ทรัพย์สินทั้งหมด"
          value={stats.totalProperties}
          icon={Building2}
          iconBg="bg-blue-100"
          href="/admin/properties"
        />
        <StatCard
          title="ลูกค้าที่สนใจ (Active)"
          value={stats.activeLeads}
          icon={Users}
          iconBg="bg-yellow-100"
        />
        <StatCard
          title="ปิดการขายเดือนนี้"
          value={stats.closedThisMonth}
          icon={FileCheck}
          iconBg="bg-green-100"
        />
      </div>

      {/* Pending Properties Alert */}
      {pendingCount > 0 && (
        <Link
          to="/admin/pending-properties"
          className="flex items-center justify-between px-6 py-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-amber-800" />
            </div>
            <div>
              <p className="font-semibold">ประกาศรออนุมัติ</p>
              <p className="text-sm text-amber-700">มี {pendingCount} รายการรอตรวจสอบ</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-amber-700" />
        </Link>
      )}

      {/* Row 2: Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads Chart - 7 วันย้อนหลัง */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-blue-900">Leads Overview</h2>
            <p className="text-sm text-slate-600 mt-0.5">จำนวนคนติดต่อ 7 วันย้อนหลัง</p>
          </div>
          <div className="p-4 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadsChartData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  formatter={(value) => [value.toLocaleString('th-TH'), 'จำนวน Lead']}
                  labelFormatter={(label) => `วัน${label}`}
                />
                <Area type="monotone" dataKey="leads" stroke="#1e3a8a" strokeWidth={2} fill="url(#colorLeads)" name="Leads" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Property Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-blue-900">Property Distribution</h2>
            <p className="text-sm text-slate-600 mt-0.5">สัดส่วนประเภททรัพย์</p>
          </div>
          <div className="p-4 h-[340px]">
            {propertyTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={propertyTypeData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {propertyTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} รายการ`, '']} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-sm text-slate-700">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                ยังไม่มีข้อมูลทรัพย์สิน
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Recent Leads & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-blue-900">ลูกค้าล่าสุด (Recent Leads)</h2>
            <Link
              to="/admin/leads"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              ดูทั้งหมด
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-3">ลูกค้า</th>
                  <th className="px-6 py-3">เบอร์โทร</th>
                  <th className="px-6 py-3">ทรัพย์ที่สนใจ</th>
                  <th className="px-6 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.length > 0 ? (
                  recentLeads.map((lead) => (
                    <tr key={lead.id} className="border-t border-gray-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <LeadAvatar name={lead.name} />
                          <span className="font-medium text-slate-800">{lead.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
                          <Phone className="h-4 w-4" />
                          {lead.phone}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm line-clamp-2">{lead.property}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${lead.status === 'ติดต่อแล้ว' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                            }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      ยังไม่มีลูกค้าติดต่อ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-900" />
              <h2 className="text-lg font-bold text-blue-900">Activity Feed</h2>
            </div>
            <Link
              to="/admin/activities"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              ดูทั้งหมด
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {recentActivities.length > 0 ? (
              recentActivities.map((item) => {
                const category = getActionCategory(item.action)
                const displayAction = getActionDisplay(item.action)
                const fmtTs = item.timestamp?.toDate
                  ? item.timestamp.toDate().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
                  : '-'
                return (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 rounded-lg bg-slate-50/80 hover:bg-slate-100/80 transition-colors"
                  >
                    <div
                      className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${category === 'critical' ? 'bg-red-500' : category === 'operation' ? 'bg-blue-400' : 'bg-slate-400'
                        }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 leading-snug" title={item.user?.email}>
                        <span className="font-semibold text-slate-800">{getUsernameFromEmail(item.user?.email)}</span>
                        <span className="text-slate-400 font-normal"> ({formatRoleDisplay(item.user?.role)})</span>
                        <span className="mx-1">·</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${getActivityBadgeClass(category)}`}>
                          {displayAction}
                        </span>
                        {item.target && item.target !== '-' && (
                          <>
                            <span className="mx-1">·</span>
                            <span>{item.target}</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{fmtTs}</p>
                      {item.details && <p className="text-xs text-slate-600 mt-0.5">{item.details}</p>}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-8 text-center text-slate-500 text-sm">ยังไม่มีกิจกรรม</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-4">
        <Link
          to="/admin/properties"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 text-white font-medium hover:bg-blue-800 transition-colors"
        >
          <Building2 className="h-4 w-4" />
          ดูรายการทรัพย์ทั้งหมด
        </Link>
        <Link
          to="/admin/leads"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          <Users className="h-4 w-4" />
          จัดการ Lead
        </Link>
      </div>
    </div>
  )
}
