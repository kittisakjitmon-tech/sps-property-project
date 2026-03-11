import { useState, useEffect, lazy, Suspense } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { MapPin, Bed, Bath, Maximize2, Phone, MessageCircle, Share2, CheckCircle2, Copy } from 'lucide-react'
import { createIsgdShortUrl } from '../lib/isgd'
import { getPropertyByIdOnce, createOrReuseShareLink, recordPropertyView } from '../lib/firestore'
import PageLayout from '../components/PageLayout'
import Toast from '../components/Toast'
import ProtectedImageContainer from '../components/ProtectedImageContainer'
import MortgageCalculator from '../components/MortgageCalculator'
import LeadForm from '../components/LeadForm'
import { formatPrice } from '../lib/priceFormat'
import { highlightText, highlightTags } from '../lib/textHighlight'
import { usePublicAuth } from '../context/PublicAuthContext'
import { getPropertyLabel } from '../constants/propertyTypes'
import { getCloudinaryLargeUrl, getCloudinaryThumbUrl, isValidImageUrl } from '../lib/cloudinary'
import { extractIdFromSlug, generatePropertySlug, getPropertyPath } from '../lib/propertySlug'

const RelatedProperties = lazy(() => import('../components/RelatedProperties'))
const NeighborhoodData = lazy(() => import('../components/NeighborhoodData'))

export default function PropertyDetail() {
  const { slug, id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAgent } = usePublicAuth()
  const searchQuery = searchParams.get('q') || ''

  // Support both /properties/:slug and /p/:id routes
  const propertyId = slug ? extractIdFromSlug(slug) : id

  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPropertyByIdOnce(propertyId).then((p) => {
      if (!cancelled) {
        setProperty(p)
        if (p?.id) recordPropertyView({ propertyId: p.id, type: p.type }).catch(() => {})
      }
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [propertyId])

  useEffect(() => {
    if (!property) return
    const canonical = generatePropertySlug(property)
    if (canonical && slug !== canonical) {
      navigate(`/properties/${canonical}`, { replace: true })
    }
  }, [property, slug, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl overflow-hidden shadow-md">
                <div className="aspect-video bg-slate-200 animate-pulse" />
                <div className="flex gap-2 p-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="shrink-0 w-20 h-14 rounded-lg bg-slate-200 animate-pulse" />
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 space-y-4">
                <div className="h-5 w-24 bg-slate-200 rounded-full animate-pulse" />
                <div className="h-8 w-3/4 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-6 w-1/3 bg-yellow-100 rounded-lg animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-5/6" />
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-4/6" />
                </div>
              </div>
            </div>
            {/* Sidebar skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md space-y-4">
                <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                ))}
                <div className="h-12 bg-blue-100 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">ไม่พบรายการนี้</p>
          <Link to="/" className="text-blue-900 font-medium hover:underline">กลับหน้าแรก</Link>
        </div>
      </div>
    )
  }

  const loc = property.location || {}
  const agent = property.agentContact || {}
  const defaultImg = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
  const rawImgs = property.images && Array.isArray(property.images) ? property.images.filter(isValidImageUrl) : []
  
  // --- จัดลำดับรูปภาพ: ให้รูปปก (coverImageUrl) ขึ้นเป็นรูปแรกเสมอ ---
  let finalImgs = [...rawImgs]
  if (property.coverImageUrl && isValidImageUrl(property.coverImageUrl)) {
    // กรองรูปปกออกจากรายการปกติก่อน (เพื่อไม่ให้รูปซ้ำ) แล้วเอามาวางไว้ลำดับที่ 1
    finalImgs = [
      property.coverImageUrl,
      ...rawImgs.filter(img => img !== property.coverImageUrl)
    ]
  }
  const imgs = finalImgs.length > 0 ? finalImgs : [defaultImg]
  // ---------------------------------------------------------

  const title = `${property.title} | SPS Property Solution`
  const description = (property.description || '').slice(0, 160) + ((property.description || '').length > 160 ? '...' : '')
  const primaryImageRaw = rawImgs.length > 0 ? rawImgs[0] : 'https://spspropertysolution.com/icon.png'
  const primaryImage = primaryImageRaw && primaryImageRaw.startsWith('http') ? primaryImageRaw : `https://spspropertysolution.com${primaryImageRaw || ''}`

  // Convert Google Maps URL to embed URL if needed
  const getMapEmbedUrl = (url) => {
    if (!url) {
      if (loc.district && loc.province) {
        const locationQuery = `${loc.district}, ${loc.province}`
        return `https://www.google.com/maps?q=${encodeURIComponent(locationQuery)}&output=embed`
      }
      return null
    }
    // ลิงก์สั้น (maps.app.goo.gl, goo.gl) ไม่รองรับ iframe embed
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) return null
    if (url.includes('/embed')) return url
    if (url.includes('google.com/maps')) {
      const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (coordMatch) {
        return `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&output=embed`
      }
      const placeMatch = url.match(/place\/([^/?#]+)/)
      if (placeMatch) {
        const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
        return `https://www.google.com/maps?q=${encodeURIComponent(placeName)}&output=embed`
      }
      const searchMatch = url.match(/[?&]q=([^&]+)/)
      if (searchMatch) {
        const query = decodeURIComponent(searchMatch[1])
        return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
      }
      try {
        const urlObj = new URL(url)
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

  const handleShare = async () => {
    if (!property?.id) return

    const isLineApp = /Line/i.test(navigator.userAgent)

    if (isLineApp) {
      try {
        const link = await createOrReuseShareLink({
          propertyId: property.id,
          createdBy: 'public_share',
          ttlHours: 24,
        })
        const shareUrl = `${window.location.origin}/share/${link.id}`
        window.location.href = shareUrl
      } catch (error) {
        console.error('Share link error:', error)
        setToastMessage('ไม่สามารถสร้างลิงก์แชร์ได้ กรุณาลองใหม่')
        setShowToast(true)
      }
      return
    }

    // ไม่ใช่ Line: ได้ shareUrl แล้วเปิดแท็บใหม่เท่านั้น — แท็บเดิมไม่ redirect เลย (ถ้าเปิดแท็บไม่ได้ให้แสดงลิงก์)
    try {
      const link = await createOrReuseShareLink({
        propertyId: property.id,
        createdBy: 'public_share',
        ttlHours: 24,
      })
      const shareUrl = `${window.location.origin}/share/${link.id}`
      const newTab = window.open(shareUrl, '_blank', 'noopener,noreferrer')
      if (!newTab || newTab.closed) {
        try {
          await navigator.clipboard.writeText(shareUrl)
          setToastMessage('คัดลอกลิงก์แชร์แล้ว — แท็บใหม่ถูกบล็อก กรุณาวางลิงก์ในแท็บใหม่')
        } catch {
          setToastMessage(`ลิงก์แชร์: ${shareUrl}`)
        }
        setShowToast(true)
      }
    } catch (error) {
      console.error('Share link error:', error)
      setToastMessage('ไม่สามารถสร้างลิงก์แชร์ได้ กรุณาลองใหม่')
      setShowToast(true)
    }
  }

  const handleCopyLink = async () => {
    if (!property?.id) return
    setIsCopying(true)
    try {
      const longUrl = window.location.href
      const shortUrl = await createIsgdShortUrl(longUrl)
      await navigator.clipboard.writeText(shortUrl)
      if (shortUrl === longUrl) {
        console.warn('is.gd shortening returned original URL; copy used long URL')
        setToastMessage(`คัดลอกลิงก์แล้ว: ${shortUrl}`)
      } else {
        setToastMessage(`คัดลอกลิงก์แล้ว: ${shortUrl}`)
      }
      setShowToast(true)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error('Copy link error:', err)
      setToastMessage('ไม่สามารถคัดลอกลิงก์ได้ กรุณาลองใหม่')
      setShowToast(true)
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <PageLayout
      heroTitle={property.title}
      heroSubtitle={`${loc.district || ''}, ${loc.province || ''}`}
      searchComponent={null}
    >
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://spspropertysolution.com${getPropertyPath(property)}`} />
        {/* Open Graph for social sharing (e.g., LINE, Facebook) */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`https://spspropertysolution.com${getPropertyPath(property)}`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={primaryImage} />
        {/* Twitter Card (บางแพลตฟอร์มอื่นใช้งานร่วมกันได้) */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={primaryImage} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'RealEstateListing',
            name: property.title,
            description: property.description || '',
            image: property.images && property.images.length > 0 ? property.images : [],
            url: window.location.href,
            datePosted: property.createdAt ? new Date(property.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
            offers: {
              '@type': 'Offer',
              price: property.price || 0,
              priceCurrency: 'THB',
              availability: property.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
              url: window.location.href
            },
            address: {
              '@type': 'PostalAddress',
              addressLocality: loc.district || '',
              addressRegion: loc.province || '',
              addressCountry: 'TH',
            },
            ...(loc.lat && loc.lng ? {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: loc.lat,
                longitude: loc.lng
              }
            } : {}),
            numberOfRooms: property.bedrooms || 0,
            numberOfBathroomsTotal: property.bathrooms || 0,
            floorSize: property.area ? {
              '@type': 'QuantitativeValue',
              value: property.area,
              unitText: 'SQM'
            } : undefined,
            propertyType: getPropertyLabel(property.type) || '',
          })}
        </script>
      </Helmet>
      <div className="min-h-screen bg-slate-50 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Gallery */}
              <div className="bg-white rounded-xl overflow-hidden shadow-md">
                <ProtectedImageContainer propertyId={property.propertyId} className="aspect-video relative bg-slate-200">
                  <img
                    src={getCloudinaryLargeUrl(imgs[galleryIndex])}
                    alt={`${getPropertyLabel(property.type) || 'อสังหาริมทรัพย์'} โครงการ ${property.title} - รูปภาพที่ ${galleryIndex + 1}`}
                    className="w-full h-full object-cover protected-image"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </ProtectedImageContainer>
                {imgs.length > 1 && (
                  <div className="flex gap-2 p-2 overflow-x-auto" onContextMenu={(e) => e.preventDefault()}>
                    {imgs.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setGalleryIndex(i)}
                        className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 ${i === galleryIndex ? 'border-blue-900' : 'border-transparent'}`}
                        aria-label={`ดูรูปภาพที่ ${i + 1} จากทั้งหมด ${imgs.length} รูป`}
                      >
                        <img
                          src={getCloudinaryThumbUrl(img)}
                          alt={`รูปย่อที่ ${i + 1} โครงการ ${property.title}`}
                          className="w-full h-full object-cover protected-image"
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                {/* Top Row: Badges Area */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {/* Badge 1: ID with Copy */}
                  {property.propertyId && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                      <span className="font-mono">{property.propertyId}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(property.propertyId)
                          setToastMessage('คัดลอกรหัสทรัพย์แล้ว')
                          setShowToast(true)
                          setTimeout(() => setShowToast(false), 2000)
                        }}
                        className="p-0.5 hover:bg-gray-200 rounded transition"
                        title="คัดลอกรหัสทรัพย์"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Badge 2: Transaction Type (ซื้อ/เช่า) */}
                  {property.type && (
                    <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                      {property.isRental ? 'เช่า' : 'ซื้อ'}
                    </span>
                  )}

                  {/* Badge 3: Asset Type (มือ 1/มือ 2) - แสดงเฉพาะทรัพย์ขาย */}
                  {!property.isRental && property.propertySubStatus && (
                    <span className="px-3 py-1.5 rounded-full bg-blue-900 text-white text-sm font-medium">
                      {property.propertySubStatus}
                    </span>
                  )}

                  {/* Badge 4: Status */}
                  {(() => {
                    let statusLabel = ''
                    let statusColor = ''
                    if (property.isRental) {
                      // สำหรับทรัพย์เช่า: ใช้ availability
                      if (property.availability === 'unavailable') {
                        statusLabel = 'ไม่ว่าง'
                        statusColor = 'bg-red-600 text-white'
                      } else {
                        statusLabel = 'ว่าง'
                        statusColor = 'bg-emerald-500 text-white'
                      }
                    } else {
                      // สำหรับทรัพย์ขาย: ใช้ status
                      if (property.status === 'available') {
                        statusLabel = 'ว่าง'
                        statusColor = 'bg-emerald-500 text-white'
                      } else if (property.status === 'reserved') {
                        statusLabel = 'ติดจอง'
                        statusColor = 'bg-orange-500 text-white'
                      } else if (property.status === 'sold') {
                        statusLabel = 'ขายแล้ว'
                        statusColor = 'bg-red-600 text-white'
                      }
                    }
                    return statusLabel ? (
                      <span className={`px-3 py-1.5 rounded-full ${statusColor} text-sm font-medium`}>
                        {statusLabel}
                      </span>
                    ) : null
                  })()}

                  {/* ผ่อนตรง Badge */}
                  {property.directInstallment && (
                    <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-yellow-400 text-blue-900">
                      ผ่อนตรง
                    </span>
                  )}
                </div>

                {/* Title Section */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {property.displayId && (
                      <p className="text-xs font-mono text-slate-400 mb-1.5">{property.displayId}</p>
                    )}
                    <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-4">
                      {property.title}
                    </h1>

                    {/* Price Section */}
                    <p className="text-2xl font-bold text-amber-700 mb-4">
                      {formatPrice(property.price, property.isRental, property.showPrice)}
                    </p>
                    {/* Custom Tags with Highlight */}

                  </div>
                  {/* ปุ่มแชร์สำหรับส่งลิงก์ให้ลูกค้า (เปิด blank ทันทีเพื่อไม่ให้ mobile บล็อก popup) */}
                    <button
                      type="button"
                      onClick={handleShare}
                      className="ml-4 flex items-center gap-2 px-4 py-2.5 min-h-[44px] min-w-[44px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium shrink-0 [touch-action:manipulation]"
                      aria-label="แชร์ให้ลูกค้า"
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="hidden sm:inline">แชร์ให้ลูกค้า</span>
                      <span className="sm:hidden">แชร์</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="ml-3 flex items-center gap-2 px-4 py-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200 shadow-sm transition-transform transform hover:-translate-y-0.5 active:translate-y-0 duration-150 font-medium shrink-0 [touch-action:manipulation]"
                      aria-label="คัดลอกลิงก์"
                    >
                      {isCopying ? (
                        <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">คัดลอกลิงก์</span>
                      <span className="sm:hidden">คัดลอก</span>
                    </button>
                </div>

                {/* Location & Specs */}
                <div className="space-y-3 mb-4">
                  {/* Location */}
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{loc.district || ''}{loc.district && loc.province ? ', ' : ''}{loc.province || ''}</span>
                  </div>

                  {/* Specs Row */}
                  <div className="flex flex-wrap items-center gap-4 text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Bed className="h-4 w-4 shrink-0" />
                      <span>{property.bedrooms || '-'} ห้องนอน</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Bath className="h-4 w-4 shrink-0" />
                      <span>{property.bathrooms || '-'} ห้องน้ำ</span>
                    </span>
                    {property.area != null && property.area > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Maximize2 className="h-4 w-4 shrink-0" />
                        <span>{(Number(property.area) / 4).toFixed(1)} ตร.ว.</span>
                      </span>
                    )}
                  </div>
                </div>
                <p
                  className="text-slate-700 leading-relaxed whitespace-pre-wrap"
                  style={{ fontFamily: 'Prompt, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}
                >
                  {property.description || '-'}
                </p>

                {/* เงื่อนไขการผ่อนตรง (เช่าซื้อ) */}
                {property.directInstallment && (
                  <div className="mt-6 p-6 rounded-xl border-2 border-blue-200 bg-blue-50/50">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-blue-900 text-sm">ผ่อนตรง</span>
                      เงื่อนไขการผ่อนตรง (เช่าซื้อ)
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        'ไม่เช็คเครดิตบูโร ไม่ต้องกู้แบงก์',
                        'ใช้เพียงบัตรประชาชนใบเดียวในการทำสัญญา',
                        'วางเงินดาวน์ตามตกลง เข้าอยู่ได้ทันที',
                        'ผ่อนชำระโดยตรงกับโครงการ/เจ้าของ',
                        'สามารถเปลี่ยนเป็นการกู้ธนาคารได้ในภายหลังเมื่อพร้อม',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-700">
                          <CheckCircle2 className="h-5 w-5 text-blue-900 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags Section */}
                {property.customTags && Array.isArray(property.customTags) && property.customTags.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-blue-900 mb-3">Tag</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.customTags.map((tag, index) => {
                        if (searchQuery && typeof tag === 'string') {
                          // Use highlightText when there's a search query
                          return (
                            <Link
                              key={index}
                              to={`/properties?search=${encodeURIComponent(tag)}`}
                              className="px-3 py-1.5 bg-blue-50 text-gray-700 text-sm rounded-full border border-blue-200 font-medium hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors cursor-pointer inline-block"
                            >
                              {highlightText(tag, searchQuery)}
                            </Link>
                          )
                        } else {
                          // Regular display without highlight - Clickable
                          return (
                            <Link
                              key={index}
                              to={`/properties?search=${encodeURIComponent(tag)}`}
                              className="px-3 py-1.5 bg-blue-50 text-gray-700 text-sm rounded-full border border-blue-200 font-medium hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors cursor-pointer inline-block"
                            >
                              {tag}
                            </Link>
                          )
                        }
                      })}
                    </div>
                  </div>
                )}
              </div>
              {property.mapUrl && !property.mapUrl.includes('/embed') && (
                <div className="bottom-2 right-2">
                  <a
                    href={property.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white rounded-lg shadow-md text-xs text-blue-900 font-medium hover:bg-slate-50 transition"
                  >
                    เปิดใน Google Maps
                  </a>
                </div>
              )}

              {/* Map */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md">
                {mapEmbedUrl ? (
                  <div className="aspect-video">
                    <iframe
                      title="แผนที่"
                      src={mapEmbedUrl}
                      className="w-full h-full border-0"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : isShortMapLink ? (
                  <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-slate-50 px-6">
                    <MapPin className="h-12 w-12 text-blue-600" />
                    <p className="text-slate-600 text-center">ลิงก์สั้นไม่รองรับการแสดงแผนที่ในหน้า</p>
                    <a
                      href={property.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 text-white font-medium hover:bg-blue-800 transition-colors"
                    >
                      เปิดใน Google Maps
                    </a>
                  </div>
                ) : (
                  <div className="h-64 bg-slate-200 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>แผนที่ Google Maps</p>
                      <p className="text-sm">{loc.district || 'ไม่ระบุ'}, {loc.province || 'ไม่ระบุ'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Loan Calculator - แสดงเมื่อ showPrice เท่านั้น (เพื่อไม่เปิดเผยราคาผ่านค่างวด) */}
              {!property.isRental && property.price > 0 && property.showPrice !== false && (
                <div className="mt-6">
                  <MortgageCalculator price={property.price} directInstallment={property.directInstallment} />
                </div>
              )}

              {/* Related Properties — below the fold, lazy loaded */}
              <Suspense
                fallback={
                  <div className="py-8" aria-hidden="true">
                    <div className="h-6 w-40 bg-slate-200 rounded-lg mb-4 animate-pulse" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  </div>
                }
              >
                <RelatedProperties currentPropertyId={property.id} district={loc.district} type={property.type} />
              </Suspense>
            </div>

            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 space-y-6">
                {/* Sticky contact - ธีม Blue 30%, White 60%, Yellow 10% */}
                <div className="bg-white rounded-xl border border-blue-100 p-6 shadow-md">
                  <div className="pt-4 border-slate-100">
                    <p className="text-sm font-medium text-slate-700 mb-2">จองเยี่ยมชม (ส่งข้อความ)</p>
                    <LeadForm
                      propertyId={property.displayId || property.propertyId || property.id}
                      propertyTitle={property.title}
                      propertyPrice={property.price}
                      isRental={property.isRental}
                      onSuccess={(message) => {
                        setToastMessage(message || 'ส่งข้อมูลสำเร็จ เจ้าหน้าที่จะติดต่อกลับ')
                        setShowToast(true)
                      }}
                      onError={() => {
                        setToastMessage('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
                        setShowToast(true)
                      }}
                    />
                  </div>
                </div>

                <Suspense
                  fallback={
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md min-h-[120px] animate-pulse" aria-hidden="true" />
                  }
                >
                  <NeighborhoodData property={property} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} duration={3000} />
    </PageLayout>
  )
}
