import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPropertiesSnapshot } from '../lib/firestore'
import { formatPrice } from '../lib/priceFormat'
import { FileText, Plus, Pencil, Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Get status badges for property - returns array of badges
 * Logic ใหม่ตาม listingType:
 * - sale: แสดง propertyCondition (มือ 1/มือ 2) และ availability (ว่าง/ขายแล้ว)
 * - rent: แสดง subListingType (เช่า/ผ่อนตรง) และ availability (ว่าง/ติดจอง)
 * - Backward compatibility: ถ้าไม่มี listingType ให้ใช้ status เดิม
 */
function getStatusBadges(property) {
  const badges = []
  
  // Determine listingType (รองรับข้อมูลเก่า)
  const listingType = property.listingType || (property.isRental ? 'rent' : 'sale')

  if (listingType === 'sale') {
    // กรณี listingType === 'sale' (ซื้อ)
    
    // Badge 1: สภาพบ้าน (มือ 1/มือ 2)
    const propertyCondition = property.propertyCondition || property.propertySubStatus
    if (propertyCondition === 'มือ 1') {
      badges.push({ label: 'มือ 1', color: 'bg-blue-100 text-blue-800' })
    } else if (propertyCondition === 'มือ 2') {
      badges.push({ label: 'มือ 2', color: 'bg-blue-100 text-blue-800' })
    }

    // Badge 2: สถานะการขาย (ว่าง/ขายแล้ว)
    const availability = property.availability || property.status
    if (availability === 'available' || availability === 'ว่าง') {
      badges.push({ label: 'ว่าง', color: 'bg-green-100 text-green-800' })
    } else if (availability === 'sold' || availability === 'ขายแล้ว') {
      badges.push({ label: 'ขายแล้ว', color: 'bg-red-100 text-red-800' })
    } else if (availability === 'reserved' || availability === 'ติดจอง') {
      badges.push({ label: 'ติดจอง', color: 'bg-orange-100 text-orange-800' })
    } else if (availability === 'pending' || availability === 'รออนุมัติ') {
      badges.push({ label: 'รออนุมัติ', color: 'bg-yellow-100 text-yellow-800' })
    } else if (availability) {
      badges.push({ label: String(availability), color: 'bg-slate-100 text-slate-700' })
    }
  } else if (listingType === 'rent') {
    // กรณี listingType === 'rent' (เช่า/ผ่อนตรง)
    
    // Badge 1: ประเภท (เช่า/ผ่อนตรง)
    const subListingType = property.subListingType
    if (subListingType === 'rent_only') {
      badges.push({ label: 'เช่า', color: 'bg-purple-100 text-purple-800' })
    } else if (subListingType === 'installment_only') {
      badges.push({ label: 'ผ่อนตรง', color: 'bg-purple-100 text-purple-800' })
    } else if (property.directInstallment) {
      // Backward compatibility: ถ้ามี directInstallment ให้แสดง 'ผ่อนตรง'
      badges.push({ label: 'ผ่อนตรง', color: 'bg-purple-100 text-purple-800' })
    } else {
      // Default: ถ้าไม่มี subListingType ให้แสดง 'เช่า'
      badges.push({ label: 'เช่า', color: 'bg-purple-100 text-purple-800' })
    }

    // Badge 2: สถานะการจอง (ว่าง/ติดจอง)
    const availability = property.availability
    if (availability === 'available' || availability === 'ว่าง') {
      badges.push({ label: 'ว่าง', color: 'bg-green-100 text-green-800' })
    } else if (availability === 'reserved' || availability === 'ติดจอง') {
      badges.push({ label: 'ติดจอง', color: 'bg-red-100 text-red-800' })
    } else if (availability === 'unavailable' || availability === 'ไม่ว่าง') {
      badges.push({ label: 'ไม่ว่าง', color: 'bg-red-100 text-red-800' })
    } else if (availability) {
      badges.push({ label: String(availability), color: 'bg-slate-100 text-slate-700' })
    }
  } else {
    // Backward compatibility: ถ้าไม่มี listingType ให้ใช้ status เดิม
    const status = property.status
    if (status === 'available') {
      badges.push({ label: 'ว่าง', color: 'bg-green-100 text-green-800' })
    } else if (status === 'reserved') {
      badges.push({ label: 'ติดจอง', color: 'bg-orange-100 text-orange-800' })
    } else if (status === 'sold') {
      badges.push({ label: 'ขายแล้ว', color: 'bg-red-100 text-red-800' })
    } else if (status === 'pending') {
      badges.push({ label: 'รออนุมัติ', color: 'bg-yellow-100 text-yellow-800' })
    } else if (status) {
      badges.push({ label: String(status), color: 'bg-slate-100 text-slate-700' })
    }
  }

  // ถ้าไม่มี badge ใดๆ ให้แสดง '-'
  if (badges.length === 0) {
    badges.push({ label: '-', color: 'bg-slate-100 text-slate-700' })
  }

  return badges
}

export default function PropertyListPage() {
  // All hooks must be called unconditionally at the top level
  const authContext = useAuth()
  const user = authContext?.user || null
  const isAdmin = authContext?.isAdmin || (() => false)

  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  
  // State Management: Search, Filter และ Pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    type: '', // ประเภททรัพย์ (เช่น บ้านเดี่ยว, คอนโด)
    listingType: '', // ประเภทการดีล (sale, rent)
    propertyCondition: '', // สภาพบ้าน (มือ 1, มือ 2) - สำหรับ sale
    subListingType: '', // รูปแบบ (rent_only, installment_only) - สำหรับ rent
    availability: '', // สถานะ (available, sold, reserved)
    // Backward compatibility fields
    assetType: '', // ประเภทสินทรัพย์ (มือ 1, มือ 2) - สำหรับข้อมูลเก่า
    status: '', // สถานะ (ว่าง, ติดจอง, ขายแล้ว, รออนุมัติ) - สำหรับข้อมูลเก่า
    category: '', // หมวดหมู่ (ซื้อ, เช่า) - สำหรับข้อมูลเก่า
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    let isMounted = true
    
    try {
      if (!user) {
        setLoading(false)
        return
      }

      let adminCheck = false
      try {
        adminCheck = isAdmin && typeof isAdmin === 'function' ? isAdmin() : false
      } catch (error) {
        console.error('PropertyListPage: isAdmin check error in useEffect:', error)
        adminCheck = false
      }

      if (!adminCheck) {
        setLoading(false)
        return
      }

      const unsub = getPropertiesSnapshot((allProperties) => {
        if (!isMounted) return
        
        try {
          if (Array.isArray(allProperties)) {
            setProperties(allProperties)
          } else {
            setProperties([])
          }
        } catch (error) {
          console.error('PropertyListPage: Error setting properties:', error)
          setProperties([])
        } finally {
          if (isMounted) {
            setLoading(false)
          }
        }
      })

      return () => {
        isMounted = false
        try {
          if (unsub && typeof unsub === 'function') {
            unsub()
          }
        } catch (error) {
          console.error('PropertyListPage: Error unsubscribing:', error)
        }
      }
    } catch (error) {
      console.error('PropertyListPage: Error loading properties:', error)
      if (isMounted) {
        setProperties([])
        setLoading(false)
      }
    }
  }, [user, isAdmin])

  // Advanced Filtering Logic: กรองข้อมูลตาม searchTerm และ filters (AND Logic)
  const filteredProperties = useMemo(() => {
    try {
      if (!Array.isArray(properties)) {
        return []
      }

      let filtered = [...properties]

      // Search Filter: ตรวจสอบ title หรือ propertyId (Case-insensitive)
      if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim()
        filtered = filtered.filter((p) => {
          try {
            if (!p || typeof p !== 'object') return false
            const titleMatch = p.title?.toLowerCase().includes(searchLower) || false
            const idMatch = p.propertyId?.toLowerCase().includes(searchLower) || false
            return titleMatch || idMatch
          } catch {
            return false
          }
        })
      }

      // Filter: ประเภททรัพย์ (type)
      if (filters?.type) {
        filtered = filtered.filter((p) => {
          try {
            return p?.type === filters.type
          } catch {
            return false
          }
        })
      }

      // Filter: ประเภทการดีล (listingType - sale/rent)
      if (filters?.listingType) {
        filtered = filtered.filter((p) => {
          try {
            // ตรวจสอบ listingType ใหม่ หรือ fallback ไปที่ isRental (backward compatibility)
            const pListingType = p?.listingType || (p?.isRental ? 'rent' : 'sale')
            return pListingType === filters.listingType
          } catch {
            return false
          }
        })
      }

      // Filter: สภาพบ้าน (propertyCondition - มือ 1/มือ 2) - สำหรับ sale เท่านั้น
      if (filters?.propertyCondition && filters.listingType === 'sale') {
        filtered = filtered.filter((p) => {
          try {
            // ตรวจสอบ propertyCondition ใหม่ หรือ fallback ไปที่ propertySubStatus (backward compatibility)
            const pCondition = p?.propertyCondition || p?.propertySubStatus
            return pCondition === filters.propertyCondition
          } catch {
            return false
          }
        })
      }

      // Filter: รูปแบบ (subListingType - rent_only/installment_only) - สำหรับ rent เท่านั้น
      if (filters?.subListingType && filters.listingType === 'rent') {
        filtered = filtered.filter((p) => {
          try {
            // ตรวจสอบ subListingType ใหม่ หรือ fallback ไปที่ directInstallment (backward compatibility)
            if (p?.subListingType) {
              return p.subListingType === filters.subListingType
            } else if (filters.subListingType === 'installment_only') {
              return p?.directInstallment === true
            } else if (filters.subListingType === 'rent_only') {
              return !p?.directInstallment || p.directInstallment === false
            }
            return false
          } catch {
            return false
          }
        })
      }

      // Filter: สถานะ (availability - available/sold/reserved)
      if (filters?.availability) {
        filtered = filtered.filter((p) => {
          try {
            // ตรวจสอบ availability ใหม่ หรือ fallback ไปที่ status (backward compatibility)
            const pAvailability = p?.availability || p?.status
            return pAvailability === filters.availability
          } catch {
            return false
          }
        })
      }

      // Backward Compatibility: Filter ประเภทสินทรัพย์ (assetType - มือ 1/มือ 2) - สำหรับข้อมูลเก่า
      if (filters?.assetType && !filters.propertyCondition) {
        filtered = filtered.filter((p) => {
          try {
            const pCondition = p?.propertyCondition || p?.propertySubStatus
            return pCondition === filters.assetType
          } catch {
            return false
          }
        })
      }

      // Backward Compatibility: Filter สถานะ (status) - สำหรับข้อมูลเก่า
      if (filters?.status && !filters.availability) {
        filtered = filtered.filter((p) => {
          try {
            const pStatus = p?.availability || p?.status
            if (filters.status === 'available-rental') {
              return p?.isRental && pStatus === 'available'
            } else if (filters.status === 'unavailable-rental') {
              return p?.isRental && (pStatus === 'unavailable' || pStatus === 'reserved')
            } else {
              return !p?.isRental && pStatus === filters.status
            }
          } catch {
            return false
          }
        })
      }

      // Backward Compatibility: Filter หมวดหมู่ (category - ซื้อ/เช่า) - สำหรับข้อมูลเก่า
      if (filters?.category && !filters.listingType) {
        if (filters.category === 'buy') {
          filtered = filtered.filter((p) => {
            try {
              return !p?.isRental
            } catch {
              return false
            }
          })
        } else if (filters.category === 'rent') {
          filtered = filtered.filter((p) => {
            try {
              return p?.isRental
            } catch {
              return false
            }
          })
        }
      }

      return Array.isArray(filtered) ? filtered : []
    } catch (error) {
      console.error('PropertyListPage: Filtering error:', error)
      return []
    }
  }, [properties, searchTerm, filters])

  // Auto-Reset: Reset currentPage เป็น 1 เมื่อ searchTerm หรือ filters เปลี่ยน
  useEffect(() => {
    try {
      setCurrentPage(1)
    } catch (error) {
      console.error('PropertyListPage: Error resetting page:', error)
    }
  }, [searchTerm, filters])

  // Pagination Logic: คำนวณ totalPages และ paginatedProperties
  const filteredLength = Array.isArray(filteredProperties) ? filteredProperties.length : 0
  const totalPages = Math.max(1, Math.ceil(filteredLength / itemsPerPage))
  const paginatedProperties = useMemo(() => {
    try {
      if (!Array.isArray(filteredProperties)) {
        return []
      }
      const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage)
      const endIndex = Math.min(startIndex + itemsPerPage, filteredProperties.length)
      return filteredProperties.slice(startIndex, endIndex)
    } catch (error) {
      console.error('PropertyListPage: Pagination error:', error)
      return []
    }
  }, [filteredProperties, currentPage, itemsPerPage])

  // Stats: คำนวณจาก filteredProperties
  const available = useMemo(() => {
    try {
      return Array.isArray(filteredProperties) ? filteredProperties.filter((p) => p?.status === 'available') : []
    } catch {
      return []
    }
  }, [filteredProperties])
  
  const pending = useMemo(() => {
    try {
      return Array.isArray(filteredProperties) ? filteredProperties.filter((p) => p?.status === 'pending') : []
    } catch {
      return []
    }
  }, [filteredProperties])
  
  const sold = useMemo(() => {
    try {
      return Array.isArray(filteredProperties) ? filteredProperties.filter((p) => p?.status === 'sold') : []
    } catch {
      return []
    }
  }, [filteredProperties])
  
  const reserved = useMemo(() => {
    try {
      return Array.isArray(filteredProperties) ? filteredProperties.filter((p) => p?.status === 'reserved') : []
    } catch {
      return []
    }
  }, [filteredProperties])

  // Handler Functions
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }))
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setFilters({
      type: '',
      listingType: '',
      propertyCondition: '',
      subListingType: '',
      availability: '',
      assetType: '',
      status: '',
      category: '',
    })
    setCurrentPage(1)
  }

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Get unique values for filter options
  const uniqueTypes = useMemo(() => {
    try {
      const safeProps = Array.isArray(properties) ? properties : []
      if (safeProps.length === 0) return []
      const types = new Set(safeProps.map((p) => p?.type).filter(Boolean))
      return Array.from(types).sort()
    } catch (error) {
      console.error('PropertyListPage: uniqueTypes error:', error)
      return []
    }
  }, [properties])

  // Ensure we have valid data before rendering
  const safeProperties = Array.isArray(properties) ? properties : []

  // Debug logging removed for production

  // Check admin access safely (after all hooks)
  let hasAdminAccess = false
  try {
    hasAdminAccess = isAdmin && typeof isAdmin === 'function' ? isAdmin() : false
  } catch (error) {
    console.error('PropertyListPage: isAdmin check error:', error)
    hasAdminAccess = false
  }

  if (!hasAdminAccess) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงหน้านี้ได้</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-slate-600">กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  // Early return with error boundary
  try {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">จัดการทรัพย์</h1>
          <p className="text-slate-600">
            รายการประกาศทั้งหมด ({safeProperties.length} รายการ)
          </p>
        </div>
        <Link
          to="/admin/properties/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition"
        >
          <Plus className="h-5 w-5" />
          เพิ่มประกาศใหม่
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">ว่าง</p>
          <p className="text-2xl font-bold text-green-600">{available.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">ติดจอง</p>
          <p className="text-2xl font-bold text-yellow-600">{reserved.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">ขายแล้ว</p>
          <p className="text-2xl font-bold text-blue-600">{sold.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">รออนุมัติ</p>
          <p className="text-2xl font-bold text-orange-600">{pending.length}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="ค้นหาด้วยชื่อโครงการ หรือ รหัสทรัพย์ (เช่น SPS-TW-90)..."
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          {/* ประเภททรัพย์ */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ประเภททรัพย์</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ทั้งหมด</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* ประเภทการดีล (Listing Type) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ประเภทการดีล</label>
            <select
              value={filters.listingType}
              onChange={(e) => {
                const newListingType = e.target.value
                handleFilterChange('listingType', newListingType)
                // Reset sub-filters when listingType changes
                if (newListingType !== 'sale') {
                  handleFilterChange('propertyCondition', '')
                }
                if (newListingType !== 'rent') {
                  handleFilterChange('subListingType', '')
                }
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ทั้งหมด</option>
              <option value="sale">ซื้อ</option>
              <option value="rent">เช่า/ผ่อนตรง</option>
            </select>
          </div>

          {/* Dynamic Filter: สภาพบ้าน (สำหรับ sale) หรือ รูปแบบ (สำหรับ rent) */}
          {filters.listingType === 'sale' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">สภาพ</label>
              <select
                value={filters.propertyCondition}
                onChange={(e) => handleFilterChange('propertyCondition', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ทั้งหมด</option>
                <option value="มือ 1">มือ 1</option>
                <option value="มือ 2">มือ 2</option>
              </select>
            </div>
          ) : filters.listingType === 'rent' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">รูปแบบ</label>
              <select
                value={filters.subListingType}
                onChange={(e) => handleFilterChange('subListingType', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ทั้งหมด</option>
                <option value="rent_only">เช่าเท่านั้น</option>
                <option value="installment_only">ผ่อนตรง</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">สภาพ/รูปแบบ</label>
              <select
                disabled
                className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed"
              >
                <option value="">เลือกประเภทการดีลก่อน</option>
              </select>
            </div>
          )}

          {/* สถานะ (Availability) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">สถานะ</label>
            <select
              value={filters.availability}
              onChange={(e) => handleFilterChange('availability', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ทั้งหมด</option>
              <option value="available">ว่าง</option>
              <option value="sold">ขายแล้ว</option>
              <option value="reserved">ติดจอง</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <div>
            <button
              onClick={handleResetFilters}
              className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition border border-slate-300 flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Reset Filters
            </button>
          </div>
        </div>

        {/* Filter Summary (แสดงเมื่อมี filter active) */}
        {(searchTerm || filters.type || filters.listingType || filters.propertyCondition || filters.subListingType || filters.availability) && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">
              Active Filters: {[
                searchTerm && `ค้นหา: "${searchTerm}"`,
                filters.type && `ประเภท: ${filters.type}`,
                filters.listingType && `ดีล: ${filters.listingType === 'sale' ? 'ซื้อ' : 'เช่า/ผ่อนตรง'}`,
                filters.propertyCondition && `สภาพ: ${filters.propertyCondition}`,
                filters.subListingType && `รูปแบบ: ${filters.subListingType === 'rent_only' ? 'เช่าเท่านั้น' : 'ผ่อนตรง'}`,
                filters.availability && `สถานะ: ${filters.availability === 'available' ? 'ว่าง' : filters.availability === 'sold' ? 'ขายแล้ว' : 'ติดจอง'}`,
              ].filter(Boolean).join(' • ')}
            </p>
          </div>
        )}
      </div>

      {/* Properties Table */}
      {safeProperties.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-slate-400" />
          <p className="text-lg font-medium text-slate-700 mb-2">ยังไม่มีประกาศ</p>
          <p className="text-slate-600 mb-6">เริ่มต้นด้วยการเพิ่มประกาศแรก</p>
          <Link
            to="/admin/properties/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition"
          >
            <Plus className="h-5 w-5" />
            เพิ่มประกาศใหม่
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    <th className="px-6 py-3 whitespace-nowrap">ID</th>
                    <th className="px-6 py-3">ชื่อประกาศ</th>
                    <th className="px-6 py-3 whitespace-nowrap">ประเภท</th>
                    <th className="px-6 py-3 whitespace-nowrap">สถานะ</th>
                    <th className="px-6 py-3 whitespace-nowrap text-right">ราคา</th>
                    <th className="px-6 py-3 whitespace-nowrap text-center">แก้ไข</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProperties.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลที่ค้นหา</p>
                        <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProperties.map((property) => {
                      if (!property || !property.id) {
                        return null
                      }
                      try {
                        const badges = getStatusBadges(property)
                        const loc = property.location || {}
                        return (
                        <tr key={property.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-sm font-medium text-slate-800 whitespace-nowrap">
                            {property.propertyId || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-slate-800 line-clamp-2">{property.title}</span>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {loc.district}, {loc.province}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-slate-600 text-sm whitespace-nowrap">{property.type}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 flex-wrap">
                              {badges.map((badge, index) => (
                                <span
                                  key={index}
                                  className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${badge.color}`}
                                >
                                  {badge.label}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-700 text-sm whitespace-nowrap">
                            {formatPrice(property.price, property.isRental, true)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Link
                              to={`/admin/properties/edit/${property.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-900 font-medium hover:bg-blue-100 transition"
                              aria-label={`แก้ไข ${property.title}`}
                            >
                              <Pencil className="h-4 w-4" />
                              แก้ไข
                            </Link>
                          </td>
                        </tr>
                        )
                      } catch (error) {
                        console.error('PropertyListPage: Error rendering property row:', error, property)
                        return null
                      }
                    }).filter(Boolean)
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {filteredProperties.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Results Info */}
              <div className="text-sm text-slate-600">
                แสดง{' '}
                <span className="font-semibold text-slate-800">
                  {filteredProperties.length === 0
                    ? 0
                    : (currentPage - 1) * itemsPerPage + 1}
                </span>
                {' - '}
                <span className="font-semibold text-slate-800">
                  {Math.min(currentPage * itemsPerPage, filteredProperties.length)}
                </span>
                {' จากทั้งหมด '}
                <span className="font-semibold text-slate-800">{filteredProperties.length.toLocaleString('th-TH')}</span>{' '}
                รายการ
              </div>

              {/* Pagination Buttons */}
              <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    currentPage === 1
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  ก่อนหน้า
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      )
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const prevPage = array[index - 1]
                      const showEllipsis = prevPage && page - prevPage > 1

                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-slate-400">...</span>
                          )}
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                              currentPage === page
                                ? 'bg-blue-900 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      )
                    })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    currentPage === totalPages
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  ถัดไป
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    )
  } catch (error) {
    console.error('PropertyListPage: Render error:', error)
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-red-700">{error?.message || 'Unknown error'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            รีเฟรชหน้า
          </button>
        </div>
      </div>
    )
  }
}
