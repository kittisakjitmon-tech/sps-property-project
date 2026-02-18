import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import PropertySlider from './PropertySlider'

export default function DynamicPropertySection({ 
  title, 
  subtitle, 
  properties, 
  targetTag,
  titleColor = 'text-blue-900',
  isHighlighted = false,
  isBlinking = false,
  sectionIndex = 0,
}) {
  if (!properties || properties.length === 0) return null

  // ใช้ targetTag ถ้ามี ถ้าไม่มีใช้ title (ชื่อหัวข้อ)
  const tagForFilter = (targetTag && targetTag.trim()) || title || ''
  const viewAllHref = tagForFilter
    ? `/properties?tag=${encodeURIComponent(tagForFilter)}`
    : '/properties'

  // สร้าง className และ style สำหรับชื่อหัวข้อตามสไตล์
  const getTitleStyle = () => {
    let baseClasses = 'text-xl sm:text-2xl font-bold tracking-tight'
    
    // ถ้า isHighlighted ให้ใช้ gradient effect
    if (isHighlighted) {
      // แปลง Tailwind color class เป็น gradient colors
      let gradientFrom = 'from-blue-900'
      let gradientVia = 'via-blue-700'
      let gradientTo = 'to-blue-900'
      
      if (titleColor.includes('red')) {
        gradientFrom = 'from-red-600'
        gradientVia = 'via-red-500'
        gradientTo = 'to-red-600'
      } else if (titleColor.includes('yellow')) {
        gradientFrom = 'from-yellow-600'
        gradientVia = 'via-yellow-500'
        gradientTo = 'to-yellow-600'
      } else if (titleColor.includes('emerald') || titleColor.includes('green')) {
        gradientFrom = 'from-emerald-600'
        gradientVia = 'via-emerald-500'
        gradientTo = 'to-emerald-600'
      } else if (titleColor.includes('purple')) {
        gradientFrom = 'from-purple-600'
        gradientVia = 'via-purple-500'
        gradientTo = 'to-purple-600'
      } else if (titleColor.includes('orange')) {
        gradientFrom = 'from-orange-600'
        gradientVia = 'via-orange-500'
        gradientTo = 'to-orange-600'
      }
      
      baseClasses += ` bg-gradient-to-r ${gradientFrom} ${gradientVia} ${gradientTo} bg-clip-text text-transparent`
    } else {
      // ถ้าไม่ highlight ให้ใช้สีปกติ
      baseClasses += ` ${titleColor || 'text-blue-900'}`
    }
    
    // ถ้า isBlinking ให้เพิ่ม pulse animation
    if (isBlinking) {
      baseClasses += ' animate-pulse'
    }
    
    return {
      className: baseClasses,
    }
  }

  const titleStyle = getTitleStyle()

  const bgClass = sectionIndex % 2 === 0 ? 'bg-slate-50' : 'bg-white'

  return (
    <section className={`py-10 sm:py-12 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header: Title + View All */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="relative">
            {/* Accent bar */}
            <div className="flex items-center gap-3">
              <span className="w-1 h-7 bg-yellow-400 rounded-full shrink-0" />
              <h2 className={titleStyle.className}>
                {title}
              </h2>
            </div>
            {isHighlighted && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-30" />
            )}
            {subtitle && <p className="text-slate-500 text-sm mt-1.5 ml-4">{subtitle}</p>}
          </div>
          <Link
            to={viewAllHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-900 border border-blue-200 bg-blue-50 hover:bg-blue-900 hover:text-white px-4 py-1.5 rounded-full transition-all duration-200 shrink-0"
          >
            ดูทั้งหมด
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Property Slider */}
        <PropertySlider properties={properties} featuredLabel="แนะนำ" />
      </div>
    </section>
  )
}
