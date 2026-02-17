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

  return (
    <section className="py-6 sm:py-8 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header: Title + View All */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="relative">
            <h2 className={titleStyle.className}>
              {title}
            </h2>
            {isHighlighted && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-30" />
            )}
            {subtitle && <p className="text-slate-600 text-sm mt-0.5">{subtitle}</p>}
          </div>
          <Link
            to={viewAllHref}
            className="inline-flex items-center gap-1 text-blue-900 font-medium hover:underline focus:outline-none focus:underline group shrink-0"
          >
            ดูทั้งหมด
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Property Slider */}
        <PropertySlider properties={properties} featuredLabel="แนะนำ" />
      </div>
    </section>
  )
}
