import { X, Copy, MessageCircle, Facebook, MapPin, Bed, Bath, Maximize2 } from 'lucide-react'
import ProtectedImageContainer from './ProtectedImageContainer'
import { formatPrice } from '../lib/priceFormat'

export default function PropertyShareModal({ isOpen, onClose, property, onCopySuccess }) {
  if (!isOpen || !property) return null

  const loc = property.location || {}
  const imgs = property.images && property.images.length > 0 ? property.images : []
  const mainImage = imgs[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
  const priceText = formatPrice(property.price, property.isRental, property.showPrice)

  const currentUrl = window.location.href

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      onCopySuccess?.()
      onClose()
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = currentUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      onCopySuccess?.()
      onClose()
    }
  }

  const handleShareLine = () => {
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(currentUrl)}`
    window.open(lineUrl, '_blank', 'width=600,height=400')
  }

  const handleShareFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`
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
          className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
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
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-900 hover:bg-blue-100 transition font-medium"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center shrink-0">
                  <Copy className="h-5 w-5 text-white" />
                </div>
                <span>คัดลอกลิงก์</span>
              </button>

              {/* Share to Line */}
              <button
                onClick={handleShareLine}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 text-green-900 hover:bg-green-100 transition font-medium"
              >
                <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <span>แชร์ไปยัง Line</span>
              </button>

              {/* Share to Facebook */}
              <button
                onClick={handleShareFacebook}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-900 hover:bg-blue-100 transition font-medium"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <Facebook className="h-5 w-5 text-white" />
                </div>
                <span>แชร์ไปยัง Facebook</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
