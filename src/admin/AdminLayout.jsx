import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import {
  LayoutDashboard,
  Home,
  Inbox,
  LogOut,
  Building2,
  Images,
  FileCheck,
  MapPin,
  Users,
  Settings,
  FileText,
  LayoutList,
  Activity,
  CreditCard,
  BookOpen,
  Menu,
  X,
} from 'lucide-react'

// Menu items with role requirements
const allNavItems = [
  { to: '/admin', end: true, label: 'แดชบอร์ด', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'member'] },
  { to: '/admin/properties', end: false, label: 'จัดการทรัพย์', icon: Building2, roles: ['super_admin', 'admin'] },
  { to: '/admin/my-properties', end: false, label: 'ประกาศของฉัน', icon: FileText, roles: ['member'] },
  { to: '/admin/properties/new', end: true, label: 'เพิ่มประกาศใหม่', icon: Building2, roles: ['member'] },
  { to: '/admin/pending-properties', end: false, label: 'ตรวจสอบประกาศ', icon: FileCheck, roles: ['super_admin', 'admin'] },
  { to: '/admin/hero-slides', end: false, label: 'จัดการสไลด์หน้าแรก', icon: Images, roles: ['super_admin', 'admin'] },
  { to: '/admin/homepage-sections', end: false, label: 'จัดการหน้าแรก', icon: LayoutList, roles: ['super_admin', 'admin'] },
  { to: '/admin/popular-locations', end: false, label: 'จัดการทำเลยอดฮิต', icon: MapPin, roles: ['super_admin', 'admin'] },
  { to: '/admin/blogs', end: false, label: 'จัดการบทความ', icon: BookOpen, roles: ['super_admin', 'admin'] },
  { to: '/admin/users', end: false, label: 'จัดการสมาชิก', icon: Users, roles: ['super_admin'] },
  { to: '/admin/settings', end: false, label: 'การตั้งค่าระบบ', icon: Settings, roles: ['super_admin'] },
  { to: '/admin/leads', end: false, label: 'จัดการนัดหมาย', icon: Inbox, roles: ['super_admin', 'admin', 'member'] },
  { to: '/admin/loan-requests', end: false, label: 'จัดการสินเชื่อ', icon: CreditCard, roles: ['super_admin'] },
  { to: '/admin/activities', end: false, label: 'บันทึกกิจกรรม', icon: Activity, roles: ['super_admin', 'admin'] },
]

export default function AdminLayout() {
  const { logout, userRole, hasRole } = useAdminAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  const handleNavClick = () => {
    // Close sidebar on mobile when navigating
    setSidebarOpen(false)
  }

  // Filter menu items based on user role
  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true
    return hasRole(item.roles)
  })

  // Get role display name
  const getRoleDisplayName = () => {
    switch (userRole) {
      case 'super_admin':
        return 'Super Admin'
      case 'admin':
        return 'Admin'
      case 'member':
        return 'สมาชิก'
      default:
        return 'ผู้ใช้'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Mobile Top Bar ─────────────────────────────────────── */}
      <header className="lg:hidden flex items-center gap-4 px-4 py-3 bg-blue-900 text-white sticky top-0 z-30 shadow-md">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="เปิดเมนู"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-lg tracking-tight">SPS Admin</h1>
        {userRole && (
          <span className="ml-auto text-xs font-medium text-yellow-400 uppercase tracking-wide">
            {getRoleDisplayName()}
          </span>
        )}
      </header>

      {/* ─── Overlay Backdrop (mobile) ──────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex min-h-[calc(100vh-52px)] lg:min-h-screen">
        {/* ─── Sidebar ──────────────────────────────────────────── */}
        <aside
          className={`
            fixed top-0 left-0 h-full w-72 lg:w-64 bg-blue-900 text-white z-50 flex flex-col
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:static lg:translate-x-0 lg:z-auto lg:shrink-0
          `}
        >
          {/* Sidebar Header */}
          <div className="p-6 border-b border-blue-800 flex items-start justify-between">
            <div>
              <h1 className="font-bold text-lg">SPS Admin</h1>
              <p className="text-blue-200 text-sm">จัดการระบบ</p>
              {userRole && (
                <p className="text-yellow-400 text-xs mt-1 font-medium">{getRoleDisplayName()}</p>
              )}
            </div>
            {/* Close button — mobile only */}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-blue-800 transition text-blue-200 hover:text-white"
              aria-label="ปิดเมนู"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm ${isActive ? 'bg-yellow-400 text-yellow-900 font-semibold' : 'text-blue-100 hover:bg-blue-800'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom Links */}
          <div className="p-4 border-t border-blue-800 space-y-1">
            <NavLink
              to="/"
              onClick={handleNavClick}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800 text-sm transition"
            >
              <Home className="h-5 w-5 shrink-0" />
              <span>กลับเว็บหลัก</span>
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800 text-sm transition"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </aside>

        {/* ─── Main Content ─────────────────────────────────────── */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
