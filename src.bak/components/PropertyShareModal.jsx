import { X, Copy, MessageCircle, Facebook, MapPin, Bed, Bath, Maximize2, Check } from 'lucide-react'
import ProtectedImageContainer from './ProtectedImageContainer'
import { formatPrice } from '../lib/priceFormat'
import { getPropertyPath } from '../lib/propertySlug'
import { useState } from 'react'

export default function PropertyShareModal({ isOpen, onClose, property, onCopySuccess }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  if (!isOpen || !property) return null

  const loc = property.location || {}
  const imgs = property.images && property.images.length > 0 ? property.images : []
  const mainImage = imgs[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
  const priceText = formatPrice(property.price, property.isRental, property.showPrice)

  // Generate static URL for the property
  const propertyPath = getPropertyPath(property)
  const staticUrl = `${window.location.origin}${propertyPath}`

  const finishCopy = () => {
    setIsGenerating(false)
    setCopied(true)
    onCopySuccess?.()
    setTimeout(() => {
      setCopied(false)
      onClose()
    }, 1500)
  }

  const handleCopyLink = async () => {
    if (copied) return
    setIsGenerating(true)
    try {
      await navigator.clipboard.writeText(staticUrl)
      finishCopy()
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = staticUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      finishCopy()
    }
  }

  const handleShareLine = async () => {
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(staticUrl)}`
    window.open(lineUrl, '_blank', 'width=600,height=400')
  }

  const handleShareFacebook = async () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(staticUrl)}`
    window.open(facebookUrl, '_blank', 'width=600,height=400')
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-[100] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-blue-900">แชร์ทรัพย์สิน</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
              aria-label="ปิด"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Property Image */}
            <ProtectedImageContainer
              propertyId={property.propertyId}
              className="rounded-lg overflow-hidden bg-slate-100 h-48"
            >
              <img
                src={mainImage}
                alt={property.title}
                loading="lazy"
                decoding="async"
                className="w-full h-48 object-cover protected-image"
                draggable={false}
              />
            </ProtectedImageContainer>

            {/* Property Info */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-blue-900 line-clamp-2">
                {property.title}
              </h3>
              
              <p className="text-2xl font-bold text-yellow-900">
                {priceText}
              </p>

              {/* Location */}
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="text-sm">
                  {loc.subDistrict ? `${loc.subDistrict}, ` : ''}
                  {loc.district ? `${loc.district}, ` : ''}
                  {loc.province || 'ไม่ระบุ'}
                </span>
              </div>

              {/* Property Details */}
              <div className="flex flex-wrap gap-4 pt-2">
                {property.bedrooms != null && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Bed className="h-4 w-4" />
                    <span className="text-sm">{property.bedrooms} ห้องนอน</span>
                  </div>
                )}
                {property.bathrooms != null && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Bath className="h-4 w-4" />
                    <span className="text-sm">{property.bathrooms} ห้องน้ำ</span>
                  </div>
                )}
                {property.area && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Maximize2 className="h-4 w-4" />
                    <span className="text-sm">{property.area != null && property.area > 0 ? (Number(property.area) / 4).toFixed(1) : ''} ตร.ว.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Share Buttons */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <p className="text-sm font-medium text-slate-700 mb-3">แชร์ไปยัง</p>
              
              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                disabled={isGenerating || copied}
                className={`group relative w-full flex items-center gap-4 px-4 py-3 sm:p-4 rounded-xl border-2 transition-all duration-300 font-semibold overflow-hidden disabled:opacity-90 ${copied ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-lg shadow-emerald-500/10' : 'border-slate-100 bg-white text-slate-700 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-900/10'}`}
              >
                {!copied && <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>}
                <div className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${copied ? 'bg-emerald-500 text-white shadow-md' : 'bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white'}`}>
                  {isGenerating ? (
                    <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : copied ? (
                    <Check className="h-6 w-6 scale-110 transition-transform duration-300" />
                  ) : (
                    <Copy className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                  )}
                </div>
                <div className="relative z-10 flex flex-col items-start">
                  <span className="text-base sm:text-lg">{isGenerating ? 'กำลังสร้างลิงก์...' : copied ? 'คัดลอกสำเร็จแล้ว!' : 'คัดลอกลิงก์'}</span>
                  {!copied && !isGenerating && <span className="text-xs text-slate-500 font-medium font-normal mt-0.5">กดเพื่อคัดลอกลิงก์นำไปแชร์ต่อ</span>}
                </div>
                {copied && (
                   <span className="absolute right-6 z-10 flex h-3 w-3">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                   </span>
                )}
              </button>

              {/* Share to Line */}
              <button
                onClick={handleShareLine}
                className="group relative w-full flex items-center gap-4 px-4 py-3 sm:p-4 rounded-xl border-2 border-slate-100 bg-white text-slate-700 hover:border-[#00B900] hover:shadow-xl hover:shadow-[#00B900]/10 transition-all duration-300 font-semibold overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#00B900]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 w-12 h-12 rounded-xl bg-[#00B900]/10 group-hover:bg-[#00B900] text-[#00B900] group-hover:text-white flex items-center justify-center shrink-0 transition-all duration-300">
                  <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="relative z-10 flex flex-col items-start">
                  <span className="text-base sm:text-lg">แชร์ไปยัง Line</span>
                </div>
              </button>

              {/* Share to Facebook */}
              <button
                onClick={handleShareFacebook}
                className="group relative w-full flex items-center gap-4 px-4 py-3 sm:p-4 rounded-xl border-2 border-slate-100 bg-white text-slate-700 hover:border-[#1877F2] hover:shadow-xl hover:shadow-[#1877F2]/10 transition-all duration-300 font-semibold overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#1877F2]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 w-12 h-12 rounded-xl bg-[#1877F2]/10 group-hover:bg-[#1877F2] text-[#1877F2] group-hover:text-white flex items-center justify-center shrink-0 transition-all duration-300">
                  <Facebook className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="relative z-10 flex flex-col items-start">
                  <span className="text-base sm:text-lg">แชร์ไปยัง Facebook</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
