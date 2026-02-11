import { useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'

export default function FilterSidebar({ filters, onUpdateFilters, onApply, onClear, isOpen, onClose }) {
  const [localFilters, setLocalFilters] = useState(filters)

  const handleChange = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleApply = () => {
    onUpdateFilters(localFilters)
    onApply()
    onClose()
  }

  const handleClear = () => {
    const cleared = {
      priceMin: '',
      priceMax: '',
      bedrooms: '',
    }
    setLocalFilters(cleared)
    onUpdateFilters(cleared)
    onClear()
  }

  return (
    <>
      {/* Overlay - Mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 transition-transform lg:relative lg:shadow-sm lg:rounded-2xl lg:w-64 lg:h-auto lg:translate-x-0 overflow-y-auto ${
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-blue-900" />
              <h2 className="text-lg font-bold text-blue-900">กรองผลการค้นหา</h2>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">ช่วงราคา (บาท)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">ราคาต่ำสุด</label>
                <input
                  type="number"
                  value={localFilters.priceMin || ''}
                  onChange={(e) => handleChange('priceMin', e.target.value)}
                  placeholder="เช่น 1000000"
                  className="w-full px-3 py-2 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">ราคาสูงสุด</label>
                <input
                  type="number"
                  value={localFilters.priceMax || ''}
                  onChange={(e) => handleChange('priceMax', e.target.value)}
                  placeholder="เช่น 5000000"
                  className="w-full px-3 py-2 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0"
                />
              </div>
            </div>
          </div>

          {/* Bedrooms */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">จำนวนห้องนอน</h3>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, '5+'].map((bed) => (
                <button
                  key={bed}
                  type="button"
                  onClick={() => handleChange('bedrooms', bed === '5+' ? '5' : String(bed))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    localFilters.bedrooms === String(bed === '5+' ? '5' : bed)
                      ? 'bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-sm'
                      : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                  }`}
                >
                  {bed === '5+' ? '5+' : bed} ห้อง
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-slate-200">
            <button
              onClick={handleApply}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-900 to-blue-700 text-white font-semibold rounded-xl hover:shadow-md transition-all duration-300"
            >
              ใช้การกรอง
            </button>
            <button
              onClick={handleClear}
              className="w-full px-4 py-2 bg-gray-100 text-slate-700 rounded-xl hover:bg-gray-200 transition-all border-0"
            >
              ล้างการกรอง
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
