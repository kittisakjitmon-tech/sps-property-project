import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Menu,
  X,
  Heart,
  User,
  ChevronDown,
  Home,
  Sparkles,
  House,
  Flame,
  CreditCard,
  Megaphone,
  BookOpen,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'; // นำเข้าไฟล์โลโก้

const buyHomeLinks = [
  { to: '/properties?listingType=sale', label: 'รวมโครงการทั้งหมด', icon: Home },
  { to: '/properties?listingType=sale&propertyCondition=มือ 1', label: 'บ้านมือ 1', icon: Sparkles },
  { to: '/properties?listingType=sale&propertyCondition=มือ 2', label: 'บ้านมือ 2', icon: House },
  { to: '/properties?listingType=rent&subListingType=installment_only', label: 'บ้านผ่อนตรง', icon: Flame, highlight: true },
]

const serviceLinks = [
  { to: '/loan-services', label: 'สินเชื่อ & ปิดภาระหนี้', icon: CreditCard },
  { to: '/post', label: 'ฝากขาย / เช่า', icon: Megaphone },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [buyMenuOpen, setBuyMenuOpen] = useState(false)
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false)
  const [mobileBuyOpen, setMobileBuyOpen] = useState(false)
  const [mobileServiceOpen, setMobileServiceOpen] = useState(false)
  const desktopMenuRef = useRef(null)
  const buyCloseTimerRef = useRef(null)
  const serviceCloseTimerRef = useRef(null)
  const { user } = useAuth()

  const clearBuyCloseTimer = () => {
    if (buyCloseTimerRef.current) {
      clearTimeout(buyCloseTimerRef.current)
      buyCloseTimerRef.current = null
    }
  }

  const clearServiceCloseTimer = () => {
    if (serviceCloseTimerRef.current) {
      clearTimeout(serviceCloseTimerRef.current)
      serviceCloseTimerRef.current = null
    }
  }

  const scheduleBuyClose = () => {
    clearBuyCloseTimer()
    buyCloseTimerRef.current = setTimeout(() => {
      setBuyMenuOpen(false)
      buyCloseTimerRef.current = null
    }, 100)
  }

  const scheduleServiceClose = () => {
    clearServiceCloseTimer()
    serviceCloseTimerRef.current = setTimeout(() => {
      setServiceMenuOpen(false)
      serviceCloseTimerRef.current = null
    }, 100)
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(e.target)) {
        setBuyMenuOpen(false)
        setServiceMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      clearBuyCloseTimer()
      clearServiceCloseTimer()
    }
  }, [])

  return (
    <header className="sticky top-0 z-[100] w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
        
          <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-3">
            {/* ส่วนของรูปภาพโลโก้ */}
            <img src={logo} alt="SPS Logo" className="h-10 w-auto" />

            {/* ส่วนของข้อความที่จัดเรียงใหม่ */}
            <div className="flex flex-col leading-tight">
              <span className="text-lg md:text-xl font-bold text-slate-800">
                SPS Property Solution
              </span>
              <span className="text-xs md:text-sm text-slate-500 font-medium">
                บ้านคอนโดสวย อมตะซิตี้ ชลบุรี
              </span>
            </div>
          </div>
          </Link>

          {/* Desktop */}
          <div ref={desktopMenuRef} className="hidden md:flex items-center gap-4">
            <Link to="/" className="text-slate-600 hover:text-blue-900 font-medium transition text-sm">
              หน้าหลัก
            </Link>

            {/* Buy Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => {
                clearBuyCloseTimer()
                setBuyMenuOpen(true)
              }}
              onMouseLeave={scheduleBuyClose}
            >
              <button
                type="button"
                onClick={() => {
                  clearBuyCloseTimer()
                  setBuyMenuOpen((prev) => !prev)
                  setServiceMenuOpen(false)
                }}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-900 font-medium transition text-sm"
              >
                ซื้อบ้าน
                <ChevronDown className={`h-4 w-4 transition-transform ${buyMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <div
                className={`absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 transition-all duration-200 ${
                  buyMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
                }`}
              >
                {buyHomeLinks.map(({ to, label, icon: Icon, highlight }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm transition ${
                      highlight
                        ? 'font-semibold text-red-600 hover:bg-red-50'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => {
                      clearBuyCloseTimer()
                      setBuyMenuOpen(false)
                    }}
                  >
                    <Icon className={`h-4 w-4 ${highlight ? 'text-red-500' : 'text-slate-500'}`} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <Link to="/properties?listingType=rent&subListingType=rent_only" className="text-slate-600 hover:text-blue-900 font-medium transition text-sm">
              เช่า
            </Link>

            <Link to="/blogs" className="text-slate-600 hover:text-blue-900 font-medium transition text-sm flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              บทความ
            </Link>

            {/* Service Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => {
                clearServiceCloseTimer()
                setServiceMenuOpen(true)
              }}
              onMouseLeave={scheduleServiceClose}
            >
              <button
                type="button"
                onClick={() => {
                  clearServiceCloseTimer()
                  setServiceMenuOpen((prev) => !prev)
                  setBuyMenuOpen(false)
                }}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-900 font-medium transition text-sm"
              >
                บริการของเรา
                <ChevronDown className={`h-4 w-4 transition-transform ${serviceMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <div
                className={`absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 transition-all duration-200 ${
                  serviceMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
                }`}
              >
                {serviceLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    onClick={() => {
                      clearServiceCloseTimer()
                      setServiceMenuOpen(false)
                    }}
                  >
                    <Icon className="h-4 w-4 text-slate-500" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <Link to="/contact" className="text-slate-600 hover:text-blue-900 font-medium transition text-sm">
              ติดต่อเรา
            </Link>

            <Link
              to="/favorites"
              className="text-slate-600 hover:text-red-500 font-medium transition flex items-center gap-1"
            >
              <Heart className="h-4 w-4" />
              รายการโปรด
            </Link>
            {/*{user && (
              <Link
                to="/profile"
                className="text-slate-600 hover:text-blue-900 font-medium transition flex items-center gap-1"
              >
                <User className="h-4 w-4" />
                โปรไฟล์
              </Link>
            )}*/}
          
            <Link
              to="/post"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white font-semibold hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              ลงประกาศฟรี
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label={mobileOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-slate-100">
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
              >
                หน้าหลัก
              </Link>

              <button
                type="button"
                onClick={() => setMobileBuyOpen((prev) => !prev)}
                className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center justify-between"
              >
                <span>ซื้อบ้าน</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileBuyOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileBuyOpen && (
                <div className="ml-3 mr-1 rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden">
                  {buyHomeLinks.map(({ to, label, icon: Icon, highlight }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => {
                        setMobileOpen(false)
                        setMobileBuyOpen(false)
                      }}
                      className={`px-4 py-3 border-b border-slate-200 last:border-b-0 flex items-center gap-2 text-sm ${
                        highlight ? 'font-semibold text-red-600' : 'text-slate-700'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${highlight ? 'text-red-500' : 'text-slate-500'}`} />
                      {label}
                    </Link>
                  ))}
                </div>
              )}

              <Link
                to="/properties?listingType=rent&subListingType=rent_only"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
              >
                เช่า
              </Link>

              <Link
                to="/blogs"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                บทความ
              </Link>

              <button
                type="button"
                onClick={() => setMobileServiceOpen((prev) => !prev)}
                className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center justify-between"
              >
                <span>บริการของเรา</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileServiceOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileServiceOpen && (
                <div className="ml-3 mr-1 rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden">
                  {serviceLinks.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => {
                        setMobileOpen(false)
                        setMobileServiceOpen(false)
                      }}
                      className="px-4 py-3 border-b border-slate-200 last:border-b-0 flex items-center gap-2 text-sm text-slate-700"
                    >
                      <Icon className="h-4 w-4 text-slate-500" />
                      {label}
                    </Link>
                  ))}
                </div>
              )}

              <Link
                to="/contact"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
              >
                ติดต่อเรา
              </Link>
              <Link
                to="/favorites"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
              >
                <Heart className="h-4 w-4" />
                รายการโปรด
              </Link>
              {user && (
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  โปรไฟล์
                </Link>
              )}
              <a
                href="tel:0955520801"
                onClick={() => setMobileOpen(false)}
                className="mx-4 inline-flex items-center justify-center px-4 py-3 rounded-xl bg-yellow-400 text-blue-900 font-semibold hover:bg-yellow-300"
              >
                โทรหาเรา: 095 552 0801
              </a>
              <Link
                to="/post"
                onClick={() => setMobileOpen(false)}
                className="mx-4 mt-2 inline-flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white font-semibold hover:shadow-md"
              >
                ลงประกาศฟรี
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
