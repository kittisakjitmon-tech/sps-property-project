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

const HeartIcon = ({ active }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-4 h-4 transition-all duration-200 ${active ? 'text-red-500' : 'text-slate-500'}`}
    aria-hidden
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)

function PropertyCard({ property, compact = false, home = false }) {
  const propertyId = property?.id ?? null
  const [favorited, setFavorited] = useState(() => (typeof window !== 'undefined' && propertyId ? isFavorite(propertyId) : false))
  const [renderedAt, setRenderedAt] = useState(null)

  // Set renderedAt only on client to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRenderedAt(Date.now())
      setFavorited(propertyId ? isFavorite(propertyId) : false)
    }
  }, [propertyId])

  if (!propertyId) return null

  const listingType = property.listingType || (property.isRental ? 'rent' : 'sale')
  const subListingType = property.subListingType
  // Only check isNew on client (renderedAt is null during SSR)
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
    if (typeof window !== 'undefined') {
      setFavorited(toggleFavorite(propertyId))
    }
  }

  const isHome = home || false

  return (
    <article
      className={`group flex flex-col h-full w-full bg-white overflow-hidden rounded-2xl transition-all duration-300 ${
        isHome
          ? 'shadow-card hover:shadow-card-hover'
          : 'shadow-card hover:shadow-card-hover hover:-translate-y-0.5'
      }`}
      style={isHome ? undefined : { maxWidth: 'min(100%, 340px)' }}
    >
      {/* Image Section */}
      <div className="relative w-full aspect-[4/3] flex-shrink-0 overflow-hidden rounded-t-2xl">
        <Link to={getPropertyPath(property)} className="block w-full h-full">
          <img
            src={getCloudinaryThumbUrl(property.coverImageUrl || property.images?.[0])}
            alt={titleText}
            width={400}
            height={300}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </Link>

        {/* Gradient Overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 35%, transparent 55%)',
          }}
        />

        {/* Status Badge */}
        <div className="absolute top-2.5 left-2.5 flex gap-2 z-10 pointer-events-none">
          <span
            className="inline-flex items-center py-1 px-2.5 text-xs font-semibold text-white leading-none rounded-full shadow-sm"
            style={{
              backgroundColor: isInstallment ? '#059669' : listingType === 'rent' ? '#ea580c' : '#2563eb',
            }}
          >
            {isInstallment ? 'ผ่อนตรง' : listingType === 'rent' ? 'เช่า' : 'ขาย'}
          </span>
          {isNew && (
            <span className="inline-flex items-center py-1 px-2.5 text-xs font-semibold text-white leading-none rounded-full shadow-sm bg-blue-500">
              New
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          onClick={handleFavorite}
          className="absolute top-2.5 right-2.5 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-sm hover:bg-white hover:shadow hover:scale-105 active:scale-95 transition-all duration-200"
          aria-label={favorited ? 'ลบออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
        >
          <HeartIcon active={favorited} />
        </button>

        {/* Price Overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none p-2 pt-5">
          {property.hotDeal && (
            <div className="text-amber-300 text-[10px] font-bold uppercase tracking-wide mb-0.5 drop-shadow-md">
              🔥 ราคาดี
            </div>
          )}
          <div
            className="text-white font-bold text-sm leading-tight tracking-tight"
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6)',
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

      {/* Content Section */}
      <div className="flex flex-col flex-1 min-w-0 p-3 gap-0.5">
        <Link to={getPropertyPath(property)} className="block mb-0.5">
          <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors text-sm">
            {titleText}
          </h3>
        </Link>

        <p className="text-slate-500 text-xs font-medium mb-1.5">
          <span aria-hidden>📍</span> {district || '—'}
        </p>

        <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium flex-wrap mb-2">
          <span className="flex items-center gap-0.5">
            <BedIcon /> {property.bedrooms ?? '-'}
          </span>
          <span className="text-slate-300" aria-hidden>|</span>
          <span className="flex items-center gap-0.5">
            <BathIcon /> {property.bathrooms ?? '-'}
          </span>
          {areaSqWa != null && (
            <>
              <span className="text-slate-300" aria-hidden>|</span>
              <span className="flex items-center gap-0.5">
                <AreaIcon /> {areaSqWa} ตร.ว.
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
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
          className="mt-auto inline-flex items-center justify-center gap-1 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-xs hover:border-blue-600 hover:text-blue-700 hover:bg-blue-50/50 active:scale-[0.98] transition-all duration-200 min-h-[40px] py-2 px-3"
        >
          ดูรายละเอียด
          <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  )
}

export default memo(PropertyCard)