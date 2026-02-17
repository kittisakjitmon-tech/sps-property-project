import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import PropertySlider from './PropertySlider'

export default function DynamicPropertySection({ title, subtitle, properties, targetTag }) {
  if (!properties || properties.length === 0) return null

  // ใช้ targetTag ถ้ามี ถ้าไม่มีใช้ title (ชื่อหัวข้อ)
  const tagForFilter = (targetTag && targetTag.trim()) || title || ''
  const viewAllHref = tagForFilter
    ? `/properties?tag=${encodeURIComponent(tagForFilter)}`
    : '/properties'

  return (
    <section className="py-6 sm:py-8 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header: Title + View All */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-900 tracking-tight">{title}</h2>
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
