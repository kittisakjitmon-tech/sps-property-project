import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import PropertyCard from './PropertyCard'

/**
 * PropertySlider - Horizontal property slider with navigation arrows
 * @param {Array} properties - Array of property objects
 * @param {string} featuredLabel - Label for featured properties
 */
export default function PropertySlider({ properties, featuredLabel = 'แนะนำ' }) {
  const containerRef = useRef(null)

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -340, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 340, behavior: 'smooth' })
    }
  }

  if (!properties || properties.length === 0) return null

  return (
    <div className="relative group">
      {/* Left Arrow - Desktop Only */}
      <button
        onClick={scrollLeft}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 -translate-x-1/2"
        aria-label="เลื่อนซ้าย"
      >
        <ChevronLeft className="w-6 h-6 text-blue-900" strokeWidth={2.5} />
      </button>

      {/* Slider Container */}
      <div
        ref={containerRef}
        className="flex flex-row flex-nowrap gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide"
      >
        {properties.map((property) => (
          <div
            key={property.id}
            className="snap-start shrink-0 w-[280px] sm:w-[300px] lg:w-[320px]"
          >
            <PropertyCard property={property} featuredLabel={featuredLabel} />
          </div>
        ))}
      </div>

      {/* Right Arrow - Desktop Only */}
      <button
        onClick={scrollRight}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 translate-x-1/2"
        aria-label="เลื่อนขวา"
      >
        <ChevronRight className="w-6 h-6 text-blue-900" strokeWidth={2.5} />
      </button>

      {/* Scrollbar Hide Styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
