import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useSearch } from '../context/SearchContext'
import { getPropertiesSnapshot } from '../lib/firestore'
import PageLayout from '../components/PageLayout'
import AdvanceSearch from '../components/AdvanceSearch'
import PropertyCard from '../components/PropertyCard'
import PropertiesMap from '../components/PropertiesMap'
import FilterSidebar from '../components/FilterSidebar'
import { SlidersHorizontal } from 'lucide-react'

export default function Properties() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { filters, updateFilters, clearFilters } = useSearch()
  const [properties, setProperties] = useState([])
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false)
  
  // Auto-open filter sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setFilterSidebarOpen(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const unsub = getPropertiesSnapshot(setProperties)
    return () => unsub()
  }, [])

  // Determine buy/rent from URL
  const typeParam = searchParams.get('type')
  const isRentalFilter = typeParam === 'rent' ? true : typeParam === 'buy' ? false : null

  useEffect(() => {
    const location = searchParams.get('location') ?? ''
    const propertyType = searchParams.get('propertyType') ?? ''
    const priceMin = searchParams.get('priceMin') ?? ''
    const priceMax = searchParams.get('priceMax') ?? ''
    const bedrooms = searchParams.get('bedrooms') ?? ''
    const bathrooms = searchParams.get('bathrooms') ?? ''
    const areaMin = searchParams.get('areaMin') ?? ''
    const areaMax = searchParams.get('areaMax') ?? ''
    
    updateFilters({ 
      location, 
      propertyType, 
      priceMin, 
      priceMax,
      bedrooms,
      bathrooms,
      areaMin,
      areaMax,
      isRental: isRentalFilter,
    })
  }, [searchParams, updateFilters, isRentalFilter])

  const handleSearch = () => {
    const params = new URLSearchParams()
    
    // Preserve type (buy/rent) if exists
    if (typeParam) params.set('type', typeParam)
    
    if (filters.location) params.set('location', filters.location)
    if (filters.propertyType) params.set('propertyType', filters.propertyType)
    if (filters.priceMin) params.set('priceMin', filters.priceMin)
    if (filters.priceMax) params.set('priceMax', filters.priceMax)
    if (filters.bedrooms) params.set('bedrooms', filters.bedrooms)
    if (filters.bathrooms) params.set('bathrooms', filters.bathrooms)
    if (filters.areaMin) params.set('areaMin', filters.areaMin)
    if (filters.areaMax) params.set('areaMax', filters.areaMax)
    
    navigate(`/properties?${params.toString()}`)
  }

  const handleClearFilters = () => {
    clearFilters()
    const params = new URLSearchParams()
    if (typeParam) params.set('type', typeParam)
    navigate(`/properties?${params.toString()}`)
  }

  const filtered = useMemo(() => {
    let list = properties.filter((p) => p.status === 'available')

    const toSearchStr = (val) => (val != null && typeof val === 'string' ? val : String(val ?? '')).trim()

    // Filter by buy/rent
    if (isRentalFilter !== null) {
      list = list.filter((p) => Boolean(p.isRental) === isRentalFilter)
    }

    const locationRaw = searchParams?.get?.('location') ?? filters?.location ?? ''
    const location = toSearchStr(locationRaw).toLowerCase()

    const typeRaw = searchParams?.get?.('propertyType') ?? filters?.propertyType ?? ''
    const type = toSearchStr(typeRaw)

    const priceMinRaw = searchParams?.get?.('priceMin') ?? filters?.priceMin ?? ''
    const priceMaxRaw = searchParams?.get?.('priceMax') ?? filters?.priceMax ?? ''
    const priceMin = Math.max(0, Number(priceMinRaw) || 0)
    const priceMax = Number(priceMaxRaw) > 0 ? Number(priceMaxRaw) : Infinity

    const bedroomsRaw = searchParams?.get?.('bedrooms') ?? filters?.bedrooms ?? ''
    const bedrooms = bedroomsRaw ? Number(bedroomsRaw) : null

    const bathroomsRaw = searchParams?.get?.('bathrooms') ?? filters?.bathrooms ?? ''
    const bathrooms = bathroomsRaw ? Number(bathroomsRaw) : null

    const areaMinRaw = searchParams?.get?.('areaMin') ?? filters?.areaMin ?? ''
    const areaMaxRaw = searchParams?.get?.('areaMax') ?? filters?.areaMax ?? ''
    const areaMin = Number(areaMinRaw) || 0
    const areaMax = Number(areaMaxRaw) > 0 ? Number(areaMaxRaw) : Infinity

    if (location.length > 0) {
      list = list.filter((p) => {
        const province = toSearchStr(p?.location?.province).toLowerCase()
        const district = toSearchStr(p?.location?.district).toLowerCase()
        return province.includes(location) || district.includes(location)
      })
    }
    if (type.length > 0) {
      list = list.filter((p) => p?.type === type)
    }
    if (priceMin > 0 || priceMax < Infinity) {
      list = list.filter((p) => {
        const price = Number(p?.price) || 0
        return price >= priceMin && price <= priceMax
      })
    }
    if (bedrooms !== null) {
      list = list.filter((p) => {
        const pBedrooms = Number(p?.bedrooms) || 0
        if (bedrooms === 5) return pBedrooms >= 5
        return pBedrooms === bedrooms
      })
    }
    if (bathrooms !== null) {
      list = list.filter((p) => {
        const pBathrooms = Number(p?.bathrooms) || 0
        if (bathrooms === 4) return pBathrooms >= 4
        return pBathrooms === bathrooms
      })
    }
    if (areaMin > 0 || areaMax < Infinity) {
      list = list.filter((p) => {
        const area = Number(p?.area) || 0
        return area >= areaMin && area <= areaMax
      })
    }
    return list
  }, [searchParams, filters, properties, isRentalFilter])

  const pageTitle = isRentalFilter === true ? 'ทรัพย์สินให้เช่า' : isRentalFilter === false ? 'ทรัพย์สินขาย' : 'รายการประกาศ'
  const heroTitle = isRentalFilter === true ? 'ทรัพย์สินให้เช่า' : isRentalFilter === false ? 'ทรัพย์สินขาย' : 'SPS Property Solution'
  const heroSubtitle = isRentalFilter === true ? 'ค้นหาบ้านที่ใช่สำหรับคุณ' : isRentalFilter === false ? 'ค้นหาบ้านที่ใช่สำหรับคุณ' : 'บ้านคอนโดสวย อมตะซิตี้ ชลบุรี'

  return (
    <PageLayout 
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      searchComponent={null}
    >
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">{pageTitle}</h1>
            <div className="flex items-center gap-4">
              {filtered.length > 0 && (
                <p className="text-slate-600 text-sm">
                  พบ <span className="font-semibold text-blue-900">{filtered.length}</span> รายการ
                </p>
              )}
              <button
                onClick={() => setFilterSidebarOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                <SlidersHorizontal className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">กรอง</span>
              </button>
            </div>
          </div>
        
          <div className="flex gap-6">
            {/* Filter Sidebar */}
            <FilterSidebar
              filters={filters}
              onUpdateFilters={updateFilters}
              onApply={handleSearch}
              onClear={handleClearFilters}
              isOpen={filterSidebarOpen}
              onClose={() => setFilterSidebarOpen(false)}
            />

            <div className="flex-1">
              {/* Advance Search */}
              <AdvanceSearch
                filters={filters}
                onUpdateFilters={updateFilters}
                onSearch={handleSearch}
                onClear={handleClearFilters}
              />

        {/* Properties Map */}
        {filtered.length > 0 && (
          <div className="mb-8">
            <PropertiesMap properties={filtered} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
              {filtered.length === 0 && (
                <p className="text-center text-slate-500 py-12">ไม่พบรายการที่ตรงกับเงื่อนไข</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
