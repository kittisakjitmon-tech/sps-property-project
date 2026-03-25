import { useState } from 'react'
import { ChevronDown, DollarSign, Bed, Bath, Maximize2, X } from 'lucide-react'

/**
 * AdvancedFiltersPanel - Collapsible panel for advanced property filters
 * แสดงตัวกรองขั้นสูง (ราคา, ห้องนอน, ห้องน้ำ, พื้นที่) แบบ Progressive Disclosure
 */
export default function AdvancedFiltersPanel({ filters, onUpdateFilters, onApply }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleApplyFilters = () => {
    onApply()
    setIsExpanded(false) // ปิด panel หลังจากกดนำค่ากรอง
  }

  const handleClearAdvancedFilters = () => {
    onUpdateFilters({
      priceMin: '',
      priceMax: '',
      bedrooms: '',
      bathrooms: '',
      areaMin: '',
      areaMax: '',
    })
  }

  // Count active advanced filters
  const activeCount = [
    filters.priceMin,
    filters.priceMax,
    filters.bedrooms,
    filters.bathrooms,
    filters.areaMin,
    filters.areaMax,
  ].filter(Boolean).length

  return (
    <div className="mb-6">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-5 py-3 rounded-xl border-2 transition-all duration-200 ${
          isExpanded
            ? 'bg-blue-50 border-blue-500 text-blue-900'
            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">ตัวกรองเพิ่มเติม</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-xs font-bold">
              {activeCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expandable Panel */}
      {isExpanded && (
        <div className="mt-3 p-6 bg-white border-2 border-blue-100 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-6">
            {/* ราคา */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <div className="p-1.5 rounded-lg bg-green-100 text-green-700">
                  <DollarSign className="h-4 w-4" />
                </div>
                ราคา (บาท)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="ราคาต่ำสุด"
                  value={filters.priceMin || ''}
                  onChange={(e) => onUpdateFilters({ priceMin: e.target.value })}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <input
                  type="number"
                  placeholder="ราคาสูงสุด"
                  value={filters.priceMax || ''}
                  onChange={(e) => onUpdateFilters({ priceMax: e.target.value })}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* พื้นที่ */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <Maximize2 className="h-4 w-4" />
                </div>
                พื้นที่ (ตร.ว.)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="ขั้นต่ำ"
                  value={filters.areaMin || ''}
                  onChange={(e) => onUpdateFilters({ areaMin: e.target.value })}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <input
                  type="number"
                  placeholder="สูงสุด"
                  value={filters.areaMax || ''}
                  onChange={(e) => onUpdateFilters({ areaMax: e.target.value })}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* ห้องนอน */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                  <Bed className="h-4 w-4" />
                </div>
                ห้องนอน
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, '5+'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onUpdateFilters({ bedrooms: String(num) })}
                    className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                      filters.bedrooms === String(num)
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                {filters.bedrooms && (
                  <button
                    type="button"
                    onClick={() => onUpdateFilters({ bedrooms: '' })}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    title="ล้าง"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* ห้องน้ำ */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700">
                  <Bath className="h-4 w-4" />
                </div>
                ห้องน้ำ
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, '4+'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onUpdateFilters({ bathrooms: String(num) })}
                    className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                      filters.bathrooms === String(num)
                        ? 'bg-cyan-600 border-cyan-600 text-white shadow-md'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-cyan-400'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                {filters.bathrooms && (
                  <button
                    type="button"
                    onClick={() => onUpdateFilters({ bathrooms: '' })}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    title="ล้าง"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              นำค่ากรอง
            </button>
            <button
              type="button"
              onClick={handleClearAdvancedFilters}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
            >
              ล้างทั้งหมด
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
