import { Link } from 'react-router-dom'
import { MapPin, Bed, Bath, Heart } from 'lucide-react'
import { useState, useEffect, memo } from 'react'
import { isFavorite, toggleFavorite } from '../lib/favorites'
import { formatPrice } from '../lib/priceFormat'
import ProtectedImageContainer from './ProtectedImageContainer'
import { highlightText, highlightTags } from '../lib/textHighlight'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400'

// Constants
const NEW_PROPERTY_DAYS = 14
const NEW_PROPERTY_MS = NEW_PROPERTY_DAYS * 24 * 60 * 60 * 1000

/**
 * ตรวจสอบว่าทรัพย์สินมีคุณสมบัติ 'ผ่อนตรง' จริงๆ หรือไม่
 * Strict Boolean/Tag Check: ตรวจสอบจากฟิลด์เฉพาะเท่านั้น
 * Moved outside component for better performance
 */
function hasDirectInstallment(property) {
  try {
    if (!property || typeof property !== 'object') return false
    
    // ตรวจสอบจากฟิลด์ directInstallment (Boolean) ก่อน
    if (property.directInstallment === true) {
      return true
    }
    
    // ตรวจสอบจาก tags array (ถ้ามี)
    const tags = property.tags || property.customTags || []
    if (Array.isArray(tags) && tags.length > 0) {
      const tagText = tags.map((t) => {
        if (typeof t === 'string') return String(t).toLowerCase().trim()
        if (t && typeof t === 'object') return String(t.label || t.name || t.value || '').toLowerCase().trim()
        return ''
      }).join(' ')
      if (tagText.includes('ผ่อนตรง')) {
        return true
      }
    }
    
    // Fallback: ตรวจสอบจาก description ด้วย Negative Lookbehind Logic
    // เฉพาะกรณีที่ข้อมูลยังไม่ได้แยก Field ชัดเจน
    const description = String(property.description || '').toLowerCase()
    if (description.includes('ผ่อนตรง')) {
      // Negative Lookbehind: ต้องไม่เจอคำว่า 'ไม่รับ', 'งด', 'ไม่' อยู่ข้างหน้า
      const negativePatterns = [
        /ไม่รับ\s*ผ่อนตรง/,
        /งด\s*ผ่อนตรง/,
        /ไม่\s*ผ่อนตรง/,
        /ไม่มี\s*ผ่อนตรง/,
        /ไม่สามารถ\s*ผ่อนตรง/,
      ]
      
      // ตรวจสอบว่ามี negative patterns หรือไม่
      const hasNegative = negativePatterns.some((pattern) => pattern.test(description))
      if (hasNegative) {
        return false // ถ้ามี negative pattern ให้ return false
      }
      
      // ถ้าไม่มี negative pattern และเจอคำว่า 'ผ่อนตรง' ให้ return true
      return true
    }
    
    return false
  } catch {
    return false
  }
}

function getBadges(property) {
  const badges = []
  // Badge 'แนะนำ' และ 'Hot Deal' - คงไว้ตามเดิม
  if (property.featured) badges.push({ label: 'แนะนำ', key: 'featured' })
  if (property.hotDeal) badges.push({ label: 'Hot Deal', key: 'hotDeal' })
  
  // Badge 'New' - คงไว้ตามเดิม
  const createdAt = property.createdAt
  if (createdAt) {
    const ms = createdAt?.toMillis ? createdAt.toMillis() : (typeof createdAt === 'number' ? createdAt : null)
    if (ms && Date.now() - ms < NEW_PROPERTY_MS) {
      badges.push({ label: 'New', key: 'new' })
    }
  }
  
  // ไม่ต้องแสดง Badge 'ผ่อนตรง' ที่นี่แล้ว เพราะจะแสดงใน Transaction Type Badge เมื่อ subListingType === 'installment_only'
  // แต่ถ้าเป็นข้อมูลเก่าที่มี directInstallment แต่ไม่มี subListingType ให้แสดง Badge 'ผ่อนตรง' ที่นี่
  const listingType = property.listingType || (property.isRental ? 'rent' : 'sale')
  const subListingType = property.subListingType
  
  // แสดง Badge 'ผ่อนตรง' เฉพาะกรณีข้อมูลเก่าที่ไม่มี subListingType แต่มี directInstallment
  if (listingType === 'rent' && !subListingType && hasDirectInstallment(property)) {
    badges.push({ label: 'ผ่อนตรง', key: 'directInstallment' })
  }
  
  return badges
}

/**
 * Get listing type badge (ขาย/เช่า/ผ่อนตรง) - แสดงประเภทรายการ
 * ใช้โครงสร้างข้อมูลใหม่ (listingType, subListingType)
 */
function getTransactionTypeBadge(property) {
  // ตรวจสอบ listingType ใหม่ก่อน
  const listingType = property.listingType || (property.isRental ? 'rent' : 'sale')
  
  if (listingType === 'sale') {
    return { label: 'ขาย', color: 'bg-blue-700 text-white' }
  } else if (listingType === 'rent') {
    // ตรวจสอบ subListingType เพื่อแยก 'เช่า' กับ 'ผ่อนตรง'
    const subListingType = property.subListingType
    if (subListingType === 'installment_only') {
      return { label: 'ผ่อนตรง', color: 'bg-blue-900 text-white' }
    } else if (subListingType === 'rent_only') {
      return { label: 'เช่า', color: 'bg-orange-600 text-white' }
    }
    // Backward compatibility: ตรวจสอบ directInstallment
    if (property.directInstallment === true) {
      return { label: 'ผ่อนตรง', color: 'bg-blue-900 text-white' }
    }
    // Default สำหรับ rent: แสดง 'เช่า'
    return { label: 'เช่า', color: 'bg-emerald-700 text-white' }
  }
  
  // Backward compatibility: ใช้ isRental ถ้าไม่มี listingType
  if (property.isRental === true) {
    return { label: 'เช่า', color: 'bg-emerald-700 text-white' }
  } else if (property.isRental === false) {
    return { label: 'ขาย', color: 'bg-blue-700 text-white' }
  }
  
  // Fallback: ตรวจสอบจาก type
  if (property.type === 'บ้านเช่า') {
    return { label: 'เช่า', color: 'bg-emerald-700 text-white' }
  }
  
  return { label: 'ขาย', color: 'bg-blue-700 text-white' }
}

/**
 * Get availability status badge (ว่าง, ติดจอง, ขายแล้ว)
 * ใช้โครงสร้างข้อมูลใหม่ (availability)
 */
function getAvailabilityBadge(property) {
  // ตรวจสอบ availability ใหม่ก่อน
  const availability = property.availability || property.status
  
  if (!availability || availability === 'pending') return null
  
  switch (availability) {
    case 'available':
    case 'ว่าง':
      return { label: 'ว่าง', color: 'bg-green-500 text-white' }
    case 'reserved':
    case 'ติดจอง':
      return { label: 'ติดจอง', color: 'bg-orange-500 text-white' }
    case 'sold':
    case 'ขายแล้ว':
      return { label: 'ขายแล้ว', color: 'bg-red-600 text-white' }
    case 'unavailable':
    case 'ไม่ว่าง':
      return { label: 'ไม่ว่าง', color: 'bg-red-500 text-white' }
    default:
      // Backward compatibility: แสดงเป็น Badge สีเทา
      return { label: String(availability), color: 'bg-slate-100 text-slate-700' }
  }
}

/**
 * Get property condition badge (มือ 1, มือ 2) - แสดงเฉพาะเมื่อเป็น listingType === 'sale'
 * ใช้โครงสร้างข้อมูลใหม่ (propertyCondition)
 */
function getPropertyConditionBadge(property) {
  // ตรวจสอบ listingType ก่อน
  const listingType = property.listingType || (property.isRental ? 'rent' : 'sale')
  if (listingType !== 'sale') return null
  
  // ตรวจสอบ propertyCondition ใหม่ก่อน
  const condition = property.propertyCondition || property.propertySubStatus
  if (condition === 'มือ 1') {
    return { label: 'มือ 1', color: 'bg-blue-100 text-blue-900' }
  }
  if (condition === 'มือ 2') {
    return { label: 'มือ 2', color: 'bg-blue-100 text-blue-900' }
  }
  return null
}

/**
 * Check if property is sold/rented (for grayscale overlay)
 * ใช้โครงสร้างข้อมูลใหม่ (availability)
 */
function isSoldOrRented(property) {
  const availability = property.availability || property.status
  return availability === 'sold' || availability === 'ขายแล้ว'
}

function PropertyCard({ property, featuredLabel = 'แนะนำ', searchQuery = '' }) {
  // Safety check: ถ้าไม่มี property หรือไม่มี id ให้ return null
  if (!property || !property.id) {
    return null
  }

  try {
    // Image Selection Logic: ใช้ coverImageUrl ถ้ามี หรือ images[0] ถ้าไม่มี
    const coverImage = property.coverImageUrl || 
      (property.images && Array.isArray(property.images) && property.images.length > 0 
        ? property.images[0] 
        : DEFAULT_IMAGE)
    
  const loc = property.location || {}
  const badges = getBadges(property)
    
    // Logic การแสดง Badge ตามประเภททรัพย์ (ใช้โครงสร้างข้อมูลใหม่)
    const listingType = property.listingType || (property.isRental ? 'rent' : 'sale')
    const transactionTypeBadge = getTransactionTypeBadge(property) // ประเภทรายการ (ขาย/เช่า/ผ่อนตรง)
    const availabilityBadge = getAvailabilityBadge(property) // สถานะ (ว่าง/ติดจอง/ขายแล้ว)
    const propertyConditionBadge = listingType === 'sale' ? getPropertyConditionBadge(property) : null // สภาพ (มือ 1/มือ 2) - เฉพาะ sale
    
    const isSold = isSoldOrRented(property)
    
    // ตรวจสอบว่าเป็น rental หรือไม่ (สำหรับการแสดงราคา)
    const isRental = listingType === 'rent' || property.isRental === true
  const [favorited, setFavorited] = useState(false)

  useEffect(() => {
    setFavorited(isFavorite(property.id))
  }, [property.id])

  const handleFavoriteClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const newState = toggleFavorite(property.id)
    setFavorited(newState)
  }

  return (
    <Link
      to={`/properties/${property.id}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ease-in-out"
    >
      <div 
        className="relative overflow-hidden rounded-t-2xl"
        style={isSold ? { filter: 'grayscale(60%)' } : {}}
      >
        {/* Dark overlay for sold/rented properties */}
        {isSold && (
          <div className="absolute inset-0 bg-black/25 z-[15] pointer-events-none rounded-t-2xl" />
        )}
        {/* Single Cover Image - Disable Slideshow */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl">
          <ProtectedImageContainer className="absolute inset-0 w-full h-full" propertyId={property.propertyId}>
            <img
              src={coverImage}
              alt={property.title || 'Property image'}
              className="w-full h-full object-cover protected-image transition-transform duration-700 ease-in-out group-hover:scale-110"
              loading="lazy"
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
          </ProtectedImageContainer>
        </div>
        {/* Top Left Section - Transaction Type Badge + Favorite Button + Other Badges */}
        <div className="absolute top-3 left-3 z-30 flex items-start gap-2">
          
          {/* Favorite Button */}
          <button
            onClick={handleFavoriteClick}
            className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm hover:bg-white/90 transition"
            title={favorited ? 'ลบออกจากรายการโปรด' : 'บันทึกเป็นรายการโปรด'}
          >
            
            <Heart
              className={`h-5 w-5 transition ${
                favorited ? 'fill-red-500 text-red-500' : 'text-slate-600'
              }`}
            />
          </button>
          
          {/* Transaction Type Badge - ลำดับแรกสุด (มุมซ้ายบน) */}
          {transactionTypeBadge && (
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-semibold text-white shadow-lg hover:scale-105 transition-transform ${transactionTypeBadge.color}`}
            >
              {transactionTypeBadge.label}
            </span>
          )}
          {/* Other Badges (Hot Deal, ผ่อนตรง) */}
          <div className="flex flex-wrap gap-1.5">
            {badges.map(({ label, key }) => (
            <span
              key={key}
                className={`px-2 py-0.5 rounded text-xs font-semibold hover:scale-105 transition-transform ${
                key === 'featured' || key === 'hotDeal'
                  ? 'bg-yellow-400 text-blue-900'
                  : 'bg-blue-900 text-white'
              }`}
            >
              {key === 'featured' ? featuredLabel : label}
            </span>
          ))}
        </div>
        </div>
        {/* Price - ขยับขึ้นเพื่อไม่ให้จมกับลายน้ำ */}
        <span className="absolute bottom-9 left-3 text-white font-bold text-lg drop-shadow z-20">
          {formatPrice(property.price, isRental, property.showPrice)}
        </span>
        {/* Status Badges - มุมขวาล่าง */}
        <div className="absolute bottom-9 right-3 z-20 flex flex-col items-end gap-1.5">
          {/* Badge สถานะ (availability) - แสดงทุกประเภท */}
          {availabilityBadge && (
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-medium shadow-md backdrop-blur-sm hover:scale-105 transition-transform ${availabilityBadge.color}`}
            >
              {availabilityBadge.label}
            </span>
          )}
          {/* Badge สภาพ (propertyCondition - มือ 1/มือ 2) - แสดงเฉพาะ listingType === 'sale' */}
          {propertyConditionBadge && (
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-medium shadow-md backdrop-blur-sm hover:scale-105 transition-transform ${propertyConditionBadge.color}`}
            >
              {propertyConditionBadge.label}
            </span>
          )}
        </div>
      </div>
      <div className="p-4 rounded-b-2xl">
        <h3 className="font-semibold text-blue-900 line-clamp-2 group-hover:underline">
          {searchQuery ? highlightText(property.title, searchQuery) : property.title}
        </h3>
        <p className="flex items-center gap-1 text-slate-600 text-sm mt-1">
          <MapPin className="h-4 w-4 shrink-0" />
          {loc.district}, {loc.province}
        </p>
        
        <div className="flex gap-3 mt-2 text-slate-500 text-sm">
          <span className="flex items-center gap-1"><Bed className="h-4 w-4" /> {property.bedrooms ?? '-'}</span>
          <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {property.bathrooms ?? '-'}</span>
        </div>
      </div>
    </Link>
  )
  } catch (error) {
    // Keep error logging for critical errors
    if (process.env.NODE_ENV === 'development') {
      console.error('PropertyCard render error:', error, property)
    }
    return (
      <div className="bg-white rounded-2xl p-4 border border-red-200">
        <p className="text-red-600 text-sm">เกิดข้อผิดพลาดในการแสดงผลทรัพย์สิน</p>
      </div>
    )
  }
}

// Memoize component to prevent unnecessary re-renders
export default memo(PropertyCard)
