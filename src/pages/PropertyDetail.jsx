import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { MapPin, Bed, Bath, Maximize2, Phone, MessageCircle, Share2, CheckCircle2 } from 'lucide-react'
import NeighborhoodData from '../components/NeighborhoodData'
import { getPropertyByIdOnce, createViewingRequest } from '../lib/firestore'
import PageLayout from '../components/PageLayout'
import Toast from '../components/Toast'
import ProtectedImageContainer from '../components/ProtectedImageContainer'
import { formatPrice } from '../lib/priceFormat'

function MortgageCalculator({ price, directInstallment }) {
  const [loanType, setLoanType] = useState(directInstallment ? 'direct' : 'bank')
  const [downPercent, setDownPercent] = useState(20)
  const [years, setYears] = useState(20)
  const [bankInterestRate, setBankInterestRate] = useState(3.5)
  const [directInterestRate, setDirectInterestRate] = useState(2.5)

  const down = Math.round((price * downPercent) / 100)
  const loan = price - down
  const interestRate = loanType === 'direct' ? directInterestRate : bankInterestRate
  const monthlyRate = interestRate / 100 / 12
  const numPayments = years * 12
  const monthlyPayment =
    monthlyRate === 0 ? loan / numPayments : (loan * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)

  // Generate payment schedule table
  const paymentSchedule = []
  let remainingBalance = loan
  for (let i = 1; i <= Math.min(12, numPayments); i++) {
    const interestPayment = remainingBalance * monthlyRate
    const principalPayment = monthlyPayment - interestPayment
    remainingBalance -= principalPayment
    paymentSchedule.push({
      month: i,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, remainingBalance),
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md">
      <h3 className="text-lg font-bold text-blue-900 mb-4">คำนวณสินเชื่อบ้าน</h3>
      <div className="space-y-4">
        {/* Loan Type Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">ประเภทสินเชื่อ</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLoanType('bank')}
              className={`px-4 py-3 rounded-lg border-2 transition ${
                loanType === 'bank'
                  ? 'border-blue-900 bg-blue-50 text-blue-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              กู้แบงก์
            </button>
            <button
              type="button"
              onClick={() => setLoanType('direct')}
              className={`px-4 py-3 rounded-lg border-2 transition ${
                loanType === 'direct'
                  ? 'border-blue-900 bg-blue-50 text-blue-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              ผ่อนตรง
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">เงินดาวน์ (%)</label>
          <input
            type="range"
            min="10"
            max="50"
            value={downPercent}
            onChange={(e) => setDownPercent(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-sm text-slate-600">{downPercent}% = {(down / 1_000_000).toFixed(1)} ล้านบาท</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ระยะเวลากู้ (ปี)</label>
          <select
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          >
            {[5, 10, 15, 20, 25, 30].map((y) => (
              <option key={y} value={y}>{y} ปี</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            อัตราดอกเบี้ย (% ต่อปี) - {loanType === 'direct' ? 'ผ่อนตรง' : 'กู้แบงก์'}
          </label>
          <input
            type="number"
            step="0.1"
            value={loanType === 'direct' ? directInterestRate : bankInterestRate}
            onChange={(e) => {
              if (loanType === 'direct') {
                setDirectInterestRate(Number(e.target.value))
              } else {
                setBankInterestRate(Number(e.target.value))
              }
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div className="pt-4 border-t border-slate-200">
          <p className="text-slate-600 text-sm mb-1">ค่างวดโดยประมาณ</p>
          <p className="text-2xl font-bold text-yellow-900">
            {monthlyPayment.toLocaleString('th-TH', { maximumFractionDigits: 0 })} บาท/เดือน
          </p>
          <p className="text-xs text-slate-500 mt-1">
            รวมทั้งสิ้น {((monthlyPayment * numPayments) / 1_000_000).toFixed(1)} ล้านบาท ({years} ปี)
          </p>
        </div>

        {/* Payment Schedule Table */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-3">ตารางค่างวด 12 เดือนแรก</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-2 py-2 text-left font-medium text-slate-700">เดือน</th>
                  <th className="px-2 py-2 text-right font-medium text-slate-700">ค่างวด</th>
                  <th className="px-2 py-2 text-right font-medium text-slate-700">เงินต้น</th>
                  <th className="px-2 py-2 text-right font-medium text-slate-700">ดอกเบี้ย</th>
                  <th className="px-2 py-2 text-right font-medium text-slate-700">คงเหลือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentSchedule.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50">
                    <td className="px-2 py-2 text-slate-600">{row.month}</td>
                    <td className="px-2 py-2 text-right font-medium text-blue-900">
                      {row.payment.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">
                      {row.principal.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">
                      {row.interest.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-500">
                      {row.balance.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxXLqx7DQsmWF2WjcQM8OtwVkoFjIg3Vhw_MXtYTvlajlriy82qSIiV5cWisA3dHMDaCQ/exec'

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 && /^0\d{9}$/.test(digits)
}

function LeadForm({ propertyId, propertyTitle, propertyPrice, isRental, onSuccess, onError }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const priceFormatted = propertyPrice != null
    ? isRental
      ? `${(propertyPrice / 1000).toFixed(0)}K บาท/เดือน`
      : `${(propertyPrice / 1_000_000).toFixed(1)} ล้านบาท`
    : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!name.trim()) newErrors.name = 'กรุณากรอกชื่อ'
    if (!phone.trim()) newErrors.phone = 'กรุณากรอกเบอร์โทร'
    else if (!validatePhone(phone.trim())) newErrors.phone = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก (เช่น 0812345678)'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setIsLoading(true)
    setErrors({})
    try {
      await createViewingRequest({
        name: name.trim(),
        phone: phone.trim(),
        message: message.trim() || '',
        propertyName: propertyTitle || '',
        price: priceFormatted,
        propertyId: propertyId || '',
      })

      try {
        await fetch(GAS_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            propertyName: propertyTitle || '',
            price: priceFormatted,
            message: message.trim() || '',
          }),
        })
      } catch {
        // Firestore saved; LINE notify is best-effort
      }

      setName('')
      setPhone('')
      setMessage('')
      onSuccess?.()
    } catch (err) {
      console.error(err)
      onError?.()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: '' })) }}
          placeholder="กรอกชื่อ-นามสกุล"
          className={`w-full px-4 py-2.5 rounded-lg border text-sm bg-white transition-colors ${errors.name ? 'border-amber-500 focus:ring-amber-200' : 'border-slate-200 focus:ring-blue-200'} focus:ring-2 focus:outline-none`}
        />
        {errors.name && <p className="mt-1 text-xs text-amber-600">{errors.name}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร *</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setErrors((prev) => ({ ...prev, phone: '' })) }}
          placeholder="เช่น 0812345678"
          className={`w-full px-4 py-2.5 rounded-lg border text-sm bg-white transition-colors ${errors.phone ? 'border-amber-500 focus:ring-amber-200' : 'border-slate-200 focus:ring-blue-200'} focus:ring-2 focus:outline-none`}
        />
        {errors.phone && <p className="mt-1 text-xs text-amber-600">{errors.phone}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">ข้อความเพิ่มเติม</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="ข้อความ (ถ้ามี)"
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-white resize-none focus:ring-2 focus:ring-blue-200 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 rounded-lg bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 hover:ring-2 hover:ring-yellow-400 hover:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            กำลังส่งข้อมูล...
          </>
        ) : (
          'ส่งคำขอจองเยี่ยมชม'
        )}
      </button>
    </form>
  )
}

export default function PropertyDetail() {
  const { id } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPropertyByIdOnce(id).then((p) => {
      if (!cancelled) setProperty(p)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">กำลังโหลด...</p>
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
  const imgs = property.images && property.images.length > 0 ? property.images : ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800']
  const title = `${property.title} | SPS Property Solution`
  const description = (property.description || '').slice(0, 160) + ((property.description || '').length > 160 ? '...' : '')

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

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/share/${property.id}`
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
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
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'RealEstateListing',
            name: property.title,
            description: property.description || '',
            address: {
              '@type': 'PostalAddress',
              addressLocality: loc.district || '',
              addressRegion: loc.province || '',
              addressCountry: 'TH',
            },
            offers: {
              '@type': 'Offer',
              price: property.price || 0,
              priceCurrency: 'THB',
              availability: property.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
            },
            numberOfRooms: property.bedrooms || 0,
            numberOfBathroomsTotal: property.bathrooms || 0,
            floorSize: property.area ? {
              '@type': 'QuantitativeValue',
              value: property.area,
              unitCode: 'MTK',
            } : undefined,
            propertyType: property.type || '',
            image: property.images && property.images.length > 0 ? property.images : [],
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
                    src={imgs[galleryIndex]}
                    alt={property.title}
                    className="w-full h-full object-cover protected-image"
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
                      >
                        <img src={img} alt="" className="w-full h-full object-cover protected-image" draggable={false} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                    <h1 className="text-2xl font-bold text-blue-900">{property.title}</h1>
                    {property.directInstallment && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-400 text-blue-900">
                        ผ่อนตรง
                      </span>
                    )}
                  </div>
                    <p className="text-2xl font-bold text-yellow-900 mb-4">
                      {formatPrice(property.price, property.isRental, property.showPrice)}
                    </p>
                  </div>
                  <button
                    onClick={handleShare}
                    className="ml-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition font-medium shrink-0"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">แชร์ให้ลูกค้า</span>
                    <span className="sm:hidden">แชร์</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-4 text-slate-600 mb-4">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {loc.district}, {loc.province}</span>
                  <span className="flex items-center gap-1"><Bed className="h-4 w-4" /> {property.bedrooms} ห้องนอน</span>
                  <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {property.bathrooms} ห้องน้ำ</span>
                  <span className="flex items-center gap-1"><Maximize2 className="h-4 w-4" /> {property.area != null && property.area > 0 ? (Number(property.area) / 4).toFixed(1) : '-'} ตร.ว.</span>
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
            </div>

            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 space-y-6">
              {/* Sticky contact - ธีม Blue 30%, White 60%, Yellow 10% */}
              <div className="bg-white rounded-xl border border-blue-100 p-6 shadow-md">
                <h3 className="font-bold text-blue-900 mb-4">ติดต่อตัวแทน</h3>
                <p className="text-slate-700 font-medium">{agent.name || '-'}</p>
                <div className="mt-4 flex flex-col gap-2">
                  {agent.lineId && (
                    <a
                      href={`https://line.me/ti/p/~${agent.lineId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Line ID: {agent.lineId}
                    </a>
                  )}
                  {agent.phone && (
                    <a
                      href={`tel:${agent.phone}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-yellow-400 text-yellow-900 font-semibold hover:bg-yellow-500 transition"
                    >
                      <Phone className="h-5 w-5" />
                      โทรเลย
                    </a>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm font-medium text-slate-700 mb-2">จองเยี่ยมชม (ส่งข้อความ)</p>
                  <LeadForm
                    propertyId={property.id}
                    propertyTitle={property.title}
                    propertyPrice={property.price}
                    isRental={property.isRental}
                    onSuccess={() => {
                      setToastMessage('ส่งข้อมูลสำเร็จ เจ้าหน้าที่จะติดต่อกลับ')
                      setShowToast(true)
                      setTimeout(() => setShowToast(false), 3000)
                    }}
                    onError={() => {
                      setToastMessage('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
                      setShowToast(true)
                      setTimeout(() => setShowToast(false), 3000)
                    }}
                  />
                </div>
              </div>

              <NeighborhoodData property={property} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
    </PageLayout>
  )
}
