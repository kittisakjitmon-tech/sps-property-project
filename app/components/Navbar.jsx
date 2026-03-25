import { Link } from 'react-router'
import {
  useEffect, useRef, useState
} from 'react'
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
  Settings,
  LogOut,
  LogIn,
  Building2,
} from 'lucide-react'
import { usePublicAuth } from '../context/PublicAuthContext'
import { useNavigate } from 'react-router'
import { useHoverMenu } from '../hooks/useHoverMenu'
import { Button } from './ui'
import logo from '../assets/logo.png' // นำเข้าไฟล์โลโก้

const buyHomeLinks = [
  { to: '/properties?listingType=sale', label: 'รวมโครงการทั้งหมด', icon: Home },
  { to: '/properties?listingType=sale&propertyCondition=มือ 1', label: 'บ้านมือ 1', icon: Sparkles },
  { to: '/properties?listingType=sale&propertyCondition=มือ 2', label: 'บ้านมือ 2', icon: House },
  { to: '/properties?listingType=rent&subListingType=installment_only', label: 'บ้านผ่อนตรง', icon: Flame, highlight: true },
  { to: '/properties?project=NPA', label: 'บ้าน NPA', icon: Building2, npaHighlight: true },
]

const serviceLinks = [
  { to: '/loan-services', label: 'สินเชื่อ & ปิดภาระหนี้', icon: CreditCard },
  { to: '/post', label: 'ฝากขาย / เช่า', icon: Megaphone },
  { to: '/blogs', label: 'บทความ', icon: BookOpen },
]

export default function Navbar() {
  const buyMenu = useHoverMenu()
  const serviceMenu = useHoverMenu()
  const userMenu = useHoverMenu()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileBuyOpen, setMobileBuyOpen] = useState(false)
  const [mobileServiceOpen, setMobileServiceOpen] = useState(false)
  const desktopMenuRef = useRef(null)
  const propertiesPrefetchedRef = useRef(false)
  const { user, userRole, userProfile, logout, isAgent } = usePublicAuth()
  const navigate = useNavigate()

  const prefetchProperties = () => {
    if (propertiesPrefetchedRef.current) return
    propertiesPrefetchedRef.current = true
    import('../pages/Properties')
  }

  const handleLogout = async () => {
    await logout()
    userMenu.closeMenu()
    navigate('/')
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(e.target)) {
        buyMenu.closeMenu()
        serviceMenu.closeMenu()
        userMenu.closeMenu()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [buyMenu, serviceMenu, userMenu])

  return (
    <header className="sticky top-0 z-[100] w-full bg-white border-b border-gray-200">
      <nav className="w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 lg:max-w-7xl min-h-[60px] flex flex-wrap items-center justify-between gap-3 py-2">
        {/* ซ้าย: Logo + ชื่อ */}
        <Link to="/" className="flex items-center gap-2 shrink min-w-0 max-w-[calc(100%-56px)] lg:max-w-none">
          <img src={logo} alt="SPS Logo" width={120} height={48} className="h-8 w-auto" />
          <span className="text-base font-semibold text-gray-900 whitespace-nowrap truncate hidden sm:inline">
            SPS Property Solution
          </span>
        </Link>

        {/* กลาง: เมนูหลัก */}
        <div ref={desktopMenuRef} className="hidden lg:flex items-center gap-6 flex-1 justify-center min-w-0">
          <Link to="/" className="nav-link text-[15px] font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap no-underline py-2">
            หน้าหลัก
          </Link>

            {/* Buy Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => {
                buyMenu.openMenu()
                prefetchProperties()
              }}
              onMouseLeave={buyMenu.scheduleClose}
            >
              <button
                type="button"
                onClick={() => {
                  buyMenu.toggle()
                  serviceMenu.closeMenu()
                }}
                className="nav-link inline-flex items-center gap-1 text-[15px] font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap bg-transparent border-0 cursor-pointer py-2"
              >
                ซื้อบ้าน
                <ChevronDown className={`h-4 w-4 transition-transform ${buyMenu.open ? 'rotate-180' : ''}`} />
              </button>

              <div
                className={`absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 transition-all duration-200 ${
                  buyMenu.open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
                }`}
              >
                {buyHomeLinks.map(({ to, label, icon: Icon, highlight, npaHighlight }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm transition ${
                      highlight
                        ? 'font-semibold text-red-600 hover:bg-red-50'
                        : npaHighlight
                        ? 'font-semibold text-indigo-700 hover:bg-indigo-50'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => buyMenu.closeMenu()}
                  >
                    <Icon className={`h-4 w-4 ${highlight ? 'text-red-500' : npaHighlight ? 'text-indigo-500' : 'text-slate-500'}`} />
                    {label}
                    {npaHighlight && (
                      <span className="ml-auto text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">NPA</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <Link to="/properties?listingType=rent&subListingType=rent_only" className="nav-link text-[15px] font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap no-underline py-2" onMouseEnter={prefetchProperties}>
              เช่า
            </Link>

            {/* Service Dropdown */}
            <div
              className="relative"
              onMouseEnter={serviceMenu.openMenu}
              onMouseLeave={serviceMenu.scheduleClose}
            >
              <button
                type="button"
                onClick={() => {
                  serviceMenu.toggle()
                  buyMenu.closeMenu()
                }}
                className="nav-link inline-flex items-center gap-1 text-[15px] font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap bg-transparent border-0 cursor-pointer py-2"
              >
                บริการของเรา
                <ChevronDown className={`h-4 w-4 transition-transform ${serviceMenu.open ? 'rotate-180' : ''}`} />
              </button>

              <div
                className={`absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 transition-all duration-200 ${
                  serviceMenu.open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
                }`}
              >
                {serviceLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    onClick={() => serviceMenu.closeMenu()}
                  >
                    <Icon className="h-4 w-4 text-slate-500" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <Link to="/contact" className="nav-link text-[15px] font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap no-underline py-2">
              ติดต่อเรา
            </Link>

            <Link
              to="/favorites"
              className="nav-link text-[15px] font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 flex items-center gap-1.5 whitespace-nowrap no-underline py-2"
            >
              <Heart className="h-4 w-4" />
              รายการโปรด
            </Link>
          </div>

          {/* ขวา: ปุ่มเข้าสู่ระบบ + ลงประกาศฟรี */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {!user ? (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span className="whitespace-nowrap">เข้าสู่ระบบ</span>
              </Link>
            ) : (
              (isAgent() || userRole) ? (
              <div
                className="relative"
                onMouseEnter={userMenu.openMenu}
                onMouseLeave={userMenu.scheduleClose}
              >
                <button
                  type="button"
                  onClick={() => {
                    userMenu.toggle()
                    buyMenu.closeMenu()
                    serviceMenu.closeMenu()
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  {(userProfile?.photoURL || user.photoURL) ? (
                    <img
                      src={userProfile?.photoURL || user.photoURL}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border-2 border-slate-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700 hidden lg:inline">
                    {userProfile?.username || user.displayName || user.email?.split('@')[0] || 'ผู้ใช้'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform ${userMenu.open ? 'rotate-180' : ''}`} />
                </button>

                <div
                  className={`absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 transition-all duration-200 ${
                    userMenu.open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
                  }`}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs text-slate-500">เข้าสู่ระบบเป็น</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {userProfile?.username || user.displayName || user.email?.split('@')[0] || 'ผู้ใช้'}
                    </p>
                  </div>
                  {/* ตั้งค่าโปรไฟล์ — แสดงสำหรับทุก role ที่ login */}
                  <Link
                    to="/profile-settings"
                    onClick={() => userMenu.closeMenu()}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Settings className="h-4 w-4 text-slate-500" />
                    ตั้งค่าโปรไฟล์
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    ออกจากระบบ
                  </button>
                </div>
              </div>
              ) : null
            )}
            <Link
              to="/post"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold whitespace-nowrap hover:bg-amber-600 transition-colors"
            >
              ลงประกาศฟรี
            </Link>
          </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label={mobileOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden basis-full w-full py-3 border-t border-slate-100">
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium min-h-[44px] flex items-center"
              >
                หน้าหลัก
              </Link>

              <button
                type="button"
                onClick={() => setMobileBuyOpen((prev) => !prev)}
                className="w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium flex items-center justify-between min-h-[44px]"
              >
                <span>ซื้อบ้าน</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileBuyOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileBuyOpen && (
                <div className="w-full space-y-2">
                  {buyHomeLinks.map(({ to, label, icon: Icon, highlight, npaHighlight }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => {
                        setMobileOpen(false)
                        setMobileBuyOpen(false)
                      }}
                      className={`w-full rounded-xl border px-4 py-3.5 flex items-center gap-3 text-sm min-h-[48px] ${
                        highlight ? 'font-semibold text-red-600' : npaHighlight ? 'font-semibold text-indigo-700' : 'text-slate-700'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${highlight ? 'text-red-500' : npaHighlight ? 'text-indigo-500' : 'text-slate-500'}`} />
                      {label}
                      {npaHighlight && (
                        <span className="ml-auto text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">NPA</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              <Link
                to="/properties?listingType=rent&subListingType=rent_only"
                onClick={() => setMobileOpen(false)}
                className="w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium min-h-[44px] flex items-center"
              >
                เช่า
              </Link>

              <Link
                to="/blogs"
                onClick={() => setMobileOpen(false)}
                className="w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 min-h-[44px]"
              >
                <BookOpen className="h-4 w-4" />
                บทความ
              </Link>

              <button
                type="button"
                onClick={() => setMobileServiceOpen((prev) => !prev)}
                className="w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium flex items-center justify-between min-h-[44px]"
              >
                <span>บริการของเรา</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileServiceOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileServiceOpen && (
                <div className="w-full space-y-2">
                  {serviceLinks.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => {
                        setMobileOpen(false)
                        setMobileServiceOpen(false)
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 flex items-center gap-3 text-sm text-slate-700 min-h-[52px] hover:bg-slate-50 transition"
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
                className="w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium min-h-[44px] flex items-center"
              >
                ติดต่อเรา
              </Link>
              <Link
                to="/favorites"
                onClick={() => setMobileOpen(false)}
                className="w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 min-h-[44px]"
              >
                <Heart className="h-4 w-4" />
                รายการโปรด
              </Link>
              {!user ? (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full px-4 py-3 rounded-xl text-blue-900 hover:bg-blue-50 font-medium flex items-center gap-2 min-h-[44px]"
                >
                  <LogIn className="h-4 w-4" />
                  เข้าสู่ระบบ
                </Link>
              ) : (
                <>
                  {isAgent() && (
                    <Link
                      to="/profile-settings"
                      onClick={() => setMobileOpen(false)}
                      className="w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 min-h-[44px]"
                    >
                      <Settings className="h-4 w-4" />
                      ตั้งค่าโปรไฟล์
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout()
                      setMobileOpen(false)
                    }}
                    className="w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 font-medium flex items-center gap-2 text-left min-h-[44px]"
                  >
                    <LogOut className="h-4 w-4" />
                    ออกจากระบบ
                  </button>
                </>
              )}
              <Link
                to="/post"
                onClick={() => setMobileOpen(false)}
                className="w-full mt-2 inline-flex items-center justify-center px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white text-sm font-semibold hover:shadow-md min-h-[48px]"
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
