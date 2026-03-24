import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const SearchStateContext = createContext(null)
const SearchActionsContext = createContext(null)

const INITIAL_FILTERS = {
  location: '',
  propertyType: '',
  priceMin: '',
  priceMax: '',
  bedrooms: '',
  bathrooms: '',
  areaMin: '',
  areaMax: '',
  propertySubStatus: '', // มือ 1, มือ 2
  isRental: null, // null = ทั้งหมด, false = ซื้อ, true = เช่า
  tag: '', // จาก homepage section (targetTag)
}

export function SearchProvider({ children }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  const updateFilters = useCallback((next) => {
    setFilters((prev) => (typeof next === 'function' ? next(prev) : { ...prev, ...next }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS)
  }, [])

  const actions = useMemo(() => ({ updateFilters, clearFilters }), [updateFilters, clearFilters])

  return (
    <SearchStateContext.Provider value={filters}>
      <SearchActionsContext.Provider value={actions}>
        {children}
      </SearchActionsContext.Provider>
    </SearchStateContext.Provider>
  )
}

export function useSearch() {
  const filters = useContext(SearchStateContext)
  const actions = useContext(SearchActionsContext)
  if (!filters || !actions) throw new Error('useSearch must be used within SearchProvider')
  return { filters, ...actions }
}

// เฉพาะคอมโพเนนต์ที่ต้องการแค่อัปเดตค่า (เช่น ปุ่มค้นหา, ปุ่มรีเซ็ต)
export function useSearchActions() {
  const actions = useContext(SearchActionsContext)
  if (!actions) throw new Error('useSearchActions must be used within SearchProvider')
  return actions
}

// เฉพาะคอมโพเนนต์ที่ต้องการแค่ค่าฟิลเตอร์ (เช่น หน้าแสดงผลการค้นหา)
export function useSearchFilters() {
  const filters = useContext(SearchStateContext)
  if (!filters) throw new Error('useSearchFilters must be used within SearchProvider')
  return filters
}
