import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { MapPin, Phone, Mail, Facebook, Clock } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import { createInquiry } from '../lib/firestore'

const MAPS_EMBED_URL = 'https://www.google.com/maps?q=%E0%B8%95.%E0%B8%AB%E0%B8%99%E0%B8%AD%E0%B8%87%E0%B8%AB%E0%B8%87%E0%B8%A9%E0%B8%B2+%E0%B8%AD.%E0%B8%9E%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%AD%E0%B8%87+%E0%B8%88.%E0%B8%8A%E0%B8%A5%E0%B8%9A%E0%B8%B8%E0%B8%A3%E0%B8%B5&output=embed'

const THANK_YOU_MESSAGE = 'ขอบคุณที่ไว้วางใจ SPS Property Solution ทางทีมงานได้รับข้อมูลของท่านเรียบร้อยแล้ว และจะติดต่อกลับโดยเร็วที่สุด'

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 && /^0\d{9}$/.test(digits)
}

export default function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', message: '' })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'กรุณากรอกชื่อ'
    if (!form.phone.trim()) newErrors.phone = 'กรุณากรอกเบอร์โทร'
    else if (!validatePhone(form.phone.trim())) newErrors.phone = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก (เช่น 0812345678)'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setIsLoading(true)
    try {
      await createInquiry({
        name: form.name.trim(),
        phone: form.phone.trim(),
        message: form.message.trim() || '',
      })
      setShowThankYou(true)
    } catch (err) {
      console.error(err)
      setErrors({ submit: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseThankYou = () => {
    setShowThankYou(false)
    setForm({ name: '', phone: '', message: '' })
    setErrors({})
  }

  return (
    <>
      <Helmet>
        <title>ติดต่อเรา | SPS Property Solution - บ้านคอนโดสวย อมตะซิตี้ ชลบุรี</title>
      </Helmet>
      <PageLayout heroTitle="ติดต่อเรา" heroSubtitle="บ้านคอนโดสวย อมตะซิตี้ ชลบุรี" searchComponent={null}>
        <div className="py-12 md:py-16 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* ซ้าย: ข้อมูลบริษัท */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-blue-100 p-6 md:p-8 shadow-lg">
                  <h2 className="text-xl font-bold text-blue-900 mb-6">SPS Property Solutions</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-blue-900 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-800">ที่อยู่</p>
                        <p className="text-slate-600 text-sm">
                          103/162 หมู่ 5 ตำบลหนองหงษ์, Phanthong, Chonburi 20160
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 mb-2">พื้นที่บริการ</p>
                      <p className="text-slate-600 text-sm">กรุงเทพฯ, ชลบุรี, ระยอง และพัทยา</p>
                    </div>
                    <a
                      href="tel:0955520801"
                      className="flex items-center gap-3 p-3 rounded-lg bg-yellow-400/20 border border-yellow-400/50 hover:bg-yellow-400/30 transition"
                    >
                      <Phone className="h-5 w-5 text-blue-900 shrink-0" />
                      <span className="font-semibold text-blue-900">095 552 0801</span>
                    </a>
                    <a
                      href="mailto:propertysommai@gmail.com"
                      className="flex items-center gap-3 text-slate-600 hover:text-blue-900 transition"
                    >
                      <Mail className="h-5 w-5 shrink-0" />
                      propertysommai@gmail.com
                    </a>
                    <a
                      href="https://www.facebook.com/houseamata"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-slate-600 hover:text-blue-600 transition"
                    >
                      <Facebook className="h-5 w-5 shrink-0" />
                      Facebook: houseamata
                    </a>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Clock className="h-5 w-5 shrink-0" />
                      <span>เปิดทำการตลอดเวลา (24/7)</span>
                    </div>
                  </div>
                </div>

                {/* แผนที่ */}
                <div className="rounded-xl overflow-hidden border border-blue-100 shadow-sm">
                  <iframe
                    title="แผนที่ ต.หนองหงษ์ อ.พานทอง จ.ชลบุรี"
                    src={MAPS_EMBED_URL}
                    width="100%"
                    height="280"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              {/* ขวา: แบบฟอร์มติดต่อ */}
              <div>
                <div className="bg-white rounded-xl border border-blue-100 p-6 md:p-8 shadow-lg">
                  <h2 className="text-xl font-bold text-blue-900 mb-6">ส่งข้อความถึงเรา</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ *</label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="กรอกชื่อ-นามสกุล"
                        className={`w-full px-4 py-3 rounded-lg border text-sm bg-white focus:ring-2 focus:ring-blue-200 focus:outline-none ${errors.name ? 'border-amber-500' : 'border-slate-200'}`}
                      />
                      {errors.name && <p className="mt-1 text-xs text-amber-600">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="เช่น 0812345678"
                        className={`w-full px-4 py-3 rounded-lg border text-sm bg-white focus:ring-2 focus:ring-blue-200 focus:outline-none ${errors.phone ? 'border-amber-500' : 'border-slate-200'}`}
                      />
                      {errors.phone && <p className="mt-1 text-xs text-amber-600">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">ข้อความ</label>
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        rows={4}
                        placeholder="ระบุคำถามหรือความต้องการ..."
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm bg-white resize-none focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      />
                    </div>
                    {errors.submit && (
                      <p className="text-sm text-amber-600">{errors.submit}</p>
                    )}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 hover:ring-2 hover:ring-yellow-400 hover:ring-offset-1 disabled:opacity-60 transition flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          กำลังส่ง...
                        </>
                      ) : (
                        'ส่งข้อความ'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thank You Overlay */}
        {showThankYou && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50"
              onClick={handleCloseThankYou}
              aria-hidden="true"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 md:p-8 pointer-events-auto">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✓</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed mb-6">{THANK_YOU_MESSAGE}</p>
                  <button
                    type="button"
                    onClick={handleCloseThankYou}
                    className="w-full py-3 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 transition"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </PageLayout>
    </>
  )
}
