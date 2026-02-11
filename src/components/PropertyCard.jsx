import { Link } from 'react-router-dom'
import { MapPin, Bed, Bath, Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { isFavorite, toggleFavorite } from '../lib/favorites'
import ImageSlider from './ImageSlider'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400'

function formatPrice(price, isRental) {
  if (price == null || price === '') return '-'
  const num = Number(price)
  if (isRental) {
    return `${num.toLocaleString('th-TH')} บาท/เดือน`
  }
  return `${num.toLocaleString('th-TH')} บาท`
}

function getBadges(property) {
  const badges = []
  if (property.featured) badges.push({ label: 'แนะนำ', key: 'featured' })
  if (property.hotDeal) badges.push({ label: 'Hot Deal', key: 'hotDeal' })
  if (property.directInstallment) badges.push({ label: 'ผ่อนตรง', key: 'directInstallment' })
  const createdAt = property.createdAt
  if (createdAt) {
    const ms = createdAt?.toMillis ? createdAt.toMillis() : (typeof createdAt === 'number' ? createdAt : null)
    if (ms && Date.now() - ms < 14 * 24 * 60 * 60 * 1000) {
      badges.push({ label: 'New', key: 'new' })
    }
  }
  return badges
}

export default function PropertyCard({ property, featuredLabel = 'แนะนำ' }) {
  const imgs = property.images && property.images.length > 0 ? property.images : []
  const loc = property.location || {}
  const badges = getBadges(property)
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
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300"
    >
      <div className="relative overflow-hidden rounded-t-2xl">
        <ImageSlider
          images={imgs}
          defaultImage={DEFAULT_IMAGE}
          showDots={false}
          showArrows={false}
          autoPlay={true}
          className="rounded-t-2xl"
        />
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <button
            onClick={handleFavoriteClick}
            className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm hover:bg-white/90 transition z-30"
            title={favorited ? 'ลบออกจากรายการโปรด' : 'บันทึกเป็นรายการโปรด'}
          >
            <Heart
              className={`h-5 w-5 transition ${
                favorited ? 'fill-red-500 text-red-500' : 'text-slate-600'
              }`}
            />
          </button>
          <div className="flex flex-wrap gap-1.5">
            {badges.map(({ label, key }) => (
              <span
                key={key}
                className={`px-2 py-0.5 rounded text-xs font-semibold z-20 ${
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
        <span className="absolute bottom-3 left-3 text-white font-bold text-lg drop-shadow z-20">
          {formatPrice(property.price, property.isRental)}
        </span>
      </div>
      <div className="p-4 rounded-b-2xl">
        <h3 className="font-semibold text-blue-900 line-clamp-2 group-hover:underline">{property.title}</h3>
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
}
