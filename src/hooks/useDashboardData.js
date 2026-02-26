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
  getPropertyViewsSnapshot,
} from '../lib/firestore'
import { getPropertyLabel } from '../constants/propertyTypes'

const DASHBOARD_ACTIVITY_LIMIT = 5
const DASHBOARD_LEADS_LIMIT = 5
const CHART_DAYS = 7

/** วันในสัปดาห์ (ไทย) */
const DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const MONTH_NAMES = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const TOP_VIEWS_LIMIT = 10

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

/** ได้ timestamp (ms) จาก view doc */
function getViewTime(v) {
  const ts = v.timestamp?.toMillis?.()
  if (ts) return ts
  if (v.date) return new Date(v.date).getTime()
  return 0
}

/** กรอง views ตามช่วงเวลา */
function filterViewsByRange(views, rangeKey) {
  if (!views || views.length === 0) return []
  const now = new Date()
  const cutoff = new Date(now)
  if (rangeKey === '7d') cutoff.setDate(now.getDate() - 7)
  else if (rangeKey === '30d') cutoff.setDate(now.getDate() - 30)
  else if (rangeKey === '6m') cutoff.setMonth(now.getMonth() - 6)
  else if (rangeKey === '1y') cutoff.setFullYear(now.getFullYear() - 1)
  const cutoffTime = cutoff.getTime()
  return views.filter((v) => getViewTime(v) >= cutoffTime)
}

/**
 * สร้างข้อมูลกราฟการเข้าชม ตาม range: 7d/30d = รายวัน, 6m/1y = รายเดือน
 */
function buildViewsChartData(views, rangeKey) {
  const filtered = filterViewsByRange(views, rangeKey)
  const now = new Date()

  if (rangeKey === '7d' || rangeKey === '30d') {
    const days = rangeKey === '7d' ? 7 : 30
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const dateStr = d.toISOString().slice(0, 10)
      const count = filtered.filter((v) => {
        const vDate = v.date || (getViewTime(v) ? new Date(getViewTime(v)).toISOString().slice(0, 10) : '')
        return vDate === dateStr
      }).length
      result.push({
        name: rangeKey === '7d' ? DAY_NAMES[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`,
        views: count,
        date: dateStr,
      })
    }
    return result
  }

  if (rangeKey === '6m' || rangeKey === '1y') {
    const months = rangeKey === '6m' ? 6 : 12
    const result = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth()
      const count = filtered.filter((v) => {
        const t = getViewTime(v)
        if (!t) return false
        const vd = new Date(t)
        return vd.getFullYear() === year && vd.getMonth() === month
      }).length
      result.push({
        name: `${MONTH_NAMES[month]} ${String(year).slice(-2)}`,
        views: count,
        year,
        month,
      })
    }
    return result
  }

  return []
}

/** Top N ทรัพย์ที่มีการเข้าชมสูงสุด (จาก views ที่กรองแล้ว) */
function buildTopPropertiesByViews(views, properties, limit = TOP_VIEWS_LIMIT) {
  const countByProperty = {}
  ;(views || []).forEach((v) => {
    const id = v.propertyId || 'unknown'
    countByProperty[id] = (countByProperty[id] || 0) + 1
  })
  const metaById = {}
  ;(properties || []).forEach((p) => {
    metaById[p.id] = {
      title: p.title || '(ไม่ระบุชื่อ)',
      typeLabel: getPropertyLabel(p.type) || p.type || 'อื่นๆ',
      province: (p.location && p.location.province) || '',
    }
  })
  return Object.entries(countByProperty)
    .map(([propertyId, viewsCount]) => ({
      propertyId,
      views: viewsCount,
      title: (metaById[propertyId] && metaById[propertyId].title) || propertyId,
      typeLabel: (metaById[propertyId] && metaById[propertyId].typeLabel) || '-',
      province: (metaById[propertyId] && metaById[propertyId].province) || '-',
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
}

/**
 * สร้างข้อมูล Bar + ตาราง: ประเภททรัพย์ | จำนวนประกาศ | จำนวนการเข้าชม
 * รวม type จาก properties และ views
 */
function buildPropertyTypeDataWithViews(properties, views) {
  const countByType = {}
  ;(properties || []).forEach((p) => {
    const t = p.type || 'อื่นๆ'
    countByType[t] = { count: (countByType[t]?.count || 0) + 1, views: countByType[t]?.views || 0 }
  })
  const viewsByType = {}
  ;(views || []).forEach((v) => {
    const t = v.type || 'อื่นๆ'
    viewsByType[t] = (viewsByType[t] || 0) + 1
  })
  Object.keys(viewsByType).forEach((t) => {
    if (!countByType[t]) countByType[t] = { count: 0, views: 0 }
    countByType[t].views = viewsByType[t]
  })
  Object.keys(countByType).forEach((t) => {
    if (countByType[t].views === undefined) countByType[t].views = 0
  })
  const colors = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']
  return Object.entries(countByType)
    .map(([typeKey, { count, views }], i) => ({
      typeKey,
      name: getPropertyLabel(typeKey) || typeKey,
      count,
      views: views || 0,
      color: colors[i % colors.length],
    }))
    .sort((a, b) => b.count - a.count)
}

export function useDashboardData(viewRange = '7d') {
  const [properties, setProperties] = useState([])
  const [leads, setLeads] = useState([])
  const [viewingRequests, setViewingRequests] = useState([])
  const [activities, setActivities] = useState([])
  const [pendingProperties, setPendingProperties] = useState([])
  const [views, setViews] = useState([])
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
    const unsubViews = getPropertyViewsSnapshot((list) => {
      if (mounted) setViews(list)
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
      unsubViews()
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

  const filteredViews = useMemo(() => filterViewsByRange(views, viewRange), [views, viewRange])
  const viewsChartData = useMemo(() => buildViewsChartData(views, viewRange), [views, viewRange])
  const topPropertiesByViews = useMemo(
    () => buildTopPropertiesByViews(filteredViews, properties, TOP_VIEWS_LIMIT),
    [filteredViews, properties]
  )
  const propertyTypeDataWithViews = useMemo(
    () => buildPropertyTypeDataWithViews(properties, views),
    [properties, views]
  )
  const recentLeads = useMemo(() => contacts.slice(0, DASHBOARD_LEADS_LIMIT), [contacts])
  const recentActivities = useMemo(() => activities.slice(0, DASHBOARD_ACTIVITY_LIMIT), [activities])

  return {
    loading,
    properties,
    contacts,
    activities,
    pendingProperties,
    stats,
    viewsChartData,
    topPropertiesByViews,
    propertyTypeDataWithViews,
    recentLeads,
    recentActivities,
  }
}
