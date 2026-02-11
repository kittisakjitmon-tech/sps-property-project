import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, Heart, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'; // นำเข้าไฟล์โลโก้

const navLinks = [
  { to: '/', label: 'หน้าแรก' },
  { to: '/properties?type=buy', label: 'ซื้อ' },
  { to: '/properties?type=rent', label: 'เช่า' },
  { to: '/contact', label: 'ติดต่อเรา' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
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
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-slate-600 hover:text-blue-900 font-medium transition"
              >
                {label}
              </Link>
            ))}
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
            <a
              href="tel:0955520801"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-yellow-400 text-blue-900 font-semibold hover:bg-yellow-300 hover:shadow-md transition-all duration-300"
            >
              โทรหาเรา: 095 552 0801
            </a>
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
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  {label}
                </Link>
              ))}
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
