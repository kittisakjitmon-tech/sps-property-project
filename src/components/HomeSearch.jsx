import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import LocationAutocomplete from './LocationAutocomplete'
import { useSearch } from '../context/SearchContext'

const propertyTypes = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'คอนโดมิเนียม', label: 'คอนโดมิเนียม' },
  { value: 'บ้านเดี่ยว', label: 'บ้านเดี่ยว' },
  { value: 'ทาวน์โฮม', label: 'ทาวน์โฮม' },
  { value: 'วิลล่า', label: 'วิลล่า' },
  { value: 'บ้านเช่า', label: 'บ้านเช่า' },
]

export default function HomeSearch() {
  const navigate = useNavigate()
  const { filters, updateFilters } = useSearch()

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (filters.location) params.set('location', filters.location)
    if (filters.propertyType) params.set('type', filters.propertyType)
    if (filters.priceMin) params.set('priceMin', filters.priceMin)
    if (filters.priceMax) params.set('priceMax', filters.priceMax)
    navigate(`/properties?${params.toString()}`)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
        <div className="md:col-span-2">
          <LocationAutocomplete
            value={filters.location}
            onChange={(v) => updateFilters({ location: v })}
            onSelect={(loc) => updateFilters({ location: loc.displayName })}
            placeholder="ค้นหาพื้นที่ จังหวัด อำเภอ..."
          />
        </div>
        <div>
          <select
            value={filters.propertyType}
            onChange={(e) => updateFilters({ propertyType: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-gray-100 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0"
          >
            {propertyTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="ราคาต่ำสุด (บาท)"
            value={filters.priceMin}
            onChange={(e) => updateFilters({ priceMin: e.target.value })}
            className="flex-1 min-w-0 px-3 py-3 rounded-xl bg-gray-100 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0"
          />
          <input
            type="number"
            placeholder="ราคาสูงสุด"
            value={filters.priceMax}
            onChange={(e) => updateFilters({ priceMax: e.target.value })}
            className="flex-1 min-w-0 px-3 py-3 rounded-xl bg-gray-100 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={handleSearch}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-md"
        >
          <Search className="h-5 w-5" />
          ค้นหา
        </button>
      </div>
    </>
  )
}
