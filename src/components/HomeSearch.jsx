import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Home, Building2, KeyRound, Flame } from 'lucide-react'

// Quick Filter Chips Configuration
const quickFilters = [
  {
    id: 'house',
    label: 'บ้านเดี่ยว',
    icon: Home,
    keyword: 'บ้านเดี่ยว',
  },
  {
    id: 'townhouse',
    label: 'ทาวน์โฮม',
    icon: Building2,
    keyword: 'ทาวน์โฮม',
  },
  {
    id: 'rent',
    label: 'เช่า/ผ่อนตรง',
    icon: KeyRound,
    keyword: 'เช่า',
  },
  {
    id: 'budget',
    label: 'ราคาไม่เกิน 2 ล้าน',
    icon: Flame,
    keyword: 'ราคาไม่เกิน 2 ล้าน',
  },
]

export default function HomeSearch() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeChipId, setActiveChipId] = useState(null)
  const inputRef = useRef(null)

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    
    const params = new URLSearchParams()
    params.set('search', searchQuery.trim())
    navigate(`/properties?${params.toString()}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const handleChipClick = (filter) => {
    // Set keyword to input
    setSearchQuery(filter.keyword)
    setActiveChipId(filter.id)
    
    
    
    // Option B: Just update input and focus (allow user to edit)
    // Focus on input after a short delay to ensure state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        // Move cursor to end of input
        inputRef.current.setSelectionRange(
          inputRef.current.value.length,
          inputRef.current.value.length
        )
      }
      handleSearch()
      
      
    }, 100)
    
    
  }

  return (
    <div className="w-full flex flex-col items-center gap-4 px-4">
      {/* Single Smart Input Box - Google/Airbnb Style */}
      <div className="w-[90%] max-w-3xl">
        <div className="relative bg-white rounded-full shadow-2xl flex items-center gap-2 p-2 border border-slate-100">
          {/* Search Icon (Left) */}
          <div className="pl-4 flex-shrink-0">
            <Search className="h-6 w-6 text-slate-400" />
          </div>
          
          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              // Clear active chip when user types manually
              if (activeChipId) {
                setActiveChipId(null)
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="ค้นหาทำเล, ชื่อโครงการ หรือเงื่อนไขที่คุณต้องการ..."
            className="flex-1 text-lg md:text-xl py-3 md:py-4 px-2 border-none bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
          />
          
          {/* Search Button (Right) */}
          <button
            type="button"
            onClick={handleSearch}
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 md:p-4 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
            aria-label="ค้นหา"
          >
            <Search className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>
      </div>

      {/* Quick Filter Chips 
      <div className="w-[90%] max-w-3xl">
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {quickFilters.map((filter) => {
            const Icon = filter.icon
            const isActive = activeChipId === filter.id
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => handleChipClick(filter)}
                className={`inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full border shadow-sm hover:shadow-md transition-all duration-200 text-sm md:text-base font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700'
                    : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200 hover:border-blue-300'
                }`}
              >
                <Icon className="h-4 w-4 md:h-5 md:w-5" />
                <span>{filter.label}</span>
              </button>
            )
          })}
        </div>
      </div>*/}

    </div>
  )
}
