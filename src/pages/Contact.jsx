import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { MapPin, Phone, Mail, Facebook, Clock, Globe2, CheckCircle2 } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import { createInquiry } from '../lib/firestore'

const MAPS_EMBED_URL = 'https://www.google.com/maps?q=%E0%B8%95.%E0%B8%AB%E0%B8%99%E0%B8%AD%E0%B8%87%E0%B8%AB%E0%B8%87%E0%B8%A9%E0%B8%B2+%E0%B8%AD.%E0%B8%9E%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%AD%E0%B8%87+%E0%B8%88.%E0%B8%8A%E0%B8%A5%E0%B8%9A%E0%B8%B8%E0%B8%A3%E0%B8%B5&output=embed'

const THANK_YOU_MESSAGE = 'ขอบคุณที่ไว้วางใจ SPS Property Solution ทางทีมงานได้รับข้อมูลของท่านเรียบร้อยแล้ว และจะติดต่อกลับโดยเร็วที่สุด'

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 && /^0\d{9}$/.test(digits)
}

/** Reusable contact pill/card component */
function ContactItem({ href, icon: Icon, children, className = '' }) {
  const base = 'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200'
  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
        className={`${base} ${className}`}>
        <Icon className="h-5 w-5 shrink-0" />
        <span className="font-medium text-sm">{children}</span>
      </a>
    )
  }
  return (
    <div className={`${base} ${className}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-sm">{children}</span>
    </div>
  )
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
                <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm">
                  {/* Company header */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-blue-900">SPS Property Solutions</h2>
                    <p className="text-slate-500 text-sm mt-1">ผู้เชี่ยวชาญด้านอสังหาริมทรัพย์ อมตะซิตี้ ชลบุรี</p>
                  </div>

                  <div className="space-y-3">
                    {/* Address */}
                    <div className="flex items-start gap-3 py-1">
                      <MapPin className="h-5 w-5 text-blue-900 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-800 text-sm">ที่อยู่</p>
                        <p className="text-slate-500 text-sm mt-0.5">
                          103/162 หมู่ 5 ตำบลหนองหงษ์, Phanthong, Chonburi 20160
                        </p>
                      </div>
                    </div>

                    {/* Service area */}
                    <div className="flex items-start gap-3 py-1">
                      <Globe2 className="h-5 w-5 text-blue-900 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-800 text-sm">พื้นที่บริการ</p>
                        <p className="text-slate-500 text-sm mt-0.5">กรุงเทพฯ, ชลบุรี, ระยอง และพัทยา</p>
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      {/* Phone - primary CTA */}
                      <ContactItem
                        href="tel:0955520801"
                        icon={Phone}
                        className="bg-yellow-400/15 border-yellow-400/50 text-blue-900 hover:bg-yellow-400/25 hover:border-yellow-400 font-semibold"
                      >
                        095 552 0801
                      </ContactItem>

                      {/* Email */}
                      <ContactItem
                        href="mailto:propertysommai@gmail.com"
                        icon={Mail}
                        className="bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900"
                      >
                        propertysommai@gmail.com
                      </ContactItem>

                      {/* Facebook */}
                      <ContactItem
                        href="https://www.facebook.com/houseamata"
                        icon={Facebook}
                        className="bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900"
                      >
                        Facebook: houseamata
                      </ContactItem>

                      {/* Hours */}
                      <ContactItem
                        icon={Clock}
                        className="bg-slate-50 border-slate-200 text-slate-600 cursor-default"
                      >
                        เปิดทำการตลอดเวลา (24/7)
                      </ContactItem>
                    </div>
                  </div>
                </div>

                {/* แผนที่ */}
                <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
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
                <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-blue-900">ส่งข้อความถึงเรา</h2>
                    <p className="text-slate-500 text-sm mt-1">กรอกข้อมูลด้านล่าง ทีมงานจะติดต่อกลับโดยเร็ว</p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        ชื่อ–นามสกุล <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="กรอกชื่อ-นามสกุล"
                        className={`w-full px-4 py-3 rounded-xl border text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition ${errors.name ? 'border-red-400 bg-red-50/30' : 'border-slate-200'}`}
                      />
                      {errors.name && (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                          <span>⚠</span> {errors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="เช่น 0812345678"
                        inputMode="numeric"
                        className={`w-full px-4 py-3 rounded-xl border text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition ${errors.phone ? 'border-red-400 bg-red-50/30' : 'border-slate-200'}`}
                      />
                      {errors.phone && (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                          <span>⚠</span> {errors.phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        ข้อความ <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                      </label>
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        rows={4}
                        placeholder="ระบุคำถามหรือความต้องการ..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition"
                      />
                    </div>

                    {errors.submit && (
                      <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {errors.submit}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-800 hover:shadow-md disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                    >
                      {isLoading ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          กำลังส่ง...
                        </>
                      ) : 'ส่งข้อความ'}
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={handleCloseThankYou}
              aria-hidden="true"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 pointer-events-auto">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">ส่งข้อความสำเร็จ!</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">{THANK_YOU_MESSAGE}</p>
                  <button
                    type="button"
                    onClick={handleCloseThankYou}
                    className="w-full py-3 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-800 transition"
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
