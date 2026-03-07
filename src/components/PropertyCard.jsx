import { Link } from 'react-router-dom'
import { useState, useEffect, memo } from 'react'
import { isFavorite, toggleFavorite } from '../lib/favorites'
import { formatPriceShort } from '../lib/priceFormat'
import { getCloudinaryThumbUrl } from '../lib/cloudinary'
import { getPropertyLabel } from '../constants/propertyTypes'

// --- Modern Emoji Icons (Lightweight & Clear) ---
const BedIcon = () => <span className="text-base mr-1">🛏</span>
const BathIcon = () => <span className="text-base mr-1">🛁</span>
const ParkIcon = () => <span className="text-base mr-1">🚗</span>
const AreaIcon = () => <span className="text-base mr-1">📐</span>

const HeartIcon = ({ active }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill={active ? "currentColor" : "none"} 
    stroke="currentColor" 
    className={`w-6 h-6 transition-all duration-300 ${active ? 'text-red-500 scale-110' : 'text-slate-400'}`}
    strokeWidth="2"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
)

function PropertyCard({ property }) {
  if (!property?.id) return null

  const [favorited, setFavorited] = useState(false)
  
  useEffect(() => {
    setFavorited(isFavorite(property.id))
  }, [property.id])

  const listingType = property.listingType || (property.isRental ? 'rent' : 'sale')
  const subListingType = property.subListingType
  const isNew = property.createdAt && (Date.now() - (property.createdAt?.toMillis?.() || property.createdAt) < 7 * 24 * 60 * 60 * 1000)

  const handleFavorite = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setFavorited(toggleFavorite(property.id))
  }

  return (
    <div className="group bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full">
      
      {/* 1. IMAGE SECTION */}
      <div className="relative aspect-[4/3] overflow-hidden block">
        <Link to={`/properties/${property.id}`}>
          <img
            src={getCloudinaryThumbUrl(property.coverImageUrl || property.images?.[0])}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        </Link>
        
        {/* Top Badges (Limit to Max 2) */}
        <div className="absolute top-4 left-4 flex gap-2 z-10 pointer-events-none">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-wider shadow-md ${
            subListingType === 'installment_only' ? 'bg-blue-900' : (listingType === 'rent' ? 'bg-orange-600' : 'bg-blue-600')
          }`}>
            {subListingType === 'installment_only' ? 'ผ่อนตรง' : (listingType === 'rent' ? 'เช่า' : 'ขาย')}
          </span>
          {isNew && (
            <span className="bg-emerald-500 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-wider shadow-md">
              New
            </span>
          )}
        </div>

        {/* Favorite Button (Large Target 44px+) */}
        <button 
          onClick={handleFavorite}
          className="absolute top-2 right-2 p-3 bg-white/80 backdrop-blur-md rounded-full hover:bg-white transition-all z-10 active:scale-90 shadow-sm"
          aria-label="Favorite"
        >
          <HeartIcon active={favorited} />
        </button>

        {/* Price Overlay with Strong Shadow */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
          {property.hotDeal && (
            <span className="text-yellow-400 font-black text-[10px] uppercase tracking-tighter drop-shadow-md">
              🔥 ราคาดี
            </span>
          )}
          <div className="text-2xl font-black text-white tracking-tighter drop-shadow-lg filter">
            {formatPriceShort(property.price, listingType === 'rent', property.showPrice)}
          </div>
        </div>
      </div>

      {/* 2. INFORMATION SECTION */}
      <div className="p-5 flex flex-col flex-1">
        
        {/* Title & Location */}
        <Link to={`/properties/${property.id}`} className="block mb-3">
          <h3 className="font-bold text-slate-800 text-lg leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
            {getPropertyLabel(property.type)} {property.location?.subDistrict || ''}
          </h3>
          <p className="text-slate-400 text-sm flex items-center gap-1 mt-1 font-medium">
            📍 {property.location?.district}, {property.location?.province}
          </p>
        </Link>

        {/* Property Information Row (Features) */}
        <div className="flex items-center justify-between py-3 border-y border-slate-50 text-slate-600 mb-4 text-sm font-bold">
          <div className="flex items-center"><BedIcon /> {property.bedrooms || 0}</div>
          <div className="flex items-center"><BathIcon /> {property.bathrooms || 0}</div>
          <div className="flex items-center"><ParkIcon /> {property.parking || 0}</div>
          <div className="flex items-center"><AreaIcon /> {property.area || 0} ตร.ว.</div>
        </div>

        {/* Secondary Status (Moved from image to bottom) */}
        <div className="flex gap-2 mb-5">
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border ${
            property.availability === 'available' 
            ? 'bg-green-50 text-green-600 border-green-100' 
            : 'bg-red-50 text-red-600 border-red-100'
          }`}>
            {property.availability === 'available' ? '● ว่าง' : '● ติดจอง'}
          </span>
          <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 uppercase tracking-widest border border-slate-100">
            {property.propertyCondition || 'มือสอง'}
          </span>
        </div>

        {/* CTA Button */}
        <Link 
          to={`/properties/${property.id}`}
          className="mt-auto w-full bg-slate-900 hover:bg-blue-700 text-white text-center py-3.5 rounded-2xl font-black transition-all duration-300 active:scale-[0.98] shadow-lg shadow-slate-100"
        >
          ดูรายละเอียด
        </Link>
      </div>
    </div>
  )
}

export default memo(PropertyCard)
