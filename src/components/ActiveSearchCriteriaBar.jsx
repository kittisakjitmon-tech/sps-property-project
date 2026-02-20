import { X } from 'lucide-react'
import { getPropertyLabel } from '../constants/propertyTypes'

/**
 * ActiveSearchCriteriaBar - แสดงสถานะการค้นหาปัจจุบันเป็น Chips
 * - แสดง Keyword, ประเภท, สถานะ, คุณสมบัติพิเศษ, ราคา
 * - มีปุ่ม x เพื่อลบ filter แต่ละตัว
 * - มีปุ่ม Clear All เพื่อล้างทั้งหมด
 */
export default function ActiveSearchCriteriaBar({
  keyword = '',
  filters = {},
  resultCount = 0,
  onRemoveFilter,
  onClearAll,
}) {
  const activeFilters = []

  // 1. Keyword
  if (keyword && keyword.trim()) {
    activeFilters.push({
      type: 'keyword',
      label: `🔍 ${keyword}`,
      value: keyword,
    })
  }

  // 2. Tag (จาก homepage section)
  if (filters.tag && filters.tag.trim()) {
    activeFilters.push({
      type: 'tag',
      label: `🏷️ ${filters.tag}`,
      value: filters.tag,
      highlight: true,
    })
  }

  // 3. ประเภท (ซื้อ/เช่า)
  if (filters.isRental === true) {
    activeFilters.push({
      type: 'isRental',
      label: 'เช่า',
      value: 'rent',
    })
  } else if (filters.isRental === false) {
    activeFilters.push({
      type: 'isRental',
      label: 'ซื้อ',
      value: 'buy',
    })
  }

  // 4. สถานะ (มือ 1/มือ 2)
  if (filters.propertySubStatus) {
    activeFilters.push({
      type: 'propertySubStatus',
      label: filters.propertySubStatus,
      value: filters.propertySubStatus,
    })
  }

  // 5. คุณสมบัติพิเศษ (ผ่อนตรง)
  if (filters.feature === 'directInstallment') {
    activeFilters.push({
      type: 'feature',
      label: '🏠 ผ่อนตรง',
      value: 'directInstallment',
      highlight: true, // Badge สีพิเศษ
    })
  }

  if (filters.propertyType) {
    activeFilters.push({
      type: 'propertyType',
      label: getPropertyLabel(filters.propertyType),
      value: filters.propertyType,
    })
  }

  // 7. ทำเล
  if (filters.location) {
    activeFilters.push({
      type: 'location',
      label: `📍 ${filters.location}`,
      value: filters.location,
    })
  }

  // 8. ราคา
  if (filters.priceMin || filters.priceMax) {
    const formatPrice = (price) => {
      if (!price) return ''
      const num = Number(price)
      if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M`
      }
      return num.toLocaleString('th-TH')
    }
    const min = filters.priceMin ? formatPrice(filters.priceMin) : ''
    const max = filters.priceMax ? formatPrice(filters.priceMax) : ''
    const priceLabel = min && max ? `${min} - ${max}` : min || max
    activeFilters.push({
      type: 'price',
      label: `💰 ${priceLabel}`,
      value: { min: filters.priceMin, max: filters.priceMax },
    })
  }

  // 8. ห้องนอน
  if (filters.bedrooms) {
    activeFilters.push({
      type: 'bedrooms',
      label: `🛏️ ${filters.bedrooms === '5' ? '5+' : filters.bedrooms} ห้อง`,
      value: filters.bedrooms,
    })
  }

  // 9. ห้องน้ำ
  if (filters.bathrooms) {
    activeFilters.push({
      type: 'bathrooms',
      label: `🚿 ${filters.bathrooms === '4' ? '4+' : filters.bathrooms} ห้อง`,
      value: filters.bathrooms,
    })
  }

  // 10. พื้นที่
  if (filters.areaMin || filters.areaMax) {
    const formatArea = (area) => {
      if (!area) return ''
      return `${Number(area).toLocaleString('th-TH')} ตร.ม.`
    }
    const min = filters.areaMin ? formatArea(filters.areaMin) : ''
    const max = filters.areaMax ? formatArea(filters.areaMax) : ''
    const areaLabel = min && max ? `${min} - ${max}` : min || max
    activeFilters.push({
      type: 'area',
      label: `📐 ${areaLabel}`,
      value: { min: filters.areaMin, max: filters.areaMax },
    })
  }

  // ถ้าไม่มี active filters ให้ไม่แสดงอะไร
  if (activeFilters.length === 0) {
    return null
  }

  return (
    <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Summary Text */}
        <div className="flex-shrink-0 text-sm text-slate-600">
          <span className="font-medium text-blue-900">กำลังแสดงผลลัพธ์:</span>{' '}
          <span className="font-semibold text-blue-900">พบ {resultCount.toLocaleString('th-TH')} รายการ</span>
        </div>

        {/* Chips Container - Horizontal Scroll on Mobile */}
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            {activeFilters.map((filter, index) => (
              <div
                key={`${filter.type}-${index}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter.highlight
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
                  }`}
              >
                <span>{filter.label}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFilter(filter)}
                  className={`ml-0.5 p-0.5 rounded-full hover:bg-opacity-20 transition ${filter.highlight
                      ? 'hover:bg-white/30 text-white'
                      : 'hover:bg-blue-200 text-blue-700'
                    }`}
                  aria-label={`ลบ ${filter.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Clear All Button */}
        <button
          type="button"
          onClick={onClearAll}
          className="flex-shrink-0 px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition whitespace-nowrap"
        >
          ล้างทั้งหมด
        </button>
      </div>
    </div>
  )
}
