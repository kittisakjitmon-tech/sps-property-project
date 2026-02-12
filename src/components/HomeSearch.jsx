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

const listingTypes = [
  { value: '', label: 'ทุกประเภทการดีล' },
  { value: 'sale', label: 'ซื้อ' },
  { value: 'rent', label: 'เช่า/ผ่อนตรง' },
]

export default function HomeSearch() {
  const navigate = useNavigate()
  const { filters, updateFilters } = useSearch()

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (filters.location) params.set('location', filters.location)
    if (filters.propertyType) params.set('type', filters.propertyType)
    if (filters.listingType) params.set('listingType', filters.listingType)
    if (filters.priceMin) params.set('priceMin', filters.priceMin)
    if (filters.priceMax) params.set('priceMax', filters.priceMax)
    navigate(`/properties?${params.toString()}`)
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Unified Container - Single Row */}
      <div className="bg-white rounded-full shadow-xl flex flex-col md:flex-row items-stretch md:items-center gap-0 overflow-hidden border border-slate-100">
        {/* Location Search - with Search Icon */}
        <div className="relative flex-1 md:flex-[2] min-w-0">
          <div className="relative">
            {/* Override MapPin with Search icon */}
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none z-10" />
            <LocationAutocomplete
              value={filters.location || ''}
              onChange={(v) => updateFilters({ location: v })}
              onSelect={(loc) => updateFilters({ location: loc.displayName })}
              placeholder="ค้นหาพื้นที่ จังหวัด อำเภอ..."
              className="w-full [&>div>svg]:hidden"
              inputClassName="w-full pl-12 pr-4 py-4 md:py-3 rounded-full md:rounded-none border-none bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 transition-all"
            />
          </div>
        </div>
        
        {/* Vertical Divider */}
        <div className="hidden md:block w-px h-8 bg-slate-200 self-center mx-1" />
        
        {/* Listing Type Dropdown */}
        <div className="flex-1 min-w-0 border-t md:border-t-0 md:border-r border-slate-200">
          <select
            value={filters.listingType || ''}
            onChange={(e) => updateFilters({ listingType: e.target.value })}
            className="w-full px-4 py-4 md:py-3 rounded-full md:rounded-none border-none bg-transparent text-slate-800 focus:outline-none focus:ring-0 transition-all appearance-none cursor-pointer"
          >
            {listingTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        {/* Vertical Divider */}
        <div className="hidden md:block w-px h-8 bg-slate-200 self-center mx-1" />
        
        {/* Property Type Dropdown */}
        <div className="flex-1 min-w-0 border-t md:border-t-0 md:border-r border-slate-200">
          <select
            value={filters.propertyType || ''}
            onChange={(e) => updateFilters({ propertyType: e.target.value })}
            className="w-full px-4 py-4 md:py-3 rounded-full md:rounded-none border-none bg-transparent text-slate-800 focus:outline-none focus:ring-0 transition-all appearance-none cursor-pointer"
          >
            {propertyTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        {/* Vertical Divider */}
        <div className="hidden md:block w-px h-8 bg-slate-200 self-center mx-1" />
        
        {/* Price Inputs */}
        <div className="flex-1 min-w-0 border-t md:border-t-0 md:border-r border-slate-200">
          <div className="flex gap-2 px-4 py-2 md:py-0">
            <input
              type="number"
              placeholder="ราคาต่ำสุด"
              value={filters.priceMin || ''}
              onChange={(e) => updateFilters({ priceMin: e.target.value })}
              className="flex-1 min-w-0 px-2 py-4 md:py-3 rounded-full md:rounded-none border-none bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 transition-all text-sm"
            />
            <span className="hidden md:inline-flex items-center text-slate-400">-</span>
            <input
              type="number"
              placeholder="ราคาสูงสุด"
              value={filters.priceMax || ''}
              onChange={(e) => updateFilters({ priceMax: e.target.value })}
              className="flex-1 min-w-0 px-2 py-4 md:py-3 rounded-full md:rounded-none border-none bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 transition-all text-sm"
            />
          </div>
        </div>
        
        {/* Vertical Divider */}
        <div className="hidden md:block w-px h-8 bg-slate-200 self-center mx-1" />
        
        {/* Search Button - Integrated in Row */}
        <div className="border-t md:border-t-0">
          <button
            type="button"
            onClick={handleSearch}
            className="w-full md:w-auto px-6 md:px-8 py-4 md:py-3 rounded-full md:rounded-none bg-gradient-to-r from-blue-900 to-blue-700 text-white font-semibold hover:from-blue-800 hover:to-blue-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Search className="h-5 w-5" />
            <span>ค้นหา</span>
          </button>
        </div>
      </div>
    </div>
  )
}
