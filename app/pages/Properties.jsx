import { useSearchParams, Link, useNavigate } from 'react-router'
import { createElement, useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense, useTransition } from 'react'
import { useSearch } from '../context/SearchContext'
import { getPropertiesOnceForListing } from '../lib/firestore'
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
import { filterProperties } from '../lib/globalSearch'
import { useTypingPlaceholder } from '../components/TypingPlaceholder'
import { Helmet } from 'react-helmet-async'
import { PROPERTY_TYPES } from '../constants/propertyTypes'

const toSearchableText = (value) => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value.map((item) => toSearchableText(item)).filter(Boolean).join(' ')
  }
  if (value && typeof value === 'object') {
    const preferred = [
      value.name,
      value.label,
      value.title,
      value.address,
      value.fullAddress,
      value.province,
      value.district,
    ]
      .map((item) => toSearchableText(item))
      .filter(Boolean)
      .join(' ')

    if (preferred) return preferred
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return ''
}

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
            {createElement(Icon, { className: 'h-3.5 w-3.5' })}
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
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Safety check for useSearch context
  let filters, updateFilters, clearFilters
  try {
    const searchContext = useSearch()
    filters = searchContext?.filters || {}
    updateFilters = searchContext?.updateFilters || (() => { })
    clearFilters = searchContext?.clearFilters || (() => { })
  } catch (_error) {
    console.error('SearchContext error:', _error)
    filters = {}
    updateFilters = () => { }
    clearFilters = () => { }
  }

  const [properties, setProperties] = useState([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)

  // State Separation
  const initialKeyword = searchParams.get('search') || searchParams.get('q') || ''
  const [searchQuery, setSearchQuery] = useState(initialKeyword)
  const [debouncedKeyword, setDebouncedKeyword] = useState(initialKeyword)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  
  // Pagination Configuration (แบบ A: Hybrid)
  const ITEMS_PER_PAGE = 12
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))
  const resultsTopRef = useRef(null)
  const searchInputRef = useRef(null)
  const [isPending, startTransition] = useTransition()

  // Auto-debounce effect
  useEffect(() => {
    if (searchQuery === debouncedKeyword) return
    
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchQuery)
      const params = new URLSearchParams(searchParams)
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim())
      } else {
        params.delete('q')
      }
      params.set('page', '1') // Reset to page 1 on new search
      prevSearchParamsRef.current = params.toString()
      navigate(`/properties?${params.toString()}`, { replace: true })
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, navigate, searchParams, debouncedKeyword])

  // Sync page from URL
  useEffect(() => {
    const urlPage = parseInt(searchParams.get('page') || '1')
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage)
    }
  }, [searchParams, currentPage])

  // Typing animation
  const TYPING_PHRASES = ['บ้านมือสอง', 'คอนโดผ่อนตรง', 'ทาวน์โฮมใกล้นิคม', 'บ้านเดี่ยวชลบุรี', 'คอนโดอมตะนคร']
  const { displayText: typingPlaceholder, stop: stopTyping, start: startTyping } = useTypingPlaceholder(
    TYPING_PHRASES, 100, 50, 2000
  )

  useEffect(() => {
    let mounted = true
    setPropertiesLoading(true)
    const fetchProperties = async () => {
      try {
        const props = await getPropertiesOnceForListing(true, 300)
        if (mounted) setProperties(Array.isArray(props) ? props : [])
      } catch {
        if (mounted) setProperties([])
      } finally {
        if (mounted) setPropertiesLoading(false)
      }
    }
    fetchProperties()
    return () => { mounted = false }
  }, [])

  const typeParam = searchParams.get('type')
  const isRentalFilter = typeParam === 'rent' ? true : typeParam === 'buy' ? false : null

  const prevSearchParamsRef = useRef(searchParams.toString())
  useEffect(() => {
    const currentParams = searchParams.toString()
    const urlKeyword = searchParams.get('q') || ''
    const urlSearch = searchParams.get('search') || ''
    const isExternalChange = prevSearchParamsRef.current !== currentParams

    if (isExternalChange) {
      const keywordToUse = urlSearch || urlKeyword
      if (keywordToUse) {
        setDebouncedKeyword(keywordToUse)
        setSearchQuery(keywordToUse)
        if (urlSearch && !urlKeyword) {
          const params = new URLSearchParams(searchParams)
          params.set('q', urlSearch)
          params.delete('search')
          navigate(`/properties?${params.toString()}`, { replace: true })
        }
      } else {
        setDebouncedKeyword('')
        setSearchQuery('')
      }
    }
    prevSearchParamsRef.current = currentParams
  }, [searchParams, navigate])

  const normalizeSubStatusFromURL = (status) => {
    if (!status) return ''
    const normalized = String(status).trim().replace(/\s+/g, '').toLowerCase()
    if (normalized === 'มือ1' || normalized === 'มือ 1') return 'มือ 1'
    if (normalized === 'มือ2' || normalized === 'มือ 2') return 'มือ 2'
    return status
  }

  useEffect(() => {
    try {
      const location = searchParams.get('location') ?? ''
      const typeP = searchParams.get('type') || ''
      const propertyTypeParam = searchParams.get('propertyType') || ''
      const propertyType = propertyTypeParam || (['buy', 'rent'].includes(typeP) ? '' : typeP)
      
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
      const project = searchParams.get('project') ?? ''

      if (updateFilters) {
        updateFilters({
          location, propertyType, listingType, subListingType, propertyCondition,
          availability, priceMin, priceMax, bedrooms, bathrooms, areaMin, areaMax,
          propertySubStatus, feature, tag, project, isRental: isRentalFilter,
        })
      }
    } catch (_error) {
      console.error('URL Parameter Parsing error:', _error)
    }
  }, [searchParams, updateFilters, isRentalFilter])

  const filtered = useMemo(() => {
    try {
      if (!Array.isArray(properties)) return []
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
        project: filters?.project || searchParams.get('project') || '',
      }
      return filterProperties(properties, searchFilters)
    } catch {
      return []
    }
  }, [properties, debouncedKeyword, filters, searchParams, isRentalFilter])

  const safeFiltered = Array.isArray(filtered) ? filtered : []
  const totalPages = Math.max(1, Math.ceil(safeFiltered.length / ITEMS_PER_PAGE))

  // สำหรับแผนที่: เฉพาะรายการที่มีพิกัด, ไม่เกิน 100; ถ้ามี filters.location ให้เรียงให้ตรงทำเลมาก่อน
  const { mapProperties, mapShowingMaxCaption } = useMemo(() => {
    const withCoords = safeFiltered.filter(
      (p) => typeof p.lat === 'number' && typeof p.lng === 'number' && !Number.isNaN(p.lat) && !Number.isNaN(p.lng)
    )
    const loc = toSearchableText(filters.location).trim().toLowerCase()
    if (loc) {
      withCoords.sort((a, b) => {
        const aText = `${toSearchableText(a.location)} ${toSearchableText(a.address)}`.toLowerCase()
        const bText = `${toSearchableText(b.location)} ${toSearchableText(b.address)}`.toLowerCase()
        const aMatch = aText.includes(loc) ? 1 : 0
        const bMatch = bText.includes(loc) ? 1 : 0
        return bMatch - aMatch
      })
    }
    return {
      mapProperties: withCoords.slice(0, 100),
      mapShowingMaxCaption: withCoords.length > 100
    }
  }, [safeFiltered, filters.location])
  
  // Slice properties for current page
  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return safeFiltered.slice(start, start + ITEMS_PER_PAGE)
  }, [safeFiltered, currentPage])

  // Reset to page 1 when filters change (length change is a good trigger)
  useEffect(() => {
    if (currentPage > 1 && safeFiltered.length <= (currentPage - 1) * ITEMS_PER_PAGE) {
      handlePageChange(1)
    }
  }, [safeFiltered.length])

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return
    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      params.set('page', newPage.toString())
      navigate(`/properties?${params.toString()}`)
      if (resultsTopRef.current) {
        resultsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }

  const navigateWithParams = useCallback((params) => {
    startTransition(() => {
      const nextQuery = params.toString()
      prevSearchParamsRef.current = nextQuery
      navigate(nextQuery ? `/properties?${nextQuery}` : '/properties')
      if (resultsTopRef.current) {
        resultsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }, [navigate])

  const handleRemoveFilter = useCallback((filter) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      params.delete('page')

      switch (filter.type) {
        case 'keyword':
          setSearchQuery('')
          setDebouncedKeyword('')
          params.delete('q')
          params.delete('search')
          break
          case 'tag':
          updateFilters({ tag: '' })
          params.delete('tag')
          break
        case 'feature':
          updateFilters({ feature: '' })
          params.delete('feature')
          break
        case 'propertyType':
          updateFilters({ propertyType: '' })
          params.delete('propertyType')
          break
        case 'location':
          updateFilters({ location: '' })
          params.delete('location')
          break
        case 'propertySubStatus':
          updateFilters({ propertySubStatus: '' })
          params.delete('status')
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
        case 'isRental':
          updateFilters({ isRental: null, subListingType: '' })
          params.delete('type')
          params.delete('listingType')
          params.delete('subListingType')
          break
        case 'project':
          updateFilters({ project: '' })
          params.delete('project')
          break
        default:
          break
      }

      prevSearchParamsRef.current = params.toString()
      navigate(params.toString() ? `/properties?${params.toString()}` : '/properties')
      if (resultsTopRef.current) {
        resultsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }, [navigate, searchParams, updateFilters])

  const handleClearAllFilters = useCallback(() => {
    startTransition(() => {
      clearFilters()
      setSearchQuery('')
      setDebouncedKeyword('')
      prevSearchParamsRef.current = ''
      navigate('/properties')
      if (resultsTopRef.current) {
        resultsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }, [navigate, clearFilters])

  // Wrapper function to update filters and URL params simultaneously
  const updateFiltersWithUrl = useCallback((filterUpdates) => {
    // Update context filters
    updateFilters(filterUpdates)
    
    // Update URL params
    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      
      // Update params based on filter changes
      Object.entries(filterUpdates).forEach(([key, value]) => {
        const paramKey = key === 'propertyType' ? 'type' : 
                        key === 'propertySubStatus' ? 'status' : key
        
        if (value && value !== '' && value !== null && value !== undefined) {
          params.set(paramKey, String(value))
        } else {
          params.delete(paramKey)
        }
      })
      
      // Reset to page 1 when filters change
      params.delete('page')
      
      prevSearchParamsRef.current = params.toString()
      navigate(params.toString() ? `/properties?${params.toString()}` : '/properties', { replace: true })
    })
  }, [searchParams, navigate, updateFilters])

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  const pageTitle = isRentalFilter === true ? 'ทรัพย์สินให้เช่า' : isRentalFilter === false ? 'ทรัพย์สินขาย' : 'รายการประกาศ'
  const heroTitle = isRentalFilter === true ? 'ทรัพย์สินให้เช่า' : isRentalFilter === false ? 'ทรัพย์สินขาย' : 'SPS Property Solution'
  const heroSubtitle = 'ค้นหาบ้านที่ใช่สำหรับคุณ'

  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://spspropertysolution.com/properties" />
      </Helmet>
      <PageLayout heroTitle={heroTitle} heroSubtitle={heroSubtitle} searchComponent={null}>
      <div className="min-h-screen bg-slate-50 py-8" ref={resultsTopRef} aria-busy={isPending}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 tracking-tight">{pageTitle}</h1>
              {safeFiltered.length > 0 && (
                <p className="text-slate-500 text-sm mt-1">
                  พบ <span className="font-semibold text-blue-900">{safeFiltered.length}</span> รายการ
                  {totalPages > 1 && ` (หน้า ${currentPage} จาก ${totalPages})`}
                </p>
              )}
            </div>
            {safeFiltered.length > 0 && (
              <div className="text-xs text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                แสดง {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, safeFiltered.length)}
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="mb-6">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none z-10" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { setIsSearchFocused(true); stopTyping(); }}
                  onBlur={() => { setIsSearchFocused(false); if (!searchQuery.trim()) startTyping(); }}
                  placeholder={isSearchFocused ? "ค้นหาทำเล, รหัสทรัพย์..." : (!searchQuery.trim() ? typingPlaceholder : "ค้นหาประกาศ...")}
                  className="w-full pl-12 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition"
                />
                {searchQuery.length > 0 && (
                  <button onClick={() => { setSearchQuery(''); setDebouncedKeyword(''); startTyping(); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100">
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                )}
              </div>
              <button className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-md">
                <Search className="h-5 w-5" />
                <span className="hidden sm:inline">ค้นหา</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
            <FilterItem label="ประเภทอสังหาฯ" icon={HomeIcon} value={filters.propertyType || ''} onChange={(val) => updateFiltersWithUrl({ propertyType: val })} options={[{ value: '', label: 'ทั้งหมด' }, ...PROPERTY_TYPES.map(pt => ({ value: pt.id, label: pt.label }))]} />
            <FilterItem label="พื้นที่ / ทำเล" icon={MapPin} value={filters.location || ''} onChange={(val) => updateFiltersWithUrl({ location: val })} options={[{ value: '', label: 'ทุกทำเล' }, { value: 'ชลบุรี', label: 'ชลบุรี' }, { value: 'พานทอง', label: 'พานทอง' }, { value: 'บ้านบึง', label: 'บ้านบึง' }, { value: 'ศรีราชา', label: 'ศรีราชา' }, { value: 'ฉะเชิงเทรา', label: 'ฉะเชิงเทรา' }, { value: 'ระยอง', label: 'ระยอง' }]} />
            <FilterItem label="สภาพบ้าน" icon={Sparkles} value={filters.propertySubStatus || ''} onChange={(val) => updateFiltersWithUrl({ propertySubStatus: val })} options={[{ value: '', label: 'ทั้งหมด' }, { value: 'มือ 1', label: 'มือ 1 (ใหม่)' }, { value: 'มือ 2', label: 'มือ 2 (พร้อมอยู่)' }]} />
            <FilterItem label="เงื่อนไขสัญญา" icon={ShieldCheck} value={filters.subListingType === 'installment_only' ? 'installment' : (filters.isRental ? 'rent' : (filters.isRental === false ? 'sale' : ''))} onChange={(val) => { if (val === 'installment') updateFiltersWithUrl({ subListingType: 'installment_only', isRental: true }); else if (val === 'rent') updateFiltersWithUrl({ isRental: true, subListingType: '' }); else if (val === 'sale') updateFiltersWithUrl({ isRental: false, subListingType: '' }); else updateFiltersWithUrl({ isRental: null, subListingType: '' }); }} options={[{ value: '', label: 'ทั้งหมด' }, { value: 'sale', label: 'ขายปกติ' }, { value: 'rent', label: 'เช่าปกติ' }, { value: 'installment', label: '🔥 ผ่อนตรง (เช่าซื้อ)' }]} />
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="w-full lg:w-80 shrink-0 space-y-6">
              <AdvancedFiltersPanel filters={filters} onUpdateFilters={updateFiltersWithUrl} onApply={() => handlePageChange(1)} />
              <div className="hidden lg:block">
                <RecommendedPropertiesSection allProperties={properties} currentFilters={filters} vertical={true} />
              </div>
            </aside>

            <div className="flex-1 min-w-0">
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
                onClearAll={handleClearAllFilters}
              />

              <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
                <div className="h-[320px] relative">
                  <Suspense fallback={<div className="absolute inset-0 bg-slate-100 flex items-center justify-center animate-pulse"><span className="text-slate-500 text-sm">กำลังอัปเดตแผนที่…</span></div>}>
                    {safeFiltered.length > 0 ? <PropertiesMap properties={mapProperties} /> : <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center text-slate-400"><MapPin className="h-8 w-8 mb-2 opacity-20" /><p className="text-sm">ไม่พบตำแหน่งทรัพย์สิน</p></div>}
                  </Suspense>
                </div>
                {mapShowingMaxCaption && (
                  <p className="text-xs text-slate-400 px-4 py-2 bg-slate-50 border-t border-slate-100">แสดงตำแหน่งไม่เกิน 100 รายการ</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                {propertiesLoading
                  ? Array.from({ length: 12 }, (_, i) => (
                      <div key={`skeleton-${i}`} className="flex flex-col rounded-[10px] overflow-hidden bg-white border border-slate-100 shadow-sm" aria-hidden="true">
                        <div className="w-full aspect-[4/3] bg-slate-200 animate-pulse" />
                        <div className="p-3 space-y-2">
                          <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                          <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                          <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                          <div className="h-9 bg-slate-200 rounded-lg animate-pulse w-full mt-2" />
                        </div>
                      </div>
                    ))
                  : paginatedProperties.map((p) => p && p.id && <PropertyCard key={p.id} property={p} searchQuery={debouncedKeyword} />)}
              </div>

              {/* Pagination UI */}
              {totalPages > 1 && (
                <div className="mt-12 flex flex-col items-center gap-4">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40"><ChevronDown className="h-5 w-5 rotate-90" /></button>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {getPageNumbers()[0] > 1 && <><button onClick={() => handlePageChange(1)} className="w-10 h-10 rounded-xl hover:bg-slate-100">1</button>{getPageNumbers()[0] > 2 && <span className="text-slate-300">...</span>}</>}
                      {getPageNumbers().map(n => (
                        <button key={n} onClick={() => handlePageChange(n)} className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-sm font-bold transition-all ${currentPage === n ? 'bg-blue-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{n}</button>
                      ))}
                      {getPageNumbers()[getPageNumbers().length - 1] < totalPages && <>{getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && <span className="text-slate-300">...</span>}<button onClick={() => handlePageChange(totalPages)} className="w-10 h-10 rounded-xl hover:bg-slate-100">{totalPages}</button></>}
                    </div>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40"><ChevronDown className="h-5 w-5 -rotate-90" /></button>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">หน้าที่ {currentPage} จาก {totalPages} หน้า</p>
                </div>
              )}

              {safeFiltered.length === 0 && (
                <div className="text-center py-16">
                  <div className="inline-flex w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center mb-4"><SearchX className="h-8 w-8 text-slate-400" /></div>
                  <h2 className="text-lg font-bold text-slate-800 mb-1">ไม่พบรายการที่ตรงกับเงื่อนไข</h2>
                  <p className="text-slate-500 text-sm mb-8">ลองเปลี่ยนคำค้นหาหรือปรับตัวกรองใหม่</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
    </>
  )
}
