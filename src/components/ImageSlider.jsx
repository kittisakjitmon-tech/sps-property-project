import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * ImageSlider - Component สำหรับแสดงภาพหลายภาพแบบสไลด์
 * @param {string[]} images - Array ของ image URLs
 * @param {string} defaultImage - ภาพ default ถ้าไม่มี images
 * @param {string} className - CSS classes เพิ่มเติม
 * @param {boolean} autoPlay - เล่นอัตโนมัติหรือไม่ (default: false)
 * @param {number} autoPlayInterval - ระยะเวลาระหว่างสไลด์ (ms, default: 5000)
 * @param {boolean} showDots - แสดงจุดบอกตำแหน่งหรือไม่ (default: true)
 * @param {boolean} showArrows - แสดงปุ่มลูกศรหรือไม่ (default: true)
 */
export default function ImageSlider({
  images = [],
  defaultImage = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400',
  className = '',
  autoPlay = false,
  autoPlayInterval = 5000,
  showDots = false,
  showArrows = false,
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const imgs = images && images.length > 0 ? images : [defaultImage]

  // Auto play
  useEffect(() => {
    if (!autoPlay || imgs.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imgs.length)
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [autoPlay, autoPlayInterval, imgs.length])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + imgs.length) % imgs.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % imgs.length)
  }

  const goToSlide = (index) => {
    setCurrentIndex(index)
  }

  if (imgs.length === 0) {
    return (
      <div className={`relative aspect-[4/3] overflow-hidden bg-slate-200 ${className}`}>
        <img src={defaultImage} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className={`relative aspect-[4/3] overflow-hidden group ${className}`}>
      {/* Images */}
      <div className="relative w-full h-full overflow-hidden">
        {imgs.map((img, index) => (
          <img
            key={index}
            src={img}
            alt={`Slide ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      {showArrows && imgs.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {showDots && imgs.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {imgs.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/50 w-2 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image Counter */}
      {imgs.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10">
          {currentIndex + 1} / {imgs.length}
        </div>
      )}
    </div>
  )
}
