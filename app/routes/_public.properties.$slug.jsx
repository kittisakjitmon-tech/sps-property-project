/**
 * ★ Property Detail Page — Route Module with Server-Side Loader
 * 
 * ข้อมูลทรัพย์สินถูกดึงจาก Firestore ใน `clientLoader` ก่อน React render
 * → HTML ที่ส่งกลับมามีเนื้อหา (title, description, images, price) ครบ 100%
 * → OG meta tags ถูกใส่ลงไปใน <head> ตั้งแต่ Server render เลย
 */
import { useState, lazy, Suspense } from 'react'
import { useParams, Link, useSearchParams, useNavigate, data } from 'react-router'
import { MapPin, Bed, Bath, Maximize2, Phone, MessageCircle, Share2, CheckCircle2, Copy, Check } from 'lucide-react'
import { createSpoomeShortUrl } from '../lib/spoo'
import { getPropertyByIdOnce, createOrReuseShareLink, recordPropertyView } from '../lib/firestore'
import PageLayout from '../components/PageLayout'
import Toast from '../components/Toast'
import ProtectedImageContainer from '../components/ProtectedImageContainer'
import MortgageCalculator from '../components/MortgageCalculator'
import LeadForm from '../components/LeadForm'
import { formatPrice } from '../lib/priceFormat'
import { highlightText } from '../lib/textHighlight'
import { usePublicAuth } from '../context/PublicAuthContext'
import { getPropertyLabel } from '../constants/propertyTypes'
import { getCloudinaryLargeUrl, getCloudinaryThumbUrl, isValidImageUrl } from '../lib/cloudinary'
import { extractIdFromSlug, generatePropertySlug, getPropertyPath } from '../lib/propertySlug'

const RelatedProperties = lazy(() => import('../components/RelatedProperties'))
const NeighborhoodData = lazy(() => import('../components/NeighborhoodData'))

// ─── SEO Meta Tags (Server-rendered ใน <head>) ──────────────────────────────
export function meta({ data: loaderData }) {
  if (!loaderData?.property) {
    return [
      { title: "ไม่พบรายการนี้ | SPS Property Solution" },
      { name: "robots", content: "noindex" },
    ]
  }
  const p = loaderData.property
  const title = `${p.title || 'อสังหาริมทรัพย์'} | SPS Property Solution`
  const description = (p.description || '').slice(0, 160) + ((p.description || '').length > 160 ? '...' : '')
  const rawImgs = p.images && Array.isArray(p.images) ? p.images.filter(isValidImageUrl) : []
  const primaryImage = rawImgs.length > 0 ? rawImgs[0] : 'https://spspropertysolution.com/icon.png'
  const url = `https://spspropertysolution.com${getPropertyPath(p)}`

  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    // Open Graph
    { property: "og:type", content: "article" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: primaryImage },
    { property: "og:url", content: url },
    { property: "og:site_name", content: "SPS Property Solution" },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: primaryImage },
  ]
}

// ─── Client-Side Loader ──────────────────────────────────────────────────────
export async function clientLoader({ params }) {
  const propertyId = extractIdFromSlug(params.slug)
  if (!propertyId) {
    throw data("Not Found", { status: 404 })
  }
  
  const property = await getPropertyByIdOnce(propertyId)
  if (!property) {
    throw data("Not Found", { status: 404 })
  }

  // Record view (fire-and-forget, ไม่ block render)
  recordPropertyView({ propertyId: property.id, type: property.type }).catch(() => {})

  return { property }
}
clientLoader.hydrate = true

// ─── Component ───────────────────────────────────────────────────────────────
export default function PropertyDetailPage({ loaderData }) {
  const property = loaderData?.property
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAgent } = usePublicAuth()
  const searchQuery = searchParams.get('q') || ''

  const [galleryIndex, setGalleryIndex] = useState(0)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  // ถ้าไม่มีข้อมูล (fallback — ปกติ loader จะ throw 404 ก่อน)
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

  // Redirect ถ้า slug ไม่ตรงกับ canonical
  const canonicalSlug = generatePropertySlug(property)
  if (canonicalSlug && slug !== canonicalSlug) {
    navigate(`/properties/${canonicalSlug}`, { replace: true })
  }

  const loc = property.location || {}
  const defaultImg = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
  const rawImgs = property.images && Array.isArray(property.images) ? property.images.filter(isValidImageUrl) : []
  
  let finalImgs = [...rawImgs]
  if (property.coverImageUrl && isValidImageUrl(property.coverImageUrl)) {
    finalImgs = [property.coverImageUrl, ...rawImgs.filter(img => img !== property.coverImageUrl)]
  }
  const imgs = finalImgs.length > 0 ? finalImgs : [defaultImg]

  const getMapEmbedUrl = (url) => {
    if (!url) {
      if (loc.district && loc.province) {
        const locationQuery = `${loc.district}, ${loc.province}`
        return `https://maps.google.com/maps?q=${encodeURIComponent(locationQuery)}&output=embed`
      }
      return null
    }
    if (url.includes('<iframe')) {
      const match = url.match(/src="([^"]+)"/)
      if (match) return match[1]
    }
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) return null
    if (url.includes('/embed')) return url
    if (url.includes('google.') && url.includes('/maps')) {
      let query = ''
      const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (coordMatch) query = `${coordMatch[1]},${coordMatch[2]}`
      else {
        const placeMatch = url.match(/place\/([^/?#]+)/)
        if (placeMatch) query = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
        else {
          const searchMatch = url.match(/[?&]q=([^&]+)/)
          if (searchMatch) query = decodeURIComponent(searchMatch[1])
        }
      }
      if (query) return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
      if (loc.district && loc.province) return `https://maps.google.com/maps?q=${encodeURIComponent(`${loc.district}, ${loc.province}`)}&output=embed`
    }
    return null
  }

  const mapEmbedUrl = getMapEmbedUrl(property.mapUrl)
  const isShortMapLink = property.mapUrl && (property.mapUrl.includes('maps.app.goo.gl') || property.mapUrl.includes('goo.gl/maps'))

  const handleShare = async () => {
    if (!property?.id) return
    const isLineApp = /Line/i.test(navigator.userAgent)
    try {
      const link = await createOrReuseShareLink({ propertyId: property.id, createdBy: 'public_share', ttlHours: 24 })
      const shareUrl = `${window.location.origin}/share/${link.id}`
      if (isLineApp) { window.location.href = shareUrl; return }
      const newTab = window.open(shareUrl, '_blank', 'noopener,noreferrer')
      if (!newTab || newTab.closed) {
        try { await navigator.clipboard.writeText(shareUrl); setToastMessage('คัดลอกลิงก์แชร์แล้ว') }
        catch { setToastMessage(`ลิงก์แชร์: ${shareUrl}`) }
        setShowToast(true)
      }
    } catch { setToastMessage('ไม่สามารถสร้างลิงก์แชร์ได้'); setShowToast(true) }
  }

  const handleCopyLink = async () => {
    if (!property?.id) return
    setIsCopying(true)
    try {
      const longUrl = window.location.href
      const shortUrl = await createSpoomeShortUrl(longUrl)
      await navigator.clipboard.writeText(shortUrl)
      setToastMessage(`คัดลอกลิงก์แล้ว: ${shortUrl}`)
      setShowToast(true)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch { setToastMessage('ไม่สามารถคัดลอกลิงก์ได้'); setShowToast(true) }
    finally { setIsCopying(false) }
  }

  return (
    <PageLayout heroTitle={property.title} heroSubtitle={`${loc.district || ''}, ${loc.province || ''}`} searchComponent={null}>
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
                    loading="lazy" decoding="async" draggable={false}
                  />
                </ProtectedImageContainer>
                {imgs.length > 1 && (
                  <div className="flex gap-2 p-2 overflow-x-auto" onContextMenu={(e) => e.preventDefault()}>
                    {imgs.map((img, i) => (
                      <button key={i} type="button" onClick={() => setGalleryIndex(i)}
                        className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 ${i === galleryIndex ? 'border-blue-900' : 'border-transparent'}`}>
                        <img src={getCloudinaryThumbUrl(img)} alt={`รูปย่อที่ ${i + 1}`}
                          className="w-full h-full object-cover protected-image" loading="lazy" decoding="async" draggable={false} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {property.propertyId && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                      <span className="font-mono">{property.propertyId}</span>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(property.propertyId); setToastMessage('คัดลอกรหัสทรัพย์แล้ว'); setShowToast(true) }}
                        className="p-0.5 hover:bg-gray-200 rounded transition"><Copy className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                  {property.type && <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">{property.isRental ? 'เช่า' : 'ซื้อ'}</span>}
                  {!property.isRental && property.propertySubStatus && <span className="px-3 py-1.5 rounded-full bg-blue-900 text-white text-sm font-medium">{property.propertySubStatus}</span>}
                  {(() => {
                    let statusLabel = '', statusColor = ''
                    if (property.isRental) {
                      statusLabel = property.availability === 'unavailable' ? 'ไม่ว่าง' : 'ว่าง'
                      statusColor = property.availability === 'unavailable' ? 'bg-red-600 text-white' : 'bg-emerald-500 text-white'
                    } else {
                      if (property.status === 'available') { statusLabel = 'ว่าง'; statusColor = 'bg-emerald-500 text-white' }
                      else if (property.status === 'reserved') { statusLabel = 'ติดจอง'; statusColor = 'bg-orange-500 text-white' }
                      else if (property.status === 'sold') { statusLabel = 'ขายแล้ว'; statusColor = 'bg-red-600 text-white' }
                    }
                    return statusLabel ? <span className={`px-3 py-1.5 rounded-full ${statusColor} text-sm font-medium`}>{statusLabel}</span> : null
                  })()}
                  {property.directInstallment && <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-yellow-400 text-blue-900">ผ่อนตรง</span>}
                </div>

                {/* Title & Price */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-4">{property.title}</h1>
                    <p className="text-2xl font-bold text-amber-700 mb-4">{formatPrice(property.price, property.isRental, property.showPrice)}</p>
                  </div>
                  <button type="button" onClick={handleShare} className="ml-2 sm:ml-4 flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 min-h-[44px] rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-all font-semibold shrink-0">
                    <Share2 className="h-5 w-5" /><span className="hidden sm:inline">แชร์ให้ลูกค้า</span>
                  </button>
                  <button type="button" onClick={handleCopyLink}
                    className={`ml-2 sm:ml-3 flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 min-h-[44px] rounded-xl font-semibold shrink-0 transition-all shadow-sm border ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'}`}>
                    {isCopying ? <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      : copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    <span className="hidden sm:inline">{copied ? 'คัดลอกสำเร็จ' : 'คัดลอกลิงก์'}</span>
                  </button>
                </div>

                {/* Location & Specs */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{loc.district || ''}{loc.district && loc.province ? ', ' : ''}{loc.province || ''}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-gray-600">
                    <span className="flex items-center gap-1.5"><Bed className="h-4 w-4 shrink-0" /><span>{property.bedrooms || '-'} ห้องนอน</span></span>
                    <span className="flex items-center gap-1.5"><Bath className="h-4 w-4 shrink-0" /><span>{property.bathrooms || '-'} ห้องน้ำ</span></span>
                    {property.area != null && property.area > 0 && (
                      <span className="flex items-center gap-1.5"><Maximize2 className="h-4 w-4 shrink-0" /><span>{(Number(property.area) / 4).toFixed(1)} ตร.ว.</span></span>
                    )}
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Prompt, sans-serif' }}>
                  {property.description || '-'}
                </p>

                {/* ผ่อนตรง Section */}
                {property.directInstallment && (
                  <div className="mt-6 p-6 rounded-xl border-2 border-blue-200 bg-blue-50/50">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-blue-900 text-sm">ผ่อนตรง</span>
                      เงื่อนไขการผ่อนตรง (เช่าซื้อ)
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['ไม่เช็คเครดิตบูโร ไม่ต้องกู้แบงก์', 'ใช้เพียงบัตรประชาชนใบเดียวในการทำสัญญา', 'วางเงินดาวน์ตามตกลง เข้าอยู่ได้ทันที', 'ผ่อนชำระโดยตรงกับโครงการ/เจ้าของ', 'สามารถเปลี่ยนเป็นการกู้ธนาคารได้ในภายหลังเมื่อพร้อม'].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-700"><CheckCircle2 className="h-5 w-5 text-blue-900 shrink-0 mt-0.5" /><span>{item}</span></li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags */}
                {property.customTags && Array.isArray(property.customTags) && property.customTags.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-blue-900 mb-3">Tag</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.customTags.map((tag, index) => (
                        <Link key={index} to={`/properties?search=${encodeURIComponent(tag)}`}
                          className="px-3 py-1.5 bg-blue-50 text-gray-700 text-sm rounded-full border border-blue-200 font-medium hover:bg-blue-600 hover:text-white transition-colors">
                          {searchQuery ? highlightText(tag, searchQuery) : tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Map */}
              {property.mapUrl && !property.mapUrl.includes('/embed') && (
                <div className="bottom-2 right-2">
                  <a href={property.mapUrl} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white rounded-lg shadow-md text-xs text-blue-900 font-medium hover:bg-slate-50 transition">
                    เปิดใน Google Maps
                  </a>
                </div>
              )}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md">
                {mapEmbedUrl ? (
                  <div className="aspect-video">
                    <iframe title="แผนที่" src={mapEmbedUrl} className="w-full h-full border-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  </div>
                ) : isShortMapLink ? (
                  <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-slate-50 px-6">
                    <MapPin className="h-12 w-12 text-blue-600" />
                    <p className="text-slate-600 text-center">ลิงก์สั้นไม่รองรับการแสดงแผนที่ในหน้า</p>
                    <a href={property.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 text-white font-medium hover:bg-blue-800 transition-colors">เปิดใน Google Maps</a>
                  </div>
                ) : (
                  <div className="h-64 bg-slate-200 flex items-center justify-center text-slate-500">
                    <div className="text-center"><MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>แผนที่ Google Maps</p><p className="text-sm">{loc.district || 'ไม่ระบุ'}, {loc.province || 'ไม่ระบุ'}</p></div>
                  </div>
                )}
              </div>

              {/* Mortgage Calculator */}
              {!property.isRental && property.price > 0 && property.showPrice !== false && (
                <div className="mt-6"><MortgageCalculator price={property.price} directInstallment={property.directInstallment} /></div>
              )}

              {/* Related Properties */}
              <Suspense fallback={<div className="py-8"><div className="h-6 w-40 bg-slate-200 rounded-lg mb-4 animate-pulse" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />)}</div></div>}>
                <RelatedProperties currentPropertyId={property.id} district={loc.district} type={property.type} />
              </Suspense>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 space-y-6">
                <div className="bg-white rounded-xl border border-blue-100 p-6 shadow-md">
                  <div className="pt-4 border-slate-100">
                    <p className="text-sm font-medium text-slate-700 mb-2">จองเยี่ยมชม (ส่งข้อความ)</p>
                    <LeadForm propertyId={property.displayId || property.propertyId || property.id} propertyTitle={property.title} propertyPrice={property.price} isRental={property.isRental}
                      onSuccess={(m) => { setToastMessage(m || 'ส่งข้อมูลสำเร็จ'); setShowToast(true) }}
                      onError={() => { setToastMessage('เกิดข้อผิดพลาด กรุณาลองใหม่'); setShowToast(true) }} />
                  </div>
                </div>
                <Suspense fallback={<div className="bg-white rounded-xl border p-6 min-h-[120px] animate-pulse" />}>
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
