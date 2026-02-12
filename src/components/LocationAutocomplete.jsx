import { useState, useRef, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { searchLocations } from '../data/thaiLocations'
import { useTypingPlaceholder } from './TypingPlaceholder'

const TYPING_PHRASES = [
  'ค้นหาพื้นที่ จังหวัด อำเภอ...',
  'ค้นหาชลบุรี...',
  'ค้นหาฉะเชิงเทรา...',
  'ค้นหาระยอง...',
]

export default function LocationAutocomplete({
  value = '',
  onChange,
  onSelect,
  placeholder = 'ค้นหาพื้นที่ จังหวัด อำเภอ ตำบล...',
  className = '',
  inputClassName = '',
  enableTypingAnimation = true,
}) {
  // State Separation: แยกตัวแปรออกเป็น 2 ตัว
  const [searchQuery, setSearchQuery] = useState(value) // ค่าจริงที่ผู้ใช้พิมพ์ (ใช้สำหรับ Filter)
  const [suggestions, setSuggestions] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [isFocused, setIsFocused] = useState(false)
  const wrapperRef = useRef(null)
  
  // Typing animation สำหรับ placeholder (Decoupled จาก searchQuery)
  const { displayText: typingPlaceholder, stop: stopTyping, start: startTyping } = useTypingPlaceholder(
    TYPING_PHRASES,
    100,
    50,
    2000
  )

  useEffect(() => {
    setSearchQuery(value)
  }, [value])

  // Strict Focus Logic: หยุด animation เมื่อ focus, เริ่มใหม่เมื่อ blur และไม่มีค่า
  useEffect(() => {
    if (enableTypingAnimation) {
      if (isFocused) {
        stopTyping()
      } else if (!searchQuery.trim()) {
        startTyping()
      }
    }
  }, [isFocused, searchQuery, enableTypingAnimation, stopTyping, startTyping])

  // Filtering Dependency: ใช้ searchQuery เป็น dependency เพียงอย่างเดียว (ห้ามใช้ typingPlaceholder)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      setIsOpen(false)
      return
    }
    const results = searchLocations(searchQuery)
    setSuggestions(results.slice(0, 8))
    setIsOpen(results.length > 0)
    setHighlightIndex(-1)
  }, [searchQuery])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e) => {
    const v = e.target.value
    setSearchQuery(v) // อัปเดต searchQuery (ค่าจริงที่ผู้ใช้พิมพ์)
    onChange?.(v)
  }

  const handleSelect = (location) => {
    const display = location.displayName
    setSearchQuery(display) // อัปเดต searchQuery (ค่าจริงที่ผู้ใช้พิมพ์)
    onChange?.(display)
    onSelect?.(location)
    setIsOpen(false)
  }

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' && highlightIndex >= 0 && suggestions[highlightIndex]) {
      e.preventDefault()
      handleSelect(suggestions[highlightIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlightIndex(-1)
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={(e) => {
            setIsFocused(true)
            stopTyping() // หยุด animation ทันทีเมื่อ focus
            if (searchQuery.trim() && suggestions.length > 0) {
              setIsOpen(true)
            }
          }}
          onBlur={() => {
            setIsFocused(false)
            if (!searchQuery.trim()) {
              startTyping() // เริ่ม animation ใหม่เมื่อ blur และไม่มีค่า
            }
            // Delay เพื่อให้ click suggestion ทำงานได้
            setTimeout(() => setIsOpen(false), 200)
          }}
          onKeyDown={handleKeyDown}
          placeholder={isFocused ? 'ค้นหาทำเล, จังหวัด, อำเภอ...' : (enableTypingAnimation && !searchQuery.trim() ? typingPlaceholder : placeholder)}
          autoComplete="off"
          className={`w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all border-0 ${inputClassName}`}
        />
      </div>
      {isOpen && suggestions.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 py-1 bg-white rounded-xl shadow-lg max-h-60 overflow-auto border-0"
          role="listbox"
        >
          {suggestions.map((loc, i) => (
            <li
              key={loc.id}
              role="option"
              aria-selected={i === highlightIndex}
              onMouseEnter={() => setHighlightIndex(i)}
              onClick={() => handleSelect(loc)}
              className={`px-4 py-2.5 cursor-pointer flex items-center gap-2 text-sm ${
                i === highlightIndex ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
              <span>{loc.displayName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
