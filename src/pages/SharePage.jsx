import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Copy,
  Check,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { getPropertyByIdOnce, getShareLinkByToken, isShareLinkExpired } from '../lib/firestore'
import NeighborhoodData from '../components/NeighborhoodData'
import ProtectedImageContainer from '../components/ProtectedImageContainer'
import { formatPrice } from '../lib/priceFormat'

export default function SharePage() {
  const { id: token } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [expired, setExpired] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadSharedProperty() {
      try {
        const shareLink = await getShareLinkByToken(token)
        if (shareLink) {
          if (isShareLinkExpired(shareLink)) {
            if (!cancelled) {
              setExpired(true)
              setProperty(null)
            }
            return
          }
          const p = await getPropertyByIdOnce(shareLink.propertyId)
          if (!cancelled) setProperty(p)
          return
        }

        // Backward compatibility: old direct /share/:propertyId links
        const fallback = await getPropertyByIdOnce(token)
        if (!cancelled) setProperty(fallback)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSharedProperty()
    return () => { cancelled = true }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">กำลังโหลด...</p>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{expired ? 'ลิงก์นี้หมดอายุแล้ว กรุณาให้เอเจนต์แชร์ลิงก์ใหม่' : 'ไม่พบรายการนี้'}</p>
          <Link to="/" className="text-blue-900 font-medium hover:underline">กลับหน้าแรก</Link>
        </div>
      </div>
    )
  }

  const loc = property.location || {}
  const imgs = property.images && property.images.length > 0 ? property.images : ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800']
  const category = property?.category || (property?.isRental ? 'rent' : 'buy')
  const condition = property?.condition || property?.subStatus
  const availability = property?.availability
  const propertyIdText = property?.propertyId || 'N/A'

  const priceText = formatPrice(property.price, property.isRental, property.showPrice)
  // พิกัด/ที่อยู่: ใช้ locationDisplay ก่อน แล้วค่อย location (subDistrict, district, province)
  const locationText = (property.locationDisplay && property.locationDisplay.trim()) ||
    [loc.subDistrict, loc.district, loc.province].filter(Boolean).join(', ') ||
    'ไม่ระบุ'

  const getMapEmbedUrl = (mapUrl) => {
    const hasValidCoords = property.lat != null && property.lng != null && !isNaN(Number(property.lat)) && !isNaN(Number(property.lng))
    if (hasValidCoords) return `https://www.google.com/maps?q=${property.lat},${property.lng}&output=embed`
    if (!mapUrl) {
      return locationText !== 'ไม่ระบุ'
        ? `https://www.google.com/maps?q=${encodeURIComponent(locationText)}&output=embed`
        : null
    }
    if (mapUrl.includes('maps.app.goo.gl') || mapUrl.includes('goo.gl/maps')) return null
    if (mapUrl.includes('/embed')) return mapUrl
    if (mapUrl.includes('google.com/maps')) {
      const coordMatch = mapUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (coordMatch) return `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&output=embed`
      const searchMatch = mapUrl.match(/[?&]q=([^&]+)/)
      if (searchMatch) {
        const query = decodeURIComponent(searchMatch[1])
        return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
      }
      try {
        const urlObj = new URL(mapUrl)
        urlObj.searchParams.set('output', 'embed')
        return urlObj.toString()
      } catch {
        return null
      }
    }
    return null
  }

  const mapEmbedUrl = getMapEmbedUrl(property.mapUrl)
  const isShortMapLink = property.mapUrl && (property.mapUrl.includes('maps.app.goo.gl') || property.mapUrl.includes('goo.gl/maps'))

  const pageTitle = `${property.title} | SPS Property Solution`
  const handleContextMenu = (e) => e.preventDefault()
  const handleCopyPropertyId = async () => {
    if (!property?.propertyId) return
    try {
      await navigator.clipboard.writeText(property.propertyId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={`${property.title} - ${priceText} - ${locationText}`} />
      </Helmet>
      <div
        className="share-page protected-content min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden"
        onContextMenu={handleContextMenu}
      >
        <div className="share-page-watermark absolute inset-0 pointer-events-none" aria-hidden />
        {/* Theme: Blue 30%, White 60%, Yellow 10% */}
        <div className="w-full max-w-3xl relative z-10">
          {/* Card - White 60% background */}
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
            {/* Main Image */}
            <ProtectedImageContainer propertyId={property.propertyId} className="aspect-video relative bg-slate-100 select-none">
              <img
                src={imgs[galleryIndex]}
                alt={property.title}
                className="w-full h-full object-cover share-protected-image protected-image"
                draggable={false}
              />
              <div className="absolute inset-0 pointer-events-none share-image-watermark" aria-hidden />
              {imgs.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setGalleryIndex((prev) => (prev === 0 ? imgs.length - 1 : prev - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                    aria-label="รูปก่อนหน้า"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryIndex((prev) => (prev === imgs.length - 1 ? 0 : prev + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                    aria-label="รูปถัดไป"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </ProtectedImageContainer>
            {imgs.length > 1 && (
              <div className="px-4 py-3 border-b border-slate-100 bg-white" onContextMenu={handleContextMenu}>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {imgs.map((img, i) => (
                    <button
                      key={`${img}-${i}`}
                      type="button"
                      onClick={() => setGalleryIndex(i)}
                      className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition ${i === galleryIndex ? 'border-blue-900' : 'border-transparent'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover protected-image" draggable={false} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Content - Blue accents */}
            <div className="p-5 sm:p-8">
              {/* Header */}
              <div className="mb-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 bg-gray-100 rounded-md px-2 py-1">
                    <span className="font-mono text-xs sm:text-sm text-slate-700">
                      {propertyIdText}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPropertyId}
                      className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 text-slate-600 transition"
                      title="คัดลอกรหัสทรัพย์"
                      aria-label="คัดลอกรหัสทรัพย์"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${category === 'rent' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {category === 'rent' ? 'เช่า' : 'ซื้อ'}
                  </span>
                  {category === 'rent' ? (
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${availability === 'available' || availability === 'ว่าง' ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
                      {availability === 'available' || availability === 'ว่าง' ? 'ว่าง' : 'ไม่ว่าง'}
                    </span>
                  ) : (
                    condition ? (
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${condition === 'มือ 1' ? 'bg-blue-900 text-white' : 'bg-slate-500 text-white'}`}>
                        {condition}
                      </span>
                    ) : null
                  )}
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-blue-900 mb-3 line-clamp-2">
                {property.title}
              </h1>

              <p className="text-2xl sm:text-3xl font-bold text-yellow-900 mb-4">
                {priceText}
              </p>

              {/* Location / พิกัด */}
              <div className="flex items-start gap-2 text-slate-600 mb-4">
                <MapPin className="h-5 w-5 shrink-0 text-blue-900 mt-0.5" />
                <span className="text-sm sm:text-base">{locationText}</span>
              </div>

              {/* Property details */}
              <div className="flex flex-wrap gap-4 pb-4 border-b border-slate-100">
                {property.bedrooms != null && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Bed className="h-4 w-4 text-blue-900" />
                    <span className="text-sm">{property.bedrooms} ห้องนอน</span>
                  </div>
                )}
                {property.bathrooms != null && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Bath className="h-4 w-4 text-blue-900" />
                    <span className="text-sm">{property.bathrooms} ห้องน้ำ</span>
                  </div>
                )}
                {property.area && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Maximize2 className="h-4 w-4 text-blue-900" />
                    <span className="text-sm">{property.area != null && property.area > 0 ? (Number(property.area) / 4).toFixed(1) : ''} ตร.ว.</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Prompt, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                  {property.description || '-'}
                </p>
              </div>

              {/* Nearby Places */}
              <div className="mt-6">
                <NeighborhoodData property={property} />
              </div>

              {/* Live Google Map Embed */}
              <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {mapEmbedUrl ? (
                  <div className="aspect-video">
                    <iframe
                      title="แผนที่โครงการ"
                      src={mapEmbedUrl}
                      className="w-full h-full border-0"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : isShortMapLink ? (
                  <div className="aspect-video flex flex-col items-center justify-center gap-3 bg-slate-50 px-6">
                    <MapPin className="h-10 w-10 text-blue-600" />
                    <p className="text-slate-600 text-center text-sm">ลิงก์สั้นไม่รองรับการฝังแผนที่ในหน้า</p>
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-slate-100 text-slate-500">
                    ไม่สามารถแสดงแผนที่ได้
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Branding - Yellow 10% accent */}
          <p className="text-center text-slate-500 text-xs sm:text-sm mt-6 flex items-center justify-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            ข้อมูลนี้เป็นลิขสิทธิ์ของ SPS Property Solution ห้ามมิให้ทำซ้ำหรือเผยแพร่โดยไม่ได้รับอนุญาต
          </p>
        </div>
      </div>
    </>
  )
}
