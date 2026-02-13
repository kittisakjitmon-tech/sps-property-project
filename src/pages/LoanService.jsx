import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PageLayout from '../components/PageLayout'
import { createLoanRequest } from '../lib/firestore'
import {
  Check,
  Calculator,
  FileText,
  ChevronDown,
  CreditCard,
  DollarSign,
  User,
  Phone,
  MessageCircle,
  Briefcase,
  Wallet,
  AlertCircle,
  Sparkles,
  Home,
  X,
} from 'lucide-react'

const OCCUPATIONS = [
  { value: '', label: 'เลือกอาชีพ' },
  { value: 'government', label: 'ข้าราชการ' },
  { value: 'employee', label: 'พนักงานประจำ' },
  { value: 'business', label: 'ธุรกิจส่วนตัว' },
  { value: 'freelance', label: 'รับจ้างอิสระ' },
]

const CREDIT_HISTORY = [
  { value: '', label: 'เลือกประวัติเครดิต' },
  { value: 'normal', label: 'ปกติดี' },
  { value: 'delayed', label: 'เคยล่าช้า' },
  { value: 'bureau_closed', label: 'ติดบูโร - ปิดแล้ว' },
  { value: 'bureau_open', label: 'ติดบูโร - ยังไม่ปิด' },
]

const LINE_URL = 'https://line.me/R/ti/p/@sps-property'

export default function LoanService() {
  const formSectionRef = useRef(null)
  const navigate = useNavigate()

  // Calculator state
  const [debtAmount, setDebtAmount] = useState('')
  const [currentRate, setCurrentRate] = useState(20)
  const [homeRate, setHomeRate] = useState(4)

  // Form state
  const [form, setForm] = useState({
    nickname: '',
    phone: '',
    lineId: '',
    occupation: '',
    income: '',
    monthlyDebt: '',
    creditHistory: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalScenario, setModalScenario] = useState(null)

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Calculator logic
  const debtNum = parseFloat(String(debtAmount).replace(/,/g, '')) || 0
  const minPaymentRate = 0.05 // ~5% of balance typical for credit cards
  const currentMonthly = debtNum * (currentRate / 100 / 12) + debtNum * minPaymentRate
  const homeMonthly = debtNum * (homeRate / 100 / 12) * (1 + homeRate / 100 / 12) ** 360 / ((1 + homeRate / 100 / 12) ** 360 - 1)
  const savingsPerMonth = Math.max(0, Math.round(currentMonthly - homeMonthly))

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const err = {}
    if (!form.nickname.trim()) err.nickname = 'กรุณากรอกชื่อเล่น'
    if (!form.phone.trim()) err.phone = 'กรุณากรอกเบอร์โทร'
    else if (!/^0\d{9}$/.test(form.phone.replace(/\D/g, ''))) err.phone = 'เบอร์โทรต้องเป็น 10 หลัก'
    if (!form.occupation) err.occupation = 'กรุณาเลือกอาชีพ'
    if (!form.income.trim()) err.income = 'กรุณากรอกรายได้'
    else if (isNaN(parseFloat(form.income)) || parseFloat(form.income) < 0) err.income = 'กรุณากรอกตัวเลข'
    if (!form.monthlyDebt.trim()) form.monthlyDebt = '0'
    if (!form.creditHistory) err.creditHistory = 'กรุณาเลือกประวัติเครดิต'
    setFormErrors(err)
    return Object.keys(err).length === 0
  }

  const getScenario = () => {
    const income = parseFloat(form.income) || 0
    const debt = parseFloat(form.monthlyDebt) || 0
    const credit = form.creditHistory

    const isBureauBad = credit === 'bureau_open' || credit === 'bureau_closed' || credit === 'delayed'
    const isLowIncome = income < 15000

    if (income >= 25000 && !isBureauBad && debt > 0) {
      return 'A'
    }
    if (isLowIncome || isBureauBad) {
      return 'B'
    }
    return 'A'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await createLoanRequest({
        nickname: form.nickname.trim(),
        phone: form.phone.trim(),
        lineId: form.lineId.trim(),
        occupation: form.occupation,
        income: form.income,
        monthlyDebt: form.monthlyDebt || '0',
        creditHistory: form.creditHistory,
      })

      const scenario = getScenario()
      setModalScenario(scenario)
      setShowModal(true)
    } catch (err) {
      console.error(err)
      setFormErrors({ submit: 'เกิดข้อผิดพลาด กรุณาลองใหม่' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setModalScenario(null)
  }

  const handleGoInstallment = () => {
    handleCloseModal()
    navigate('/properties?listingType=rent&subListingType=installment_only')
  }

  return (
    <>
      <Helmet>
        <title>ปลดล็อคชีวิตการเงินด้วยอสังหาฯ | SPS Property Solution</title>
        <meta name="description" content="เปลี่ยนหนี้บัตรหลายใบเป็นบ้านหลังเดียว ผ่อนถูกลงครึ่งต่อครึ่ง ปิดหนี้ให้ก่อน ไม่ผ่านคืนเงินจอง" />
      </Helmet>
      <PageLayout showHero={false}>
        <div className="min-h-screen bg-slate-50">
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 text-white overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920')", backgroundSize: 'cover' }} />
            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-6 drop-shadow-lg">
                เปลี่ยนหนี้บัตรหลายใบ...<br />
                ให้เป็นบ้านหลังเดียว ผ่อนถูกลงครึ่งต่อครึ่ง!
              </h1>
              <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-2xl">
                ติดบูโร? ภาระเยอะ? กู้ไม่ผ่าน? อย่าเพิ่งท้อ เราช่วยปิดหนี้ให้ก่อนยื่นกู้ หรือเลือกผ่อนตรงกับเจ้าของได้ทันที
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4 sm:gap-6 mb-10">
                {[
                  { icon: Check, text: 'ปิดหนี้ให้ก่อน' },
                  { icon: Check, text: 'ดันเคสทุกอาชีพ' },
                  { icon: Check, text: 'ไม่ผ่านคืนเงินจอง' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20">
                      <Icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="font-semibold">{text}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={scrollToForm}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <Calculator className="h-6 w-6" />
                ประเมินวงเงิน & ทางออกแก้หนี้ (ฟรี)
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </section>

          {/* Magic Calculator */}
          <section className="py-12 sm:py-16 bg-white border-b border-slate-200">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2 mb-8">
                <Calculator className="h-8 w-8 text-blue-600" />
                <h2 className="text-2xl sm:text-3xl font-bold text-blue-900">คำนวณเห็นภาพ: รวมหนี้แล้วเหลือเท่าไหร่?</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                {/* Left: Current */}
                <div className="rounded-2xl border-2 border-slate-200 p-6 sm:p-8 bg-slate-50">
                  <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-amber-600" />
                    จ่ายขั้นต่ำปัจจุบัน
                  </h3>
                  <label className="block text-sm font-medium text-slate-600 mb-2">ยอดหนี้บัตร/สินเชื่อ (บาท)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
                    placeholder="เช่น 500000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                  <label className="block text-sm font-medium text-slate-600 mt-4 mb-2">ดอกเบี้ยประมาณ (% ต่อปี)</label>
                  <select
                    value={currentRate}
                    onChange={(e) => setCurrentRate(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                  >
                    {[18, 20, 22, 25].map((r) => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                  <p className="mt-4 text-slate-600 text-sm">ผ่อนขั้นต่ำเดือนละประมาณ <span className="font-bold text-amber-700">{currentMonthly.toLocaleString('th-TH', { maximumFractionDigits: 0 })} บาท</span></p>
                </div>

                {/* Right: After */}
                <div className="rounded-2xl border-2 border-emerald-200 p-6 sm:p-8 bg-emerald-50/50">
                  <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Home className="h-5 w-5 text-emerald-600" />
                    เมื่อรวมหนี้เป็นก้อนเดียว (กู้บ้าน)
                  </h3>
                  <p className="text-slate-600 text-sm mb-4">ดอกเบี้ยบ้านประมาณ 3-5% ผ่อนยาว 30 ปี</p>
                  <label className="block text-sm font-medium text-slate-600 mb-2">อัตราดอกเบี้ยบ้าน (% ต่อปี)</label>
                  <select
                    value={homeRate}
                    onChange={(e) => setHomeRate(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  >
                    {[3, 4, 5].map((r) => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                  <p className="mt-4 text-slate-600 text-sm">ผ่อนบ้านเดือนละประมาณ <span className="font-bold text-emerald-700">{homeMonthly.toLocaleString('th-TH', { maximumFractionDigits: 0 })} บาท</span></p>
                </div>
              </div>

              {/* Result */}
              <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-6 sm:p-8 text-white text-center">
                <p className="text-lg sm:text-xl font-medium mb-2">หยุดจ่ายดอกเบี้ยแพงๆ! รวมหนี้วันนี้ มีเงินเหลือไปแต่งบ้านเดือนละ</p>
                <p className="text-3xl sm:text-4xl md:text-5xl font-extrabold drop-shadow-lg">
                  {savingsPerMonth.toLocaleString('th-TH')} บาท
                </p>
              </div>
            </div>
          </section>

          {/* Smart Assessment Form */}
          <section ref={formSectionRef} className="py-12 sm:py-16 bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2 mb-8">
                <FileText className="h-8 w-8 text-blue-600" />
                <h2 className="text-2xl sm:text-3xl font-bold text-blue-900">เช็คโอกาสกู้ & รับคำปรึกษาส่วนตัว</h2>
              </div>
              <p className="text-slate-600 mb-8">ข้อมูลปลอดภัย 100% ใช้เพื่อวิเคราะห์โอกาสกู้และติดต่อกลับเท่านั้น</p>

              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
                {formErrors.submit && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {formErrors.submit}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" /> ชื่อเล่น
                  </label>
                  <input
                    type="text"
                    name="nickname"
                    value={form.nickname}
                    onChange={handleFormChange}
                    placeholder="เช่น ปุ่ม"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base"
                  />
                  {formErrors.nickname && <p className="mt-1 text-red-600 text-sm">{formErrors.nickname}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4" /> เบอร์โทร
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="0812345678"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base"
                    inputMode="numeric"
                  />
                  {formErrors.phone && <p className="mt-1 text-red-600 text-sm">{formErrors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" /> Line ID
                  </label>
                  <input
                    type="text"
                    name="lineId"
                    value={form.lineId}
                    onChange={handleFormChange}
                    placeholder="เช่น @yourline"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> อาชีพ
                  </label>
                  <select
                    name="occupation"
                    value={form.occupation}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base"
                  >
                    {OCCUPATIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {formErrors.occupation && <p className="mt-1 text-red-600 text-sm">{formErrors.occupation}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Wallet className="h-4 w-4" /> รายได้รวม (บาท/เดือน)
                  </label>
                  <input
                    type="text"
                    name="income"
                    value={form.income}
                    onChange={handleFormChange}
                    placeholder="เช่น 25000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base"
                    inputMode="numeric"
                  />
                  {formErrors.income && <p className="mt-1 text-red-600 text-sm">{formErrors.income}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> ภาระหนี้ต่อเดือน (บาท)
                  </label>
                  <input
                    type="text"
                    name="monthlyDebt"
                    value={form.monthlyDebt}
                    onChange={handleFormChange}
                    placeholder="เช่น 8000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base"
                    inputMode="numeric"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> ประวัติเครดิต
                  </label>
                  <select
                    name="creditHistory"
                    value={form.creditHistory}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-base"
                  >
                    {CREDIT_HISTORY.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  {formErrors.creditHistory && <p className="mt-1 text-red-600 text-sm">{formErrors.creditHistory}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'กำลังส่ง...' : 'ส่งข้อมูลรับคำปรึกษา'}
                </button>
              </form>
            </div>
          </section>

          {/* Result Modal */}
          {showModal && modalScenario && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-600"
                  aria-label="ปิด"
                >
                  <X className="h-5 w-5" />
                </button>

                {modalScenario === 'A' ? (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-emerald-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-blue-900 text-center mb-2">ยินดีด้วย! เครดิตคุณดีพอที่จะล้างไพ่หนี้สินได้!</h3>
                    <p className="text-slate-600 text-center mb-6">
                      เราสามารถดันเคสปิดหนี้บัตรให้คุณได้ รวมเป็นก้อนเดียวผ่อนบ้าน สบายกว่าเดิมเยอะ
                    </p>
                    <a
                      href={LINE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-center transition-colors"
                    >
                      สนใจโปรเจกต์ปิดหนี้ (แอดไลน์เจ้าหน้าที่)
                    </a>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                        <Home className="h-8 w-8 text-amber-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-blue-900 text-center mb-2">กู้ธนาคารอาจเหนื่อย... แต่คุณมีบ้านได้แน่นอน!</h3>
                    <p className="text-slate-600 text-center mb-6">
                      ไม่ต้องง้อแบงค์! เรามีโครงการผ่อนตรงกับเจ้าของ (Rent-to-Own) ไม่เช็คบูโร หิ้วกระเป๋าเข้าอยู่ได้เลย
                    </p>
                    <button
                      type="button"
                      onClick={handleGoInstallment}
                      className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold transition-colors"
                    >
                      ดูบ้านผ่อนตรง (เข้าอยู่ได้เลย)
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </PageLayout>
    </>
  )
}
