import { useState } from 'react'
import { X, Filter, Search } from 'lucide-react'
import LocationAutocomplete from './LocationAutocomplete'
import { PROPERTY_TYPES } from '../constants/propertyTypes'

export default function AdvanceSearch({ filters, onUpdateFilters, onSearch, onClear }) {
  const [isOpen, setIsOpen] = useState(false)

  const hasActiveFilters =
    filters.location ||
    filters.propertyType ||
    filters.priceMin ||
    filters.priceMax ||
    filters.bedrooms ||
    filters.bathrooms ||
    filters.areaMin ||
    filters.areaMax ||
    filters.isRental !== null

  return (
    <>
      {/* Toggle Button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${isOpen || hasActiveFilters
              ? 'bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-sm'
              : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
            }`}
        >
          <Filter className="h-5 w-5" />
          ค้นหาขั้นสูง
          {hasActiveFilters && (
            <span className="ml-1 px-2 py-0.5 bg-white text-blue-900 rounded-full text-xs font-semibold">
              {Object.values(filters).filter(v => v !== '' && v !== null).length}
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onClear()
              setIsOpen(false)
            }}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ล้างทั้งหมด
          </button>
        )}
      </div>

      {/* Search Panel */}
      {isOpen && (
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Location */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">พื้นที่</label>
              <LocationAutocomplete
                value={filters.location}
                onChange={(v) => onUpdateFilters({ location: v })}
                onSelect={(loc) => onUpdateFilters({ location: loc.displayName })}
                placeholder="ค้นหาพื้นที่ จังหวัด อำเภอ..."
              />
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ประเภททรัพย์</label>
              <select
                value={filters.propertyType}
                onChange={(e) => onUpdateFilters({ propertyType: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0"
              >
                <option value="">ทุกประเภท</option>
                {PROPERTY_TYPES.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ราคาต่ำสุด</label>
              <input
                type="number"
                value={filters.priceMin}
                onChange={(e) => onUpdateFilters({ priceMin: e.target.value })}
                placeholder="เช่น 1000000"
                className="w-full px-4 py-2 rounded-xl bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ราคาสูงสุด</label>
              <input
                type="number"
                value={filters.priceMax}
                onChange={(e) => onUpdateFilters({ priceMax: e.target.value })}
                placeholder="เช่น 5000000"
                className="w-full px-4 py-2 rounded-xl bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0"
              />
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ห้องนอน</label>
              <select
                value={filters.bedrooms}
                onChange={(e) => onUpdateFilters({ bedrooms: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0"
              >
                <option value="">ทั้งหมด</option>
                <option value="1">1 ห้อง</option>
                <option value="2">2 ห้อง</option>
                <option value="3">3 ห้อง</option>
                <option value="4">4 ห้อง</option>
                <option value="5">5+ ห้อง</option>
              </select>
            </div>

            {/* Bathrooms */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ห้องน้ำ</label>
              <select
                value={filters.bathrooms}
                onChange={(e) => onUpdateFilters({ bathrooms: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0"
              >
                <option value="">ทั้งหมด</option>
                <option value="1">1 ห้อง</option>
                <option value="2">2 ห้อง</option>
                <option value="3">3 ห้อง</option>
                <option value="4">4+ ห้อง</option>
              </select>
            </div>

            {/* Area Range (ตร.ว. - 1 ตร.ว = 4 ตร.ม) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">พื้นที่ต่ำสุด (ตร.ว.)</label>
              <input
                type="number"
                value={filters.areaMin ? String(Number(filters.areaMin) / 4) : ''}
                onChange={(e) => onUpdateFilters({ areaMin: e.target.value ? String(Math.round(Number(e.target.value) * 4)) : '' })}
                placeholder="เช่น 12"
                className="w-full px-4 py-2 rounded-xl bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">พื้นที่สูงสุด (ตร.ว.)</label>
              <input
                type="number"
                value={filters.areaMax ? String(Number(filters.areaMax) / 4) : ''}
                onChange={(e) => onUpdateFilters({ areaMax: e.target.value ? String(Math.round(Number(e.target.value) * 4)) : '' })}
                placeholder="เช่น 50"
                className="w-full px-4 py-2 rounded-xl bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                onClear()
                setIsOpen(false)
              }}
              className="px-6 py-2 rounded-xl bg-gray-100 text-slate-700 hover:bg-gray-200 transition-all"
            >
              ล้าง
            </button>
            <button
              type="button"
              onClick={() => {
                onSearch()
                setIsOpen(false)
              }}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white font-medium hover:shadow-md transition-all duration-300"
            >
              <Search className="h-5 w-5" />
              ค้นหา
            </button>
          </div>
        </div>
      )}
    </>
  )
}
