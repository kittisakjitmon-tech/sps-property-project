import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { MapPin, Bed, Bath, Maximize2, ExternalLink } from 'lucide-react'
import { getPropertyByIdOnce } from '../lib/firestore'

export default function SharePage() {
  const { id } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getPropertyByIdOnce(id).then((p) => {
      if (!cancelled) setProperty(p)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

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
          <p className="text-slate-600 mb-4">ไม่พบรายการนี้</p>
          <Link to="/" className="text-blue-900 font-medium hover:underline">กลับหน้าแรก</Link>
        </div>
      </div>
    )
  }

  const loc = property.location || {}
  const imgs = property.images && property.images.length > 0 ? property.images : ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800']
  const mainImage = imgs[0]
  const priceText = property.isRental
    ? `${(property.price / 1000).toFixed(0)}K บาท/เดือน`
    : `${(property.price / 1_000_000).toFixed(1)} ล้านบาท`
  // พิกัด/ที่อยู่: ใช้ locationDisplay ก่อน แล้วค่อย location (subDistrict, district, province)
  const locationText = (property.locationDisplay && property.locationDisplay.trim()) ||
    [loc.subDistrict, loc.district, loc.province].filter(Boolean).join(', ') ||
    'ไม่ระบุ'
  // URL แผนที่พร้อมปักหมุด: ใช้ lat/lng ก่อน (จะปักหมุดได้), แล้วค่อย mapUrl, สุดท้ายค้นจาก location
  const hasValidCoords = property.lat != null && property.lng != null && !isNaN(Number(property.lat)) && !isNaN(Number(property.lng))
  const mapUrl = hasValidCoords
    ? `https://www.google.com/maps?q=${property.lat},${property.lng}`
    : (property.mapUrl && property.mapUrl.trim()) || (locationText !== 'ไม่ระบุ'
      ? `https://www.google.com/maps?q=${encodeURIComponent(locationText)}`
      : null)

  const pageTitle = `${property.title} | SPS Property Solution`

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={`${property.title} - ${priceText} - ${locationText}`} />
      </Helmet>
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        {/* Theme: Blue 30%, White 60%, Yellow 10% */}
        <div className="w-full max-w-lg">
          {/* Card - White 60% background */}
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
            {/* Main Image */}
            <div className="aspect-video relative bg-slate-100">
              <img
                src={mainImage}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Content - Blue accents */}
            <div className="p-6 sm:p-8">
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

              {/* CTA - Blue 30% */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  to={`/properties/${property.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-800 transition"
                >
                  ดูรายละเอียดเพิ่มเติม
                  <ExternalLink className="h-4 w-4" />
                </Link>
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-blue-900 text-blue-900 font-semibold hover:bg-blue-50 transition"
                  >
                    <MapPin className="h-4 w-4" />
                    เปิดแผนที่
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Branding - Yellow 10% accent */}
          <p className="text-center text-slate-500 text-sm mt-6">
            SPS Property Solution
          </p>
        </div>
      </div>
    </>
  )
}
