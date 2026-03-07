import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react'
import { useSearch } from '../context/SearchContext'
import { getPropertiesOnce } from '../lib/firestore'
import PageLayout from '../components/PageLayout'
import PropertyCard from '../components/PropertyCard'
import ActiveSearchCriteriaBar from '../components/ActiveSearchCriteriaBar'
import AdvancedFiltersPanel from '../components/AdvancedFiltersPanel'
import RecommendedPropertiesSection from '../components/RecommendedPropertiesSection'
import {
  SlidersHorizontal, Search, X, Wallet, Landmark, SearchX,
  Home as HomeIcon, MapPin, Sparkles, ShieldCheck, ChevronDown
} from 'lucide-react'

const PropertiesMap = lazy(() => import('../components/PropertiesMap'))
import { searchProperties } from '../lib/smartSearch'
import { filterProperties } from '../lib/globalSearch'
import { useTypingPlaceholder } from '../components/TypingPlaceholder'
import { Helmet } from 'react-helmet-async'
import { PROPERTY_TYPES } from '../constants/propertyTypes'

// --- Reusable Modern Dropdown Component ---
const FilterItem = ({ label, value, options, onChange, icon: Icon, activeColor = 'text-blue-900' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value) || options[0]

  return (
    <div className="relative" ref={containerRef}>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-white border-2 transition-all duration-200 ${
          isOpen ? 'border-blue-900 shadow-md ring-4 ring-blue-900/5 bg-white' : 'border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg ${value ? 'bg-blue-100 ' + activeColor : 'bg-slate-200 text-slate-400'}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className={`text-sm font-semibold truncate ${value ? 'text-slate-900' : 'text-slate-500'}`}>
            {selectedOption.label}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full min-w-[200px] bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                value === opt.value 
                ? 'bg-blue-50 text-blue-900 font-bold' 
                : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
              {value === opt.value && <ShieldCheck className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Properties() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Safety check for useSearch context
  let filters, updateFilters, clearFilters
  try {
    const searchContext = useSearch()
    filters = searchContext?.filters || {}
    updateFilters = searchContext?.updateFilters || (() => { })
    clearFilters = searchContext?.clearFilters || (() => { })
  } catch (error) {
    console.error('SearchContext error:', error)
    filters = {}
    updateFilters = () => { }
    clearFilters = () => { }
  }

  const [properties, setProperties] = useState([])

  // State Separation: แยกตัวแปรออกเป็น 2 ตัว
  // Priority: 'search' parameter (from tag clicks) > 'q' parameter (from manual search)
  const initialKeyword = searchParams.get('search') || searchParams.get('q') || ''
  const [searchQuery, setSearchQuery] = useState(initialKeyword) // ค่าจริงที่ผู้ใช้พิมพ์ (State Update Only)
  const [debouncedKeyword, setDebouncedKeyword] = useState(initialKeyword) // ค่าที่ใช้สำหรับ Filter (อัปเดตเมื่อกดปุ่มค้นหาเท่านั้น)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [displayLimit, setDisplayLimit] = useState(12)
  const searchInputRef = useRef(null)

  // Auto-debounce effect: อัปเดต debouncedKeyword อัตโนมัติเมื่อผู้ใช้หยุดพิมพ์ 500ms
  useEffect(() => {
    if (searchQuery === debouncedKeyword) return
    
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchQuery)
      // อัปเดต URL ไปด้วยเพื่อให้แชร์ลิงก์ได้ทันที
      const params = new URLSearchParams(searchParams)
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim())
      } else {
        params.delete('q')
      }
      prevSearchParamsRef.current = params.toString()
      navigate(`/properties?${params.toString()}`, { replace: true })
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, navigate, searchParams, debouncedKeyword])

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

  useEffect(() => {
    let mounted = true
    const fetchProperties = async () => {
      try {
        const props = await getPropertiesOnce(true) // Fetch only available properties
        if (mounted) {
          setProperties(Array.isArray(props) ? props : [])
        }
      } catch (error) {
        console.error('Error loading properties:', error)
        if (mounted) setProperties([])
      }
    }
    
    fetchProperties()
    
    return () => {
      mounted = false
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
      const typeParam = searchParams.get('type') || ''
      const propertyTypeParam = searchParams.get('propertyType') || ''
      
      // If 'type' is 'buy' or 'rent', it's a listing type, not a property type
      const propertyType = propertyTypeParam || (['buy', 'rent'].includes(typeParam) ? '' : typeParam)
      
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
    setSearchQuery(value)
    if (!value.trim()) startTyping()
  }

  // Button Action: ฟังก์ชันการกดปุ่มค้นหาหรือกด Enter
  const handleSearchButton = useCallback(() => {
    const trimmedQuery = searchQuery.trim()
    setDebouncedKeyword(trimmedQuery)

    const params = new URLSearchParams(searchParams)
    if (trimmedQuery) {
      params.set('q', trimmedQuery)
    } else {
      params.delete('q')
    }
    if (typeParam) params.set('type', typeParam)

    // อัปเดต ref ก่อน navigate เพื่อป้องกัน useEffect sync กลับ
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
    startTyping()
    // Update URL to remove both 'q' and 'search' parameters
    const params = new URLSearchParams(searchParams)
    params.delete('q')
    params.delete('search') // Also remove 'search' parameter from tag clicks
    if (typeParam) params.set('type', typeParam)
    navigate(`/properties?${params.toString()}`, { replace: true })
    
    // Focus back to input reliably using ref
    if (searchInputRef.current) {
      searchInputRef.current.focus()
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
        type: filters?.propertyType || '',
        listingType: filters?.listingType || searchParams.get('listingType') || (isRentalFilter === true ? 'rent' : isRentalFilter === false ? 'sale' : ''),
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
  }, [properties, debouncedKeyword, filters, searchParams, isRentalFilter])

  const pageTitle = isRentalFilter === true ? 'ทรัพย์สินให้เช่า' : isRentalFilter === false ? 'ทรัพย์สินขาย' : 'รายการประกาศ'
  const heroTitle = isRentalFilter === true ? 'ทรัพย์สินให้เช่า' : isRentalFilter === false ? 'ทรัพย์สินขาย' : 'SPS Property Solution'
  const heroSubtitle = 'ค้นหาบ้านที่ใช่สำหรับคุณ'

  // Safety check: Ensure filtered is always an array
  const safeFiltered = Array.isArray(filtered) ? filtered : []

  // Reset display limit when filter results change
  useEffect(() => {
    setDisplayLimit(12)
  }, [safeFiltered.length])

  // Get only the paginated subset for the grid
  const paginatedProperties = safeFiltered.slice(0, displayLimit)

  // Debug logging removed for production

  return (
    <PageLayout
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      searchComponent={null}
    >
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header: Title + result count */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 tracking-tight">{pageTitle}</h1>
            {safeFiltered.length > 0 && (
              <p className="text-slate-500 text-sm mt-1">
                พบ <span className="font-semibold text-blue-900">{safeFiltered.length}</span> รายการ
              </p>
            )}
          </div>

          {/* Global Keyword Search with Button Trigger */}
          <div className="mb-6">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none z-10" />
                <input
                  ref={searchInputRef}
                  type="search"
                  aria-label="ค้นหาทำเล รหัสทรัพย์ หรือคำสำคัญ"
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

          {/* Dropdown Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
            <FilterItem
              label="ประเภทอสังหาฯ"
              icon={HomeIcon}
              value={filters.propertyType || ''}
              onChange={(val) => updateFilters({ propertyType: val })}
              options={[
                { value: '', label: 'ทั้งหมด' },
                ...PROPERTY_TYPES.map(pt => ({ value: pt.id, label: pt.label }))
              ]}
            />

            <FilterItem
              label="พื้นที่ / ทำเล"
              icon={MapPin}
              value={filters.location || ''}
              onChange={(val) => updateFilters({ location: val })}
              options={[
                { value: '', label: 'ทุกทำเล' },
                { value: 'ชลบุรี', label: 'ชลบุรี' },
                { value: 'พานทอง', label: 'พานทอง' },
                { value: 'บ้านบึง', label: 'บ้านบึง' },
                { value: 'ศรีราชา', label: 'ศรีราชา' },
                { value: 'ฉะเชิงเทรา', label: 'ฉะเชิงเทรา' },
                { value: 'ระยอง', label: 'ระยอง' },
              ]}
            />

            <FilterItem
              label="สภาพบ้าน"
              icon={Sparkles}
              value={filters.propertySubStatus || ''}
              onChange={(val) => updateFilters({ propertySubStatus: val })}
              options={[
                { value: '', label: 'ทั้งหมด' },
                { value: 'มือ 1', label: 'มือ 1 (ใหม่)' },
                { value: 'มือ 2', label: 'มือ 2 (พร้อมอยู่)' },
              ]}
            />

            <FilterItem
              label="เงื่อนไขสัญญา"
              icon={ShieldCheck}
              activeColor={filters.subListingType === 'installment_only' ? 'text-yellow-700' : 'text-blue-900'}
              value={filters.subListingType === 'installment_only' ? 'installment' : (filters.isRental ? 'rent' : (filters.isRental === false ? 'sale' : ''))}
              onChange={(val) => {
                if (val === 'installment') updateFilters({ subListingType: 'installment_only', isRental: true })
                else if (val === 'rent') updateFilters({ isRental: true, subListingType: '' })
                else if (val === 'sale') updateFilters({ isRental: false, subListingType: '' })
                else updateFilters({ isRental: null, subListingType: '' })
              }}
              options={[
                { value: '', label: 'ทั้งหมด' },
                { value: 'sale', label: 'ขายปกติ' },
                { value: 'rent', label: 'เช่าปกติ' },
                { value: 'installment', label: '🔥 ผ่อนตรง (เช่าซื้อ)' },
              ]}
            />
          </div>

          {/* Layout: Sidebar (Left) + Main Content (Right) */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Sidebar: Advanced Filters + Recommendations */}
            <aside className="w-full lg:w-80 shrink-0 space-y-6">
              {/* Advanced Filters Panel (Collapsible) */}
              <AdvancedFiltersPanel
                filters={filters}
                onUpdateFilters={updateFilters}
                onApply={handleSearch}
              />

              {/* Recommended Properties Section (Vertical) */}
              <div className="hidden lg:block">
                <RecommendedPropertiesSection
                  allProperties={properties}
                  currentFilters={filters}
                  vertical={true}
                />
              </div>
            </aside>

            {/* Main Content: Search Results */}
            <div className="flex-1 min-w-0">
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

              {/* Properties Map — ปรับปรุงให้เสถียรขึ้น ไม่หายไปตอน filter */}
              <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
                <div className="h-[320px] relative">
                  <Suspense
                    fallback={
                      <div className="absolute inset-0 bg-slate-100 flex items-center justify-center animate-pulse">
                        <span className="text-slate-500 text-sm">กำลังอัปเดตแผนที่…</span>
                      </div>
                    }
                  >
                    {safeFiltered.length > 0 ? (
                      <PropertiesMap properties={safeFiltered} />
                    ) : (
                      <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                        <MapPin className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">ไม่พบตำแหน่งทรัพย์สิน</p>
                      </div>
                    )}
                  </Suspense>
                </div>
              </div>

              {/* Properties Grid (Paginated) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedProperties.map((p) => {
                  if (!p || !p.id) return null
                  return <PropertyCard key={p.id} property={p} searchQuery={debouncedKeyword} />
                })}
              </div>

              {/* Load More Button */}
              {safeFiltered.length > displayLimit && (
                <div className="mt-10 flex justify-center">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 12)}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-blue-300 hover:text-blue-700 hover:shadow-sm transition-all font-medium inline-flex items-center gap-2"
                  >
                    โหลดเพิ่มเติม (Load More)
                  </button>
                </div>
              )}

              {/* Empty State */}
              {safeFiltered.length === 0 && (
                <div className="text-center py-16">
                  <div className="inline-flex w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center mb-4">
                    <SearchX className="h-8 w-8 text-slate-400" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 mb-1">ไม่พบรายการที่ตรงกับเงื่อนไข</h2>
                  <p className="text-slate-500 text-sm mb-8">ลองเปลี่ยนคำค้นหาหรือปรับตัวกรองใหม่</p>

                  {/* Recommended Services */}
                  <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl p-8 max-w-2xl mx-auto border border-blue-100">
                    <h3 className="text-base font-bold text-blue-900 mb-4">บริการแนะนำจาก SPS</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Link
                        to="/loan-services"
                        className="group flex items-center gap-4 bg-white rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-slate-100"
                      >
                        <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-slate-900 text-sm">ปิดหนี้ / รวมหนี้</h4>
                          <p className="text-xs text-slate-500 mt-0.5">บริการปิดหนี้ รวมหนี้ ผ่อนทางเดียว</p>
                        </div>
                      </Link>
                      <Link
                        to="/loan-services"
                        className="group flex items-center gap-4 bg-white rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-slate-100"
                      >
                        <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                          <Landmark className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-slate-900 text-sm">สินเชื่อครบวงจร</h4>
                          <p className="text-xs text-slate-500 mt-0.5">บริการสินเชื่อครบวงจรทุกขั้นตอน</p>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout >
  )
}
