import { useMemo } from 'react'
import { Link } from 'react-router'
import { Sparkles, ArrowRight, TrendingUp, Clock, Star, MapPin, Home as HomeIcon } from 'lucide-react'
import { formatPrice } from '../lib/priceFormat'
import { getPropertyLabel } from '../constants/propertyTypes'
import { getPropertyPath } from '../lib/propertySlug'

/**
 * RecommendedPropertiesSection - แสดงบ้านแนะนำแบบ horizontal scroll หรือ vertical list
 * Algorithm: Featured > Hot Deals > Recently Added > High Engagement
 * @param {boolean} vertical - แสดงแบบ vertical list (sidebar) หรือ horizontal scroll (default)
 */
export default function RecommendedPropertiesSection({ allProperties, currentFilters, vertical = false }) {
  // Smart Recommendation Algorithm
  const recommendations = useMemo(() => {
    if (!Array.isArray(allProperties) || allProperties.length === 0) return []

    // 1. Priority: Featured properties
    const featured = allProperties.filter((p) => p.featured)

    // 2. Hot Deals
    const hotDeals = allProperties.filter((p) => p.hotDeal && !p.featured)

    // 3. Recently Added (last 7 days)
    const recentlyAdded = allProperties
      .filter((p) => {
        if (!p.createdAt || p.featured || p.hotDeal) return false
        const daysSinceCreated = (Date.now() - p.createdAt.toMillis()) / (1000 * 60 * 60 * 24)
        return daysSinceCreated <= 7
      })
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())

    // 4. Similar to current filters (if any active)
    let similarToSearch = []
    if (currentFilters?.propertyType || currentFilters?.location) {
      similarToSearch = allProperties.filter((p) => {
        if (p.featured || p.hotDeal) return false

        const matchesType = currentFilters.propertyType
          ? p.type === currentFilters.propertyType
          : true

        const matchesLocation = currentFilters.location
          ? p.locationDisplay?.includes(currentFilters.location) ||
            p.location?.province?.includes(currentFilters.location) ||
            p.location?.district?.includes(currentFilters.location)
          : true

        return matchesType && matchesLocation
      })
    }

    // Combine and deduplicate (max 12 items)
    const combined = [
      ...featured,
      ...hotDeals,
      ...recentlyAdded.slice(0, 3),
      ...similarToSearch.slice(0, 3),
    ]

    // Remove duplicates by ID
    const unique = Array.from(new Map(combined.map((p) => [p.id, p])).values())

    return unique.slice(0, 12)
  }, [allProperties, currentFilters])

  if (recommendations.length === 0) return null

  // Vertical Layout (Sidebar)
  if (vertical) {
    return (
      <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl p-5 border-2 border-amber-200 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">บ้านแนะนำ</h2>
            <p className="text-xs text-slate-600">{recommendations.length} รายการ</p>
          </div>
        </div>

        {/* Vertical List */}
        <div className="space-y-3">
          {recommendations.slice(0, 6).map((property) => (
            <RecommendedPropertyCard key={property.id} property={property} compact />
          ))}
        </div>
      </section>
    )
  }

  // Horizontal Layout (Default)
  return (
    <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl p-6 mb-8 border-2 border-amber-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">บ้านแนะนำสำหรับคุณ</h2>
            <p className="text-xs text-slate-600">ดีลเด็ด • มาใหม่ • ยอดนิยม</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-600">
          <span className="font-medium">{recommendations.length} รายการ</span>
        </div>
      </div>

      {/* Horizontal Scrollable Cards */}
      <div className="relative">
        {/* Gradient Fade Effects */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-amber-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-amber-50 to-transparent z-10 pointer-events-none" />

        {/* Scrollable Container */}
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide scroll-smooth">
          {recommendations.map((property) => (
            <RecommendedPropertyCard key={property.id} property={property} />
          ))}
        </div>
      </div>

      {/* Scroll Hint (Mobile) */}
      <div className="sm:hidden text-center mt-3">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
          <ArrowRight className="h-3 w-3" />
          เลื่อนดูเพิ่มเติม
        </p>
      </div>
    </section>
  )
}

/**
 * RecommendedPropertyCard - Compact card for recommended properties
 * @param {boolean} compact - แสดงแบบ compact สำหรับ sidebar
 */
function RecommendedPropertyCard({ property, compact = false }) {
  const coverImage = property.coverImageUrl || (property.images && property.images[0]) || ''

  // Determine badge
  let badge = null
  if (property.featured) {
    badge = { label: 'แนะนำ', icon: Star, color: 'bg-amber-500 text-white' }
  } else if (property.hotDeal) {
    badge = { label: 'ดีลเด็ด', icon: TrendingUp, color: 'bg-red-500 text-white' }
  } else if (property.createdAt) {
    const daysSinceCreated = (Date.now() - property.createdAt.toMillis()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated <= 7) {
      badge = { label: 'มาใหม่', icon: Clock, color: 'bg-green-500 text-white' }
    }
  }

  // Compact Layout (Sidebar)
  if (compact) {
    return (
      <Link
        to={getPropertyPath(property)}
        className="group block"
      >
        <div className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
          <div className="flex gap-3 p-3">
            {/* Image */}
            <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={property.title}
                  width={80}
                  height={80}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <HomeIcon className="h-6 w-6" />
                </div>
              )}
              {/* Badge */}
              {badge && (
                <div className={`absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${badge.color} shadow-sm`}>
                  <badge.icon className="h-2.5 w-2.5" />
                  <span className="text-[9px] font-bold">{badge.label}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs text-slate-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {property.title}
              </h3>
              <p className="text-xs font-bold text-blue-600 mb-1">
                {formatPrice(property.price, property.isRental, false)}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {property.location?.district}, {property.location?.province}
              </p>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Horizontal Layout (Default)
  return (
    <Link
      to={getPropertyPath(property)}
      className="group flex-none w-[280px] sm:w-[320px] snap-start"
    >
      <div className="bg-white rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 h-full">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
          {coverImage ? (
            <img
              src={coverImage}
              alt={property.title}
              width={320}
              height={200}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <HomeIcon className="h-12 w-12" />
            </div>
          )}

          {/* Badge */}
          {badge && (
            <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full ${badge.color} shadow-md`}>
              <badge.icon className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">{badge.label}</span>
            </div>
          )}

          {/* Price */}
          <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-sm shadow-md">
            <p className="text-sm font-bold text-blue-600">
              {formatPrice(property.price, property.isRental, false)}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Type Badge */}
          <div className="mb-2">
            <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
              {getPropertyLabel(property.type)}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-slate-900 text-sm mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-blue-600 transition-colors">
            {property.title}
          </h3>

          {/* Location */}
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{property.location?.district}, {property.location?.province}</span>
          </p>

          {/* Specs */}
          {(property.bedrooms || property.bathrooms || property.area) && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
              {property.bedrooms > 0 && <span>🛏️ {property.bedrooms}</span>}
              {property.bathrooms > 0 && <span>🚿 {property.bathrooms}</span>}
              {property.area > 0 && <span>📐 {(property.area / 4).toFixed(1)} ตร.ว.</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// Hide scrollbar but keep functionality (SSR-safe)
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `
  document.head.appendChild(style)
}
