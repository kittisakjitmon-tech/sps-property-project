/**
 * useDashboardData - ดึงข้อมูลแดชบอร์ดจาก Firestore
 * รวม properties, leads, viewing_requests, activities
 */
import { useState, useEffect, useMemo } from 'react'
import {
  getPropertiesSnapshot,
  getLeadsSnapshot,
  getViewingRequestsSnapshot,
  getActivitiesSnapshot,
  getPendingPropertiesSnapshot,
} from '../lib/firestore'

const DASHBOARD_ACTIVITY_LIMIT = 5
const DASHBOARD_LEADS_LIMIT = 5
const CHART_DAYS = 7

/** วันในสัปดาห์ (ไทย) */
const DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

/**
 * ผสาน leads + viewing_requests เป็น contacts  unified
 * เรียงตาม createdAt (ใหม่สุดก่อน)
 */
function mergeContacts(leads, viewingRequests) {
  const fromLeads = (leads || []).map((l) => ({
    id: `lead-${l.id}`,
    name: l.name || l.customerName || 'ลูกค้า',
    phone: l.phone || l.tel || '-',
    property: l.propertyTitle || l.propertyId || '-',
    status: l.contacted ? 'ติดต่อแล้ว' : 'รอติดต่อ',
    createdAt: l.createdAt,
    source: 'leads',
  }))
  const fromViewing = (viewingRequests || []).map((v) => ({
    id: `view-${v.id}`,
    name: v.name || 'ลูกค้า',
    phone: v.phone || '-',
    property: v.propertyName || v.propertyId || '-',
    status: v.status === 'contacted' ? 'ติดต่อแล้ว' : 'รอติดต่อ',
    createdAt: v.createdAt,
    source: 'viewing_requests',
  }))
  const merged = [...fromLeads, ...fromViewing]
  merged.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0
    const tb = b.createdAt?.toMillis?.() ?? 0
    return tb - ta
  })
  return merged
}

/**
 * สร้างข้อมูลกราฟ Leads 7 วันย้อนหลัง
 */
function buildLeadsChartData(contacts) {
  const now = new Date()
  const days = []
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const count = (contacts || []).filter((c) => {
      const ts = c.createdAt?.toMillis?.()
      if (!ts) return false
      const created = new Date(ts)
      return created >= d && created < next
    }).length
    days.push({
      name: DAY_NAMES[d.getDay()],
      leads: count,
      date: d.toISOString().slice(0, 10),
    })
  }
  return days
}

/**
 * สร้างข้อมูล Pie Chart ตาม type ของทรัพย์สิน
 */
function buildPropertyTypeData(properties) {
  const colors = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']
  const countByType = {}
  ;(properties || []).forEach((p) => {
    const t = p.type || 'อื่นๆ'
    countByType[t] = (countByType[t] || 0) + 1
  })
  const entries = Object.entries(countByType)
    .map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }))
    .sort((a, b) => b.value - a.value)
  return entries
}

export function useDashboardData() {
  const [properties, setProperties] = useState([])
  const [leads, setLeads] = useState([])
  const [viewingRequests, setViewingRequests] = useState([])
  const [activities, setActivities] = useState([])
  const [pendingProperties, setPendingProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let firstLoad = true

    const unsubP = getPropertiesSnapshot((list) => {
      if (mounted) setProperties(list)
    })
    const unsubL = getLeadsSnapshot((list) => {
      if (mounted) setLeads(list)
    })
    const unsubV = getViewingRequestsSnapshot((list) => {
      if (mounted) setViewingRequests(list)
    })
    const unsubA = getActivitiesSnapshot((list) => {
      if (mounted) setActivities(list)
    })
    const unsubPending = getPendingPropertiesSnapshot((list) => {
      if (mounted) setPendingProperties(list)
    })

    // ใช้ timeout สั้นเพื่อให้ snapshot ครั้งแรกโหลดเสร็จก่อนปิด loading
    const timer = setTimeout(() => {
      if (mounted && firstLoad) {
        firstLoad = false
        setLoading(false)
      }
    }, 800)

    return () => {
      mounted = false
      clearTimeout(timer)
      unsubP()
      unsubL()
      unsubV()
      unsubA()
      unsubPending()
    }
  }, [])

  const contacts = useMemo(() => mergeContacts(leads, viewingRequests), [leads, viewingRequests])

  const stats = useMemo(() => {
    const totalProperties = properties.length
    const totalAssetValue = properties.reduce((sum, p) => {
      const price = typeof p.price === 'string' ? parseInt(p.price.replace(/,/g, ''), 10) : Number(p.price)
      return sum + (Number.isFinite(price) ? price : 0)
    }, 0)
    const activeLeads = contacts.filter((c) => c.status === 'รอติดต่อ').length
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const closedThisMonth = properties.filter((p) => {
      if (p.status !== 'sold') return false
      const updated = p.updatedAt?.toMillis?.()
      if (!updated) return false
      return new Date(updated) >= thisMonthStart
    }).length
    return { totalProperties, totalAssetValue, activeLeads, closedThisMonth }
  }, [properties, contacts])

  const leadsChartData = useMemo(() => buildLeadsChartData(contacts), [contacts])
  const propertyTypeData = useMemo(() => buildPropertyTypeData(properties), [properties])
  const recentLeads = useMemo(() => contacts.slice(0, DASHBOARD_LEADS_LIMIT), [contacts])
  const recentActivities = useMemo(() => activities.slice(0, DASHBOARD_ACTIVITY_LIMIT), [activities])

  return {
    loading,
    properties,
    contacts,
    activities,
    pendingProperties,
    stats,
    leadsChartData,
    propertyTypeData,
    recentLeads,
    recentActivities,
  }
}
