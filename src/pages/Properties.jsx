import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useSearch } from '../context/SearchContext'
import { getPropertiesSnapshot } from '../lib/firestore'
import PageLayout from '../components/PageLayout'
import PropertyCard from '../components/PropertyCard'
import PropertiesMap from '../components/PropertiesMap'
import FilterSidebar from '../components/FilterSidebar'
import ActiveSearchCriteriaBar from '../components/ActiveSearchCriteriaBar'
import { SlidersHorizontal, Search, X } from 'lucide-react'
import { searchProperties } from '../lib/smartSearch'
import { filterProperties } from '../lib/globalSearch'
import { useTypingPlaceholder } from '../components/TypingPlaceholder'

export default function Properties() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  // Safety check for useSearch context
  let filters, updateFilters, clearFilters
  try {
    const searchContext = useSearch()
    filters = searchContext?.filters || {}
    updateFilters = searchContext?.updateFilters || (() => {})
    clearFilters = searchContext?.clearFilters || (() => {})
  } catch (error) {
    console.error('SearchContext error:', error)
    filters = {}
    updateFilters = () => {}
    clearFilters = () => {}
  }
  
  const [properties, setProperties] = useState([])
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false)
  
  // State Separation: แยกตัวแปรออกเป็น 2 ตัว
  // Priority: 'search' parameter (from tag clicks) > 'q' parameter (from manual search)
  const initialKeyword = searchParams.get('search') || searchParams.get('q') || ''
  const [searchQuery, setSearchQuery] = useState(initialKeyword) // ค่าจริงที่ผู้ใช้พิมพ์ (State Update Only)
  const [debouncedKeyword, setDebouncedKeyword] = useState(initialKeyword) // ค่าที่ใช้สำหรับ Filter (อัปเดตเมื่อกดปุ่มค้นหาเท่านั้น)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  
  // Typing animation สำหรับ placeholder (Decoupled จาก searchQuery)
  const TYPING_PHRASES = [
    'บ้านมือสอง',
    'คอนโดผ่อนตรง',
    'ทาวน์โฮมใกล้นิคม',
    'บ้านเดี่ยวชลบุรี',
    'คอนโดอมตะนคร',
  ]
  const { displayText: typingPlaceholder, stop: stopTyping, start: startTyping } = useTypingPlaceholder(
    TYPING_PHRASES,
    100,
    50,
    2000
  )
  
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
    try {
      const unsub = getPropertiesSnapshot((props) => {
      if (Array.isArray(props)) {
        setProperties(props)
      } else {
        setProperties([])
      }
      })
      return () => {
        try {
          if (unsub && typeof unsub === 'function') {
            unsub()
          }
        } catch (error) {
          console.error('Error unsubscribing from properties:', error)
        }
      }
    } catch (error) {
      console.error('Error loading properties:', error)
      setProperties([])
    }
  }, [])

  // Determine buy/rent from URL
  const typeParam = searchParams.get('type')
  const isRentalFilter = typeParam === 'rent' ? true : typeParam === 'buy' ? false : null

  // Sync searchQuery and debouncedKeyword with URL (เมื่อ URL เปลี่ยนจากภายนอกเท่านั้น)
  // ไม่ sync เมื่อผู้ใช้กำลังพิมพ์ (เพื่อป้องกันการ reset ค่า)
  const prevSearchParamsRef = useRef(searchParams.toString())
  useEffect(() => {
    const currentParams = searchParams.toString()
    const urlKeyword = searchParams.get('q') || ''
    const urlSearch = searchParams.get('search') || '' // Check for 'search' parameter from tag clicks
    
    // ตรวจสอบว่า URL เปลี่ยนจากภายนอกจริงๆ (ไม่ใช่จากการกดปุ่มค้นหา)
    const isExternalChange = prevSearchParamsRef.current !== currentParams
    
    if (isExternalChange) {
      // Priority: 'search' parameter (from tag clicks) > 'q' parameter (from manual search)
      const keywordToUse = urlSearch || urlKeyword
      
      if (keywordToUse) {
        // Sync เฉพาะเมื่อ URL เปลี่ยนจากภายนอก (เช่น จาก navigation หรือ share link หรือ tag click)
        setDebouncedKeyword(keywordToUse)
        setSearchQuery(keywordToUse) // Sync searchQuery ด้วย
        
        // If 'search' parameter exists, also update 'q' parameter for consistency
        if (urlSearch && !urlKeyword) {
          const params = new URLSearchParams(searchParams)
          params.set('q', urlSearch)
          params.delete('search') // Remove 'search' parameter after converting to 'q'
          navigate(`/properties?${params.toString()}`, { replace: true })
        }
      } else {
        // If no keyword, sync empty state
        setDebouncedKeyword('')
        setSearchQuery('')
      }
    }
    
    prevSearchParamsRef.current = currentParams
  }, [searchParams, navigate])

  // Strict Focus Logic: หยุด animation เมื่อ focus, เริ่มใหม่เมื่อ blur และไม่มีค่า
  // ใช้ useRef เพื่อป้องกัน re-render บ่อย
  const prevSearchQueryRef = useRef(searchQuery)
  useEffect(() => {
    if (isSearchFocused) {
      stopTyping()
    } else if (!searchQuery.trim() && prevSearchQueryRef.current !== searchQuery) {
      // เริ่ม animation เฉพาะเมื่อ searchQuery เปลี่ยนจากมีค่าเป็นไม่มีค่า
      startTyping()
    }
    prevSearchQueryRef.current = searchQuery
  }, [isSearchFocused, searchQuery, stopTyping, startTyping])

  // Normalize propertySubStatus: แปลง 'มือ1' หรือ 'มือ2' จาก URL เป็น 'มือ 1' หรือ 'มือ 2'
  const normalizeSubStatusFromURL = (status) => {
    if (!status) return ''
    const normalized = String(status).trim().replace(/\s+/g, '').toLowerCase()
    if (normalized === 'มือ1' || normalized === 'มือ 1') return 'มือ 1'
    if (normalized === 'มือ2' || normalized === 'มือ 2') return 'มือ 2'
    return status // คืนค่าเดิมถ้าไม่ใช่มือ1/มือ2
  }

  // URL Parameter Parsing: ดึงค่าจาก URL และตั้งค่า Filter State
  useEffect(() => {
    try {
      const location = searchParams.get('location') ?? ''
      const propertyType = searchParams.get('type') || searchParams.get('propertyType') || ''
      const listingType = searchParams.get('listingType') || ''
      const subListingType = searchParams.get('subListingType') || ''
      const propertyCondition = searchParams.get('propertyCondition') || ''
      const availability = searchParams.get('availability') || ''
      const priceMin = searchParams.get('priceMin') ?? ''
      const priceMax = searchParams.get('priceMax') ?? ''
      const bedrooms = searchParams.get('bedrooms') ?? ''
      const bathrooms = searchParams.get('bathrooms') ?? ''
      const areaMin = searchParams.get('areaMin') ?? ''
      const areaMax = searchParams.get('areaMax') ?? ''
      const statusParam = searchParams.get('status') ?? ''
      const propertySubStatus = normalizeSubStatusFromURL(statusParam)
      const feature = searchParams.get('feature') ?? ''
      const tag = searchParams.get('tag') ?? ''
      
      if (updateFilters) {
        updateFilters({ 
          location, 
          propertyType,
          listingType,
          subListingType,
          propertyCondition,
          availability,
          priceMin, 
          priceMax,
          bedrooms,
          bathrooms,
          areaMin,
          areaMax,
          propertySubStatus,
          feature,
          tag,
          isRental: isRentalFilter,
        })
      }
    } catch (error) {
      console.error('URL Parameter Parsing error:', error)
    }
  }, [searchParams, updateFilters, isRentalFilter])


  // AI Recommendation: URL State Synchronization
  const updateURL = useCallback((updates) => {
    const params = new URLSearchParams(searchParams)
    
    // Preserve type (buy/rent) if exists
    if (typeParam) params.set('type', typeParam)
    
    // Update params from updates object
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    
    navigate(`/properties?${params.toString()}`, { replace: true })
  }, [searchParams, navigate, typeParam])

  const handleSearch = () => {
    const updates = {
      location: filters.location,
      propertyType: filters.propertyType,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      bedrooms: filters.bedrooms,
      bathrooms: filters.bathrooms,
      areaMin: filters.areaMin,
      areaMax: filters.areaMax,
      q: debouncedKeyword,
      status: filters.propertySubStatus,
    }
    if (filters.tag) updates.tag = filters.tag
    updateURL(updates)
  }

  // State Update Only: onChange ทำหน้าที่เพียงแค่อัปเดตค่า State
  const handleKeywordChange = (value) => {
    setSearchQuery(value) // อัปเดต searchQuery เท่านั้น (ไม่ trigger การค้นหา)
  }

  // Button Action: ฟังก์ชันการกดปุ่มค้นหาหรือกด Enter
  const handleSearchButton = useCallback(() => {
    const trimmedQuery = searchQuery.trim()
    setDebouncedKeyword(trimmedQuery) // อัปเดต debouncedKeyword เพื่อ trigger การค้นหา
    
    // Update URL Parameters
    const params = new URLSearchParams(searchParams)
    if (trimmedQuery) {
      params.set('q', trimmedQuery)
    } else {
      //params.delete('q')
    }
    if (typeParam) params.set('type', typeParam)
    
    // อัปเดต prevSearchParamsRef ก่อน navigate เพื่อป้องกัน useEffect sync กลับ
    prevSearchParamsRef.current = params.toString()
    
    navigate(`/properties?${params.toString()}`, { replace: false })
  }, [searchQuery, searchParams, navigate, typeParam])

  // Handle Enter Key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearchButton()
    }
  }, [handleSearchButton])

  // Clear Search Handler
  const handleClearSearch = () => {
    setSearchQuery('')
    setDebouncedKeyword('')
    // Update URL to remove both 'q' and 'search' parameters
    const params = new URLSearchParams(searchParams)
    params.delete('q')
    params.delete('search') // Also remove 'search' parameter from tag clicks
    if (typeParam) params.set('type', typeParam)
    navigate(`/properties?${params.toString()}`, { replace: true })
    // Focus back to input
    const inputElement = document.querySelector('input[type="text"][placeholder*="ค้นหา"]')
    if (inputElement) {
      setTimeout(() => inputElement.focus(), 100)
    }
  }

  const handleClearFilters = () => {
    clearFilters()
    setSearchQuery('')
    setDebouncedKeyword('')
    const params = new URLSearchParams()
    params.delete('q')
    params.delete('search')
    params.delete('tag')
    if (typeParam) params.set('type', typeParam)
    navigate(`/properties?${params.toString()}`, { replace: true })
  }

  // Handle Remove Individual Filter
  const handleRemoveFilter = useCallback((filter) => {
    const params = new URLSearchParams(searchParams)
    
    switch (filter.type) {
      case 'keyword':
        setSearchQuery('')
        setDebouncedKeyword('') // Clear debouncedKeyword เพื่อล้างผลการค้นหา
        params.delete('q')
        params.delete('search') // Also remove 'search' parameter
        break
      case 'isRental':
        updateFilters({ isRental: null })
        params.delete('type')
        break
      case 'propertySubStatus':
        updateFilters({ propertySubStatus: '' })
        params.delete('status')
        break
      case 'feature':
        params.delete('feature')
        updateFilters({ feature: '' })
        break
      case 'propertyType':
        updateFilters({ propertyType: '' })
        params.delete('propertyType')
        break
      case 'location':
        updateFilters({ location: '' })
        params.delete('location')
        break
      case 'tag':
        updateFilters({ tag: '' })
        params.delete('tag')
        break
      case 'price':
        updateFilters({ priceMin: '', priceMax: '' })
        params.delete('priceMin')
        params.delete('priceMax')
        break
      case 'bedrooms':
        updateFilters({ bedrooms: '' })
        params.delete('bedrooms')
        break
      case 'bathrooms':
        updateFilters({ bathrooms: '' })
        params.delete('bathrooms')
        break
      case 'area':
        updateFilters({ areaMin: '', areaMax: '' })
        params.delete('areaMin')
        params.delete('areaMax')
        break
      default:
        break
    }
    
    // Preserve type if exists
    if (typeParam) params.set('type', typeParam)
    
    navigate(`/properties?${params.toString()}`, { replace: true })
  }, [searchParams, navigate, typeParam, updateFilters])

  // Unified Global Search with Combined Filtering (AND Logic)
  // Uses centralized filterProperties function for consistent filtering
  const filtered = useMemo(() => {
    try {
      if (!Array.isArray(properties)) {
        return []
      }
      
      // Build filter object from URL params and state
      const searchFilters = {
        keyword: debouncedKeyword || '',
        tag: filters?.tag || searchParams.get('tag') || '',
        location: filters?.location || searchParams.get('location') || '',
        type: filters?.propertyType || searchParams.get('type') || searchParams.get('propertyType') || '',
        listingType: filters?.listingType || searchParams.get('listingType') || '',
        subListingType: filters?.subListingType || searchParams.get('subListingType') || '',
        propertyCondition: filters?.propertyCondition || searchParams.get('propertyCondition') || '',
        availability: filters?.availability || searchParams.get('availability') || '',
        minPrice: filters?.priceMin || searchParams.get('priceMin') || '',
        maxPrice: filters?.priceMax || searchParams.get('priceMax') || '',
        bedrooms: filters?.bedrooms || searchParams.get('bedrooms') || '',
        bathrooms: filters?.bathrooms || searchParams.get('bathrooms') || '',
        areaMin: filters?.areaMin || searchParams.get('areaMin') || '',
        areaMax: filters?.areaMax || searchParams.get('areaMax') || '',
      }

      // Use Unified Global Search
      const result = filterProperties(properties, searchFilters)
      
      // Ensure result is an array
      if (!Array.isArray(result)) {
        return []
      }
      
      return result
    } catch (error) {
      console.error('Search error:', error)
      // Return empty array instead of crashing
      return []
    }
  }, [properties, debouncedKeyword, filters, searchParams])

  const pageTitle = isRentalFilter === true ? 'ทรัพย์สินให้เช่า' : isRentalFilter === false ? 'ทรัพย์สินขาย' : 'รายการประกาศ'
  const heroTitle = isRentalFilter === true ? 'ทรัพย์สินให้เช่า' : isRentalFilter === false ? 'ทรัพย์สินขาย' : 'SPS Property Solution'
  const heroSubtitle = isRentalFilter === true ? 'ค้นหาบ้านที่ใช่สำหรับคุณ' : isRentalFilter === false ? 'ค้นหาบ้านที่ใช่สำหรับคุณ' : 'บ้านคอนโดสวย อมตะซิตี้ ชลบุรี'

  // Safety check: Ensure filtered is always an array
  const safeFiltered = Array.isArray(filtered) ? filtered : []

  // Debug logging removed for production

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
              {safeFiltered.length > 0 && (
                <p className="text-slate-600 text-sm">
                  พบ <span className="font-semibold text-blue-900">{safeFiltered.length}</span> รายการ
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

          {/* Global Keyword Search with Button Trigger */}
          <div className="mb-6">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none z-10" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleKeywordChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setIsSearchFocused(true)
                    stopTyping() // หยุด animation ทันทีเมื่อ focus
                  }}
                  onBlur={() => {
                    setIsSearchFocused(false)
                    if (!searchQuery.trim()) {
                      startTyping() // เริ่ม animation ใหม่เมื่อ blur และไม่มีค่า
                    }
                  }}
                  placeholder={isSearchFocused ? "ค้นหาทำเล, รหัสทรัพย์..." : (!searchQuery.trim() ? typingPlaceholder : "ค้นหา: ชื่อประกาศ, รหัสทรัพย์, Tags, ประเภท, รายละเอียด หรือราคา (เช่น '2.5 ล้าน', '2500000')")}
                  className="w-full pl-12 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition"
                />
                {/* Clear Search Button (X) */}
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 transition-colors z-10"
                    aria-label="ล้างการค้นหา"
                    title="ล้างการค้นหา"
                  >
                    <X className="h-4 w-4 text-slate-500 hover:text-slate-700" />
                  </button>
                )}
              </div>
              {/* Search Button */}
              <button
                type="button"
                onClick={handleSearchButton}
                className="flex-shrink-0 inline-flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 whitespace-nowrap"
                aria-label="ค้นหา"
              >
                <Search className="h-5 w-5" />
                <span className="hidden sm:inline">ค้นหา</span>
              </button>
            </div>
            {debouncedKeyword && (
              <p className="text-xs text-slate-500 mt-2">
                ผลการค้นหา: <span className="font-medium">{debouncedKeyword}</span>
              </p>
            )}
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
              {/* Active Search Criteria Bar */}
              <ActiveSearchCriteriaBar
                keyword={debouncedKeyword}
                filters={{
                  ...filters,
                  tag: searchParams.get('tag') || filters.tag || '',
                  isRental: isRentalFilter !== null ? isRentalFilter : filters.isRental,
                  feature: searchParams.get('feature') || filters.feature || '',
                }}
                resultCount={safeFiltered.length}
                onRemoveFilter={handleRemoveFilter}
                onClearAll={handleClearFilters}
              />

        {/* Properties Map */}
        {safeFiltered.length > 0 && (
          <div className="mb-8">
            <PropertiesMap properties={safeFiltered} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {safeFiltered.map((p) => {
            if (!p || !p.id) {
              return null
            }
            try {
              return <PropertyCard key={p.id} property={p} searchQuery={debouncedKeyword} />
            } catch (error) {
              // Keep error logging for critical errors
              if (process.env.NODE_ENV === 'development') {
                console.error('Error rendering PropertyCard:', error, p)
              }
              return null
            }
          })}
        </div>
        {safeFiltered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-6">ไม่พบรายการที่ตรงกับเงื่อนไข</p>
            {/* AI Recommendation: Empty State with Services */}
            <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl p-8 max-w-2xl mx-auto">
              <h3 className="text-xl font-bold text-blue-900 mb-4">บริการแนะนำ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  to="/loan-services"
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition border border-blue-100"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                    <h4 className="font-semibold text-blue-900">ปิดหนี้ / รวมหนี้</h4>
                  </div>
                  <p className="text-sm text-slate-600">บริการปิดหนี้ รวมหนี้ ผ่อนทางเดียว</p>
                </Link>
                <Link
                  to="/loan-services"
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition border border-blue-100"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <span className="text-2xl">🏦</span>
                    </div>
                    <h4 className="font-semibold text-blue-900">สินเชื่อครบวงจร</h4>
                  </div>
                  <p className="text-sm text-slate-600">บริการสินเชื่อครบวงจรทุกขั้นตอน</p>
                </Link>
              </div>
            </div>
          </div>
        )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
