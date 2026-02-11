import { createContext, useContext, useState, useCallback } from 'react'

const SearchContext = createContext(null)

export function SearchProvider({ children }) {
  const [filters, setFilters] = useState({
    location: '',
    propertyType: '',
    priceMin: '',
    priceMax: '',
    bedrooms: '',
    bathrooms: '',
    areaMin: '',
    areaMax: '',
    isRental: null, // null = ทั้งหมด, false = ซื้อ, true = เช่า
  })

  const updateFilters = useCallback((next) => {
    setFilters((prev) => (typeof next === 'function' ? next(prev) : { ...prev, ...next }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      location: '',
      propertyType: '',
      priceMin: '',
      priceMax: '',
      bedrooms: '',
      bathrooms: '',
      areaMin: '',
      areaMax: '',
      isRental: null,
    })
  }, [])

  return (
    <SearchContext.Provider value={{ filters, updateFilters, clearFilters }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch must be used within SearchProvider')
  return ctx
}
