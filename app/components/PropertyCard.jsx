import { Link } from 'react-router'
import { useState, memo, useEffect } from 'react'
import { isFavorite, toggleFavorite } from '../lib/favorites'
import { formatPriceShort } from '../lib/priceFormat'
import { getCloudinaryThumbUrl } from '../lib/cloudinary'
import { getPropertyLabel } from '../constants/propertyTypes'
import { getPropertyPath } from '../lib/propertySlug'

// --- Icons (smaller for card) ---
const BedIcon = () => <span className="text-[13px] leading-none" aria-hidden>🛏</span>
const BathIcon = () => <span className="text-[13px] leading-none" aria-hidden>🛁</span>
const AreaIcon = () => <span className="text-[13px] leading-none" aria-hidden>📐</span>

const HeartIcon = ({ active, size = 'default' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`transition-all duration-200 shrink-0 ${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-5 h-5'} ${active ? 'text-red-500' : 'text-slate-500'}`}
    aria-hidden
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)

function PropertyCard({ property, compact = false, home = false }) {
  const propertyId = property?.id ?? null
  const [favorited, setFavorited] = useState(() => (propertyId ? isFavorite(propertyId) : false))
  const [renderedAt, setRenderedAt] = useState(null)

  // Set renderedAt only on client to avoid hydration mismatch
  useEffect(() => {
    setRenderedAt(Date.now())
  }, [])

  if (!propertyId) return null

  const listingType = property.listingType || (property.isRental ? 'rent' : 'sale')
  const subListingType = property.subListingType
  // Only check isNew onclient (renderedAt is null during SSR)
  const isNew = renderedAt && property.createdAt &&
    renderedAt - (property.createdAt?.toMillis?.() || property.createdAt) < 7 * 24 * 60 * 60 * 1000
  const isInstallment = subListingType === 'installment_only' || property.directInstallment
  const loc = property.location || {}
  const district = [loc.district, loc.province].filter(Boolean).join(' ')
  const subDistrict = loc.subDistrict || ''
  const typeLabel = getPropertyLabel(property.type) || 'อสังหาริมทรัพย์'
  const titleText = subDistrict ? `${typeLabel} ${subDistrict}` : typeLabel
  const areaSqWa =
    property.area != null && Number(property.area) > 0 ? (Number(property.area) / 4).toFixed(0) : null
  const installmentPerMonth =
    isInstallment && property.price != null && Number(property.price) > 0
      ? Math.round(Number(property.price) / 120)
      : null

  const handleFavorite = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setFavorited(toggleFavorite(propertyId))
  }

  const isHome = home || false
  const contentGapClass = isHome ? 'gap-0.5' : compact ? 'gap-0.5' : ''

  return (
    <article
      className={`group flex flex-col h-full w-full bg-white overflow-hidden rounded-[10px] transition-all duration-300 ${
        isHome
          ? 'shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]'
          : 'max-w-[340px] sm:max-w-none shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.1)]'
      }`}
      style={isHome ? undefined : { maxWidth: 'min(100%, 340px)' }}
    >
      {/* 1. IMAGE: card-image wrapper — relative, overflow, rounded */}
      <div className="relative w-full aspect-[4/3] flex-shrink-0 overflow-hidden rounded-[10px]">
        <Link to={getPropertyPath(property)} className="block w-full h-full">
          <img
            src={getCloudinaryThumbUrl(property.coverImageUrl || property.images?.[0])}
            alt={`ภาพหน้าปก${typeLabel ? ` ${typeLabel}` : ''}${district ? ` ${district}` : ''}`}
            width={400}
            height={300}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </Link>

        <div
          className="absolute inset-0 pointer-events-none rounded-[10px]"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 35%, transparent 55%)',
          }}
        />

        {/* Badge: top/left 10px, padding 4px 10px, 12px font, rounded-20px, line-height 1 */}
        <div className="absolute top-[10px] left-[10px] flex gap-2 z-10 pointer-events-none">
          <span
            className="inline-flex items-center py-1 px-2.5 text-xs font-semibold text-white leading-none rounded-[20px] shadow-sm"
            style={{
              backgroundColor: isInstallment ? '#1e3a8a' : listingType === 'rent' ? '#ea580c' : '#2563eb',
            }}
          >
            {isInstallment ? 'ผ่อนตรง' : listingType === 'rent' ? 'เช่า' : 'ขาย'}
          </span>
          {isNew && (
            <span className="inline-flex items-center py-1 px-2.5 text-xs font-semibold text-white leading-none rounded-[20px] shadow-sm bg-emerald-500">
              New
            </span>
          )}
        </div>

        {/* Favorite: top/right 10px, 36px button, small icon centered */}
        <button
          type="button"
          onClick={handleFavorite}
          className="absolute top-[10px] right-[10px] z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-[2px] shadow-sm hover:bg-white hover:shadow hover:scale-105 active:scale-95 transition-all duration-200 [touch-action:manipulation]"
          aria-label={favorited ? 'ลบออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
        >
          <HeartIcon active={favorited} size="sm" />
        </button>

        {/* Price overlay: smaller */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none p-2 pt-5">
          {property.hotDeal && (
            <div className="text-amber-300 text-[10px] font-bold uppercase tracking-wide mb-0.5 drop-shadow-md">
              🔥 ราคาดี
            </div>
          )}
          <div
            className="text-white font-bold text-sm leading-tight tracking-tight"
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6), 0 0 16px rgba(0,0,0,0.4)',
            }}
          >
            {formatPriceShort(property.price, listingType === 'rent', property.showPrice !== false)}
          </div>
          {installmentPerMonth != null && (
            <div
              className="text-white/95 text-xs font-medium mt-0.5"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
            >
              ≈ ฿{installmentPerMonth.toLocaleString('th-TH')} / ด.
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN CONTENT: flex-1 so CTA stays at bottom; home = 12px padding, tighter spacing */}
      <div className={`flex flex-col flex-1 min-w-0 p-3 ${contentGapClass}`}>
        <Link to={getPropertyPath(property)} className="block mb-0.5">
          <h3 className={`font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors ${isHome ? 'text-xs' : 'text-sm'}`}>
            {titleText}
          </h3>
        </Link>

        <p className={`text-slate-500 text-xs font-medium ${isHome ? 'mb-1' : 'mb-1.5'}`}>
          <span aria-hidden>📍</span> {district || '—'}
        </p>

        <div className={`flex items-center gap-1.5 text-slate-600 text-xs font-medium flex-wrap ${isHome ? 'mb-1' : 'mb-2'}`}>
          <span className="flex items-center gap-0.5">
            <BedIcon /> {property.bedrooms ?? '-'}
          </span>
          <span className="text-slate-300 select-none" aria-hidden>|</span>
          <span className="flex items-center gap-0.5">
            <BathIcon /> {property.bathrooms ?? '-'}
          </span>
          {areaSqWa != null && (
            <>
              <span className="text-slate-300 select-none" aria-hidden>|</span>
              <span className="flex items-center gap-0.5">
                <AreaIcon /> {areaSqWa} ตร.ว.
              </span>
            </>
          )}
        </div>

        <div className={`flex flex-wrap gap-1.5 ${isHome ? 'mb-2' : 'mb-3'}`}>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
              property.availability === 'available'
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            <span
              className={`w-1 h-1 rounded-full ${
                property.availability === 'available' ? 'bg-green-500' : 'bg-amber-500'
              }`}
              aria-hidden
            />
            {property.availability === 'available' ? 'ว่าง' : 'ติดจอง'}
          </span>
          <span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {property.propertyCondition || 'มือสอง'}
          </span>
        </div>

        <Link
          to={getPropertyPath(property)}
          className={`mt-auto inline-flex items-center justify-center gap-1 rounded-lg border-2 border-slate-200 text-slate-700 font-semibold text-xs hover:border-blue-600 hover:text-blue-700 hover:bg-blue-50/50 active:scale-[0.98] transition-all duration-200 [touch-action:manipulation] ${isHome ? 'min-h-[36px] py-1.5 px-2' : 'min-h-[40px] py-2 px-3'}`}
        >
          ดูรายละเอียด
          <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  )
}

export default memo(PropertyCard)
